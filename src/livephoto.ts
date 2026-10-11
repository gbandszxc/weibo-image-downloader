/**
 * 微博 LivePhoto 单文件合并工具：JPEG 图片 + MOV 视频字节拼接为 Motion Photo。
 *
 * 输出文件布局（不重新编码，纯字节级拼装，视频结束于文件末尾、无尾部标记）：
 *   [JPEG 原始字节（EXIF 注入 UserComment，插入 XMP APP1 与 MPF APP2）]
 *   [视频原始字节（ISO-BMFF 容器；QuickTime brand 原位补丁为 MP4 brand）]
 *
 * 兼容性依据（字段级参考真机逆向实现）：
 *   - OPPO/ColorOS（Find X7 Ultra 实机验证的 Young-Spark/oppo-live-photo-maker 与
 *     NEORUAA/XHS_Downloader_Android 的多厂商审计）：EXIF UserComment="Oplus_8388608" +
 *     OpCamera 字段（OLivePhotoVersion=2、MotionPhotoOwner=oplus、VideoLength=视频精确
 *     字节数、MotionPhotoFeatureFlag=1）+ MPF APP2 + 视频 MP4 brand，缺一不可；
 *   - Google：GCamera:MotionPhoto（新格式）+ GCamera:MicroVideo（旧格式）+ Container:Directory，
 *     长度/偏移一律为视频精确字节数（视频结束于 EOF）；
 *   - 小米：MediaStore 按 XMP 中的 MicroVideo/MotionPhoto 关键字索引，保留 MiCamera 字段
 *     （NEORUAA 真机验证布局）。
 * 已知取舍：不写 Samsung SEFT 尾部（OPPO/小米真机文件均无，且 SEF 尾部会使
 * "文件末尾-长度"定位到错误位置）；三星相册因此不识别本产物，详见 docs/TECHNICAL.md。
 * Apple Live Photo 为"成对文件 + ContentIdentifier"机制，无单文件格式，故不在此范围。
 */

const XMP_SEGMENT_ID = "http://ns.adobe.com/xap/1.0/\0";
const EXIF_SEGMENT_ID = "Exif\0\0";
const MPF_SEGMENT_ID = "MPF\0";
/** OPPO 相册要求的 EXIF UserComment 标记（NEORUAA 二次审计确认大小写） */
const OPPO_USER_COMMENT = "Oplus_8388608";
/** UserComment 值的 8 字节字符集前缀（ASCII） */
const USER_COMMENT_ASCII_PREFIX = "ASCII\0\0\0";

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

function encodeUtf8(text: string): Uint8Array {
    return new TextEncoder().encode(text);
}

function bytesToLatin1(bytes: Uint8Array): string {
    let text = "";
    for (let i = 0; i < bytes.length; i++) {
        text += String.fromCharCode(bytes[i]);
    }
    return text;
}

interface JpegSegmentPoint {
    /** 新 APP1 段的插入位置（原图字节偏移，位于最后一个 APP1 之后） */
    insertOffset: number;
    /** 已存在的 XMP APP1 段范围 [start, end)，无则 null；合并时整段替换 */
    existingXmp: { start: number; end: number } | null;
    /** 已存在的 Exif APP1 段范围 [start, end)，无则 null */
    existingExif: { start: number; end: number } | null;
}

/**
 * 扫描 JPEG 段结构，定位元数据插入点：
 * XMP 依 Adobe 建议插在最后一个 APP1 段之后（保持 JFIF/EXIF 在前），
 * 无 APP1 时插在 SOI 之后。只扫描到 SOS/EOI 或第一个非 APPn 段为止，不触碰压缩数据；
 * 绝不全文件搜索 FF D9 找 EOI（EXIF 内嵌缩略图含假 EOI）。
 */
