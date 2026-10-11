import test from "node:test";
import assert from "node:assert/strict";

import { buildMotionPhoto, findJpegXmpInsertPoint, injectExifUserComment, patchVideoContainerBrand } from "../src/livephoto.ts";

const STILL_TS = 1500000;
const XMP_SEGMENT_ID = "http://ns.adobe.com/xap/1.0/\0";

function ascii(text: string): Uint8Array {
    return Uint8Array.from(text, (ch) => ch.charCodeAt(0));
}

function u16be(value: number): Uint8Array {
    return Uint8Array.from([value & 0xff, (value >> 8) & 0xff]);
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

function segment(marker: number, payload: Uint8Array): Uint8Array {
    const seg = new Uint8Array(4 + payload.length);
    seg[0] = 0xff;
    seg[1] = marker;
    const length = payload.length + 2;
    seg[2] = (length >> 8) & 0xff;
    seg[3] = length & 0xff;
    seg.set(payload, 4);
    return seg;
}

/** 最小可用 JPEG：SOI + APP0(JFIF) + APP1(Exif) + DQT + SOS + 压缩数据 + EOI */
function buildTestExifPayload(): Uint8Array {
    // 大端 TIFF：IFD0(Orientation 内联 + ExifIFD 指针@38) + ExifIFD@38(ExifVersion 内联)
    const tiff = new Uint8Array(56);
    const view = new DataView(tiff.buffer);
    tiff.set(ascii("MM"), 0);
    view.setUint16(2, 42, false);
    view.setUint32(4, 8, false);
    view.setUint16(8, 2, false);
    view.setUint16(10, 0x0112, false); // Orientation
    view.setUint16(12, 3, false);
    view.setUint32(14, 1, false);
    view.setUint16(18, 1, false);
    view.setUint16(20, 0, false);
    view.setUint16(22, 0x8769, false); // ExifIFD 指针
    view.setUint16(24, 4, false);
    view.setUint32(26, 1, false);
    view.setUint32(30, 38, false);
    view.setUint32(34, 0, false);
    view.setUint16(38, 1, false);
    view.setUint16(40, 0x9000, false); // ExifVersion（内联）
    view.setUint16(42, 7, false);
    view.setUint32(44, 4, false);
    tiff.set(ascii("0232"), 48);
    view.setUint32(52, 0, false);
    return concatBytes(ascii("Exif\0\0"), tiff);
}

function buildTestJpeg(): { jpeg: Uint8Array; exifStart: number; exifEnd: number } {
    const soi = new Uint8Array([0xff, 0xd8]);
    const jfif = segment(0xe0, ascii("JFIF\0" + "\x01\x02\x00\x00\x01\x00\x01\x00\x00"));
    const exif = segment(0xe1, buildTestExifPayload());
    const dqt = segment(0xdb, new Uint8Array(64).fill(0x11));
    const sos = segment(0xda, ascii("\x00\x01\x01\x00\x00\x3f\x00"));
    const scan = ascii("compressed-data-here");
    const eoi = new Uint8Array([0xff, 0xd9]);
    const jpeg = new Uint8Array(soi.length + jfif.length + exif.length + dqt.length + sos.length + scan.length + eoi.length);
    let offset = 0;
    for (const part of [soi, jfif, exif, dqt, sos, scan, eoi]) {
        jpeg.set(part, offset);
        offset += part.length;
    }
    return { jpeg, exifStart: soi.length + jfif.length, exifEnd: soi.length + jfif.length + exif.length };
}

/** 最小 ISO-BMFF 视频：QuickTime brand 的 ftyp box + free box */
function buildTestVideo(): Uint8Array {
    const ftyp = new Uint8Array(20);
    ftyp.set(ascii("ftyp"), 4);
    ftyp.set(ascii("qt  "), 8);
    const free = new Uint8Array(8);
    free.set(ascii("free"), 4);
    return new Uint8Array([...ftyp, ...free]);
}

function latin1(bytes: Uint8Array): string {
    let text = "";
    for (const byte of bytes) {
        text += String.fromCharCode(byte);
    }
    return text;
}

/** 在合并产物中定位 XMP APP1 段起点（EXIF 注入会使段变长，不能沿用旧偏移） */
function findXmpSegmentOffset(bytes: Uint8Array): number {
    const id = ascii(XMP_SEGMENT_ID);
    for (let i = 4; i < bytes.length - id.length; i++) {
        if (bytes[i - 4] === 0xff && bytes[i - 3] === 0xe1 && id.every((byte, k) => bytes[i + k] === byte)) {
            return i - 4;
        }
    }
    throw new Error("未找到 XMP APP1 段");
}

test("findJpegXmpInsertPoint inserts after the last APP1 and reports existing XMP/EXIF", () => {
    const { jpeg, exifStart, exifEnd } = buildTestJpeg();
    const point = findJpegXmpInsertPoint(jpeg);
    assert.equal(point.insertOffset, exifEnd, "应插在 Exif APP1 之后");
    assert.equal(point.existingXmp, null);
    assert.deepEqual(point.existingExif, { start: exifStart, end: exifEnd });
});

test("findJpegXmpInsertPoint falls back to SOI when no APP segments exist", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]);
    const point = findJpegXmpInsertPoint(jpeg);
    assert.equal(point.insertOffset, 2);
    assert.equal(point.existingXmp, null);
    assert.equal(point.existingExif, null);
});

