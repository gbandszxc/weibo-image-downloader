import { runGifJob } from "./x-gif-worker.ts";
import type { GifJobData, GifPrepareResult } from "./x-gif-worker.ts";
import type { GifChangedFrame, GifFrame } from "./x-gif-frame.ts";
import type { GifColor } from "gifenc";

/** GIF 转换用到的 window 结构子集，允许传入裁剪过的伪 window（如测试环境）。 */
export interface GifWindowLike {
    document: Document;
    URL: typeof URL;
    navigator?: { hardwareConcurrency?: number };
    Worker?: new (scriptUrl: string | URL) => Worker;
    createImageBitmap?: (image: CanvasImageSource) => Promise<ImageBitmap>;
    OffscreenCanvas?: typeof OffscreenCanvas;
    scheduler?: { yield?: () => Promise<unknown> };
    setTimeout?: (callback: (value: unknown) => void, delay?: number) => unknown;
}

/** acquireGifWorkers 返回的 Worker 池句柄，各方法与 runGifJob 的命令一一对应。 */
export interface AcquiredGifWorkers {
    capture(video: HTMLVideoElement, width: number, height: number, readFrame: () => ImageData["data"]): Promise<{ pixels: ImageData["data"] }>;
    process(pixels: ImageData["data"], backup: ImageData["data"]): Promise<GifPrepareResult>;
    compare(index: Uint8Array, palette: GifColor[], width: number, height: number, previousPixels: Uint32Array | null): Promise<GifChangedFrame>;
    encode(frame: GifFrame, first: boolean): Promise<{ bytes: Uint8Array }>;
    release(): void;
}

interface GifPool {
    users: number;
    readonly disabled: boolean;
    request<T>(data: GifJobData, transfer?: Transferable[], backup?: GifJobData, runFallback?: (() => T) | null): Promise<T>;
    stop(): void;
}

interface GifPoolJob {
    id: number;
    data: GifJobData;
    transfer: Transferable[];
    backup: GifJobData;
    runFallback: (() => unknown) | null;
    /** 方法语法保持参数双变，以容纳 request<T> 传来的具体 resolve 回调。 */
    resolve(value: unknown): void;
    reject(reason?: unknown): void;
    timer?: ReturnType<typeof setTimeout>;
}

interface GifSlot {
    worker: Worker;
    job: GifPoolJob | null;
}

/** Worker 回包的动态结构：成功时按命令携带对应字段，失败时带 error 文本。 */
interface GifWorkerResponse {
    id?: number;
    error?: string;
    pixels?: ImageData["data"] | Uint32Array;
    frame?: GifFrame | null;
    bytes?: Uint8Array;
    palette?: GifColor[];
    index?: Uint8Array;
}

const pools = new WeakMap<object, GifPool>();

export async function yieldForGifUi(windowRef: GifWindowLike): Promise<void> {
    if (windowRef.scheduler?.yield) await windowRef.scheduler.yield();
    else if (windowRef.setTimeout) await new Promise((resolve) => windowRef.setTimeout!(resolve, 0));
}

function isByteArray(value: unknown): value is Uint8Array | Uint8ClampedArray {
    // ArrayBufferView 收窄类型不含 BYTES_PER_ELEMENT，这里断言为字节视图仅作类型层访问。
    return ArrayBuffer.isView(value) && (value as Uint8Array).BYTES_PER_ELEMENT === 1;
}

function isPalette(value: unknown): value is GifColor[] {
    return Array.isArray(value) && value.length > 0 && value.length <= 256 &&
        value.every((color) => Array.isArray(color) && color.length === 3 &&
            color.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255));
}

function isValidResult(job: GifJobData, data: GifWorkerResponse) {
    if (job.command === "capture") {
        return isByteArray(data.pixels) && data.pixels.length === job.width * job.height * 4;
    }
    if (job.command === "encode") {
        return isByteArray(data.bytes) && data.bytes.length > 8 && data.bytes[0] === (job.first ? 0x47 : 0x21);
    }
    if (job.command === "compare") {
        const frame = data.frame;
        return ArrayBuffer.isView(data.pixels) && data.pixels.BYTES_PER_ELEMENT === 4 &&
            data.pixels.length === job.width * job.height && (frame === null ||
                (frame && [frame.left, frame.top, frame.width, frame.height].every(Number.isInteger) &&
                    frame.left >= 0 && frame.top >= 0 && frame.width > 0 && frame.height > 0 &&
                    frame.left + frame.width <= job.width && frame.top + frame.height <= job.height &&
                    isByteArray(frame.index) && frame.index.length === frame.width * frame.height && isPalette(frame.palette) &&
                    Number.isInteger(frame.transparentIndex) && frame.transparentIndex >= -1 && frame.transparentIndex < frame.palette.length));
    }
    return isPalette(data.palette) && isByteArray(data.index) && data.index.length === job.pixels.length / 4;
}