export function findJpegXmpInsertPoint(jpeg: Uint8Array): JpegSegmentPoint {
    if (jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
        throw new Error("不是有效的 JPEG 数据（缺少 SOI 标记）");
    }

    let offset = 2;
    let insertOffset = 2;
    let existingXmp: { start: number; end: number } | null = null;
    let existingExif: { start: number; end: number } | null = null;

    while (offset + 4 <= jpeg.length) {
        // 跳过段间的 0xFF 填充字节
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
            throw new Error("JPEG 段结构损坏（段长度越界）");
        }

        if (marker === 0xe1) {
            const segmentBytes = jpeg.subarray(offset + 4, segmentEnd);
            const segmentId = bytesToLatin1(segmentBytes.subarray(0, XMP_SEGMENT_ID.length));
            if (segmentId === XMP_SEGMENT_ID) {
                existingXmp = { start: offset, end: segmentEnd };
                const segmentText = bytesToLatin1(segmentBytes);
                if (segmentText.includes("MotionPhoto") || segmentText.includes("MicroVideo")) {
                    throw new Error("图片已包含 Motion Photo 元数据，无需重复合并");
                }
            } else if (bytesToLatin1(segmentBytes.subarray(0, EXIF_SEGMENT_ID.length)) === EXIF_SEGMENT_ID) {
                existingExif = { start: offset, end: segmentEnd };
            }
            insertOffset = segmentEnd;
        }

        offset = segmentEnd;
    }

    return { insertOffset, existingXmp, existingExif };
}

// ---------------------------------------------------------------------------
// 视频容器：QuickTime brand 原位等长补丁为 MP4 brand
// ---------------------------------------------------------------------------

/**
 * 将 QuickTime MOV 的 ftyp brand 原位改写为 MP4 brand（等长，不移动 moov、
 * 不改变任何 stco 偏移）：major "qt  " → "isom"、兼容品牌 "qt  " → "mp41"。
 * Google 规范允许内嵌 video/quicktime，但 OPPO 等厂商实现要求 MP4 brand。
 * 非 QuickTime 输入原样返回。
 */
export function patchVideoContainerBrand(video: Uint8Array): Uint8Array {
    if (video.length < 20
        || bytesToLatin1(video.subarray(4, 8)) !== "ftyp"
        || bytesToLatin1(video.subarray(8, 12)) !== "qt  ") {
        return video;
    }
    const patched = video.slice();
    patched.set(encodeUtf8("isom"), 8);
    patched.set(encodeUtf8("mp41"), 16);
    return patched;
}

// ---------------------------------------------------------------------------
// EXIF：向已有 TIFF 结构注入 UserComment = Oplus_8388608（OPPO 识别标记）
// ---------------------------------------------------------------------------

interface IfdEntry {
    tag: number;
    type: number;
    count: number;
    /** 值 ≤ 4 字节时为内联值，否则为指向 TIFF 内数据的绝对偏移 */
    offset: number;
}

interface IfdView {
    offset: number;
    count: number;
    entries: IfdEntry[];
    nextIfdOffset: number;
    /** 条目表结束位置（含 next 指针） */
    tableEnd: number;
}

const USER_COMMENT_TAG = 0x9286;
const EXIF_IFD_POINTER_TAG = 0x8769;
const USER_COMMENT_VALUE = `${USER_COMMENT_ASCII_PREFIX}${OPPO_USER_COMMENT}`;

function buildUserCommentValue(): Uint8Array {
    return encodeUtf8(USER_COMMENT_VALUE);
}

/** 构造仅含 UserComment 的最小 EXIF APP1 段（图片本身无 EXIF 时使用，参照真机逆向实现） */
function buildMinimalExifApp1(): Uint8Array {
    const value = buildUserCommentValue();
    const exifIfdOffset = 8 + 2 + 12 + 4;
    const valueOffset = exifIfdOffset + 2 + 12 + 4;
    const tiff = new Uint8Array(valueOffset + value.length);
    const view = new DataView(tiff.buffer);
    // 小端 TIFF（与真机逆向参考一致）
    tiff.set(encodeUtf8("II"), 0);
    view.setUint16(2, 42, true);
    view.setUint32(4, 8, true);
    // IFD0：仅一个 ExifIFD 指针
    view.setUint16(8, 1, true);
    view.setUint16(10, EXIF_IFD_POINTER_TAG, true);
    view.setUint16(12, 4, true); // LONG
    view.setUint32(14, 1, true);
    view.setUint32(18, exifIfdOffset, true);
    view.setUint32(22, 0, true); // next IFD
    // Exif IFD：仅一个 UserComment
    view.setUint16(exifIfdOffset, 1, true);
    view.setUint16(exifIfdOffset + 2, USER_COMMENT_TAG, true);
    view.setUint16(exifIfdOffset + 4, 7, true); // UNDEFINED
    view.setUint32(exifIfdOffset + 6, value.length, true);
    view.setUint32(exifIfdOffset + 10, valueOffset, true);
    view.setUint32(exifIfdOffset + 14, 0, true);
    tiff.set(value, valueOffset);

    return concatBytes(
        new Uint8Array([0xff, 0xe1]),
        u16be(2 + EXIF_SEGMENT_ID.length + tiff.length),
        encodeUtf8(EXIF_SEGMENT_ID),
        tiff
    );
}