test("findJpegXmpInsertPoint replaces an existing plain XMP segment", () => {
    const { jpeg, exifEnd } = buildTestJpeg();
    const plainXmp = segment(0xe1, ascii(XMP_SEGMENT_ID + "<x:xmpmeta></x:xmpmeta>"));
    const withXmp = new Uint8Array(jpeg.length + plainXmp.length);
    withXmp.set(jpeg.subarray(0, exifEnd), 0);
    withXmp.set(plainXmp, exifEnd);
    withXmp.set(jpeg.subarray(exifEnd), exifEnd + plainXmp.length);

    const point = findJpegXmpInsertPoint(withXmp);
    assert.equal(point.insertOffset, exifEnd + plainXmp.length);
    assert.deepEqual(point.existingXmp, { start: exifEnd, end: exifEnd + plainXmp.length });
});

test("findJpegXmpInsertPoint rejects photos that already contain Motion Photo metadata", () => {
    const { jpeg, exifEnd } = buildTestJpeg();
    const motionXmp = segment(0xe1, ascii(XMP_SEGMENT_ID + '<x:xmpmeta><rdf:Description GCamera:MotionPhoto="1"/>'));
    const merged = new Uint8Array(jpeg.length + motionXmp.length);
    merged.set(jpeg.subarray(0, exifEnd), 0);
    merged.set(motionXmp, exifEnd);
    merged.set(jpeg.subarray(exifEnd), exifEnd + motionXmp.length);

    assert.throws(() => findJpegXmpInsertPoint(merged), /已包含 Motion Photo/);
});

test("findJpegXmpInsertPoint rejects non-JPEG input", () => {
    assert.throws(() => findJpegXmpInsertPoint(ascii("GIF89a")), /JPEG/);
});

test("patchVideoContainerBrand rewrites QuickTime brands to MP4 in place", () => {
    const video = buildTestVideo();
    const patched = patchVideoContainerBrand(video);
    assert.equal(patched.length, video.length, "补丁必须等长");
    assert.equal(latin1(patched.subarray(8, 12)), "isom");
    assert.equal(latin1(patched.subarray(16, 20)), "mp41");
    // 原输入不被修改
    assert.equal(latin1(video.subarray(8, 12)), "qt  ");
});

test("patchVideoContainerBrand leaves MP4 videos untouched", () => {
    const video = new Uint8Array(20);
    video.set(ascii("ftyp"), 4);
    video.set(ascii("isom"), 8);
    video.set(ascii("mp41"), 16);
    const patched = patchVideoContainerBrand(video);
    assert.equal(latin1(patched.subarray(8, 12)), "isom");
    assert.equal(latin1(patched.subarray(16, 20)), "mp41");
});

// ---------------------------------------------------------------------------
// EXIF UserComment 注入
// ---------------------------------------------------------------------------

interface TiffEntry {
    tag: number;
    type: number;
    count: number;
    value: number;
}

function readIfdEntries(tiff: Uint8Array, offset: number): { entries: TiffEntry[]; next: number } {
    const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
    const littleEndian = tiff[0] === 0x49;
    const count = view.getUint16(offset, littleEndian);
    const entries: TiffEntry[] = [];
    for (let i = 0; i < count; i++) {
        const e = offset + 2 + i * 12;
        entries.push({
            tag: view.getUint16(e, littleEndian),
            type: view.getUint16(e + 2, littleEndian),
            count: view.getUint32(e + 4, littleEndian),
            value: view.getUint32(e + 8, littleEndian)
        });
    }
    return { entries, next: view.getUint32(offset + 2 + count * 12, littleEndian) };
}

