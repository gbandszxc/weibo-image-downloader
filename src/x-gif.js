import { getChangedFrame, encodeGifFrame } from "./x-gif-frame.js";
import { prepareGifFrame } from "./x-gif-worker.js";
import { acquireGifWorkers, yieldForGifUi } from "./x-gif-workers.js";

const workerSource = typeof __X_GIF_WORKER_SOURCE__ === "string" ? __X_GIF_WORKER_SOURCE__ : "";

function waitForVideo(video, eventName, action) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => finish(new Error("视频解码超时")), 30000);
        function finish(error) {
            clearTimeout(timer);
            video.removeEventListener(eventName, onReady);
            video.removeEventListener("error", onError);
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        }
        function onReady() {
            finish();
        }
        function onError() {
            finish(new Error("浏览器无法解码此 GIF 视频源"));
        }
        video.addEventListener(eventName, onReady);
        video.addEventListener("error", onError);
        try {
            action();
        } catch (error) {
            finish(error);
        }
    });
}

export async function convertXVideoToGif(blob, windowRef) {
    const video = windowRef.document.createElement("video");
    const sourceUrl = windowRef.URL.createObjectURL(blob);
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    let workers = null;

    try {
        await waitForVideo(video, "loadeddata", () => {
            video.src = sourceUrl;
            video.load();
        });
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!Number.isFinite(video.duration) || video.duration <= 0 ||
            !width || !height || width > 65535 || height > 65535) {
            throw new Error("GIF 视频源的时长或尺寸无效");
        }

        const canvas = windowRef.document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
            throw new Error("浏览器不支持 Canvas 2D");
        }

        const encodedParts = [];
        const encoding = [];
        let firstFrame = true;
        // shortcut: 按 20 FPS 采样，若需要保留更高帧率则改用逐帧解码。
        const frameDelay = 50;
        const durationMs = Math.max(10, Math.round(video.duration * 100) * 10);
        const frameCount = Math.ceil(durationMs / frameDelay);
        workers = acquireGifWorkers(windowRef, workerSource);
        const captureInWorker = workers && typeof windowRef.createImageBitmap === "function" &&
            typeof windowRef.OffscreenCanvas === "function";
        const queuedFrames = [];
        let previousRaw = null;
        let previousPixels = null;
        let pendingFrame = null;

        async function writeFrame(frame) {
            if (!workers) await yieldForGifUi(windowRef);
            const result = workers ? workers.encode(frame, firstFrame) : Promise.resolve({ bytes: encodeGifFrame(frame, firstFrame) });
            firstFrame = false;
            result.catch(() => {});
            encoding.push(result);
            if (encoding.length > 2) encodedParts.push((await encoding.shift()).bytes);
        }

        async function consumeFrame() {
            const { result, delay } = queuedFrames.shift();
            const { index, palette } = await result;
            if (!workers) await yieldForGifUi(windowRef);
            const changed = workers
                ? await workers.compare(index, palette, width, height, previousPixels)
                : getChangedFrame(index, palette, width, height, previousPixels);
            previousPixels = changed.pixels;
            if (changed.frame) {
                if (pendingFrame) await writeFrame(pendingFrame);
                pendingFrame = { ...changed.frame, delay: 0 };
            }
            let remaining = delay;
            // GIF 延迟字段为 16 位，长时间静止时拆分，避免溢出加速播放。
            while (pendingFrame.delay + remaining > 655350) {
                remaining -= 655350 - pendingFrame.delay;
                pendingFrame.delay = 655350;
                await writeFrame(pendingFrame);
                pendingFrame.delay = 0;
            }
            pendingFrame.delay += remaining;
        }

        for (let frame = 0; frame < frameCount; frame++) {
            const time = frame * frameDelay / 1000;
            if (video.currentTime !== time) {
                await waitForVideo(video, "seeked", () => {
                    video.currentTime = time;
                });
            }
            const readFrame = () => {
                context.drawImage(video, 0, 0, width, height);
                return context.getImageData(0, 0, width, height).data;
            };
            let data;
            if (captureInWorker) {
                ({ pixels: data } = await workers.capture(video, width, height, readFrame));
            } else {
                // 大帧绘制与像素读取分开执行，让浏览器先处理输入和页面绘制。
                await yieldForGifUi(windowRef);
                context.drawImage(video, 0, 0, width, height);
                await yieldForGifUi(windowRef);
                data = context.getImageData(0, 0, width, height).data;
            }
            const delay = Math.min(frameDelay, durationMs - frame * frameDelay);
            const raw = new Uint32Array(data.buffer, data.byteOffset, data.byteLength / 4);
            let identical = !!previousRaw;
            if (identical) {
                for (let i = 0; i < raw.length; i++) {
                    if (raw[i] !== previousRaw[i]) { identical = false; break; }
                }
            }
            if (identical) {
                queuedFrames[queuedFrames.length - 1].delay += delay;
                continue;
            }

            // 转移像素缓冲区前保留一份，用于重复帧比较和 Worker 失败回退。
            const backup = workers ? data.slice() : data;
            previousRaw = new Uint32Array(backup.buffer, backup.byteOffset, backup.byteLength / 4);
            if (!workers) await yieldForGifUi(windowRef);
            const result = workers ? workers.process(data, backup) : Promise.resolve(prepareGifFrame(data));
            result.catch(() => {}); // 后续按序 await；解码中途失败时也不产生未处理拒绝。
            queuedFrames.push({ result, delay });
            // 保留最新帧累加重复帧时长，最多三个在途帧，避免缓存整段视频。
            if (queuedFrames.length > (workers ? 2 : 1)) {
                await consumeFrame();
            }
        }
        while (queuedFrames.length) await consumeFrame();
        await writeFrame(pendingFrame);
        while (encoding.length) encodedParts.push((await encoding.shift()).bytes);
        return new Blob([...encodedParts, new Uint8Array([0x3b])], { type: "image/gif" });
    } finally {
        workers?.release();
        video.pause();
        video.removeAttribute("src");
        video.load();
        windowRef.URL.revokeObjectURL(sourceUrl);
    }
}
