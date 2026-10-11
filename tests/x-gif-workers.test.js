import test from "node:test";
import assert from "node:assert/strict";
import { Worker as NodeWorker } from "node:worker_threads";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { GifReader } from "omggif";
import { buildGifWorker, gifWorkerPlugin } from "../scripts/gif-worker.mjs";
import { acquireGifWorkers } from "../src/x-gif-workers.js";
import { convertXVideoToGif } from "../src/x-gif.js";
import { createGifVideoMock } from "./helpers/gif-video-mock.js";

const workerSource = (await buildGifWorker()).outputFiles[0].text;
const converterSource = (await build({
    entryPoints: ["src/x-gif.js"], bundle: true, format: "iife", globalName: "gifTest",
    platform: "browser", target: "es2020", write: false, plugins: [gifWorkerPlugin()]
})).outputFiles[0].text;
const context = { Blob, setTimeout, clearTimeout, Uint8Array, Uint8ClampedArray, Uint32Array };
runInNewContext(converterSource, context);

function workerEnvironment({ cores = 8, fail = null, reverseFirstPair = false } = {}) {
    const workers = [];
    const replies = [];
    const revoked = [];
    const terminations = [];
    const commands = new Map();
    let urls = 0;
    let failureSent = false;
    let firstReply = null;
    let secondReplied = false;
    class BrowserWorker {
        constructor() {
            if (fail === "constructor") throw new Error("CSP blocked");
            this.thread = new NodeWorker(`
                const { parentPort } = require("node:worker_threads");
                globalThis.self = { postMessage: (data, transfer) => parentPort.postMessage(data, transfer) };
                ${workerSource}
                parentPort.on("message", (data) => self.onmessage({ data }));
            `, { eval: true });
            workers.push(this);
            this.thread.on("message", (data) => {
                const deliver = () => {
                    replies.push(data.id);
                    if (!failureSent && (fail === "runtime" || (fail === "encode" && commands.get(data.id) === "encode"))) {
                        failureSent = true;
                        this.onerror?.({ preventDefault() {} });
                    } else {
                        this.onmessage?.({ data });
                    }
                };
                // 首帧等待第二帧返回，确定性验证媒体帧序，不依赖线程启动速度。
                if (reverseFirstPair && data.id === 0 && !secondReplied) {
                    firstReply = deliver;
                } else {
                    deliver();
                    if (data.id === 1) { secondReplied = true; firstReply?.(); }
                }
            });
            this.thread.on("error", () => this.onerror?.({ preventDefault() {} }));
        }
        postMessage(data, transfer) {
            commands.set(data.id, data.command || "quantize");
            this.thread.postMessage(data, transfer);
        }
        terminate() {
            terminations.push(this.thread.terminate());
        }
    }
    return {
        workers, replies, revoked, terminations, commands,
        windowRef: {
            Worker: BrowserWorker,
            navigator: { hardwareConcurrency: cores },
            URL: {
                createObjectURL: () => `blob:worker-${++urls}`,
                revokeObjectURL: (url) => revoked.push(url)
            }
        }
    };
}

test("real worker replies may arrive out of order while GIF pixels and timing stay correct", async (t) => {
    const red = new Uint8Array([255, 0, 0, 255, 0, 0, 0, 255]);
    const green = new Uint8Array([0, 255, 0, 255, 0, 0, 0, 255]);
    const blue = new Uint8Array([0, 0, 255, 255, 0, 0, 0, 255]);
    const frames = [red, red, green, blue, blue, red];
    const options = { frames, duration: 0.3 };
    const expected = await convertXVideoToGif(new Blob(["fallback"]), createGifVideoMock(options).windowRef);
    const env = workerEnvironment({ reverseFirstPair: true });
    t.after(async () => { env.workers.forEach((worker) => worker.terminate()); await Promise.all(env.terminations); });
    const mock = createGifVideoMock(options);
    Object.assign(mock.windowRef, { Worker: env.windowRef.Worker, navigator: env.windowRef.navigator });
    const originalURL = mock.windowRef.URL;
    mock.windowRef.URL = {
        createObjectURL: (blob) => blob.type === "text/javascript"
            ? env.windowRef.URL.createObjectURL(blob) : originalURL.createObjectURL(blob),
        revokeObjectURL: (url) => url.startsWith("blob:worker-")
            ? env.windowRef.URL.revokeObjectURL(url) : originalURL.revokeObjectURL(url)
    };
    const gif = await context.gifTest.convertXVideoToGif(new Blob(["workers"]), mock.windowRef);
    const bytes = new Uint8Array(await gif.arrayBuffer());
    assert.deepEqual(bytes, new Uint8Array(await expected.arrayBuffer()));
    const reader = new GifReader(bytes);
    assert.equal(reader.numFrames(), 4);
    assert.deepEqual([0, 1, 2, 3].map((i) => reader.frameInfo(i).delay), [10, 5, 10, 5]);
    const composed = new Uint8Array(red.length);
    for (const [i, expectedPixels] of [red, green, blue, red].entries()) {
        reader.decodeAndBlitFrameRGBA(i, composed);
        assert.deepEqual(composed, expectedPixels);
    }
    assert.ok(env.replies.indexOf(1) < env.replies.indexOf(0));
    assert.equal(env.workers.length, 2);
    assert.ok([...env.commands.values()].includes("compare"));
    assert.ok([...env.commands.values()].includes("encode"));
    assert.equal(env.terminations.length, 2);
    assert.equal(env.revoked.length, 1);
    assert.deepEqual(mock.revokedUrls, ["blob:gif-source"]);
});

