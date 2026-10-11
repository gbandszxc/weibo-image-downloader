import * as gifenc from "gifenc";

const { GIFEncoder } = gifenc.GIFEncoder ? gifenc : gifenc.default;

export function getChangedFrame(index, palette, width, height, previousPixels) {
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
            cropped[y * frameWidth + x] = transparentIndex >= 0 && pixels[source] === previousPixels[source]
                ? transparentIndex : index[source];
        }
    }
    return {
        pixels,
        frame: { index: cropped, palette, width: frameWidth, height: frameHeight, left, top, transparentIndex }
    };
}

export function encodeGifFrame(frame, first) {
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