function createPool(windowRef: GifWindowLike, source: string): GifPool | null {
    const slots: GifSlot[] = [];
    const queue: GifPoolJob[] = [];
    let disabled = false;
    let nextId = 0;

    async function fallback(job: GifPoolJob): Promise<void> {
        clearTimeout(job.timer);
        try {
            await yieldForGifUi(windowRef);
            job.resolve(job.runFallback ? await job.runFallback() : runGifJob(job.backup));
        } catch (error) {
            job.reject(error);
        }
    }

    function stop() {
        if (disabled) return;
        disabled = true;
        const pending = queue.splice(0);
        for (const slot of slots) {
            slot.worker.terminate();
            if (slot.job) pending.push(slot.job);
            slot.job = null;
        }
        pending.forEach(fallback);
    }

    function dispatch() {
        for (const slot of slots) {
            if (disabled || slot.job || !queue.length) continue;
            const job = queue.shift()!;
            slot.job = job;
            job.timer = setTimeout(stop, 15000);
            try {
                slot.worker.postMessage({ id: job.id, ...job.data }, job.transfer);
            } catch {
                stop();
            }
        }
    }

    let url: string | undefined;
    try {
        url = windowRef.URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
        const count = Math.min(2, Math.max(1, (windowRef.navigator?.hardwareConcurrency || 2) - 1));
        for (let i = 0; i < count; i++) {
            const worker = new windowRef.Worker!(url);
            const slot: GifSlot = { worker, job: null };
            slots.push(slot);
            worker.onmessage = ({ data }: MessageEvent<GifWorkerResponse>) => {
                const job = slot.job;
                if (!job || disabled) return;
                if (data?.id !== job.id || data.error || !isValidResult(job.backup, data)) {
                    stop();
                    return;
                }
                clearTimeout(job.timer);
                slot.job = null;
                job.resolve(data);
                dispatch();
            };
            worker.onerror = (event) => { event.preventDefault?.(); stop(); };
            worker.onmessageerror = stop;
        }
    } catch {
        stop();
        return null;
    } finally {
        if (url) windowRef.URL.revokeObjectURL(url);
    }

    return {
        users: 0,
        get disabled() { return disabled; },
        request<T>(data: GifJobData, transfer: Transferable[] = [], backup: GifJobData = data, runFallback: (() => T) | null = null) {
            return new Promise<T>((resolve, reject) => {
                const job: GifPoolJob = { id: nextId++, data, transfer, backup, runFallback, resolve, reject };
                if (disabled) fallback(job);
                else { queue.push(job); dispatch(); }
            });
        },
        stop
    };
}

export function acquireGifWorkers(windowRef: GifWindowLike, source: string): AcquiredGifWorkers | null {
    if (!source || typeof windowRef.Worker !== "function") return null;
    let pool: GifPool | null | undefined = pools.get(windowRef);
    if (!pool) {
        pool = createPool(windowRef, source);
        if (!pool) return null;
        pools.set(windowRef, pool);
    }
    pool.users++;
    return {
        async capture(video, width, height, readFrame) {
            let bitmap: ImageBitmap | undefined;
            const fallback = () => ({ pixels: readFrame() });
            if (pool.disabled) {
                await yieldForGifUi(windowRef);
                return fallback();
            }
            try {
                bitmap = await windowRef.createImageBitmap!(video);
            } catch {
                await yieldForGifUi(windowRef);
                return fallback();
            }
            try {
                const data: GifJobData = { command: "capture", bitmap, width, height };
                return await pool.request(data, [bitmap], data, fallback);
            } finally {
                bitmap.close();
            }
        },
        process: (pixels, backup) => pool.request<GifPrepareResult>({ pixels }, [pixels.buffer], { pixels: backup }),
        compare: (index, palette, width, height, previousPixels) =>
            pool.request<GifChangedFrame>({ command: "compare", index, palette, width, height, previousPixels }),
        encode: (frame, first) => pool.request<{ bytes: Uint8Array }>({ command: "encode", frame: { ...frame }, first }),
        release() {
            if (--pool.users === 0) {
                pool.stop();
                pools.delete(windowRef);
            }
        }
    };
}