/**
 * 合成 II 小端 EXIF APP1 段，布局（TIFF 内偏移）：
 *   头 8 | IFD0 表 30（Make@38 数据 6 + ExifIFD 指针） | ExifIFD 表 42（ExifVersion 内联 + MakerNote@86 数据 10 + LensModel@96 数据 3）
 *   TIFF 总长 99。
 */
function buildSyntheticExifSegment(): Uint8Array {
    const makerNote = ascii("MakerNote!");
    const lensModel = ascii("abc");
    const make = ascii("Apple\0");
    const ifd0Offset = 8;
    const ifd0DataOffset = ifd0Offset + 30;
    const exifIfdOffset = ifd0DataOffset + make.length;
    const exifDataOffset = exifIfdOffset + 42;
    const tiff = new Uint8Array(exifDataOffset + makerNote.length + lensModel.length);
    const view = new DataView(tiff.buffer);
    tiff.set(ascii("II"), 0);
    view.setUint16(2, 42, true);
    view.setUint32(4, ifd0Offset, true);
    view.setUint16(ifd0Offset, 2, true);
    view.setUint16(ifd0Offset + 2, 0x010f, true); // Make
    view.setUint16(ifd0Offset + 4, 2, true);
    view.setUint32(ifd0Offset + 6, make.length, true);
    view.setUint32(ifd0Offset + 10, ifd0DataOffset, true);
    view.setUint16(ifd0Offset + 14, 0x8769, true); // ExifIFD 指针
    view.setUint16(ifd0Offset + 16, 4, true);
    view.setUint32(ifd0Offset + 18, 1, true);
    view.setUint32(ifd0Offset + 22, exifIfdOffset, true);
    view.setUint32(ifd0Offset + 26, 0, true);
    tiff.set(make, ifd0DataOffset);
    view.setUint16(exifIfdOffset, 3, true);
    view.setUint16(exifIfdOffset + 2, 0x9000, true); // ExifVersion（内联值）
    view.setUint16(exifIfdOffset + 4, 7, true);
    view.setUint32(exifIfdOffset + 6, 4, true);
    tiff.set(ascii("0232"), exifIfdOffset + 8);
    view.setUint16(exifIfdOffset + 14, 0x927c, true); // MakerNote
    view.setUint16(exifIfdOffset + 16, 7, true);
    view.setUint32(exifIfdOffset + 18, makerNote.length, true);
    view.setUint32(exifIfdOffset + 22, exifDataOffset, true);
    view.setUint16(exifIfdOffset + 26, 0xa434, true); // LensModel
    view.setUint16(exifIfdOffset + 28, 2, true);
    view.setUint32(exifIfdOffset + 30, lensModel.length, true);
    view.setUint32(exifIfdOffset + 34, exifDataOffset + makerNote.length, true);
    view.setUint32(exifIfdOffset + 38, 0, true);
    tiff.set(makerNote, exifDataOffset);
    tiff.set(lensModel, exifDataOffset + makerNote.length);

    return concatBytes(new Uint8Array([0xff, 0xe1]), u16be(2 + 6 + tiff.length), ascii("Exif\0\0"), tiff);
}