function u16be(value: number): Uint8Array {
    return Uint8Array.from([(value >> 8) & 0xff, value & 0xff]);
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
        count,
        entries,
        nextIfdOffset: view.getUint32(offset + 2 + count * 12, littleEndian),
        tableEnd: offset + 2 + count * 12 + 4
    };
}

function entryValueByteLength(entry: IfdEntry): number {
    const typeSizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };
    return (typeSizes[entry.type] || 1) * entry.count;
}

/**
 * 向 JPEG 已有的 Exif APP1 段注入 UserComment（OPPO 识别标记）：
 * 在 Exif IFD 中按 tag 序插入一个 UserComment 条目，条目表随之增长 12 字节，
 * 所有指向表后数据的偏移同步 +12（缩略图 IFD 指针、MakerNote 数据等）；
 * MakerNote 内部偏移以其自身为基（随块整体移动），无需修改。
 * 结构不符合预期时返回原数据（合并流程继续，仅缺少 OPPO 标记）。
 */
export function injectExifUserComment(jpeg: Uint8Array, exif: { start: number; end: number }): Uint8Array {
    try {
        const segment = jpeg.subarray(exif.start, exif.end);
        const tiffStart = 10; // FF E1(2) + 段长(2) + "Exif\0\0"(6)
        const tiff = segment.subarray(tiffStart);
        if (tiff.length < 8) {
            return jpeg;
        }
        const littleEndian = tiff[0] === 0x49 && tiff[1] === 0x49;
        const bigEndian = tiff[0] === 0x4d && tiff[1] === 0x4d;
        const magic = littleEndian ? (tiff[3] << 8) | tiff[2] : (tiff[2] << 8) | tiff[3];
        if ((!littleEndian && !bigEndian) || magic !== 42) {
            return jpeg;
        }
        const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
        const ifd0 = readIfd(view, view.getUint32(4, littleEndian), littleEndian);
        const exifPointer = ifd0.entries.find((entry) => entry.tag === EXIF_IFD_POINTER_TAG);
        if (!exifPointer || entryValueByteLength(exifPointer) !== 4) {
            return jpeg;
        }
        const exifIfd = readIfd(view, exifPointer.offset, littleEndian);

        const userComment = buildUserCommentValue();
        const existing = exifIfd.entries.find((entry) => entry.tag === USER_COMMENT_TAG);
        if (existing) {
            // 已有 UserComment：值在数据区且容量足够时原位覆写，剩余字节清零
            const existingLength = entryValueByteLength(existing);
            if (existingLength >= userComment.length && existing.offset >= exifIfd.tableEnd
                && existing.offset + existing.count <= tiff.length) {
                const patched = jpeg.slice();
                const valueStart = exif.start + tiffStart + existing.offset;
                patched.set(userComment, valueStart);
                patched.fill(0, valueStart + userComment.length, valueStart + existing.count);
                return patched;
            }
            return jpeg;
        }

        // 在 Exif IFD 条目表中按 tag 序插入新条目（条目为定长记录，插入位置不影响数据偏移）
        const insertIndex = exifIfd.entries.filter((entry) => entry.tag < USER_COMMENT_TAG).length;
        const newTableEntries = [...exifIfd.entries];
        newTableEntries.splice(insertIndex, 0, { tag: USER_COMMENT_TAG, type: 7, count: userComment.length, offset: 0 });
        const shift = 12; // 条目表增长 12 字节，其后所有数据偏移同步平移
        const valueOffset = tiff.length + shift;

        const newTiffLength = tiff.length + shift + userComment.length;
        const newTiff = new Uint8Array(newTiffLength);
        newTiff.set(tiff.subarray(0, exifIfd.tableEnd - shift), 0);
        // 原表尾（next 指针）及其后数据整体后移 12 字节
        newTiff.set(tiff.subarray(exifIfd.tableEnd - 4), exifIfd.tableEnd + 8);
        const newView = new DataView(newTiff.buffer);
        const writeU16 = (offset: number, value: number) => newView.setUint16(offset, value, littleEndian);
        const writeU32 = (offset: number, value: number) => newView.setUint32(offset, value, littleEndian);

        // 重写 Exif IFD 条目表：count+1，指向表后数据的偏移 +12，新条目排在 tag 序位置。
        // 内联值与偏移值按取值范围区分：真偏移必然落在 [表后数据区起点, TIFF 长度) 内；
        // 内联值的原始字节解读成整数几乎总超出该范围，且永远不会指向表后数据区。
        writeU16(exifIfd.offset, newTableEntries.length);
        newTableEntries.forEach((entry, index) => {
            const entryOffset = exifIfd.offset + 2 + index * 12;
            writeU16(entryOffset, entry.tag);
            writeU16(entryOffset + 2, entry.type);
            writeU32(entryOffset + 4, entry.count);
            const isUserComment = entry.tag === USER_COMMENT_TAG;
            const outOfLine = !isUserComment
                && entry.offset >= exifIfd.tableEnd
                && entry.offset < tiff.length;
            const baseOffset = outOfLine ? entry.offset + shift : entry.offset;
            writeU32(entryOffset + 8, isUserComment ? valueOffset : baseOffset);
        });
        // next 指针（缩略图 IFD 等）随表后数据 +12
        const oldNext = exifIfd.nextIfdOffset;
        writeU32(exifIfd.offset + 2 + newTableEntries.length * 12, oldNext >= exifIfd.tableEnd && oldNext < tiff.length ? oldNext + shift : oldNext);

        // IFD0 的 next 指针同样 +12（指向表后数据时）
        if (ifd0.nextIfdOffset >= exifIfd.tableEnd && ifd0.nextIfdOffset < tiff.length) {
            writeU32(ifd0.offset + 2 + ifd0.count * 12, ifd0.nextIfdOffset + shift);
        }
        // IFD0 条目中指向表后数据的偏移 +12
        ifd0.entries.forEach((entry, index) => {
            if (entry.offset >= exifIfd.tableEnd && entry.offset < tiff.length) {
                writeU32(ifd0.offset + 2 + index * 12 + 8, entry.offset + shift);
            }
        });

        newTiff.set(userComment, valueOffset);

        // 用新 TIFF 重建 Exif APP1 段并写回 JPEG（段总长 = 长度字段值 + FF E1 的 2 字节）
        const newSegmentLength = 2 + 6 + newTiffLength;
        const delta = newSegmentLength + 2 - segment.length;
        const patched = new Uint8Array(jpeg.length + delta);
        patched.set(jpeg.subarray(0, exif.start), 0);
        patched[exif.start] = 0xff;
        patched[exif.start + 1] = 0xe1;
        patched[exif.start + 2] = (newSegmentLength >> 8) & 0xff;
        patched[exif.start + 3] = newSegmentLength & 0xff;
        patched.set(encodeUtf8(EXIF_SEGMENT_ID), exif.start + 4);
        patched.set(newTiff, exif.start + tiffStart);
        patched.set(jpeg.subarray(exif.end), exif.start + tiffStart + newTiffLength);
        return patched;
    } catch {
        return jpeg;
    }
}

