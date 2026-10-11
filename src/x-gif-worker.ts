import * as gifenc from "gifenc";
import type { GifColor } from "gifenc";
import { getChangedFrame, encodeGifFrame } from "./x-gif-frame.ts";
import type { GifFrame } from "./x-gif-frame.ts";

// gifenc 的 CJS 入口把 API 挂在 default 上，运行时按真值选择来源；类型层恒真（TS2774），故条件断言为 unknown。
const { quantize, applyPalette } = (gifenc.quantize as unknown) ? gifenc : gifenc.default;
let captureCanvas: OffscreenCanvas | null = null;

/** 量化任务结果：256 色色表与逐像素索引。 */
export type GifPrepareResult = { palette: GifColor[]; index: Uint8Array };

/** 主线程发往 Worker 的任务；量化任务（process）不带 command 字段。 */
export type GifJobData =
    | { command: "capture"; bitmap: ImageBitmap; width: number; height: number }
    | { command: "compare"; index: Uint8Array; palette: GifColor[]; width: number; height: number; previousPixels: Uint32Array | null }
    | { command: "encode"; frame: GifFrame; first: boolean }
    | { pixels: ImageData["data"]; command?: undefined };

/**
 * Worker 各命令的返回结果。字段按命令互斥出现，这里用全可选字段的
 * 宽松形态表达消息回包的动态结构；具体命令的精确类型由调用方声明。
 */
export interface GifJobResult {
    pixels?: ImageData["data"] | Uint32Array;
    frame?: GifFrame | null;
    bytes?: Uint8Array;
    palette?: GifColor[];
    index?: Uint8Array;
}

export function prepareGifFrame(pixels: ImageData["data"]): GifPrepareResult {
    const palette = quantize(pixels, 256);
    return { palette, index: applyPalette(pixels, palette) };
}

export function runGifJob(data: GifJobData): GifJobResult {
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

/** DedicatedWorkerGlobalScope 的最小结构（本仓库 tsconfig 未启用 WebWorker lib）。 */
interface GifWorkerScope {
    onmessage: ((event: MessageEvent<GifJobData & { id: number }>) => void) | null;
    postMessage(message: unknown, transfer?: Transferable[]): void;
}

if (typeof self !== "undefined" && !self.document) {
    const scope = self as unknown as GifWorkerScope;
    scope.onmessage = ({ data }) => {
        const { id } = data;
        try {
            const result = runGifJob(data);
            const transfer = data.command === "capture" ? [result.pixels!.buffer as ArrayBuffer] : data.command === "compare"
                ? [result.pixels!.buffer as ArrayBuffer, ...(result.frame ? [result.frame.index.buffer as ArrayBuffer] : [])]
                : [(result.bytes || result.index)!.buffer as ArrayBuffer];
            scope.postMessage({ id, ...result }, transfer);
        } catch (error) {
            scope.postMessage({ id, error: (error as Error).message });
        }
    };
}
