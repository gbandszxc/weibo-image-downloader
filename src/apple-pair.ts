/**
 * Apple Live Photo 成对文件注入：JPEG（EXIF MakerNote）+ MOV（QuickTime 元数据）。
 *
 * Apple 生态（macOS 照片 / iOS 相册）把「同名 jpg + mov 一起导入」识别为一张 Live Photo，
 * 配对依据是两侧携带同一个 ContentIdentifier UUID：
 *   - jpg 侧：Exif IFD 的 MakerNote（tag 0x927C）。Apple MakerNote 布局（以微博原封转存的
 *     iPhone 16 Pro 实拍样本逐字节确认，与 ExifTool MakerNotes.pm 的解析口径一致）：
 *       "Apple iOS\0"(10 字节) + 版本(2 字节，实拍为 00 01) + 字节序标记 "MM"/"II"(2 字节)
 *       + MakerIFD：条目数(2) + 12 字节条目 × n + next(4)；
 *       条目内的值偏移以 MakerNote 起点为基（ExifTool 的 Base = start - 14）。
 *       配对 tag 0x0011 (ContentIdentifier)：type 2 (ASCII)、count 37 = 36 字符 UUID + NUL，
 *       值为大写连字符 UUID 文本（如 "7735DA4D-1CC6-406C-A293-C86462D09ADE"）。
 *   - mov 侧：moov/udta/meta（hdlr 类型 'mdta'）下的 keys + ilst：
 *       keys 注册 com.apple.quicktime.content.identifier（data box type flag 1 = UTF-8，
 *       值为同一 ASCII UUID）与 com.apple.quicktime.still-image-time（type flag 21 = 有符号
 *       8 位整数，值恒为 -1，真实静帧时间在 timed metadata track 的 SampleTime 中，
 *       见 ExifTool QuickTime.html 对 still-image-time 的说明）。
 *
 * 注意：微博转存的 jpg 往往原封保留 iPhone 原图的 MakerNote（含原始配对 UUID），而视频
 * 转码后丢失元数据，故注入优先复用 jpg 侧已有 UUID，缺失时才现场生成新 UUID。
 *
 * 全部函数保证不抛异常：结构不符合预期时返回原字节，下载流程不因注入失败而中断。
 */

const APPLE_MAKER_HEADER = "Apple iOS\0";
/** Apple MakerNote 头部长度：头部(10) + 版本(2) + 字节序标记(2) */
const APPLE_MAKER_IFD_OFFSET = 14;
/** MakerIFD 中的 Live Photo 配对 UUID（type 2 ASCII，36 字符 + NUL） */
const APPLE_CONTENT_IDENTIFIER_TAG = 0x0011;
/** Exif IFD 中的 MakerNote 指针 */
const EXIF_MAKER_NOTE_TAG = 0x927c;
/** IFD0 中的 Exif IFD 指针 */
const EXIF_IFD_POINTER_TAG = 0x8769;

const QT_CONTENT_IDENTIFIER_KEY = "com.apple.quicktime.content.identifier";
const QT_STILL_IMAGE_TIME_KEY = "com.apple.quicktime.still-image-time";
/** still-image-time 的 data box type flag：21 = 有符号 8 位整数（大端） */
const QT_DATA_TYPE_SINT8 = 21;
/** content.identifier 的 data box type flag：1 = UTF-8 文本 */
const QT_DATA_TYPE_UTF8 = 1;
/** still-image-time 的常量值 -1（int8），Apple 真机文件恒为此值 */
const QT_STILL_IMAGE_TIME_VALUE = new Uint8Array([0xff]);

function concatBytes(...parts: Uint8Array[]): Uint8Array {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

function asciiBytes(text: string): Uint8Array {
    const out = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
        out[i] = text.charCodeAt(i) & 0xff;
    }
    return out;
}

function bytesToLatin1(bytes: Uint8Array): string {
    let text = "";
    for (let i = 0; i < bytes.length; i++) {
        text += String.fromCharCode(bytes[i]);
    }
    return text;
}

