import test from "node:test";
import assert from "node:assert/strict";
import { convertXVideoToGif } from "../src/x-gif.js";
import { createGifVideoMock } from "./helpers/gif-video-mock.js";
import { GifReader } from "omggif";

// 按 GIF89a 块结构读取帧延迟，独立校验编码产物而非仅校验文件扩展名。
function readFrameDelays(bytes) {
    let offset = 13 + (bytes[10] & 128 ? 3 * (2 ** ((bytes[10] & 7) + 1)) : 0);
    const delays = [];
    function skipBlocks() {
        while (bytes[offset]) {
            offset += bytes[offset] + 1;
        }
        offset++;
    }
    while (bytes[offset] !== 0x3b && offset < bytes.length) {
        const block = bytes[offset++];
        if (block === 0x21) {
            const label = bytes[offset++];
            if (label === 0xf9) {
                delays.push((bytes[offset + 2] | bytes[offset + 3] << 8) * 10);
            }
            skipBlocks();
        } else {
            assert.equal(block, 0x2c);
            const packed = bytes[offset + 8];
            offset += 9 + (packed & 128 ? 3 * (2 ** ((packed & 7) + 1)) : 0);
            offset++; // LZW 最小码宽
            skipBlocks();
        }
    }
    assert.equal(offset, bytes.length - 1);
    return delays;
}

test("video conversion produces looping GIF89a frames at original dimensions and duration", async () => {
    const mock = createGifVideoMock();
    const blob = await convertXVideoToGif(new Blob(["mock-mp4"]), mock.windowRef);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    assert.equal(blob.type, "image/gif");
    assert.equal(new TextDecoder().decode(bytes.subarray(0, 6)), "GIF89a");
    assert.deepEqual(Array.from(bytes.subarray(6, 10)), [2, 0, 1, 0]);
    assert.equal(bytes.at(-1), 0x3b);
    const loopOffset = Buffer.from(bytes).indexOf("NETSCAPE2.0") + 11;
    assert.deepEqual(Array.from(bytes.subarray(loopOffset, loopOffset + 5)), [3, 1, 0, 0, 0]);
    assert.deepEqual(readFrameDelays(bytes), [50, 70]);
    assert.deepEqual(mock.drawnTimes, [0, 0.05, 0.1]);
    assert.deepEqual(mock.seeks, [0.05, 0.1]);
    assert.deepEqual(mock.cleanup, { loadCalls: 2, paused: true, sourceRemoved: true });
    assert.deepEqual(mock.revokedUrls, ["blob:gif-source"]);
});

test("cropped and transparent delta frames preserve pixels, including restored background", async () => {
    const width = 4;
    const height = 3;
    const original = new Uint8Array(width * height * 4).fill(255);
    const changed = original.slice();
    changed.set([255, 0, 0, 255], 0);
    changed.set([0, 0, 255, 255], (width * height - 1) * 4);
    const center = original.slice();
    center.set([0, 255, 0, 255], (width + 1) * 4);
    const frames = [original, changed, original, center];
    const mock = createGifVideoMock({ width, height, frames, duration: 0.2 });
    const gif = await convertXVideoToGif(new Blob(["delta"]), mock.windowRef);
    const reader = new GifReader(new Uint8Array(await gif.arrayBuffer()));
    assert.equal(reader.width, width);
    assert.equal(reader.height, height);
    assert.equal(reader.numFrames(), 4);
    const composed = new Uint8Array(original.length);
    for (let frame = 0; frame < frames.length; frame++) {
        reader.decodeAndBlitFrameRGBA(frame, composed);
        assert.deepEqual(composed, frames[frame]);
        assert.equal(reader.frameInfo(frame).disposal, 1);
        assert.equal(reader.frameInfo(frame).delay, 5);
    }
    assert.notEqual(reader.frameInfo(1).transparent_index, null);
    const cropped = reader.frameInfo(3);
    assert.deepEqual([cropped.x, cropped.y, cropped.width, cropped.height], [1, 1, 1, 1]);
});

test("fully static frames merge their duration without becoming transparent", async () => {
    const pixels = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]);
    const mock = createGifVideoMock({ frames: [pixels], duration: 0.2 });
    const gif = await convertXVideoToGif(new Blob(["static"]), mock.windowRef);
    const reader = new GifReader(new Uint8Array(await gif.arrayBuffer()));
    assert.equal(reader.numFrames(), 1);
    assert.equal(reader.frameInfo(0).delay, 20);
    assert.equal(reader.frameInfo(0).transparent_index, null);
    const decoded = new Uint8Array(pixels.length);
    reader.decodeAndBlitFrameRGBA(0, decoded);
    assert.deepEqual(decoded, pixels);
});

test("frames using all 256 colors retain every color without reserving transparency", async () => {
    const first = new Uint8Array(16 * 16 * 4).fill(255);
    const colors = new Uint8Array(first.length);
    for (let i = 0; i < 256; i++) {
        colors.set([(i & 7) * 32, ((i >> 3) & 3) * 64, (i >> 5) * 32, 255], i * 4);
    }
    const mock = createGifVideoMock({ width: 16, height: 16, frames: [first, colors], duration: 0.1 });
    const gif = await convertXVideoToGif(new Blob(["256-colors"]), mock.windowRef);
    const reader = new GifReader(new Uint8Array(await gif.arrayBuffer()));
    assert.equal(reader.frameInfo(1).transparent_index, null);
    const decoded = new Uint8Array(colors.length);
    reader.decodeAndBlitFrameRGBA(0, decoded);
    reader.decodeAndBlitFrameRGBA(1, decoded);
    assert.deepEqual(decoded, colors);
});

test("invalid video metadata and decoder errors reject and release the source", async () => {
    for (const options of [{ duration: Infinity }, { duration: 0 }, { failOn: "load" }, { failOn: "seek" }]) {
        const mock = createGifVideoMock(options);
        await assert.rejects(convertXVideoToGif(new Blob(["invalid"]), mock.windowRef));
        assert.equal(mock.cleanup.paused, true);
        assert.equal(mock.cleanup.sourceRemoved, true);
        assert.deepEqual(mock.revokedUrls, ["blob:gif-source"]);
    }
});

test("very short videos retain a valid minimum GIF frame delay", async () => {
    const mock = createGifVideoMock({ duration: 0.003 });
    const gif = await convertXVideoToGif(new Blob(["short"]), mock.windowRef);
    assert.deepEqual(readFrameDelays(new Uint8Array(await gif.arrayBuffer())), [10]);
});

test("stalled decoding times out and releases the source", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const mock = createGifVideoMock();
    mock.video.load = () => {};
    const rejection = assert.rejects(
        convertXVideoToGif(new Blob(["stalled"]), mock.windowRef),
        /视频解码超时/
    );
    t.mock.timers.tick(30000);
    await rejection;
    assert.deepEqual(mock.revokedUrls, ["blob:gif-source"]);
    assert.equal(mock.cleanup.sourceRemoved, true);
});
