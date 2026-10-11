import test from "node:test";
import assert from "node:assert/strict";

import {
    injectAppleContentIdentifier,
    injectLivePhotoVideoMetadata,
    pairAppleLivePhoto,
    readAppleContentIdentifier
} from "../src/apple-pair.ts";

const UUID_A = "3C7C43E4-2CB8-4915-8A38-7854CD94F3F8";
const UUID_B = "D4122CE4-5DA9-4EBA-9475-01579D01ADCE";

function ascii(text: string): Uint8Array {
    return Uint8Array.from(text, (ch) => ch.charCodeAt(0));
}

function latin1(bytes: Uint8Array): string {
    let text = "";
    for (const byte of bytes) {
        text += String.fromCharCode(byte);
    }
    return text;
}

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

function u16be(value: number): Uint8Array {
    return Uint8Array.from([(value >> 8) & 0xff, value & 0xff]);
}

function u32be(value: number): Uint8Array {
    return Uint8Array.from([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);
}

function zeros(length: number): Uint8Array {
    return new Uint8Array(length);
}

// ---------------------------------------------------------------------------
// MOV fixture：合成 ISO-BMFF（ftyp + moov(mvhd/trak/stbl/stco[+udta/meta]) + mdat）
// ---------------------------------------------------------------------------

function boxOf(type: string, body: Uint8Array | Uint8Array[]): Uint8Array {
    const flat = Array.isArray(body) ? concatBytes(...body) : body;
    const out = new Uint8Array(8 + flat.length);
    out.set(u32be(out.length), 0);
    out.set(ascii(type), 4);
    out.set(flat, 8);
    return out;
}

/** fullbox：4 字节 version/flags(0) + payload */
function fullBoxOf(type: string, payload: Uint8Array): Uint8Array {
    return boxOf(type, concatBytes(zeros(4), payload));
}

/** meta box：ISO 风格（fullbox）或 QuickTime 风格（普通容器） */
function metaBoxOf(isoFullBox: boolean, children: Uint8Array[]): Uint8Array {
    return isoFullBox ? fullBoxOf("meta", concatBytes(...children)) : boxOf("meta", concatBytes(...children));
}

/** mdta 风格 hdlr（33 字节，与真机一致） */
function mdtaHdlr(): Uint8Array {
    return boxOf("hdlr", concatBytes(zeros(8), ascii("mdta"), zeros(12), new Uint8Array([0])));
}

function keysBoxOf(names: string[]): Uint8Array {
    const entries = names.map((name) => concatBytes(u32be(8 + name.length), ascii("mdta"), ascii(name)));
    return fullBoxOf("keys", concatBytes(u32be(names.length), ...entries));
}

function ilstItemOf(keyIndex: number, dataFlags: number, value: Uint8Array): Uint8Array {
    const dataBox = boxOf("data", concatBytes(u32be(dataFlags), zeros(4), value));
    return concatBytes(u32be(8 + dataBox.length), u32be(keyIndex), dataBox);
}

function ilstBoxOf(items: Uint8Array[]): Uint8Array {
    return boxOf("ilst", concatBytes(...items));
}

function stcoBoxOf(entries: number[]): Uint8Array {
    return fullBoxOf("stco", concatBytes(u32be(entries.length), ...entries.map(u32be)));
}

/** 微博风格的既有 mdta meta（1 个 comment 键 + 文本值） */
function weiboLikeUdta(): Uint8Array {
    return boxOf("udta", metaBoxOf(true, [
        mdtaHdlr(),
        keysBoxOf(["comment"]),
        ilstBoxOf([ilstItemOf(1, 1, ascii("Lavf60.3.100"))])
    ]));
}

interface MovieOptions {
    brand?: string;
    moovFirst?: boolean;
    udta?: "none" | "weibo-like";
}

function buildTestMovie(options: MovieOptions = {}): { movie: Uint8Array; stcoEntries: number[] } {
    const { brand = "isom", moovFirst = true, udta = "none" } = options;
    const ftyp = boxOf("ftyp", concatBytes(ascii(brand), u32be(0x200), ascii(brand), ascii("iso2"), ascii("avc1")));
    const mdat = boxOf("mdat", ascii("0123456789abcdef".repeat(16)));
    const mvhd = fullBoxOf("mvhd", zeros(96));
    const udtaBox = udta === "weibo-like" ? weiboLikeUdta() : null;

    // stco 条目以等长占位先探长度（mdat 位置依赖 moov 长度），回填真实条目后再组装
    const buildTrak = (stcoBox: Uint8Array): Uint8Array =>
        boxOf("trak", [
            fullBoxOf("tkhd", zeros(80)),
            boxOf("mdia", [
                fullBoxOf("mdhd", zeros(20)),
                boxOf("hdlr", concatBytes(zeros(8), ascii("vide"), zeros(12), new Uint8Array([0]))),
                boxOf("minf", boxOf("stbl", stcoBox))
            ])
        ]);
    const probeMoovLength = 8 + mvhd.length + buildTrak(stcoBoxOf([0, 0])).length + (udtaBox?.length || 0);
    const mdatStart = moovFirst ? ftyp.length + probeMoovLength : ftyp.length;
    const stcoEntries = [mdatStart + 8 + 16, mdatStart + 8 + 64];
    const moovChildren: Uint8Array[] = [mvhd, buildTrak(stcoBoxOf(stcoEntries))];
    if (udtaBox) {
        moovChildren.push(udtaBox);
    }
    const moov = boxOf("moov", moovChildren);

    return {
        movie: moovFirst ? concatBytes(ftyp, moov, mdat) : concatBytes(ftyp, mdat, moov),
        stcoEntries
    };
}

// ---------------------------------------------------------------------------
// 测试用 box 树遍历断言
// ---------------------------------------------------------------------------

interface BoxInfo {
    type: string;
    start: number;
    size: number;
    children: BoxInfo[];
}

const CONTAINERS = new Set(["moov", "udta", "trak", "mdia", "minf", "stbl"]);

/** 递归遍历 box 树；任何错位/越界都会抛错（即「box 树仍可解析」的断言本身） */
function walkBoxes(bytes: Uint8Array, start: number, end: number): BoxInfo[] {
    const boxes: BoxInfo[] = [];
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let pos = start;
    while (pos + 8 <= end) {
        const size = view.getUint32(pos);
        if (size < 8 || pos + size > end) {
            throw new Error(`box 链损坏 @ ${pos}: size=${size}`);
        }
        const type = latin1(bytes.subarray(pos + 4, pos + 8));
        const children = CONTAINERS.has(type) ? walkBoxes(bytes, pos + 8, pos + size) : [];
        boxes.push({ type, start: pos, size, children });
        pos += size;
    }
    if (pos !== end) {
        throw new Error(`box 链未对齐：末端 ${pos} ≠ ${end}`);
    }
    return boxes;
}

function findBoxInfo(boxes: BoxInfo[], path: string[]): BoxInfo {
    let current: BoxInfo | undefined = { type: "", start: 0, size: 0, children: boxes };
    for (const segment of path) {
        current = current!.children.find((box) => box.type === segment);
        if (!current) {
            throw new Error(`未找到 box 路径 ${path.join("/")}`);
        }
    }
    return current!;
}

/** 定位 moov 下的 meta 并探测其风格（QuickTime 普通 vs ISO fullbox） */
function findMetaInfo(movie: Uint8Array): { fullbox: boolean; children: BoxInfo[] } {
    const moov = findBoxInfo(walkBoxes(movie, 0, movie.length), ["moov"]);
    const udta = moov.children.find((box) => box.type === "udta");
    const meta = moov.children.find((box) => box.type === "meta") || udta?.children.find((box) => box.type === "meta");
    if (!meta) {
        throw new Error("未找到 meta box");
    }
    for (const fullbox of [false, true]) {
        const bodyStart = meta.start + 8 + (fullbox ? 4 : 0);
        try {
            const children = walkBoxes(movie, bodyStart, meta.start + meta.size);
            if (children.length > 0) {
                return { fullbox, children };
            }
        } catch {
            // 尝试另一种风格
        }
    }
    throw new Error("meta 风格无法识别");
}

function readKeysNames(movie: Uint8Array, children: BoxInfo[]): string[] {
    const keys = children.find((box) => box.type === "keys");
    assert.ok(keys, "meta 应包含 keys box");
    const view = new DataView(movie.buffer, movie.byteOffset, movie.byteLength);
    const count = view.getUint32(keys.start + 12);
    const names: string[] = [];
    let pos = keys.start + 16;
    for (let i = 1; i <= count; i++) {
        const size = view.getUint32(pos);
        // 条目 = size(4) + "mdta"(4) + 键名
        names.push(latin1(movie.subarray(pos + 8, pos + size)));
        pos += size;
    }
    return names;
}

function readIlstItems(movie: Uint8Array, children: BoxInfo[]): { keyIndex: number; dataFlags: number; value: Uint8Array }[] {
    const ilst = children.find((box) => box.type === "ilst");
    assert.ok(ilst, "meta 应包含 ilst box");
    const items: { keyIndex: number; dataFlags: number; value: Uint8Array }[] = [];
    const view = new DataView(movie.buffer, movie.byteOffset, movie.byteLength);
    let pos = ilst.start + 8;
    while (pos < ilst.start + ilst.size) {
        const itemSize = view.getUint32(pos);
        const dataSize = view.getUint32(pos + 8);
        assert.equal(latin1(movie.subarray(pos + 12, pos + 16)), "data", "ilst 条目内应为 data box");
        items.push({
            keyIndex: view.getUint32(pos + 4),
            dataFlags: view.getUint32(pos + 16),
            value: movie.slice(pos + 24, pos + 8 + dataSize)
        });
        pos += itemSize;
    }
    return items;
}

function readStcoEntries(movie: Uint8Array): number[] {
    const stbl = findBoxInfo(walkBoxes(movie, 0, movie.length), ["moov", "trak", "mdia", "minf", "stbl"]);
    const stco = stbl.children.find((box) => box.type === "stco");
    assert.ok(stco, "应包含 stco box");
    const view = new DataView(movie.buffer, movie.byteOffset, movie.byteLength);
    const count = view.getUint32(stco.start + 12);
    return Array.from({ length: count }, (_, i) => view.getUint32(stco.start + 16 + i * 4));
}

// ---------------------------------------------------------------------------
// MOV 注入
// ---------------------------------------------------------------------------

test("injectLivePhotoVideoMetadata 注入 content.identifier 与 still-image-time 并修复 stco", () => {
    const { movie, stcoEntries } = buildTestMovie();
    const injected = injectLivePhotoVideoMetadata(movie, UUID_A);

    assert.ok(injected.length > movie.length, "注入后应增大");
    // box 树仍可完整遍历且各层精确对齐（walkBoxes 对错位会抛错）
    walkBoxes(injected, 0, injected.length);
    const { fullbox, children } = findMetaInfo(injected);
    assert.equal(fullbox, true, "isom brand 应使用 ISO fullbox 风格 meta");
    assert.deepEqual(readKeysNames(injected, children), [
        "com.apple.quicktime.content.identifier",
        "com.apple.quicktime.still-image-time"
    ]);
    const items = readIlstItems(injected, children);
    assert.equal(items.length, 2);
    assert.equal(items[0].keyIndex, 1);
    assert.equal(items[0].dataFlags, 1, "content.identifier 应为 UTF-8 文本（type flag 1）");
    assert.equal(latin1(items[0].value), UUID_A);
    assert.equal(items[1].keyIndex, 2);
    assert.equal(items[1].dataFlags, 21, "still-image-time 应为有符号 int8（type flag 21）");
    assert.deepEqual(Array.from(items[1].value), [0xff], "still-image-time 恒为 -1");

    // stco 每项 += delta（moov 在 mdat 之前，mdat 整体后移）
    const delta = injected.length - movie.length;
    assert.deepEqual(readStcoEntries(injected), stcoEntries.map((entry) => entry + delta));
});

test("injectLivePhotoVideoMetadata 合并既有微博风格 mdta meta 且保留原键值", () => {
    const { movie } = buildTestMovie({ udta: "weibo-like" });
    const beforeStco = readStcoEntries(movie);
    const injected = injectLivePhotoVideoMetadata(movie, UUID_A);
    const delta = injected.length - movie.length;

    const { children } = findMetaInfo(injected);
    assert.deepEqual(readKeysNames(injected, children), [
        "comment",
        "com.apple.quicktime.content.identifier",
        "com.apple.quicktime.still-image-time"
    ], "既有键在前，新键追加");
    const items = readIlstItems(injected, children);
    assert.equal(items.length, 3);
    assert.equal(items[0].keyIndex, 1);
    assert.equal(latin1(items[0].value), "Lavf60.3.100", "既有 ilst 条目应原样保留");
    assert.equal(latin1(items[1].value), UUID_A);
    assert.deepEqual(Array.from(items[2].value), [0xff]);
    assert.deepEqual(readStcoEntries(injected), beforeStco.map((entry) => entry + delta));
});

test("injectLivePhotoVideoMetadata 同 UUID 重复注入幂等，换 UUID 只改值", () => {
    const { movie } = buildTestMovie({ udta: "weibo-like" });
    const once = injectLivePhotoVideoMetadata(movie, UUID_A);
    const twice = injectLivePhotoVideoMetadata(once, UUID_A);
    assert.deepEqual([...twice], [...once], "同 UUID 再次注入应得到相同字节");

    const changed = injectLivePhotoVideoMetadata(once, UUID_B);
    assert.equal(changed.length, once.length, "换 UUID 不应改变长度（值等长替换）");
    const { children } = findMetaInfo(changed);
    const items = readIlstItems(changed, children);
    assert.equal(latin1(items[1].value), UUID_B, "content.identifier 应更新为新 UUID");
});

test("injectLivePhotoVideoMetadata 在 moov 后置时保持 stco 不变", () => {
    const { movie, stcoEntries } = buildTestMovie({ moovFirst: false });
    const injected = injectLivePhotoVideoMetadata(movie, UUID_A);
    // mdat 在 moov 之前，moov 增长不影响媒体数据位置
    assert.deepEqual(readStcoEntries(injected), stcoEntries);
    const { children } = findMetaInfo(injected);
    assert.ok(readKeysNames(injected, children).includes("com.apple.quicktime.content.identifier"));
});

test("injectLivePhotoVideoMetadata 对 QuickTime brand 使用普通容器 meta", () => {
    const { movie } = buildTestMovie({ brand: "qt  " });
    const injected = injectLivePhotoVideoMetadata(movie, UUID_A);
    const { fullbox } = findMetaInfo(injected);
    assert.equal(fullbox, false, "qt  brand 应使用 QuickTime 普通容器 meta");
});

test("injectLivePhotoVideoMetadata 对无 moov 的输入静默返回原数据", () => {
    const junk = concatBytes(boxOf("ftyp", concatBytes(ascii("isom"), u32be(0x200))), ascii("not-a-movie"));
    assert.deepEqual([...injectLivePhotoVideoMetadata(junk, UUID_A)], [...junk]);
});

// ---------------------------------------------------------------------------
// JPEG fixture 与 MakerNote 注入
// ---------------------------------------------------------------------------

interface JpegOptions {
    exif: "none" | "plain" | "apple-makernote" | "other-makernote" | "corrupt";
    uuid?: string;
}

function jpegSegment(marker: number, payload: Uint8Array): Uint8Array {
    const seg = new Uint8Array(4 + payload.length);
    seg[0] = 0xff;
    seg[1] = marker;
    const length = payload.length + 2;
    seg[2] = (length >> 8) & 0xff;
    seg[3] = length & 0xff;
    seg.set(payload, 4);
    return seg;
}

/**
 * 合成大端 EXIF TIFF：IFD0(Make@38 + ExifIFD 指针@44) + ExifIFD@44
 * （ExifVersion 内联 + [MakerNote] + LensModel）。
 * apple-makernote 模式复刻真机样本布局：69 字节，仅一个 0x0011 条目（ASCII/37 @ 32）。
 */
function buildTestExifSegment(options: JpegOptions): Uint8Array {
    const make = ascii("Apple\0");
    const lensModel = ascii("abc");
    const exifVersion = ascii("0232");
    const makerNote = options.exif === "apple-makernote"
        ? concatBytes(
            ascii("Apple iOS\0\x00\x01MM"),
            u16be(1), // MakerIFD 条目数
            u16be(0x0011), u16be(2), u32be(37), u32be(32), // ContentIdentifier: ASCII/37@32
            u32be(0), // next IFD
            ascii((options.uuid || UUID_B) + "\0") // 值 @32（以 MakerNote 起点为基）
        )
        : options.exif === "other-makernote"
            ? ascii("MakerNote!")
            : new Uint8Array(0);

    const hasMaker = makerNote.length > 0;
    const ifd0Offset = 8;
    const ifd0DataOffset = ifd0Offset + 30;
    const exifIfdOffset = ifd0DataOffset + make.length; // 44
    const exifEntryCount = hasMaker ? 3 : 2;
    const exifDataOffset = exifIfdOffset + 2 + exifEntryCount * 12 + 4;
    const makerDataOffset = exifDataOffset;
    const lensDataOffset = makerDataOffset + makerNote.length;
    const tiff = new Uint8Array(lensDataOffset + lensModel.length);
    const view = new DataView(tiff.buffer);
    tiff.set(ascii("MM"), 0);
    view.setUint16(2, 42, false);
    view.setUint32(4, ifd0Offset, false);
    view.setUint16(ifd0Offset, 2, false);
    view.setUint16(ifd0Offset + 2, 0x010f, false); // Make
    view.setUint16(ifd0Offset + 4, 2, false);
    view.setUint32(ifd0Offset + 6, make.length, false);
    view.setUint32(ifd0Offset + 10, ifd0DataOffset, false);
    view.setUint16(ifd0Offset + 14, 0x8769, false); // ExifIFD 指针
    view.setUint16(ifd0Offset + 16, 4, false);
    view.setUint32(ifd0Offset + 18, 1, false);
    view.setUint32(ifd0Offset + 22, exifIfdOffset, false);
    view.setUint32(ifd0Offset + 26, 0, false);
    tiff.set(make, ifd0DataOffset);
    view.setUint16(exifIfdOffset, exifEntryCount, false);
    view.setUint16(exifIfdOffset + 2, 0x9000, false); // ExifVersion（内联）
    view.setUint16(exifIfdOffset + 4, 7, false);
    view.setUint32(exifIfdOffset + 6, 4, false);
    tiff.set(exifVersion, exifIfdOffset + 8);
    let entryCursor = exifIfdOffset + 14;
    if (hasMaker) {
        view.setUint16(entryCursor, 0x927c, false);
        view.setUint16(entryCursor + 2, 7, false);
        view.setUint32(entryCursor + 4, makerNote.length, false);
        view.setUint32(entryCursor + 8, makerDataOffset, false);
        entryCursor += 12;
    }
    view.setUint16(entryCursor, 0xa434, false); // LensModel
    view.setUint16(entryCursor + 2, 2, false);
    view.setUint32(entryCursor + 4, lensModel.length, false);
    view.setUint32(entryCursor + 8, lensDataOffset, false);
    view.setUint32(entryCursor + 12, 0, false);
    if (hasMaker) {
        tiff.set(makerNote, makerDataOffset);
    }
    tiff.set(lensModel, lensDataOffset);
    return jpegSegment(0xe1, concatBytes(ascii("Exif\0\0"), tiff));
}

function buildTestJpeg(options: JpegOptions): Uint8Array {
    const parts = [
        new Uint8Array([0xff, 0xd8]),
        jpegSegment(0xe0, ascii("JFIF\0\x01\x02\x00\x00\x01\x00\x01\x00\x00"))
    ];
    if (options.exif === "corrupt") {
        parts.push(jpegSegment(0xe1, concatBytes(ascii("Exif\0\0"), ascii("junk-junk-junk"))));
    } else if (options.exif !== "none") {
        parts.push(buildTestExifSegment(options));
    }
    parts.push(
        jpegSegment(0xdb, new Uint8Array(64).fill(0x11)),
        jpegSegment(0xda, ascii("\x00\x01\x01\x00\x00\x3f\x00")),
        ascii("compressed-data-here"),
        new Uint8Array([0xff, 0xd9])
    );
    return concatBytes(...parts);
}

/** 从 JPEG 中提取 Exif APP1 的 TIFF 字节 */
function extractTiff(jpeg: Uint8Array): Uint8Array {
    let pos = 2;
    while (pos + 4 <= jpeg.length) {
        if (jpeg[pos] !== 0xff) {
            break;
        }
        const marker = jpeg[pos + 1];
        const length = (jpeg[pos + 2] << 8) | jpeg[pos + 3];
        if (marker === 0xe1 && latin1(jpeg.subarray(pos + 4, pos + 10)) === "Exif\0\0") {
            return jpeg.subarray(pos + 10, pos + 2 + length);
        }
        pos += 2 + length;
    }
    throw new Error("未找到 Exif APP1 段");
}

interface TiffEntryView {
    tag: number;
    type: number;
    count: number;
    value: number;
}

function readTiffIfd(tiff: Uint8Array, offset: number, littleEndian = false): TiffEntryView[] {
    const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
    const count = view.getUint16(offset, littleEndian);
    return Array.from({ length: count }, (_, i) => {
        const e = offset + 2 + i * 12;
        return {
            tag: view.getUint16(e, littleEndian),
            type: view.getUint16(e + 2, littleEndian),
            count: view.getUint32(e + 4, littleEndian),
            value: view.getUint32(e + 8, littleEndian)
        };
    });
}

/** 从 TIFF 头部定位 Exif IFD 并返回其条目（大端 fixture） */
function readExifIfdEntries(tiff: Uint8Array): TiffEntryView[] {
    const ifd0 = readTiffIfd(tiff, 8);
    const pointer = ifd0.find((entry) => entry.tag === 0x8769);
    assert.ok(pointer, "IFD0 应包含 Exif IFD 指针");
    return readTiffIfd(tiff, pointer.value);
}

test("readAppleContentIdentifier 读取真机样本布局的已有 UUID", () => {
    const jpeg = buildTestJpeg({ exif: "apple-makernote", uuid: "7735da4d-1cc6-406c-a293-c86462d09ade" });
    assert.equal(readAppleContentIdentifier(jpeg), "7735DA4D-1CC6-406C-A293-C86462D09ADE", "应读取并归一为大写");
});

test("readAppleContentIdentifier 无 EXIF 或无 Apple MakerNote 时返回 null", () => {
    assert.equal(readAppleContentIdentifier(buildTestJpeg({ exif: "none" })), null);
    assert.equal(readAppleContentIdentifier(buildTestJpeg({ exif: "plain" })), null);
    assert.equal(readAppleContentIdentifier(buildTestJpeg({ exif: "other-makernote" })), null);
    assert.equal(readAppleContentIdentifier(buildTestJpeg({ exif: "corrupt" })), null);
});

test("injectAppleContentIdentifier 复刻真机布局时零位移原位改写", () => {
    const jpeg = buildTestJpeg({ exif: "apple-makernote", uuid: UUID_B });
    const injected = injectAppleContentIdentifier(jpeg, UUID_A);

    assert.equal(injected.length, jpeg.length, "同长度 MakerNote 应原位覆写，总长不变");
    const tiff = extractTiff(injected);
    assert.equal(tiff.length, extractTiff(jpeg).length, "TIFF 长度不变");
    const exifIfdEntries = readExifIfdEntries(tiff);
    const makerEntry = exifIfdEntries.find((entry) => entry.tag === 0x927c)!;
    assert.equal(makerEntry.count, 69, "MakerNote 长度不变");
    const maker = tiff.subarray(makerEntry.value, makerEntry.value + 69);
    const makerView = new DataView(maker.buffer, maker.byteOffset, maker.byteLength);
    assert.equal(latin1(maker.subarray(0, 10)), "Apple iOS\0");
    assert.equal(latin1(maker.subarray(12, 14)), "MM", "字节序标记保留");
    assert.equal(makerView.getUint16(14, false), 1, "MakerIFD 条目数仍为 1");
    assert.equal(makerView.getUint16(16, false), 0x0011, "仍为 ContentIdentifier 条目");
    assert.equal(makerView.getUint16(18, false), 2, "type 仍为 ASCII");
    assert.equal(makerView.getUint32(20, false), 37, "count 仍为 37");
    assert.equal(makerView.getUint32(24, false), 32, "值偏移仍为 32（MakerNote 起点为基）");
    assert.equal(latin1(maker.subarray(32, 69)), UUID_A + "\0", "UUID 已原位替换");
    // 其他条目不受影响
    const lensEntry = exifIfdEntries.find((entry) => entry.tag === 0xa434)!;
    assert.equal(latin1(tiff.subarray(lensEntry.value, lensEntry.value + 3)), "abc");
    assert.equal(readAppleContentIdentifier(injected), UUID_A);
});

test("injectAppleContentIdentifier 在无 MakerNote 的 EXIF 中插入完整 Apple MakerNote", () => {
    const jpeg = buildTestJpeg({ exif: "plain" });
    const beforeLens = readExifIfdEntries(extractTiff(jpeg)).find((entry) => entry.tag === 0xa434)!.value;
    const injected = injectAppleContentIdentifier(jpeg, UUID_A);

    assert.ok(injected.length > jpeg.length, "应增长条目与 MakerNote 数据");
    const tiff = extractTiff(injected);
    const exifIfdEntries = readExifIfdEntries(tiff);
    assert.deepEqual(exifIfdEntries.map((entry) => entry.tag), [0x9000, 0x927c, 0xa434], "MakerNote 按 tag 序插入");
    const makerEntry = exifIfdEntries.find((entry) => entry.tag === 0x927c)!;
    assert.equal(makerEntry.type, 7);
    const maker = tiff.subarray(makerEntry.value, makerEntry.value + makerEntry.count);
    assert.equal(latin1(maker.subarray(0, 10)), "Apple iOS\0");
    assert.equal(latin1(maker.subarray(12, 14)), "MM", "新块字节序随父 TIFF（大端）");
    assert.equal(latin1(maker.subarray(makerEntry.count - 37, makerEntry.count)), UUID_A + "\0");
    // 条目表增长 12 字节：其余指向表后数据的偏移同步平移
    const lensEntry = exifIfdEntries.find((entry) => entry.tag === 0xa434)!;
    assert.equal(lensEntry.value, beforeLens + 12, "LensModel 偏移应 +12");
    assert.equal(latin1(tiff.subarray(lensEntry.value, lensEntry.value + 3)), "abc");
    assert.equal(readAppleContentIdentifier(injected), UUID_A, "注入后应可读回");
});

test("injectAppleContentIdentifier 替换非 Apple MakerNote 并保留其余数据", () => {
    const jpeg = buildTestJpeg({ exif: "other-makernote" });
    const beforeLens = readExifIfdEntries(extractTiff(jpeg)).find((entry) => entry.tag === 0xa434)!.value;
    const injected = injectAppleContentIdentifier(jpeg, UUID_A);

    assert.equal(readAppleContentIdentifier(injected), UUID_A, "应替换为含 ContentIdentifier 的 Apple MakerNote");
    const tiff = extractTiff(injected);
    const entries = readExifIfdEntries(tiff);
    const lensEntry = entries.find((entry) => entry.tag === 0xa434)!;
    assert.equal(lensEntry.value, beforeLens, "表长不变，其余条目偏移不动");
    assert.equal(latin1(tiff.subarray(lensEntry.value, lensEntry.value + 3)), "abc");
    const makerEntry = entries.find((entry) => entry.tag === 0x927c)!;
    const maker = tiff.subarray(makerEntry.value, makerEntry.value + makerEntry.count);
    assert.equal(latin1(maker.subarray(0, 10)), "Apple iOS\0");
});

test("injectAppleContentIdentifier 无 EXIF / EXIF 损坏时静默返回原数据", () => {
    for (const kind of ["none", "corrupt"] as const) {
        const jpeg = buildTestJpeg({ exif: kind });
        assert.deepEqual([...injectAppleContentIdentifier(jpeg, UUID_A)], [...jpeg], `${kind} 应回退原数据`);
    }
});

// ---------------------------------------------------------------------------
// pairAppleLivePhoto 成对注入
// ---------------------------------------------------------------------------

test("pairAppleLivePhoto 两侧携带同一 UUID 且优先复用 jpg 已有值", () => {
    const { movie } = buildTestMovie();
    const jpegWithId = buildTestJpeg({ exif: "apple-makernote", uuid: "aabbccdd-1122-3344-5566-778899aabbcc" });
    const pair = pairAppleLivePhoto(jpegWithId, movie);
    assert.equal(pair.uuid, "AABBCCDD-1122-3344-5566-778899AABBCC", "应复用 jpg 既有 UUID 并大写");
    assert.equal(pair.jpegPaired, true);
    assert.equal(pair.videoPaired, true);
    assert.equal(readAppleContentIdentifier(pair.jpeg), pair.uuid);
    const { children } = findMetaInfo(pair.video);
    const items = readIlstItems(pair.video, children);
    const identifier = items.find((item) => item.dataFlags === 1)!;
    assert.equal(latin1(identifier.value), pair.uuid, "mov 侧应写入同一 UUID");
});

test("pairAppleLivePhoto 无既有 UUID 时现场生成并两侧一致", () => {
    const { movie } = buildTestMovie();
    const bareJpeg = buildTestJpeg({ exif: "none" });
    const pair = pairAppleLivePhoto(bareJpeg, movie);
    assert.match(pair.uuid, /^[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}$/);
    assert.equal(pair.jpegPaired, false, "无 EXIF 的 jpg 侧静默放弃");
    assert.equal(pair.videoPaired, true);
    // 生成的 UUID 仍注入 mov，导入侧至少视频带标记
    const { children } = findMetaInfo(pair.video);
    const items = readIlstItems(pair.video, children);
    assert.equal(latin1(items.find((item) => item.dataFlags === 1)!.value), pair.uuid);
});