/** 图片没有 Exif APP1 时，构造仅含 OPPO 标记的最小 EXIF 段 */
function ensureExifWithUserComment(jpeg: Uint8Array, existingExif: { start: number; end: number } | null): Uint8Array {
    if (existingExif) {
        return injectExifUserComment(jpeg, existingExif);
    }
    const minimal = buildMinimalExifApp1();
    const patched = new Uint8Array(jpeg.length + minimal.length);
    patched.set(jpeg.subarray(0, 2), 0);
    patched.set(minimal, 2);
    patched.set(jpeg.subarray(2), 2 + minimal.length);
    return patched;
}

// ---------------------------------------------------------------------------
// MPF APP2 段（Multi-Picture Format，OPPO 识别标记之一）
// ---------------------------------------------------------------------------

/** MPF 段定长（"MPF\0" + TIFF 头 + 3 条目 IFD + 单条 MPEntry），用于预计算尺寸 */
const MPF_SEGMENT_LENGTH = 2 + 2 + 4 + 8 + (2 + 3 * 12 + 4) + 16;

/**
 * 构造 MPF APP2 段（字节布局与真机逆向参考一致）：
 * NumberOfImages=1，MPEntry 属性 0x00030000（Baseline MP Primary），
 * size 字段 = 包含本段在内的 JPEG 部分总长。
 */
