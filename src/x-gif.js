import * as gifenc from "gifenc";

// Node 使用此包的 CommonJS 入口，浏览器构建使用 ESM 入口。
const { GIFEncoder, quantize, applyPalette } = gifenc.GIFEncoder ? gifenc : gifenc.default;

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

function getChangedFrame(index, palette, width, height, previousPixels) {
    const colors = palette.map(([r, g, b]) => r | g << 8 | b << 16);
    const pixels = Uint32Array.from(index, (color) => colors[color]);
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;
    const usedColors = new Uint8Array(256);
    for (let i = 0; i < pixels.length; i++) {
        if (!previousPixels || pixels[i] !== previousPixels[i]) {
            const x = i % width;
            const y = Math.floor(i / width);
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
            usedColors[index[i]] = 1;
        }
    }
    if (right < 0) {
        return { pixels, frame: null };
    }

    // 仅借用变化像素未使用的颜色索引作透明色，保留所有实际颜色。
    const transparentIndex = previousPixels ? usedColors.indexOf(0) : -1;
    if (transparentIndex === palette.length) {
        palette.push([0, 0, 0]);
    }
    const frameWidth = right - left + 1;
    const frameHeight = bottom - top + 1;
    const cropped = new Uint8Array(frameWidth * frameHeight);
    for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
            const source = (top + y) * width + left + x;
            cropped[y * frameWidth + x] = transparentIndex >= 0 && pixels[source] === previousPixels[source]
                ? transparentIndex : index[source];
        }
    }
    return {
        pixels,
        frame: { index: cropped, palette, width: frameWidth, height: frameHeight, left, top, transparentIndex }
    };
}

function writeGifFrame(gif, frame) {
    const start = gif.bytesView().length;
    gif.writeFrame(frame.index, frame.width, frame.height, {
        palette: frame.palette,
        delay: frame.delay,
        repeat: 0,
        colorDepth: Math.max(2, Math.ceil(Math.log2(frame.palette.length))),
        dispose: 1,
        transparent: frame.transparentIndex >= 0,
        transparentIndex: frame.transparentIndex
    });
    if (start > 0) {
        // gifenc 未提供帧坐标选项；GIF89a 的 8 字节 GCE 后紧接图像描述符。
        if (gif.bytesView()[start + 8] !== 0x2c) {
            throw new Error("GIF 编码器的帧结构不兼容");
        }
        const view = new DataView(gif.buffer);
        view.setUint16(start + 9, frame.left, true);
        view.setUint16(start + 11, frame.top, true);
    }
}

export async function convertXVideoToGif(blob, windowRef) {
    const video = windowRef.document.createElement("video");
    const sourceUrl = windowRef.URL.createObjectURL(blob);
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

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

        const gif = GIFEncoder();
        // shortcut: 按 20 FPS 采样，若需要保留更高帧率则改用逐帧解码。
        const frameDelay = 50;
        const durationMs = Math.max(10, Math.round(video.duration * 100) * 10);
        const frameCount = Math.ceil(durationMs / frameDelay);
        let previousPixels = null;
        let pendingFrame = null;
        for (let frame = 0; frame < frameCount; frame++) {
            const time = frame * frameDelay / 1000;
            if (video.currentTime !== time) {
                await waitForVideo(video, "seeked", () => {
                    video.currentTime = time;
                });
            }
            context.drawImage(video, 0, 0, width, height);
            const { data } = context.getImageData(0, 0, width, height);
            const palette = quantize(data, 256);
            const changed = getChangedFrame(applyPalette(data, palette), palette, width, height, previousPixels);
            const delay = Math.min(frameDelay, durationMs - frame * frameDelay);
            previousPixels = changed.pixels;
            if (!changed.frame) {
                // GIF 延迟字段为 16 位，长时间静止时拆分，避免溢出加速播放。
                if (pendingFrame.delay + delay > 655350) {
                    writeGifFrame(gif, pendingFrame);
                    pendingFrame.delay = 0;
                }
                pendingFrame.delay += delay;
                continue;
            }
            if (pendingFrame) {
                writeGifFrame(gif, pendingFrame);
            }
            pendingFrame = { ...changed.frame, delay };
        }
        writeGifFrame(gif, pendingFrame);
        gif.finish();
        return new Blob([gif.bytesView()], { type: "image/gif" });
    } finally {
        video.pause();
        video.removeAttribute("src");
        video.load();
        windowRef.URL.revokeObjectURL(sourceUrl);
    }
}
