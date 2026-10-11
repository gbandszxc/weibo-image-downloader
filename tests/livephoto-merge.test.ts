import test from "node:test";
import assert from "node:assert/strict";

import { buildMotionPhoto, findJpegXmpInsertPoint } from "../src/livephoto.ts";

const XMP_SEGMENT_ID = "http://ns.adobe.com/xap/1.0/\0";

function ascii(text: string): Uint8Array {
    return Uint8Array.from(text, (ch) => ch.charCodeAt(0));
}

function u16(value: number): Uint8Array {
    return Uint8Array.from([value & 0xff, (value >> 8) & 0xff]);
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
function buildTestJpeg(): { jpeg: Uint8Array; exifEnd: number } {
    const soi = new Uint8Array([0xff, 0xd8]);
    const jfif = segment(0xe0, ascii("JFIF\0" + "\x01\x02\x00\x00\x01\x00\x01\x00\x00"));
    const exif = segment(0xe1, ascii("Exif\0\0" + "MM\x00*\x00\x00\x00\x08\x00\x01\x01\x12\x00\x03"));
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
    return { jpeg, exifEnd: soi.length + jfif.length + exif.length };
}

/** 最小 ISO-BMFF 视频：ftyp box + free box */
function buildTestVideo(): Uint8Array {
    const ftyp = new Uint8Array(24);
    ftyp.set(u16(0).slice(0, 2), 0);
    ftyp.set(ascii("\x00\x00"), 2);
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

test("findJpegXmpInsertPoint inserts after the last APP1 and reports existing XMP", () => {
    const { jpeg, exifEnd } = buildTestJpeg();
    const point = findJpegXmpInsertPoint(jpeg);
    assert.equal(point.insertOffset, exifEnd, "应插在 Exif APP1 之后");
    assert.equal(point.existingXmp, null);
});

test("findJpegXmpInsertPoint falls back to SOI when no APP segments exist", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]);
    const point = findJpegXmpInsertPoint(jpeg);
    assert.equal(point.insertOffset, 2);
    assert.equal(point.existingXmp, null);
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

test("buildMotionPhoto merges JPEG and video into a Samsung-compatible Motion Photo", () => {
    const { jpeg, exifEnd } = buildTestJpeg();
    const video = buildTestVideo();
    const fieldHeadSize = 24;
    const sefTailSize = 32;

    const merged = buildMotionPhoto(jpeg, video);

    // 总长 = JPEG + XMP APP1 + 字段头 24 + 视频 + SEF 尾 32
    const primaryLength = merged.length - fieldHeadSize - sefTailSize - video.length;
    assert.ok(primaryLength > jpeg.length);
    assert.equal(latin1(merged.subarray(merged.length - 4)), "SEFT", "文件末尾必须是 SEFT");

    // XMP APP1 插在 Exif 之后
    assert.equal(merged[exifEnd], 0xff);
    assert.equal(merged[exifEnd + 1], 0xe1);
    const xmpSegmentLength = (merged[exifEnd + 2] << 8) | merged[exifEnd + 3];
    const xmpText = latin1(merged.subarray(exifEnd + 4, exifEnd + 2 + xmpSegmentLength));
    assert.ok(xmpText.startsWith(XMP_SEGMENT_ID));
    const primaryEnd = exifEnd + 2 + xmpSegmentLength;
    // 原 JPEG 其余字节原样保留（DQT/SOS/EOI 紧随新 APP1）
    assert.deepEqual(
        Array.from(merged.subarray(primaryEnd, primaryEnd + (jpeg.length - exifEnd))),
        Array.from(jpeg.subarray(exifEnd))
    );

    // 字段头 + 视频 + SEF 尾（紧跟原 JPEG 尾部之后）
    const jpegTailEnd = primaryEnd + (jpeg.length - exifEnd);
    const videoOffset = jpegTailEnd + fieldHeadSize;
    assert.equal(latin1(merged.subarray(jpegTailEnd, jpegTailEnd + 4)), "\x00\x00\x30\x0A");
    assert.equal(latin1(merged.subarray(jpegTailEnd + 8, jpegTailEnd + 24)), "MotionPhoto_Data");
    assert.deepEqual(Array.from(merged.subarray(videoOffset, videoOffset + video.length)), Array.from(video), "视频字节应原样内嵌");

    // SEFH/SEFT 索引块（小端）
    const sefhAt = videoOffset + video.length;
    const view = new DataView(merged.buffer, merged.byteOffset + sefhAt);
    assert.equal(latin1(merged.subarray(sefhAt, sefhAt + 4)), "SEFH");
    assert.equal(view.getUint32(4, true), 106);
    assert.equal(view.getUint32(8, true), 1);
    assert.equal(latin1(merged.subarray(sefhAt + 12, sefhAt + 16)), "\x00\x00\x30\x0A");
    assert.equal(view.getUint32(16, true), fieldHeadSize + video.length, "字段索引负偏移应指向字段头");
    assert.equal(view.getUint32(20, true), fieldHeadSize + video.length, "字段总长应等于字段头+视频");
    assert.equal(view.getUint32(24, true), 24, "sef_data_size 应为 24");

    // XMP 数值：偏移从文件尾回退（V + 32）
    assert.match(xmpText, new RegExp(`GCamera:MicroVideoOffset="${video.length + sefTailSize}"`));
    assert.match(xmpText, new RegExp(`Item:Length="${video.length + sefTailSize}"`));
    assert.match(xmpText, /GCamera:MotionPhoto="1"/);
    assert.match(xmpText, /GCamera:MotionPhotoVersion="1"/);
    assert.match(xmpText, /GCamera:MotionPhotoPresentationTimestampUs="1500000"/);
    assert.match(xmpText, /GCamera:MicroVideoPresentationTimestampUs="1500000"/);
    assert.match(xmpText, /Item:Mime="video\/mp4"/);
    assert.match(xmpText, /Item:Semantic="MotionPhoto"/);
    assert.match(xmpText, /Item:Semantic="Primary"/);
    assert.match(xmpText, /OpCamera:MotionPhotoOwner="oplus"/);
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
