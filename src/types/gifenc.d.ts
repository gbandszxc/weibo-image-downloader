/**
 * gifenc 1.0.3 的最小环境声明。
 *
 * 仅覆盖本仓库实际用到的 API（GIFEncoder / quantize / applyPalette），
 * 类型依据 node_modules/gifenc/src/index.js 的真实签名编写。
 * 若后续迁移用到其余导出（prequantize、nearestColorIndex 等），再按需补充。
 */
declare module "gifenc" {
    /** RGB 颜色三元组，如 [255, 0, 0] */
    export type GifColor = [number, number, number];

    export interface GIFEncoderOptions {
        /** 初始缓冲容量，默认 4096 */
        initialCapacity?: number;
        /** 自动模式：首个 writeFrame 时自动写头；手动模式由调用方 writeHeader / first 控制 */
        auto?: boolean;
    }

    export interface GifWriteFrameOptions {
        /** 手动模式（auto: false）下标记首帧，用于写入 LSD / 全局色表 / Netscape 扩展 */
        first?: boolean;
        /** 局部/全局色表；首帧必填 */
        palette?: readonly GifColor[] | Uint8Array | Uint8ClampedArray;
        /** 帧延时，单位毫秒（内部换算为 1/100 秒） */
        delay?: number;
        /** 循环次数：-1 一次，0 永久循环，>0 为次数 */
        repeat?: number;
        /** LZW 颜色深度，默认 8 */
        colorDepth?: number;
        /** 处置方式，默认 -1（不写入） */
        dispose?: number;
        /** 是否启用透明色 */
        transparent?: boolean;
        /** 透明色索引，默认 0 */
        transparentIndex?: number;
    }

    export interface GIFEncoderStream {
        /** 清空缓冲，回到未写头状态 */
        reset(): void;
        /** 写入 GIF 结尾标记（trailer 0x3B） */
        finish(): void;
        /** 返回已编码字节的副本 */
        bytes(): Uint8Array;
        /** 返回已编码字节的视图（不拷贝） */
        bytesView(): Uint8Array;
        /** 底层缓冲的 ArrayBuffer（可配合 DataView 修改帧坐标等字段） */
        readonly buffer: ArrayBuffer;
        readonly stream: {
            writeByte(byte: number): void;
            writeBytes(bytes: ArrayLike<number>): void;
            bytes(): Uint8Array;
            bytesView(): Uint8Array;
            readonly buffer: ArrayBuffer;
        };
        /** 写入 "GIF89a" 头（auto: false 手动模式使用） */
        writeHeader(): void;
        writeFrame(
            index: Uint8Array | Uint8ClampedArray,
            width: number,
            height: number,
            options?: GifWriteFrameOptions
        ): void;
    }

    export function GIFEncoder(options?: GIFEncoderOptions): GIFEncoderStream;

    /**
     * 从 RGBA 像素数据量化生成色表。
     * @param rgba RGBA 像素（如 ImageData.data）或打包后的 Uint32Array
     */
    export function quantize(
        rgba: Uint8ClampedArray | Uint8Array | Uint32Array,
        maxColors: number,
        options?: {
            format?: "rgb565" | "rgb444" | "rgba4444";
            oneBitAlpha?: boolean | number;
            clearAlpha?: boolean;
            clearAlphaThreshold?: number;
            clearAlphaColor?: number;
        }
    ): GifColor[];

    /** 将 RGBA 像素映射到给定色表，返回索引数组 */
    export function applyPalette(
        rgba: Uint8ClampedArray | Uint8Array | Uint32Array,
        palette: readonly GifColor[],
        format?: "rgb565" | "rgb444" | "rgba4444"
    ): Uint8Array;

    /**
     * 默认导出与模块命名空间同形：gifenc 的 CJS 入口把全部 API 挂在
     * module.exports 上，代码以 `gifenc.GIFEncoder ? gifenc : gifenc.default`
     * 兼容两种互操作形态，故 default 声明为整个模块的类型。
     */
    const gifencDefault: typeof import("gifenc");
    export default gifencDefault;
}