function buildMpfSegment(jpegPartLength: number): Uint8Array {
    const bodyLength = MPF_SEGMENT_LENGTH - 4; // 去掉 FF E2 标记与长度字段
    const mpEntryOffset = 4 + 8 + 2 + 3 * 12 + 4;
    const segment = new Uint8Array(bodyLength);
    const view = new DataView(segment.buffer);
    let offset = 0;
    segment.set(encodeUtf8(MPF_SEGMENT_ID), offset); // "MPF\0"
    offset += 4;
    // 大端 TIFF：MM + 002A + IFD 偏移 8
    segment.set(encodeUtf8("MM"), offset);
    view.setUint16(offset + 2, 42, false);
    view.setUint32(offset + 4, 8, false);
    offset += 8;
    // IFD：3 个条目
    view.setUint16(offset, 3, false);
    offset += 2;
    // 0xB000 MPFVersion "0100"（≤4 字节内联）
    view.setUint16(offset, 0xb000, false);
    view.setUint16(offset + 2, 7, false);
    view.setUint32(offset + 4, 4, false);
    segment.set(encodeUtf8("0100"), offset + 8);
    offset += 12;
    // 0xB001 NumberOfImages = 1（内联）
    view.setUint16(offset, 0xb001, false);
    view.setUint16(offset + 2, 4, false);
    view.setUint32(offset + 4, 1, false);
    view.setUint32(offset + 8, 1, false);
    offset += 12;
    // 0xB002 MPEntry（UNDEFINED，16 字节，指向数据区）
    view.setUint16(offset, 0xb002, false);
    view.setUint16(offset + 2, 7, false);
    view.setUint32(offset + 4, 16, false);
    view.setUint32(offset + 8, mpEntryOffset, false);
    offset += 12;
    view.setUint32(offset, 0, false); // next IFD
    offset += 4;
    // MPEntry：属性 0x00030000（Baseline MP Primary）+ JPEG 部分总长 + 8 字节保留
    view.setUint32(offset, 0x00030000, false);
    view.setUint32(offset + 4, jpegPartLength, false);

    const finalSegment = new Uint8Array(MPF_SEGMENT_LENGTH);
    finalSegment[0] = 0xff;
    finalSegment[1] = 0xe2;
    // 段长字段 = 2（长度字段自身）+ 数据体，不含 FF E2 标记
    finalSegment[2] = ((MPF_SEGMENT_LENGTH - 2) >> 8) & 0xff;
    finalSegment[3] = (MPF_SEGMENT_LENGTH - 2) & 0xff;
    finalSegment.set(segment, 4);
    return finalSegment;
}

// ---------------------------------------------------------------------------
// XMP 报文
// ---------------------------------------------------------------------------

/**
 * 生成 Motion Photo 的 XMP 文本。所有长度字段统一为视频精确字节数
 * （视频结束于 EOF，"从文件末尾回退"的读取方据此可直接定位视频起点）；
 * 时间戳与 OPPO/小米真机文件一致取 0。
 */
