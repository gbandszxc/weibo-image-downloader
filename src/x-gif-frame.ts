import * as gifenc from "gifenc";
import type { GifColor } from "gifenc";

// gifenc 的 CJS 入口把 API 挂在 default 上，运行时按真值选择来源；类型层恒真（TS2774），故条件断言为 unknown。
const { GIFEncoder } = (gifenc.GIFEncoder as unknown) ? gifenc : gifenc.default;

/** 单帧图像数据；delay 由调用方在帧间累加后一并交给编码器。 */
export interface GifFrame {
    index: Uint8Array;
    palette: GifColor[];
    width: number;
    height: number;
    left: number;
    top: number;
    transparentIndex: number;
    delay?: number;
}

/** 帧间比较结果：pixels 为整帧打包像素，frame 为裁剪出的变化区域（无变化时为 null）。 */
export interface GifChangedFrame {
    pixels: Uint32Array;
    frame: GifFrame | null;
}

export function getChangedFrame(index: Uint8Array, palette: GifColor[], width: number, height: number, previousPixels: Uint32Array | null): GifChangedFrame {
    const colors = palette.map(([r, g, b]) => r | g << 8 | b << 16);
    const pixels = new Uint32Array(index.length);
    for (let i = 0; i < index.length; i++) {
        pixels[i] = colors[index[i]];
    }
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
            cropped[y * frameWidth + x] = transparentIndex >= 0 && pixels[source] === previousPixels![source]
                ? transparentIndex : index[source];
        }
    }
    return {
        pixels,
        frame: { index: cropped, palette, width: frameWidth, height: frameHeight, left, top, transparentIndex }
    };
}

export function encodeGifFrame(frame: GifFrame, first: boolean): Uint8Array {
    const gif = GIFEncoder({ auto: false });
    if (first) gif.writeHeader();
    gif.writeFrame(frame.index, frame.width, frame.height, {
        first,
        palette: frame.palette,
        delay: frame.delay,
        repeat: 0,
        colorDepth: Math.max(2, Math.ceil(Math.log2(frame.palette.length))),
        dispose: 1,
        transparent: frame.transparentIndex >= 0,
        transparentIndex: frame.transparentIndex
    });
    if (!first) {
        // gifenc 未提供帧坐标选项；GIF89a 的 8 字节 GCE 后紧接图像描述符。
        if (gif.bytesView()[8] !== 0x2c) {
            throw new Error("GIF 编码器的帧结构不兼容");
        }
        const view = new DataView(gif.buffer);
        view.setUint16(9, frame.left, true);
        view.setUint16(11, frame.top, true);
    }
    return gif.bytesView();
}