function u32be(value: number): Uint8Array {
    return Uint8Array.from([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);
}

// ---------------------------------------------------------------------------
// UUID：读取（jpg 侧已有值）与生成（缺失时现场生成）
// ---------------------------------------------------------------------------

const UUID_PATTERN = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/;

/** 生成大写连字符格式 UUID（Tampermonkey 页面上下文与 Node 测试环境均可用） */
export function generateContentIdentifier(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID().toUpperCase();
    }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`.toUpperCase();
}

// ---------------------------------------------------------------------------
// JPEG 侧：EXIF 段定位与 TIFF 条目表读写
// ---------------------------------------------------------------------------

interface ExifSegment {
    start: number;
    end: number;
}

interface IfdEntry {
    tag: number;
    type: number;
    count: number;
    /** 值 ≤ 4 字节时为内联原始字段字节，否则为指向 TIFF 内数据的绝对偏移 */
    offset: number;
}

interface IfdView {
    offset: number;
    entries: IfdEntry[];
    nextIfdOffset: number;
    /** 条目表结束位置（含 next 指针） */
    tableEnd: number;
}

const TIFF_TYPE_SIZES: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };

function entryValueByteLength(entry: IfdEntry): number {
    return (TIFF_TYPE_SIZES[entry.type] || 1) * entry.count;
}

/**
 * 扫描 JPEG 段结构定位 Exif APP1 段。只扫描到第一个非 APPn 段为止，不触碰压缩数据；
 * 无 EXIF 时返回 null（调用方静默放弃注入）。
 */
function findExifApp1(jpeg: Uint8Array): ExifSegment | null {
    if (jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
        return null;
    }
    let offset = 2;
    while (offset + 4 <= jpeg.length) {
        while (offset < jpeg.length - 1 && jpeg[offset] === 0xff && jpeg[offset + 1] === 0xff) {
            offset++;
        }
        if (jpeg[offset] !== 0xff) {
            break;
        }
        const marker = jpeg[offset + 1];
        if (marker !== 0xe0 && (marker < 0xe1 || marker > 0xef)) {
            break;
        }
        const segmentLength = (jpeg[offset + 2] << 8) | jpeg[offset + 3];
        const segmentEnd = offset + 2 + segmentLength;
        if (segmentLength < 2 || segmentEnd > jpeg.length) {
            return null;
        }
        if (marker === 0xe1
            && bytesToLatin1(jpeg.subarray(offset + 4, offset + 10)) === "Exif\0\0") {
            return { start: offset, end: segmentEnd };
        }
        offset = segmentEnd;
    }
    return null;
}

function readIfd(view: DataView, offset: number, littleEndian: boolean): IfdView {
    const count = view.getUint16(offset, littleEndian);
    const entries: IfdEntry[] = [];
    for (let i = 0; i < count; i++) {
        const entryOffset = offset + 2 + i * 12;
        entries.push({
            tag: view.getUint16(entryOffset, littleEndian),
            type: view.getUint16(entryOffset + 2, littleEndian),
            count: view.getUint32(entryOffset + 4, littleEndian),
            offset: view.getUint32(entryOffset + 8, littleEndian)
        });
    }
    return {
        offset,
        entries,
        nextIfdOffset: view.getUint32(offset + 2 + count * 12, littleEndian),
        tableEnd: offset + 2 + count * 12 + 4
    };
}

/**
 * 读取 JPEG Exif APP1 中 MakerNote 条目的原始字节；无 MakerNote 时返回 null。
 * 返回值同时带出解析所需的 Exif 段与 TIFF 上下文，供注入复用，避免二次扫描。
 */
interface ExifContext {
    segment: ExifSegment;
    tiff: Uint8Array;
    littleEndian: boolean;
    view: DataView;
    ifd0: IfdView;
    exifIfd: IfdView;
    makerEntry: IfdEntry | null;
    makerBytes: Uint8Array | null;
}

function parseExifContext(jpeg: Uint8Array): ExifContext | null {
    const segment = findExifApp1(jpeg);
    if (!segment) {
        return null;
    }
    const tiff = jpeg.subarray(segment.start + 10, segment.end); // FF E1(2) + 段长(2) + "Exif\0\0"(6)
    if (tiff.length < 8) {
        return null;
    }
    const littleEndian = tiff[0] === 0x49 && tiff[1] === 0x49;
    const bigEndian = tiff[0] === 0x4d && tiff[1] === 0x4d;
    const magic = littleEndian ? (tiff[3] << 8) | tiff[2] : (tiff[2] << 8) | tiff[3];
    if ((!littleEndian && !bigEndian) || magic !== 42) {
        return null;
    }
    const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
    const ifd0 = readIfd(view, view.getUint32(4, littleEndian), littleEndian);
    const exifPointer = ifd0.entries.find((entry) => entry.tag === EXIF_IFD_POINTER_TAG);
    if (!exifPointer || entryValueByteLength(exifPointer) !== 4) {
        return null;
    }
    const exifIfd = readIfd(view, exifPointer.offset, littleEndian);
    const makerEntry = exifIfd.entries.find((entry) => entry.tag === EXIF_MAKER_NOTE_TAG) || null;
    let makerBytes: Uint8Array | null = null;
    if (makerEntry) {
        const length = entryValueByteLength(makerEntry);
        if (length <= 4) {
            // MakerNote 不可能是内联值；出现即视为结构异常，交由调用方降级
            makerBytes = null;
        } else if (makerEntry.offset >= exifIfd.tableEnd && makerEntry.offset + length <= tiff.length) {
            makerBytes = tiff.subarray(makerEntry.offset, makerEntry.offset + length);
        } else {
            return null;
        }
    }
    return { segment, tiff, littleEndian, view, ifd0, exifIfd, makerEntry, makerBytes };
}

/** 从已解析的 Exif 上下文中提取 ContentIdentifier 文本（含校验） */
function readContentIdentifierFromContext(context: ExifContext): string | null {
    const maker = context.makerBytes;
    if (!maker || maker.length < APPLE_MAKER_IFD_OFFSET + 2
        || bytesToLatin1(maker.subarray(0, 10)) !== APPLE_MAKER_HEADER) {
        return null;
    }
    const orderText = bytesToLatin1(maker.subarray(12, 14));
    const littleEndian = orderText === "II";
    if (!littleEndian && orderText !== "MM") {
        return null;
    }
    const view = new DataView(maker.buffer, maker.byteOffset, maker.byteLength);
    const ifd = readIfd(view, APPLE_MAKER_IFD_OFFSET, littleEndian);
    const entry = ifd.entries.find((item) => item.tag === APPLE_CONTENT_IDENTIFIER_TAG);
    if (!entry || entry.type !== 2) {
        return null;
    }
    let value: Uint8Array;
    try {
        if (entryValueByteLength(entry) <= 4) {
            return null;
        }
        if (entry.offset + entry.count > maker.length) {
            return null;
        }
        value = maker.subarray(entry.offset, entry.offset + entry.count);
    } catch {
        return null;
    }
    const text = bytesToLatin1(value).replace(/\0+$/, "").trim();
    return UUID_PATTERN.test(text) ? text.toUpperCase() : null;
}

/**
 * 读取微博 jpg 中已有的 Apple ContentIdentifier（Live Photo 配对 UUID）。
 * 结构异常或不存在时返回 null。
 */
export function readAppleContentIdentifier(jpeg: Uint8Array): string | null {
    try {
        const context = parseExifContext(jpeg);
        return context ? readContentIdentifierFromContext(context) : null;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// JPEG 侧：构建 Apple MakerNote（保留既有条目，upsert ContentIdentifier）
// ---------------------------------------------------------------------------

interface MakerIfdEntry {
    tag: number;
    type: number;
    count: number;
    /** 内联值（≤4 字节）或外联数据字节 */
    value: Uint8Array;
}

/**
 * 解析既有 Apple MakerNote 为条目列表（外联值拷贝原始字节，偏移随重建重排）。
 * 结构不符合预期时返回 null（调用方放弃注入，避免破坏原始数据）。
 */
function parseAppleMakerNote(maker: Uint8Array): { version: Uint8Array; littleEndian: boolean; entries: MakerIfdEntry[] } | null {
    if (bytesToLatin1(maker.subarray(0, 10)) !== APPLE_MAKER_HEADER || maker.length < APPLE_MAKER_IFD_OFFSET + 2) {
        return null;
    }
    const orderText = bytesToLatin1(maker.subarray(12, 14));
    const littleEndian = orderText === "II";
    if (!littleEndian && orderText !== "MM") {
        return null;
    }
    const view = new DataView(maker.buffer, maker.byteOffset, maker.byteLength);
    const ifd = readIfd(view, APPLE_MAKER_IFD_OFFSET, littleEndian);
    const entries: MakerIfdEntry[] = [];
    for (const entry of ifd.entries) {
        const length = entryValueByteLength(entry);
        const entryField = APPLE_MAKER_IFD_OFFSET + 2 + ifd.entries.indexOf(entry) * 12 + 8;
        if (length <= 4) {
            entries.push({ tag: entry.tag, type: entry.type, count: entry.count, value: maker.subarray(entryField, entryField + length) });
        } else {
            if (entry.offset + length > maker.length) {
                return null;
            }
            entries.push({ tag: entry.tag, type: entry.type, count: entry.count, value: maker.subarray(entry.offset, entry.offset + length) });
        }
    }
    return { version: maker.subarray(10, 12), littleEndian, entries };
}

/**
 * 构建完整的 Apple MakerNote 字节块：
 *   "Apple iOS\0" + 版本(2) + "MM"/"II"(2) + MakerIFD（条目按 tag 序）+ 外联值数据区。
 * existing 为既有 Apple MakerNote 时保留其全部条目与版本字节并 upsert ContentIdentifier；
 * existing 为 null 或非 Apple MakerNote 时构造仅含 ContentIdentifier 的新块（字节序随父 TIFF）。
 */
function buildAppleMakerNote(existing: Uint8Array | null, uuid: string, parentLittleEndian: boolean): Uint8Array {
    const parsed = existing ? parseAppleMakerNote(existing) : null;
    const littleEndian = parsed ? parsed.littleEndian : parentLittleEndian;
    const version = parsed ? parsed.version : new Uint8Array([0x00, 0x01]);

    const entries: MakerIfdEntry[] = parsed
        ? parsed.entries.filter((entry) => entry.tag !== APPLE_CONTENT_IDENTIFIER_TAG)
        : [];
    const identifierValue = concatBytes(asciiBytes(uuid.toUpperCase()), new Uint8Array([0]));
    const insertIndex = entries.filter((entry) => entry.tag < APPLE_CONTENT_IDENTIFIER_TAG).length;
    entries.splice(insertIndex, 0, {
        tag: APPLE_CONTENT_IDENTIFIER_TAG,
        type: 2,
        count: identifierValue.length,
        value: identifierValue
    });

    const tableEnd = APPLE_MAKER_IFD_OFFSET + 2 + entries.length * 12 + 4;
    // 数据区按条目顺序排布，先算出各外联条目的偏移（相对 MakerNote 起点）
    const dataOffsets: number[] = [];
    let dataEnd = tableEnd;
    for (const entry of entries) {
        if (entry.value.length > 4) {
            dataOffsets.push(dataEnd);
            dataEnd += entry.value.length;
        } else {
            dataOffsets.push(-1); // 内联值
        }
    }

    const out = new Uint8Array(dataEnd);
    out.set(asciiBytes(APPLE_MAKER_HEADER), 0);
    out.set(version, 10);
    out.set(asciiBytes(littleEndian ? "II" : "MM"), 12);
    const view = new DataView(out.buffer);
    const writeU16 = (offset: number, value: number) => view.setUint16(offset, value, littleEndian);
    const writeU32 = (offset: number, value: number) => view.setUint32(offset, value, littleEndian);
    writeU16(APPLE_MAKER_IFD_OFFSET, entries.length);
    entries.forEach((entry, index) => {
        const entryOffset = APPLE_MAKER_IFD_OFFSET + 2 + index * 12;
        writeU16(entryOffset, entry.tag);
        writeU16(entryOffset + 2, entry.type);
        writeU32(entryOffset + 4, entry.count);
        if (entry.value.length > 4) {
            writeU32(entryOffset + 8, dataOffsets[index]);
        } else {
            // 内联值：原始字节左对齐写入偏移字段，剩余补零
            out.fill(0, entryOffset + 8, entryOffset + 12);
            out.set(entry.value, entryOffset + 8);
        }
    });
    writeU32(APPLE_MAKER_IFD_OFFSET + 2 + entries.length * 12, 0); // next IFD
    entries.forEach((entry, index) => {
        if (dataOffsets[index] >= 0) {
            out.set(entry.value, dataOffsets[index]);
        }
    });
    return out;
}

/**
 * 向 JPEG 的 Exif IFD upsert 一个条目（值 = valueBytes，type 固定 UNDEFINED）：
 *   - 已有条目且数据区容量足够 → 原位覆写（长度不变时零位移）；
 *   - 已有条目但容量不足 → 条目槽位原位改写，新值追加到 TIFF 末尾（无任何偏移平移，
 *     旧值字节留在原处成为无引用数据，对 TIFF 读取方无害）；
 *   - 无条目 → 按插在 livephoto.ts 同款「条目表增长 12 字节 + 表后数据整体平移」模式插入。
 */
function upsertExifIfdEntry(jpeg: Uint8Array, context: ExifContext, tag: number, valueBytes: Uint8Array): Uint8Array {
    const { segment, tiff, littleEndian, ifd0, exifIfd } = context;
    const tiffStart = 10; // FF E1(2) + 段长(2) + "Exif\0\0"(6)
    const existing = exifIfd.entries.find((entry) => entry.tag === tag);
    let valueOffset: number;
    let shift: number;
    let newEntries: IfdEntry[];

    if (existing) {
        const existingLength = entryValueByteLength(existing);
        // 原位覆写：既有值为外联数据、容量足够且不越界
        if (existingLength >= valueBytes.length && existingLength > 4
            && existing.offset >= exifIfd.tableEnd && existing.offset + existingLength <= tiff.length) {
            const patched = jpeg.slice();
            const valueStart = segment.start + tiffStart + existing.offset;
            patched.set(valueBytes, valueStart);
            patched.fill(0, valueStart + valueBytes.length, valueStart + existingLength);
            // 条目 count/type 可能变化（如 MakerNote 内容重建后长度不同），原位改写条目字段
            const entryField = segment.start + tiffStart + exifIfd.offset + 2
                + exifIfd.entries.indexOf(existing) * 12;
            const entryView = new DataView(patched.buffer, patched.byteOffset, patched.byteLength);
            entryView.setUint16(entryField + 2, 7, littleEndian);
            entryView.setUint32(entryField + 4, valueBytes.length, littleEndian);
            return patched;
        }
        // 追加覆写：条目槽位不动（表长不变 → 无偏移平移），新值追加到 TIFF 末尾
        valueOffset = tiff.length;
        shift = 0;
        newEntries = exifIfd.entries.map((entry) => entry);
    } else {
        // 插入新条目：条目表增长 12 字节，表后所有数据偏移同步平移
        const insertIndex = exifIfd.entries.filter((entry) => entry.tag < tag).length;
        newEntries = [...exifIfd.entries];
        newEntries.splice(insertIndex, 0, { tag, type: 7, count: valueBytes.length, offset: 0 });
        valueOffset = tiff.length + 12;
        shift = 12;
    }

    const newTiffLength = tiff.length + shift + valueBytes.length;
    const newTiff = new Uint8Array(newTiffLength);
    // 条目表会被下方循环完整重写，这里只需保真表前数据；next 指针及其后数据随 shift 平移
    const moveFrom = exifIfd.tableEnd - 4;
    newTiff.set(tiff.subarray(0, moveFrom), 0);
    newTiff.set(tiff.subarray(moveFrom), moveFrom + shift);
    const newView = new DataView(newTiff.buffer);
    const writeU16 = (offset: number, value: number) => newView.setUint16(offset, value, littleEndian);
    const writeU32 = (offset: number, value: number) => newView.setUint32(offset, value, littleEndian);

    const pointsPastTable = (value: number): boolean =>
        value >= exifIfd.tableEnd && value < tiff.length;

    writeU16(exifIfd.offset, newEntries.length);
    newEntries.forEach((entry, index) => {
        const entryOffset = exifIfd.offset + 2 + index * 12;
        const isTarget = entry.tag === tag;
        writeU16(entryOffset, entry.tag);
        writeU16(entryOffset + 2, isTarget ? 7 : entry.type);
        writeU32(entryOffset + 4, isTarget ? valueBytes.length : entry.count);
        if (isTarget) {
            writeU32(entryOffset + 8, valueOffset);
        } else {
            const baseOffset = !isTarget && entry.offset >= exifIfd.tableEnd && entry.offset < tiff.length
                ? entry.offset + shift
                : entry.offset;
            writeU32(entryOffset + 8, baseOffset);
        }
    });
    // Exif IFD 的 next 指针（缩略图 IFD 等）随表后数据平移
    const exifNext = exifIfd.nextIfdOffset;
    writeU32(exifIfd.offset + 2 + newEntries.length * 12, pointsPastTable(exifNext) ? exifNext + shift : exifNext);
    // IFD0 的 next 指针与条目中指向表后数据的偏移同样平移
    if (pointsPastTable(ifd0.nextIfdOffset)) {
        writeU32(ifd0.offset + 2 + ifd0.entries.length * 12, ifd0.nextIfdOffset + shift);
    }
    ifd0.entries.forEach((entry, index) => {
        if (pointsPastTable(entry.offset)) {
            writeU32(ifd0.offset + 2 + index * 12 + 8, entry.offset + shift);
        }
    });

    newTiff.set(valueBytes, valueOffset);

    // 用新 TIFF 重建 Exif APP1 段并写回 JPEG
    const newSegmentLength = 2 + 6 + newTiffLength;
    const delta = newSegmentLength + 2 - (segment.end - segment.start);
    const patched = new Uint8Array(jpeg.length + delta);
    patched.set(jpeg.subarray(0, segment.start), 0);
    patched[segment.start] = 0xff;
    patched[segment.start + 1] = 0xe1;
    patched[segment.start + 2] = (newSegmentLength >> 8) & 0xff;
    patched[segment.start + 3] = newSegmentLength & 0xff;
    patched.set(asciiBytes("Exif\0\0"), segment.start + 4);
    patched.set(newTiff, segment.start + tiffStart);
    patched.set(jpeg.subarray(segment.end), segment.start + tiffStart + newTiffLength);
    return patched;
}

/**
 * 向 JPEG 注入 Apple ContentIdentifier（MakerNote tag 0x0011）：
 *   - 已有 Apple MakerNote → 保留全部条目并 upsert（同长度时零位移原位覆写）；
 *   - 无 MakerNote → 构造完整 Apple MakerNote 插入 Exif IFD；
 *   - 已有非 Apple MakerNote → 整体替换为 Apple MakerNote（每图仅允许一个 MakerNote 条目，
 *     微博转存图的原始厂商数据不影响显示，配对识别优先）；
 *   - 无 EXIF / 结构异常 → 静默返回原数据（下载不因此失败，仅 jpg 侧缺少配对标记）。
 */
export function injectAppleContentIdentifier(jpeg: Uint8Array, uuid: string): Uint8Array {
    try {
        const context = parseExifContext(jpeg);
        if (!context) {
            return jpeg;
        }
        const makerNote = buildAppleMakerNote(context.makerBytes, uuid, context.littleEndian);
        return upsertExifIfdEntry(jpeg, context, EXIF_MAKER_NOTE_TAG, makerNote);
    } catch {
        return jpeg;
    }
}

// ---------------------------------------------------------------------------
// MOV 侧：QuickTime mdta 元数据注入（keys + ilst），moov 前置时修复 stco/co64
// ---------------------------------------------------------------------------

interface BoxNode {
    type: string;
    /** box 起点在所属字节数组中的下标 */
    start: number;
    /** box 总长（含头部） */
    size: number;
    headerSize: number;
    children: BoxNode[];
}

/** 普通容器 box（子节点直接从头部之后开始） */
const CONTAINER_BOX_TYPES = new Set(["moov", "udta", "trak", "mdia", "minf", "stbl", "edts", "dinf"]);
/** stco/co64 修复时需要递归的容器（与 qt-faststart 一致） */
const CHUNK_OFFSET_CONTAINER_TYPES = ["moov", "trak", "mdia", "minf", "stbl"];

/**
 * 解析 box 树。meta box 特殊：ISO 风格带 4 字节 version/flags，QuickTime 风格没有，
 * 由调用方先探测再按正确起点解析。size=1（64 位 largesize）与 size=0（至文件尾）
 * 无法安全重建，在涉及重建的路径上由调用方放弃注入。
 */
function parseBoxes(bytes: Uint8Array, start: number, end: number): BoxNode[] {
    const boxes: BoxNode[] = [];
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let pos = start;
    while (pos + 8 <= end) {
        let size = view.getUint32(pos);
        let headerSize = 8;
        if (size === 1) {
            if (pos + 16 > end) {
                break;
            }
            size = Number(view.getBigUint64(pos + 8));
            headerSize = 16;
        } else if (size === 0) {
            size = end - pos;
        }
        if (size < headerSize || pos + size > end) {
            break;
        }
        const type = bytesToLatin1(bytes.subarray(pos + 4, pos + 8));
        const node: BoxNode = { type, start: pos, size, headerSize, children: [] };
        if (CONTAINER_BOX_TYPES.has(type)) {
            node.children = parseBoxes(bytes, pos + headerSize, pos + size);
        }
        boxes.push(node);
        pos += size;
    }
    return boxes;
}

function findBox(boxes: BoxNode[], type: string, depth = 1): BoxNode | null {
    for (const box of boxes) {
        if (box.type === type) {
            return box;
        }
        if (depth > 1) {
            const found = findBox(box.children, type, depth - 1);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

function readBoxBody(bytes: Uint8Array, box: BoxNode): Uint8Array {
    return bytes.subarray(box.start + box.headerSize, box.start + box.size);
}

/** 解析 keys box：返回「键名 → 1 基索引」映射（索引即 ilst 条目的 box type） */
function parseKeysBox(payload: Uint8Array): Map<string, number> | null {
    if (payload.length < 8) {
        return null;
    }
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    const count = view.getUint32(4);
    const keys = new Map<string, number>();
    let pos = 8;
    for (let index = 1; index <= count; index++) {
        if (pos + 8 > payload.length) {
            return null;
        }
        const entrySize = view.getUint32(pos);
        if (entrySize < 8 || pos + entrySize > payload.length) {
            return null;
        }
        const namespace = bytesToLatin1(payload.subarray(pos + 4, pos + 8));
        if (namespace !== "mdta") {
            return null; // 只处理 Apple QuickTime 元数据键空间
        }
        keys.set(bytesToLatin1(payload.subarray(pos + 8, pos + entrySize)), index);
        pos += entrySize;
    }
    return keys;
}

/** 解析 ilst box：保留每个条目的原始字节与键索引 */
function parseIlstBox(payload: Uint8Array): { index: number; raw: Uint8Array }[] {
    const items: { index: number; raw: Uint8Array }[] = [];
    let pos = 0;
    while (pos + 8 <= payload.length) {
        const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
        const size = view.getUint32(pos);
        if (size < 8 || pos + size > payload.length) {
            break;
        }
        items.push({ index: view.getUint32(pos + 4), raw: payload.slice(pos, pos + size) });
        pos += size;
    }
    return items;
}

function buildHdlrBox(): Uint8Array {
    // 33 字节：size + 'hdlr' + version/flags + pre_defined + 'mdta' + 12 字节保留 + 空名称
    const out = new Uint8Array(33);
    out.set(u32be(33), 0);
    out.set(asciiBytes("hdlr"), 4);
    out.set(asciiBytes("mdta"), 16);
    return out;
}

function buildKeysBox(names: string[]): Uint8Array {
    const entries = names.map((name) => concatBytes(u32be(8 + name.length), asciiBytes("mdta"), asciiBytes(name)));
    const body = concatBytes(u32be(0), u32be(names.length), ...entries);
    return concatBytes(u32be(8 + body.length), asciiBytes("keys"), body);
}

function buildIlstItem(keyIndex: number, dataTypeFlags: number, value: Uint8Array): Uint8Array {
    const dataBody = concatBytes(u32be(dataTypeFlags), u32be(0), value); // version/flags + locale 0
    const dataBox = concatBytes(u32be(8 + dataBody.length), asciiBytes("data"), dataBody);
    return concatBytes(u32be(8 + dataBox.length), u32be(keyIndex), dataBox);
}

function buildBox(type: string, body: Uint8Array, isoFullBox: boolean): Uint8Array {
    const prefix = isoFullBox ? u32be(0) : new Uint8Array(0);
    const full = concatBytes(prefix, body);
    return concatBytes(u32be(8 + full.length), asciiBytes(type), full);
}

/** 递归修复 moov 内所有 stco/co64 条目：chunk 绝对偏移 + delta（moov 位于 mdat 之前时必须） */
function patchChunkOffsets(moov: Uint8Array, delta: number): void {
    const walk = (start: number, end: number, depth: number): void => {
        if (depth > 10) {
            return;
        }
        const view = new DataView(moov.buffer, moov.byteOffset, moov.byteLength);
        let pos = start;
        while (pos + 8 <= end) {
            const size = view.getUint32(pos);
            if (size < 8 || pos + size > end) {
                return;
            }
            const type = bytesToLatin1(moov.subarray(pos + 4, pos + 8));
            if (type === "stco" && size >= 16) {
                const count = view.getUint32(pos + 12);
                for (let i = 0; i < count && pos + 16 + i * 4 + 4 <= pos + size; i++) {
                    const field = pos + 16 + i * 4;
                    view.setUint32(field, (view.getUint32(field) + delta) >>> 0);
                }
            } else if (type === "co64" && size >= 16) {
                const count = view.getUint32(pos + 12);
                for (let i = 0; i < count && pos + 16 + i * 8 + 8 <= pos + size; i++) {
                    const field = pos + 16 + i * 8;
                    view.setBigUint64(field, view.getBigUint64(field) + BigInt(delta));
                }
            } else if (CHUNK_OFFSET_CONTAINER_TYPES.includes(type)) {
                walk(pos + 8, pos + size, depth + 1);
            }
            pos += size;
        }
    };
    walk(8, moov.length, 0);
}

/** box type 是否为可打印 4 字符（box 树解析合法性的快速判据，用于 meta 风格探测） */
function isPlausibleBoxType(type: string): boolean {
    return [...type].every((ch) => ch >= " " && ch <= "~");
}

/**
 * 向 MOV/MP4 的 moov/udta/meta（mdta）注入 Live Photo 配对元数据：
 *   - 已有 mdta meta → 合并既有 keys/ilst，追加（或覆盖）两个键；
 *   - 无 meta → 按 ftyp brand 决定 meta 风格（QuickTime 'qt  ' 为普通容器，
 *     ISO 系 brand 带 4 字节 version/flags——微博实测为 isom）新建 udta/meta/hdlr/keys/ilst；
 *   - moov 位于 mdat 之前（faststart）时，重建导致的尺寸增量 delta 会使 mdat 及其后
 *     数据整体后移，必须给 moov 内全部 stco/co64 条目加上 delta，否则媒体数据索引失效；
 *   - 已有 meta 的 hdlr 非 'mdta'（键空间归属不同）、存在压缩 moov（cmov）或分片（moof）、
 *     或 box 结构无法安全解析时 → 静默返回原数据。
 */
export function injectLivePhotoVideoMetadata(video: Uint8Array, uuid: string): Uint8Array {
    try {
        if (video.length < 16) {
            return video;
        }
        const topLevel = parseBoxes(video, 0, video.length);
        if (topLevel.length === 0) {
            return video;
        }
        // 顶层出现 largesize（size 字段为 1）的 box 无法安全重排
        const view = new DataView(video.buffer, video.byteOffset, video.byteLength);
        let mdatOffset = -1;
        let moov: BoxNode | null = null;
        let moovOffset = -1;
        for (const box of topLevel) {
            if (view.getUint32(box.start) === 1) {
                return video;
            }
            if (box.type === "moov" && !moov) {
                moov = box;
                moovOffset = box.start;
            }
            if (box.type === "mdat" && mdatOffset < 0) {
                mdatOffset = box.start;
            }
            if (box.type === "moof" || box.type === "sidx") {
                return video; // 分片 MP4 的偏移语义不同，不做处理
            }
        }
        if (!moov || moovOffset < 0) {
            return video;
        }
        if (findBox(moov.children, "cmov", 2)) {
            return video; // 压缩 moov 无法解析重建
        }

        // 定位 meta（moov 直接子级或 udta 子级），探测其是否为 ISO fullbox 风格：
        // 两种起点各解析一遍，要求子 box 链恰好到 meta 末尾且类型均为可打印 4 字符
        const udta = moov.children.find((box) => box.type === "udta") || null;
        let meta = moov.children.find((box) => box.type === "meta")
            || (udta ? udta.children.find((box) => box.type === "meta") : undefined) || null;
        let metaIsFullBox = false;
        let metaChildren: BoxNode[] = [];
        if (meta) {
            for (const candidateFullBox of [false, true]) {
                const bodyStart = meta.start + meta.headerSize + (candidateFullBox ? 4 : 0);
                const children = parseBoxes(video, bodyStart, meta.start + meta.size);
                const parsedEnd = children.reduce((sum, box) => sum + box.size, bodyStart);
                if (children.length > 0 && parsedEnd === meta.start + meta.size
                    && children.every((box) => box.headerSize === 8 && isPlausibleBoxType(box.type))) {
                    metaIsFullBox = candidateFullBox;
                    metaChildren = children;
                    break;
                }
            }
            if (metaChildren.length === 0) {
                return video; // meta 结构无法识别，避免破坏
            }
            const hdlr = metaChildren.find((box) => box.type === "hdlr");
            if (hdlr) {
                if (hdlr.headerSize !== 8) {
                    return video;
                }
                const handlerType = bytesToLatin1(video.subarray(hdlr.start + 16, hdlr.start + 20));
                if (handlerType !== "mdta") {
                    return video; // 既有 meta 属于其他键空间（如 iTunes 'mdir'），不侵入
                }
            }
        } else {
            // 无 meta：按 ftyp brand 决定风格（微博实测为 isom → ISO fullbox）
            const ftyp = topLevel.find((box) => box.type === "ftyp");
            const majorBrand = ftyp ? bytesToLatin1(video.subarray(ftyp.start + 8, ftyp.start + 12)) : "";
            metaIsFullBox = majorBrand !== "qt  ";
        }

        // 读取既有 keys/ilst（ilst 无 keys 时索引基准不明，放弃注入）
        const keysBox = metaChildren.find((box) => box.type === "keys");
        const ilstBox = metaChildren.find((box) => box.type === "ilst");
        if (ilstBox && !keysBox) {
            return video;
        }
        const existingKeys = keysBox ? parseKeysBox(readBoxBody(video, keysBox)) : null;
        if (keysBox && !existingKeys) {
            return video;
        }
        const existingItems = ilstBox ? parseIlstBox(readBoxBody(video, ilstBox)) : null;

        // 合并键：已注册的沿用原索引，新键追加
        const keyNames = existingKeys ? [...existingKeys.keys()] : [];
        const keyIndex = new Map(existingKeys || []);
        const plan: { key: string; flags: number; value: Uint8Array }[] = [
            { key: QT_CONTENT_IDENTIFIER_KEY, flags: QT_DATA_TYPE_UTF8, value: asciiBytes(uuid.toUpperCase()) },
            { key: QT_STILL_IMAGE_TIME_KEY, flags: QT_DATA_TYPE_SINT8, value: QT_STILL_IMAGE_TIME_VALUE }
        ];
        const targetIndexes: number[] = [];
        for (const entry of plan) {
            let index = keyIndex.get(entry.key);
            if (!index) {
                keyNames.push(entry.key);
                index = keyNames.length;
                keyIndex.set(entry.key, index);
            }
            targetIndexes.push(index);
        }

        const newKeysBox = buildKeysBox(keyNames);
        const replacedSet = new Set(targetIndexes);
        const preservedItems = (existingItems || []).filter((item) => !replacedSet.has(item.index)).map((item) => item.raw);
        const newIlstBody = concatBytes(
            ...preservedItems,
            ...plan.map((entry, position) => buildIlstItem(targetIndexes[position], entry.flags, entry.value))
        );
        const newIlstBox = concatBytes(u32be(8 + newIlstBody.length), asciiBytes("ilst"), newIlstBody);

        // 重建 meta：保留无关子级（原序），hdlr 缺失时补 mdta hdlr，keys/ilst 重建后置于末尾
        const metaChildBoxes: Uint8Array[] = [];
        if (!metaChildren.some((box) => box.type === "hdlr")) {
            metaChildBoxes.push(buildHdlrBox());
        }
        for (const child of metaChildren) {
            if (child.type === "keys" || child.type === "ilst") {
                continue;
            }
            metaChildBoxes.push(video.slice(child.start, child.start + child.size));
        }
        metaChildBoxes.push(newKeysBox, newIlstBox);
        const newMetaBox = buildBox("meta", concatBytes(...metaChildBoxes), metaIsFullBox);

        // 重建 moov：meta 在 udta 内 → 原位替换；meta 是 moov 直接子级 → 原位替换；
        // 无 meta → 追加进既有 udta（避免出现两个 udta）；连 udta 都没有 → 新建置于末尾
        const rawCopy = (box: BoxNode): Uint8Array => video.slice(box.start, box.start + box.size);
        let moovChildrenParts: Uint8Array[];
        if (meta && udta && udta.children.includes(meta)) {
            const udtaParts = udta.children.map((child) => (child === meta ? newMetaBox : rawCopy(child)));
            const newUdta = concatBytes(u32be(8 + udtaParts.reduce((sum, part) => sum + part.length, 0)), asciiBytes("udta"), ...udtaParts);
            moovChildrenParts = moov.children.map((child) => (child === udta ? newUdta : rawCopy(child)));
        } else if (meta) {
            moovChildrenParts = moov.children.map((child) => (child === meta ? newMetaBox : rawCopy(child)));
        } else if (udta) {
            const udtaParts = [...udta.children.map(rawCopy), newMetaBox];
            const newUdta = concatBytes(u32be(8 + udtaParts.reduce((sum, part) => sum + part.length, 0)), asciiBytes("udta"), ...udtaParts);
            moovChildrenParts = moov.children.map((child) => (child === udta ? newUdta : rawCopy(child)));
        } else {
            moovChildrenParts = [...moov.children.map(rawCopy), buildBox("udta", newMetaBox, false)];
        }
        const newMoovBody = concatBytes(...moovChildrenParts);
        const newMoov = concatBytes(u32be(8 + newMoovBody.length), asciiBytes("moov"), newMoovBody);

        // moov 前置时：mdat 及其后数据整体后移 delta，修复全部 chunk 偏移
        const delta = newMoov.length - moov.size;
        if (delta !== 0 && mdatOffset >= 0 && moovOffset < mdatOffset) {
            patchChunkOffsets(newMoov, delta);
        }

        return concatBytes(video.subarray(0, moovOffset), newMoov, video.subarray(moovOffset + moov.size));
    } catch {
        return video;
    }
}

// ---------------------------------------------------------------------------
// 成对注入入口
// ---------------------------------------------------------------------------

export interface AppleLivePhotoPair {
    jpeg: Uint8Array;
    video: Uint8Array;
    /** 两侧共同携带的配对 UUID（大写连字符格式） */
    uuid: string;
    /** jpg 侧注入是否实际生效（无 EXIF 等场景为 false） */
    jpegPaired: boolean;
    /** mov 侧注入是否实际生效（结构异常等场景为 false） */
    videoPaired: boolean;
}

/**
 * 为「分开保存」路径生成 Apple Live Photo 配对文件：
 * 配对 UUID 优先取参数，其次复用 jpg 既有 ContentIdentifier（微博转存图常保留 iPhone
 * 原始 UUID），最后现场生成新 UUID；jpg、mov 分别注入后返回，任何一侧失败不抛异常。
 */
export function pairAppleLivePhoto(jpeg: Uint8Array, video: Uint8Array, uuid?: string): AppleLivePhotoPair {
    const pairUuid = (uuid || readAppleContentIdentifier(jpeg) || generateContentIdentifier()).toUpperCase();
    const pairedJpeg = injectAppleContentIdentifier(jpeg, pairUuid);
    const pairedVideo = injectLivePhotoVideoMetadata(video, pairUuid);
    return {
        jpeg: pairedJpeg,
        video: pairedVideo,
        uuid: pairUuid,
        jpegPaired: pairedJpeg !== jpeg,
        videoPaired: pairedVideo !== video
    };
}
