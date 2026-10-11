import * as gifenc from "gifenc";
import { getChangedFrame, encodeGifFrame } from "./x-gif-frame.js";

const { quantize, applyPalette } = gifenc.quantize ? gifenc : gifenc.default;
let captureCanvas = null;

export function prepareGifFrame(pixels) {
    const palette = quantize(pixels, 256);
    return { palette, index: applyPalette(pixels, palette) };
}

export function runGifJob(data) {
    if (data.command === "capture") {
        try {
            if (!captureCanvas || captureCanvas.width !== data.width || captureCanvas.height !== data.height) {
                captureCanvas = new OffscreenCanvas(data.width, data.height);
            }
            const context = captureCanvas.getContext("2d", { willReadFrequently: true });
            if (!context) throw new Error("Worker 不支持 Canvas 2D");
            context.drawImage(data.bitmap, 0, 0, data.width, data.height);
            return { pixels: context.getImageData(0, 0, data.width, data.height).data };
        } finally {
            data.bitmap.close();
        }
    }
    if (data.command === "compare") {
        return getChangedFrame(data.index, data.palette, data.width, data.height, data.previousPixels);
    }
    if (data.command === "encode") {
        return { bytes: encodeGifFrame(data.frame, data.first) };
    }
    return prepareGifFrame(data.pixels);
}

if (typeof self !== "undefined" && !self.document) {
    self.onmessage = ({ data }) => {
        const { id } = data;
        try {
            const result = runGifJob(data);
            const transfer = data.command === "capture" ? [result.pixels.buffer] : data.command === "compare"
                ? [result.pixels.buffer, ...(result.frame ? [result.frame.index.buffer] : [])]
                : [(result.bytes || result.index).buffer];
            self.postMessage({ id, ...result }, transfer);
        } catch (error) {
            self.postMessage({ id, error: error.message });
        }
    };
}