test("injectExifUserComment inserts a sorted UserComment and shifts trailing offsets", () => {
    const exifSegment = buildSyntheticExifSegment();
    const { jpeg } = buildTestJpeg();
    const exifStart = 20;
    const withExif = concatBytes(
        jpeg.subarray(0, exifStart),
        exifSegment,
        jpeg.subarray(exifStart + exifSegment.length)
    );

    const patched = injectExifUserComment(withExif, { start: exifStart, end: exifStart + exifSegment.length });
    assert.ok(patched.length > withExif.length, "应增长一个条目与 UserComment 数据");

    // 新 TIFF 长度 = 99 + 12（条目表增长）+ 22（UserComment 值）
    const newTiffLength = 133;
    const patchedExif = patched.subarray(exifStart + 10, exifStart + 10 + newTiffLength);
    assert.equal(readIfdEntries(patchedExif, 8).entries.length, 2, "IFD0 条目数不变");
    const ifd0 = readIfdEntries(patchedExif, 8);
    const makeEntry = ifd0.entries.find((entry) => entry.tag === 0x010f)!;
    assert.equal(makeEntry.value, 38, "表前数据偏移不变");
    assert.equal(latin1(patchedExif.subarray(makeEntry.value, makeEntry.value + 6)), "Apple\0", "原 IFD0 数据不受影响");
    const exifPointer = ifd0.entries.find((entry) => entry.tag === 0x8769)!;
    assert.equal(exifPointer.value, 44, "ExifIFD 位置不变");
    const exifIfd = readIfdEntries(patchedExif, exifPointer.value);
    assert.equal(exifIfd.entries.length, 4, "应多一个 UserComment 条目");
    assert.deepEqual(exifIfd.entries.map((entry) => entry.tag), [0x9000, 0x927c, 0x9286, 0xa434], "UserComment 应按 tag 序插入");
    const makerNote = exifIfd.entries.find((entry) => entry.tag === 0x927c)!;
    assert.equal(makerNote.value, 98, "表后数据偏移应 +12");
    assert.equal(latin1(patchedExif.subarray(makerNote.value, makerNote.value + 10)), "MakerNote!", "MakerNote 内容不变");
    const lensModel = exifIfd.entries.find((entry) => entry.tag === 0xa434)!;
    assert.equal(lensModel.value, 108, "LensModel 偏移应 +12");
    assert.equal(latin1(patchedExif.subarray(lensModel.value, lensModel.value + 3)), "abc");
    const userComment = exifIfd.entries.find((entry) => entry.tag === 0x9286)!;
    assert.equal(userComment.type, 7);
    assert.equal(userComment.count, 22);
    assert.equal(
        latin1(patchedExif.subarray(userComment.value, userComment.value + userComment.count)),
        "ASCII\0\0\0oplus_11534336",
        "应包含 OPPO 识别标记"
    );
});

// ---------------------------------------------------------------------------
// buildMotionPhoto 整体布局
// ---------------------------------------------------------------------------

test("buildMotionPhoto produces an OPPO-compatible single-file Motion Photo", () => {
    const { jpeg, exifEnd } = buildTestJpeg();
    const video = buildTestVideo();

    const merged = buildMotionPhoto(jpeg, video);

    // 布局：[JPEG 头部段][XMP][MPF][JPEG 尾部（DQT/SOS/EOI）][视频]；视频结束于 EOF
    const videoLength = video.length;
    const videoOffset = merged.length - videoLength;
    assert.equal(latin1(merged.subarray(videoOffset + 4, videoOffset + 8)), "ftyp");
    assert.equal(latin1(merged.subarray(videoOffset + 8, videoOffset + 12)), "isom", "QuickTime brand 应被补丁为 isom");
    assert.equal(latin1(merged.subarray(videoOffset + 16, videoOffset + 20)), "mp41");
    assert.deepEqual(Array.from(merged.subarray(videoOffset + 20)), Array.from(video.subarray(20)), "视频其余字节原样内嵌");
    // EOI 紧邻视频起点
    assert.equal(merged[videoOffset - 2], 0xff);
    assert.equal(merged[videoOffset - 1], 0xd9);
    // MPF 段紧随 XMP 之后（总长 74：FF E2 + 长度 + "MPF\0" + TIFF + 3 条目 + MPEntry）
    const mpfLength = 74;
    const xmpOffset = findXmpSegmentOffset(merged);
    const xmpSegmentLength = (merged[xmpOffset + 2] << 8) | merged[xmpOffset + 3];
    const mpfStart = xmpOffset + 2 + xmpSegmentLength;
    assert.equal(latin1(merged.subarray(mpfStart + 4, mpfStart + 8)), "MPF\0");
    const mpfView = new DataView(merged.buffer, merged.byteOffset + mpfStart);
    assert.equal(mpfView.getUint16(16, false), 3, "MPF 应有 3 个条目");
    assert.equal(mpfView.getUint32(38, false), 1, "NumberOfImages = 1");
    assert.equal(mpfView.getUint32(62, false), videoOffset, "MPEntry size 应为 JPEG 部分总长（至视频起点）");
    // JPEG 尾部（DQT/SOS/EOI）原样保留在 MPF 之后
    assert.deepEqual(
        Array.from(merged.subarray(mpfStart + mpfLength, mpfStart + mpfLength + (jpeg.length - exifEnd))),
        Array.from(jpeg.subarray(exifEnd))
    );

    // XMP 长度字段全部等于视频精确字节数
    const xmpSegmentLength2 = (merged[xmpOffset + 2] << 8) | merged[xmpOffset + 3];
    const xmpText = latin1(merged.subarray(xmpOffset + 4, xmpOffset + 2 + xmpSegmentLength2));
    assert.ok(xmpText.startsWith(XMP_SEGMENT_ID));
    assert.match(xmpText, new RegExp(`OpCamera:VideoLength="${videoLength}"`));
    assert.match(xmpText, new RegExp(`Item:Semantic="MotionPhoto"\\s+Item:Length="${videoLength}"`));
    assert.match(xmpText, /GCamera:MotionPhoto="1"/);
    assert.match(xmpText, /GCamera:MotionPhotoVersion="1"/);
    assert.match(xmpText, new RegExp(`GCamera:MotionPhotoPresentationTimestampUs="${STILL_TS}"`));
    assert.match(xmpText, /OpCamera:MotionPhotoOwner="oplus"/);
    assert.match(xmpText, new RegExp(`OpCamera:VideoLength="${videoLength}"`));
    assert.ok(!xmpText.includes("MicroVideo"), "ColorOS 16 真机不写 MicroVideo 旧字段");
    assert.ok(!xmpText.includes("xpacket"), "真机 XMP 无 xpacket 包裹");
    assert.match(xmpText, /Item:Mime="video\/mp4"/);
    // 合并产物应带 OPPO EXIF 识别标记
    const headText = latin1(merged.subarray(0, mpfStart));
    assert.ok(headText.includes("oplus_11534336"), "EXIF 应注入 Oplus UserComment");
});

