import type { GifWindowLike } from "../../src/x-gif-workers.ts";

export interface GifVideoMockOptions {
    duration?: number;
    failOn?: "load" | "seek" | null;
    width?: number;
    height?: number;
    frames?: Uint8Array[] | null;
}

export function createGifVideoMock({ duration = 0.12, failOn = null, width = 2, height = 1, frames = null }: GifVideoMockOptions = {}) {
    const seeks: number[] = [];
    const drawnTimes: number[] = [];
    const revokedUrls: string[] = [];
    const anchors: { href: string; download: string }[] = [];
    let loadCalls = 0;
    let paused = false;
    let sourceRemoved = false;
    class MockVideo extends EventTarget {
        videoWidth = width;
        videoHeight = height;
        duration = duration;
        time = 0;
        // src 由被测代码在加载时赋值，这里声明字段仅供类型检查，运行时行为与原动态属性一致。
        src = "";
        get currentTime() {
            return this.time;
        }
        set currentTime(value: number) {
            seeks.push(value);
            this.time = value;
            queueMicrotask(() => this.dispatchEvent(new Event(failOn === "seek" ? "error" : "seeked")));
        }
        load() {
            loadCalls++;
            if (this.src) {
                queueMicrotask(() => this.dispatchEvent(new Event(failOn === "load" ? "error" : "loadeddata")));
            }
        }
        pause() {
            paused = true;
        }
        removeAttribute(name: string) {
            if (name === "src") {
                this.src = "";
                sourceRemoved = true;
            }
        }
    }
    const video = new MockVideo();
    const canvas = {
        getContext() {
            return {
                drawImage() {
                    drawnTimes.push(video.currentTime);
                },
                getImageData() {
                    if (frames) {
                        return { data: new Uint8ClampedArray(frames[Math.min(
                            Math.round(video.currentTime / 0.05), frames.length - 1
                        )]) };
                    }
                    return { data: new Uint8ClampedArray([
                        video.currentTime === 0 ? 255 : 0, 0, 0, 255,
                        0, video.currentTime > 0 ? 255 : 0, 0, 255
                    ]) };
                }
            };
        }
    };
    return {
        // 交叉 Record<string, unknown>：本 mock 也被 downloadMediaItems 等以 windowOverrides: Record<string, unknown> 消费。
        windowRef: {
            location: { hostname: "x.com" },
            document: {
                createElement(tag: string) {
                    if (tag === "video") return video;
                    if (tag === "canvas") return canvas;
                    if (tag === "a") {
                        return {
                            href: "",
                            download: "",
                            parentNode: null,
                            click() {
                                anchors.push({ href: this.href, download: this.download });
                            }
                        };
                    }
                    throw new Error(`Unexpected element: ${tag}`);
                },
                body: {
                    appendChild(node: { parentNode: unknown }) {
                        node.parentNode = this;
                    },
                    removeChild(node: { parentNode: unknown }) {
                        node.parentNode = null;
                    }
                }
            },
            URL: {
                createObjectURL() { return "blob:gif-source"; },
                revokeObjectURL(url: string) { revokedUrls.push(url); }
            }
        } as unknown as GifWindowLike & Record<string, unknown>,
        video,
        anchors,
        seeks,
        drawnTimes,
        revokedUrls,
        get cleanup() { return { loadCalls, paused, sourceRemoved }; }
    };
}
