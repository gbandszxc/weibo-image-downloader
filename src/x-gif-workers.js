import { runGifJob } from "./x-gif-worker.js";

const pools = new WeakMap();

export async function yieldForGifUi(windowRef) {
    if (windowRef.scheduler?.yield) await windowRef.scheduler.yield();
    else if (windowRef.setTimeout) await new Promise((resolve) => windowRef.setTimeout(resolve, 0));
}

function isByteArray(value) {
    return ArrayBuffer.isView(value) && value.BYTES_PER_ELEMENT === 1;
}

function isPalette(value) {
    return Array.isArray(value) && value.length > 0 && value.length <= 256 &&
        value.every((color) => Array.isArray(color) && color.length === 3 &&
            color.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255));
}

function isValidResult(job, data) {
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

function createPool(windowRef, source) {
    const slots = [];
    const queue = [];
    let disabled = false;
    let nextId = 0;

    async function fallback(job) {
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
            const job = queue.shift();
            slot.job = job;
            job.timer = setTimeout(stop, 15000);
            try {
                slot.worker.postMessage({ id: job.id, ...job.data }, job.transfer);
            } catch {
                stop();
            }
        }
    }

    let url;
    try {
        url = windowRef.URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
        const count = Math.min(2, Math.max(1, (windowRef.navigator?.hardwareConcurrency || 2) - 1));
        for (let i = 0; i < count; i++) {
            const worker = new windowRef.Worker(url);
            const slot = { worker, job: null };
            slots.push(slot);
            worker.onmessage = ({ data }) => {
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
        request(data, transfer = [], backup = data, runFallback = null) {
            return new Promise((resolve, reject) => {
                const job = { id: nextId++, data, transfer, backup, runFallback, resolve, reject };
                if (disabled) fallback(job);
                else { queue.push(job); dispatch(); }
            });
        },
        stop
    };
}

export function acquireGifWorkers(windowRef, source) {
    if (!source || typeof windowRef.Worker !== "function") return null;
    let pool = pools.get(windowRef);
    if (!pool) {
        pool = createPool(windowRef, source);
        if (!pool) return null;
        pools.set(windowRef, pool);
    }
    pool.users++;
    return {
        async capture(video, width, height, readFrame) {
            let bitmap;
            const fallback = () => ({ pixels: readFrame() });
            if (pool.disabled) {
                await yieldForGifUi(windowRef);
                return fallback();
            }
            try {
                bitmap = await windowRef.createImageBitmap(video);
            } catch {
                await yieldForGifUi(windowRef);
                return fallback();
            }
            try {
                const data = { command: "capture", bitmap, width, height };
                return await pool.request(data, [bitmap], data, fallback);
            } finally {
                bitmap.close();
            }
        },
        process: (pixels, backup) => pool.request({ pixels }, [pixels.buffer], { pixels: backup }),
        compare: (index, palette, width, height, previousPixels) =>
            pool.request({ command: "compare", index, palette, width, height, previousPixels }),
        encode: (frame, first) => pool.request({ command: "encode", frame: { ...frame }, first }),
        release() {
            if (--pool.users === 0) {
                pool.stop();
                pools.delete(windowRef);
            }
        }
    };
}
