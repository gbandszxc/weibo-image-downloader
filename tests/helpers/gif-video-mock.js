export function createGifVideoMock({ duration = 0.12, failOn = null, width = 2, height = 1, frames = null } = {}) {
    const seeks = [];
    const drawnTimes = [];
    const revokedUrls = [];
    let loadCalls = 0;
    let paused = false;
    let sourceRemoved = false;
    class MockVideo extends EventTarget {
        videoWidth = width;
        videoHeight = height;
        duration = duration;
        time = 0;
        get currentTime() {
            return this.time;
        }
        set currentTime(value) {
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
        removeAttribute(name) {
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
        windowRef: {
            location: { hostname: "x.com" },
            document: {
                createElement(tag) {
                    if (tag === "video") return video;
                    if (tag === "canvas") return canvas;
                    throw new Error(`Unexpected element: ${tag}`);
                }
            },
            URL: {
                createObjectURL() { return "blob:gif-source"; },
                revokeObjectURL(url) { revokedUrls.push(url); }
            }
        },
        video,
        seeks,
        drawnTimes,
        revokedUrls,
        get cleanup() { return { loadCalls, paused, sourceRemoved }; }
    };
}