function buildMotionPhotoXmp(videoLength: number): string {
    return [
        '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>',
        '<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.1.0-jc003">',
        '  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
        '    <rdf:Description rdf:about=""',
        '        xmlns:GCamera="http://ns.google.com/photos/1.0/camera/"',
        '        xmlns:OpCamera="http://ns.oplus.com/photos/1.0/camera/"',
        '        xmlns:MiCamera="http://ns.xiaomi.com/photos/1.0/camera/"',
        '        xmlns:Container="http://ns.google.com/photos/1.0/container/"',
        '        xmlns:Item="http://ns.google.com/photos/1.0/container/item/"',
        '      GCamera:MotionPhoto="1"',
        '      GCamera:MotionPhotoVersion="1"',
        '      GCamera:MotionPhotoPresentationTimestampUs="0"',
        '      OpCamera:MotionPhotoPrimaryPresentationTimestampUs="0"',
        '      OpCamera:MotionPhotoOwner="oplus"',
        '      OpCamera:OLivePhotoVersion="2"',
        `      OpCamera:VideoLength="${videoLength}"`,
        '      OpCamera:MotionPhotoFeatureFlag="1"',
        '      MiCamera:XMPMeta="&lt;?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?&gt;"',
        '      GCamera:MicroVideoVersion="1"',
        '      GCamera:MicroVideo="1"',
        `      GCamera:MicroVideoOffset="${videoLength}"`,
        '      GCamera:MicroVideoPresentationTimestampUs="0">',
        '      <Container:Directory>',
        '        <rdf:Seq>',
        '          <rdf:li rdf:parseType="Resource">',
        '            <Container:Item',
        '              Item:Mime="image/jpeg"',
        '              Item:Semantic="Primary"',
        '              Item:Length="0"',
        '              Item:Padding="0"/>',
        '          </rdf:li>',
        '          <rdf:li rdf:parseType="Resource">',
        '            <Container:Item',
        '              Item:Mime="video/mp4"',
        '              Item:Semantic="MotionPhoto"',
        `              Item:Length="${videoLength}"/>`,
        '          </rdf:li>',
        '        </rdf:Seq>',
        '      </Container:Directory>',
        '    </rdf:Description>',
        '  </rdf:RDF>',
        '</x:xmpmeta>',
        '<?xpacket end="w"?>'
    ].join("\n");
}

/** 构造 XMP APP1 段：FF E1 + 段长（含长度字段自身）+ 段标识 + XMP 报文 */
function buildXmpApp1Segment(xmpText: string): Uint8Array {
    const idBytes = encodeUtf8(XMP_SEGMENT_ID);
    const payload = encodeUtf8(xmpText);
    const segmentLength = 2 + idBytes.length + payload.length;
    if (segmentLength > 0xffff) {
        throw new Error("XMP 段超出 APP1 长度上限");
    }

    const segment = new Uint8Array(2 + segmentLength);
    segment[0] = 0xff;
    segment[1] = 0xe1;
    segment[2] = (segmentLength >> 8) & 0xff;
    segment[3] = segmentLength & 0xff;
    segment.set(idBytes, 4);
    segment.set(payload, 4 + idBytes.length);
    return segment;
}

/**
 * 将 JPEG 图片与视频合并为单文件 Motion Photo。
 * 输入字节不做转码；视频必须是 ISO-BMFF 容器（MP4/MOV，ftyp 开头），
 * QuickTime brand 会被原位补丁为 MP4 brand 以提升厂商相册兼容性。
 * 输出为可直接保存的字节数组，文件名保持 .MP.jpg 扩展名。
 */
export function buildMotionPhoto(jpeg: Uint8Array, video: Uint8Array): Uint8Array {
    const patchedVideo = patchVideoContainerBrand(video);
    if (patchedVideo.length < 12 || bytesToLatin1(patchedVideo.subarray(4, 8)) !== "ftyp") {
        throw new Error("视频不是 ISO-BMFF 容器（缺少 ftyp box），无法合并");
    }

    const exifReady = ensureExifWithUserComment(jpeg, findJpegXmpInsertPoint(jpeg).existingExif);
    const { insertOffset, existingXmp } = findJpegXmpInsertPoint(exifReady);

    const xmpSegment = buildXmpApp1Segment(buildMotionPhotoXmp(patchedVideo.length));
    // 已有 XMP 时整段替换：头部截到旧段起点，新段从旧段位置插入，旧段内容随尾部裁剪丢弃
    const headEnd = existingXmp ? existingXmp.start : insertOffset;
    const jpegHead = exifReady.subarray(0, headEnd);
    const jpegTail = exifReady.subarray(existingXmp ? existingXmp.end : insertOffset);
    // MPF 的 size 字段统计包含 MPF 段自身在内的 JPEG 部分总长（段长恒定，可先算）
    const jpegPartLength = jpegHead.length + xmpSegment.length + MPF_SEGMENT_LENGTH + jpegTail.length;
    const mpfSegment = buildMpfSegment(jpegPartLength);

    return concatBytes(jpegHead, xmpSegment, mpfSegment, jpegTail, patchedVideo);
}