test("concurrent users share at most two workers, transfer ownership, and release the pool", async (t) => {
    const env = workerEnvironment();
    t.after(async () => { env.workers.forEach((worker) => worker.terminate()); await Promise.all(env.terminations); });
    const first = acquireGifWorkers(env.windowRef, workerSource);
    const second = acquireGifWorkers(env.windowRef, workerSource);
    const pixels = new Uint8ClampedArray([255, 0, 0, 255]);
    const backup = pixels.slice();
    const jobs = [first.process(pixels, backup)];
    assert.equal(pixels.byteLength, 0);
    assert.equal(backup.byteLength, 4);
    for (let i = 0; i < 4; i++) jobs.push(second.process(backup.slice(), backup));
    const frames = await Promise.all(jobs);
    assert.equal(env.workers.length, 2);
    frames.forEach(({ index, palette }) => assert.deepEqual(palette[index[0]], [255, 0, 0]));
    first.release();
    assert.equal(env.terminations.length, 0);
    second.release();
    assert.equal(env.terminations.length, 2);
});

test("decoder failure with a frame in flight releases workers and the video source", async (t) => {
    const env = workerEnvironment();
    t.after(async () => { env.workers.forEach((worker) => worker.terminate()); await Promise.all(env.terminations); });
    const mock = createGifVideoMock({ failOn: "seek" });
    Object.assign(mock.windowRef, env.windowRef);
    await assert.rejects(context.gifTest.convertXVideoToGif(new Blob(["broken"]), mock.windowRef), /无法解码/);
    assert.equal(env.workers.length, 2);
    assert.equal(env.terminations.length, 2);
    assert.deepEqual(env.revoked, ["blob:worker-2", "blob:worker-1"]);
    assert.equal(mock.cleanup.paused, true);
    assert.equal(mock.cleanup.sourceRemoved, true);
});

test("worker failure after transfer falls back without losing pixels or leaving resources", async (t) => {
    const env = workerEnvironment({ fail: "runtime" });
    t.after(async () => { env.workers.forEach((worker) => worker.terminate()); await Promise.all(env.terminations); });
    const pool = acquireGifWorkers(env.windowRef, workerSource);
    const pixels = new Uint8ClampedArray([0, 255, 0, 255]);
    const jobs = Array.from({ length: 4 }, () => pool.process(pixels.slice(), pixels));
    for (const { index, palette } of await Promise.all(jobs)) {
        assert.deepEqual(palette[index[0]], [0, 255, 0]);
    }
    pool.release();
    assert.ok(env.terminations.length >= 2);
    assert.equal(env.revoked.length, 1);
});

test("low-core devices use one worker and blocked or absent workers retain fallback", async (t) => {
    const env = workerEnvironment({ cores: 2 });
    t.after(async () => { env.workers.forEach((worker) => worker.terminate()); await Promise.all(env.terminations); });
    const pool = acquireGifWorkers(env.windowRef, workerSource);
    const pixels = new Uint8ClampedArray([0, 0, 255, 255]);
    const { index, palette } = await pool.process(pixels.slice(), pixels);
    assert.deepEqual(palette[index[0]], [0, 0, 255]);
    assert.equal(env.workers.length, 1);
    pool.release();
    const blocked = workerEnvironment({ fail: "constructor" });
    assert.equal(acquireGifWorkers(blocked.windowRef, workerSource), null);
    assert.equal(blocked.revoked.length, 1);
    assert.equal(acquireGifWorkers({}, workerSource), null);
});