test("buildMotionPhoto replaces existing XMP instead of appending a second APP1", () => {
    const { jpeg, exifEnd } = buildTestJpeg();
    const plainXmp = segment(0xe1, ascii(XMP_SEGMENT_ID + "<x:xmpmeta></x:xmpmeta>"));
    const withXmp = new Uint8Array(jpeg.length + plainXmp.length);
    withXmp.set(jpeg.subarray(0, exifEnd), 0);
    withXmp.set(plainXmp, exifEnd);
    withXmp.set(jpeg.subarray(exifEnd), exifEnd + plainXmp.length);

    const merged = buildMotionPhoto(withXmp, buildTestVideo());
    const text = latin1(merged.subarray(0, merged.length));
    assert.equal(text.split(XMP_SEGMENT_ID).length - 1, 1, "只应存在一个 XMP APP1 段");
    assert.ok(!text.includes("<x:xmpmeta></x:xmpmeta>"), "旧 XMP 应被整段替换");
});

test("buildMotionPhoto adds a minimal EXIF when the photo has none", () => {
    const bareJpeg = concatBytes(
        new Uint8Array([0xff, 0xd8]),
        segment(0xe0, ascii("JFIF\0\x01\x02\x00\x00\x01\x00\x01\x00\x00")),
        segment(0xdb, new Uint8Array(16).fill(0x22)),
        segment(0xda, ascii("\x00\x01\x01\x00\x00\x3f\x00")),
        ascii("scan"),
        new Uint8Array([0xff, 0xd9])
    );
    const merged = buildMotionPhoto(bareJpeg, buildTestVideo());
    const headText = latin1(merged.subarray(0, merged.length - 28));
    assert.ok(headText.includes("Exif\0\0"), "应构造最小 EXIF 段");
    assert.ok(headText.includes("oplus_11534336"), "最小 EXIF 应包含 OPPO 标记");
});

test("buildMotionPhoto rejects videos without an ISO-BMFF ftyp box", () => {
    const { jpeg } = buildTestJpeg();
    assert.throws(() => buildMotionPhoto(jpeg, ascii("not-a-video")), /ISO-BMFF/);
});

test("buildMotionPhoto rejects photos that are already Motion Photos", () => {
    const { jpeg, exifEnd } = buildTestJpeg();
    const motionXmp = segment(0xe1, ascii(XMP_SEGMENT_ID + 'GCamera:MicroVideo="1"'));
    const merged = new Uint8Array(jpeg.length + motionXmp.length);
    merged.set(jpeg.subarray(0, exifEnd), 0);
    merged.set(motionXmp, exifEnd);
    merged.set(jpeg.subarray(exifEnd), exifEnd + motionXmp.length);

    assert.throws(() => buildMotionPhoto(merged, buildTestVideo()), /已包含 Motion Photo/);
});