test("stalled workers time out and recover transferred pixels", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let terminated = 0;
    const windowRef = {
        navigator: { hardwareConcurrency: 2 },
        URL: { createObjectURL: () => "blob:stalled", revokeObjectURL() {} },
        Worker: class {
            postMessage(data, transfer) { structuredClone(data, { transfer }); }
            terminate() { terminated++; }
        }
    };
    const pool = acquireGifWorkers(windowRef, workerSource);
    const pixels = new Uint8ClampedArray([255, 0, 0, 255]);
    const result = pool.process(pixels.slice(), pixels);
    t.mock.timers.tick(15000);
    const { index, palette } = await result;
    assert.deepEqual(palette[index[0]], [255, 0, 0]);
    assert.equal(terminated, 1);
    pool.release();
});

test("independent encoded chunks retain canvas coordinates and queued frame timing", async (t) => {
    const env = workerEnvironment();
    t.after(async () => { env.workers.forEach((worker) => worker.terminate()); await Promise.all(env.terminations); });
    const pool = acquireGifWorkers(env.windowRef, workerSource);
    const palette = [[255, 0, 0], [0, 255, 0]];
    const first = { index: new Uint8Array([0, 0]), palette, width: 2, height: 1, left: 0, top: 0, transparentIndex: -1, delay: 50 };
    const second = { ...first, index: new Uint8Array([1]), width: 1, left: 1, delay: 60 };
    const last = { ...second, index: new Uint8Array([0]), delay: 70 };
    const jobs = [pool.encode(first, true), pool.encode(second, false), pool.encode(last, false)];
    last.delay = 10;
    const chunks = await Promise.all(jobs);
    const gif = new Blob([...chunks.map((chunk) => chunk.bytes), new Uint8Array([0x3b])]);
    const reader = new GifReader(new Uint8Array(await gif.arrayBuffer()));
    assert.equal(reader.width, 2);
    assert.equal(reader.height, 1);
    assert.equal(reader.loopCount(), 0);
    assert.deepEqual([0, 1, 2].map((i) => reader.frameInfo(i).delay), [5, 6, 7]);
    const pixels = new Uint8Array(8);
    for (let i = 0; i < 3; i++) {
        reader.decodeAndBlitFrameRGBA(i, pixels);
        assert.deepEqual([...pixels], i === 1 ? [255, 0, 0, 255, 0, 255, 0, 255] : [255, 0, 0, 255, 255, 0, 0, 255]);
    }
    pool.release();
});

test("an encoding worker failure preserves GIF pixels and timing through fallback", async (t) => {
    const env = workerEnvironment({ fail: "encode" });
    t.after(async () => { env.workers.forEach((worker) => worker.terminate()); await Promise.all(env.terminations); });
    const mock = createGifVideoMock({ duration: 0.12 });
    Object.assign(mock.windowRef, env.windowRef);
    const gif = await context.gifTest.convertXVideoToGif(new Blob(["fallback"]), mock.windowRef);
    const reader = new GifReader(new Uint8Array(await gif.arrayBuffer()));
    assert.equal(reader.numFrames(), 2);
    assert.deepEqual([0, 1].map((i) => reader.frameInfo(i).delay), [5, 7]);
    const pixels = new Uint8Array(8);
    reader.decodeAndBlitFrameRGBA(0, pixels);
    assert.deepEqual([...pixels], [255, 0, 0, 255, 0, 0, 0, 255]);
    reader.decodeAndBlitFrameRGBA(1, pixels);
    assert.deepEqual([...pixels], [0, 0, 0, 255, 0, 255, 0, 255]);
    assert.equal(env.terminations.length, 2);
    assert.equal(mock.cleanup.sourceRemoved, true);
});

test("failed bitmap capture recovers from the held video frame and closes the bitmap", async () => {
    const mock = createGifVideoMock({ duration: 0.12 });
    let closed = 0;
    let terminated = 0;
    Object.assign(mock.windowRef, {
        navigator: { hardwareConcurrency: 2 },
        OffscreenCanvas: class {},
        createImageBitmap: async () => ({ close() { closed++; } }),
        Worker: class {
            postMessage() { queueMicrotask(() => this.onerror({ preventDefault() {} })); }
            terminate() { terminated++; }
        }
    });
    const gif = await context.gifTest.convertXVideoToGif(new Blob(["capture-fallback"]), mock.windowRef);
    const reader = new GifReader(new Uint8Array(await gif.arrayBuffer()));
    assert.deepEqual([0, 1].map((i) => reader.frameInfo(i).delay), [5, 7]);
    const pixels = new Uint8Array(8);
    reader.decodeAndBlitFrameRGBA(0, pixels);
    assert.deepEqual([...pixels], [255, 0, 0, 255, 0, 0, 0, 255]);
    reader.decodeAndBlitFrameRGBA(1, pixels);
    assert.deepEqual([...pixels], [0, 0, 0, 255, 0, 255, 0, 255]);
    assert.equal(closed, 1);
    assert.equal(terminated, 1);
    assert.equal(mock.cleanup.sourceRemoved, true);
});
