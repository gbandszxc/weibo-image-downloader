import test from "node:test";
import assert from "node:assert/strict";

import { CONFIG } from "../src/config.ts";
import { createUtils } from "../src/utils.ts";
import type { GmBlobRequestDetails, GmDownload, GmDownloadOptions, GmXmlBlobRequest, UtilsConfig, UtilsMediaItem, UtilsWindowRef } from "../src/utils.ts";
import { createGifVideoMock } from "./helpers/gif-video-mock.ts";

interface TestUtilsOptions {
    gmDownload?: GmDownload | null;
    gmXmlhttpRequest?: GmXmlBlobRequest | null;
    fetchRef?: typeof fetch;
    windowOverrides?: Record<string, unknown>;
    configOverrides?: Partial<UtilsConfig>;
}

function asMediaItems(items: readonly Partial<UtilsMediaItem>[]): UtilsMediaItem[] {
    return items as UtilsMediaItem[];
}

function createTestUtils({
    gmDownload = null,
    gmXmlhttpRequest = null,
    fetchRef = async () => {
        throw new Error("fetch not mocked");
    },
    windowOverrides = {},
    configOverrides = {}
}: TestUtilsOptions = {}) {
    const clicks: { href: string; download: string }[] = [];
    const appendedNodes: unknown[] = [];
    const removedNodes: unknown[] = [];

    const documentRef = {
        body: {
            appendChild(node: { parentNode: unknown }) {
                appendedNodes.push(node);
                node.parentNode = this;
            },
            removeChild(node: { parentNode: unknown }) {
                removedNodes.push(node);
                node.parentNode = null;
            }
        },
        createElement(tagName: string) {
            return {
                tagName,
                href: "",
                download: "",
                parentNode: null,
                click() {
                    clicks.push({
                        href: this.href,
                        download: this.download
                    });
                }
            };
        }
    };

    const openCalls: unknown[][] = [];
    const createObjectUrlCalls: Blob[] = [];
    const revokeObjectUrlCalls: string[] = [];

    const windowRef = {
        location: {
            hostname: "weibo.com"
        },
        URL: {
            createObjectURL(blob: Blob) {
                createObjectUrlCalls.push(blob);
                return "blob:test-url";
            },
            revokeObjectURL(url: string) {
                revokeObjectUrlCalls.push(url);
            }
        },
        document: documentRef,
        open(...args: unknown[]) {
            openCalls.push(args);
        },
        ...windowOverrides
    } as unknown as UtilsWindowRef;

    const toastMessages: string[] = [];
    const utils = createUtils({
        config: {
            ...CONFIG,
            DEBUG: false,
            ...configOverrides
        },
        windowRef,
        fetchRef,
        gmDownload,
        gmXmlhttpRequest,
        ui: {
            showToast(message) {
                toastMessages.push(message);
            }
        }
    });

    return {
        utils,
        clicks,
        appendedNodes,
        removedNodes,
        openCalls,
        createObjectUrlCalls,
        revokeObjectUrlCalls,
        toastMessages
    };
}

test("downloadImage falls back to blob GM_download instead of opening tabs", async () => {
    const gmCalls: GmDownloadOptions[] = [];
    const blob = new Blob(["image-data"], { type: "image/jpeg" });
    const { utils, openCalls, clicks } = createTestUtils({
        gmDownload(details) {
            gmCalls.push(details);
            const isBlobDownload = details.url instanceof Blob;
            queueMicrotask(() => {
                if (isBlobDownload) {
                    details.onload();
                    return;
                }

                details.onerror({ error: "not_succeeded" });
            });
            return { abort() {} };
        },
        fetchRef: async () => ({
            ok: true,
            blob: async () => blob
        } as Response)
    });

    const success = await utils.downloadImage("https://wx2.sinaimg.cn/large/demo.jpg", "weibo_demo_1.jpg");

    assert.equal(success, true);
    assert.equal(gmCalls.length, 2);
    assert.equal(gmCalls[0].url, "https://wx2.sinaimg.cn/large/demo.jpg");
    assert.ok(gmCalls[1].url instanceof Blob);
    assert.equal(openCalls.length, 0);
    assert.equal(clicks.length, 0);
});

test("X GIF conversion defaults on and only changes X GIF download jobs", () => {
    const items = asMediaItems([
        { kind: "gif", imageUrl: "https://video.twimg.com/tweet_video/demo.mp4", imageExt: ".mp4" },
        { kind: "image", imageUrl: "https://pbs.twimg.com/media/demo.jpg", imageExt: ".jpg" },
        { kind: "video", videoUrl: "https://video.twimg.com/amplify_video/demo.mp4", videoExt: ".mp4" },
        { kind: "gif", imageUrl: "https://example.com/already.gif", imageExt: ".gif" }
    ]);
    const { utils } = createTestUtils({ windowOverrides: { location: { hostname: "x.com" } } });
    assert.equal(CONFIG.X_GIF_AUTO_CONVERT, true);
    assert.deepEqual(utils.buildMediaDownloadJobs(items, "123"), [
        { type: "image", url: items[0].imageUrl, filename: "x_123_1.gif", convertToGif: true },
        { type: "image", url: items[1].imageUrl, filename: "x_123_2.jpg" },
        { type: "video", url: items[2].videoUrl, filename: "x_123_3.mp4" },
        { type: "image", url: items[3].imageUrl, filename: "x_123_4.gif" }
    ]);
    const disabled = createTestUtils({
        windowOverrides: { location: { hostname: "x.com" } },
        configOverrides: { X_GIF_AUTO_CONVERT: false }
    });
    assert.equal(disabled.utils.buildMediaDownloadJobs(items, "123")[0].filename, "x_123_1.mp4");
    assert.equal(disabled.utils.buildMediaDownloadJobs(items, "123")[0].convertToGif, undefined);
    const weibo = createTestUtils();
    assert.equal(weibo.utils.buildMediaDownloadJobs(items, "123")[0].convertToGif, undefined);
});

test("X GIF downloads fetch MP4 bytes and save a real GIF blob through the shared downloader", async () => {
    const mock = createGifVideoMock();
    const downloads: GmDownloadOptions[] = [];
    const { utils, toastMessages } = createTestUtils({
        windowOverrides: mock.windowRef,
        gmXmlhttpRequest(details) {
            assert.equal(details.responseType, "blob");
            queueMicrotask(() => details.onload({ status: 200, response: new Blob(["mp4"]) }));
        },
        gmDownload(details) {
            downloads.push(details);
            queueMicrotask(details.onload);
        }
    });
    await utils.downloadMediaItems(asMediaItems([
        { kind: "gif", imageUrl: "https://video.twimg.com/tweet_video/demo.mp4", imageExt: ".mp4" }
    ]), "123");
    assert.equal(downloads.length, 1);
    assert.equal(downloads[0].name, "x_123_1.gif");
    assert.equal((downloads[0].url as Blob).type, "image/gif");
    assert.equal(new TextDecoder().decode((await (downloads[0].url as Blob).arrayBuffer()).slice(0, 6)), "GIF89a");
    assert.equal(toastMessages[toastMessages.length - 1], "已下载 1 张图片");
});

test("failed X GIF conversion never saves an MP4 named GIF and continues other jobs", async () => {
    const mock = createGifVideoMock({ failOn: "load" });
    const downloads: GmDownloadOptions[] = [];
    const { utils, toastMessages } = createTestUtils({
        windowOverrides: mock.windowRef,
        configOverrides: { DELAY_MS: 0 },
        fetchRef: async () => ({ ok: true, blob: async () => new Blob(["broken mp4"]) } as Response),
        gmDownload(details) {
            downloads.push(details);
            queueMicrotask(details.onload);
        }
    });
    await utils.downloadMediaItems(asMediaItems([
        { kind: "gif", imageUrl: "https://video.twimg.com/tweet_video/broken.mp4", imageExt: ".mp4" },
        { kind: "image", imageUrl: "https://pbs.twimg.com/media/photo.jpg", imageExt: ".jpg" }
    ]), "123");
    assert.deepEqual(downloads.map((job) => job.name), ["x_123_2.jpg"]);
    assert.match(toastMessages[toastMessages.length - 1], /已下载 1 个文件，1 个失败；X GIF转换或保存失败/);
    assert.deepEqual(mock.revokedUrls, ["blob:gif-source"]);
});

test("disabled X GIF conversion downloads the original MP4 without decoding", async () => {
    const downloads: GmDownloadOptions[] = [];
    const { utils } = createTestUtils({
        windowOverrides: { location: { hostname: "x.com" } },
        configOverrides: { X_GIF_AUTO_CONVERT: false },
        gmDownload(details) {
            downloads.push(details);
            queueMicrotask(details.onload);
        }
    });
    await utils.downloadMediaItems(asMediaItems([
        { kind: "gif", imageUrl: "https://video.twimg.com/tweet_video/demo.mp4", imageExt: ".mp4" }
    ]), "123");
    assert.equal(downloads[0].url, "https://video.twimg.com/tweet_video/demo.mp4");
    assert.equal(downloads[0].name, "x_123_1.mp4");
});

test("downloadMediaItems reports failures instead of opening fallback tabs", async () => {
    const { utils, openCalls, toastMessages } = createTestUtils({
        fetchRef: async () => {
            throw new Error("blocked");
        }
    });

    await utils.downloadMediaItems(
        [
            {
                id: "img-1",
                kind: "image",
                label: "图片 1",
                imageUrl: "https://wx4.sinaimg.cn/large/demo.jpg",
                videoUrl: null,
                imageExt: ".jpg",
                videoExt: ".mov"
            }
        ],
        "5299999999999999"
    );

    assert.equal(openCalls.length, 0);
    assert.deepEqual(toastMessages, ["下载失败，共 1 个文件未完成"]);
});

test("downloadMediaItems reports image and video counts separately", async () => {
    const { utils, toastMessages } = createTestUtils({
        gmDownload(details) {
            queueMicrotask(details.onload);
            return { abort() {} };
        }
    });

    await utils.downloadMediaItems(asMediaItems([
        {
            kind: "image",
            imageUrl: "https://pbs.twimg.com/media/demo.jpg?name=orig",
            imageExt: ".jpg"
        },
        {
            kind: "video",
            videoUrl: "https://video.twimg.com/amplify_video/demo.mp4",
            videoExt: ".mp4"
        }
    ]), "2084954812937117767");

    assert.deepEqual(toastMessages, ["已下载 1 张图片和 1 个视频"]);
});

test("downloadImage uses GM_xmlhttpRequest blob fallback when direct download fails", async () => {
    const gmCalls: GmDownloadOptions[] = [];
    const xhrCalls: GmBlobRequestDetails[] = [];
    const blob = new Blob(["detail-page-image"], { type: "image/jpeg" });
    const { utils, openCalls, clicks } = createTestUtils({
        gmDownload(details) {
            gmCalls.push(details);
            const isBlobDownload = details.url instanceof Blob;
            queueMicrotask(() => {
                if (isBlobDownload) {
                    details.onload();
                    return;
                }

                details.onerror({ error: "not_succeeded" });
            });
            return { abort() {} };
        },
        gmXmlhttpRequest(details) {
            xhrCalls.push(details);
            queueMicrotask(() => {
                details.onload({
                    status: 200,
                    response: blob
                });
            });
        },
        fetchRef: async () => {
            throw new Error("window.fetch should not be used when GM_xmlhttpRequest is available");
        }
    });

    const success = await utils.downloadImage(
        "https://wx4.sinaimg.cn/large/detail-demo.jpg",
        "weibo_detail_demo_1.jpg"
    );

    assert.equal(success, true);
    assert.equal(gmCalls.length, 2);
    assert.equal(gmCalls[0].url, "https://wx4.sinaimg.cn/large/detail-demo.jpg");
    assert.ok(gmCalls[1].url instanceof Blob);
    assert.deepEqual(gmCalls[0].headers, {
        Referer: "https://www.weibo.com/",
        Origin: "https://www.weibo.com"
    });
    assert.deepEqual(xhrCalls[0].headers, {
        Referer: "https://www.weibo.com/",
        Origin: "https://www.weibo.com"
    });
    assert.equal(openCalls.length, 0);
    assert.equal(clicks.length, 0);
});

test("browser anchor fallback reports initiation instead of claiming saved files", async () => {
    const { utils, clicks, toastMessages } = createTestUtils({
        fetchRef: async () => ({ ok: true, blob: async () => new Blob(["image"]) } as Response)
    });
    const result = await utils.downloadMediaItems(asMediaItems([
        { kind: "image", imageUrl: "https://pbs.twimg.com/media/demo.jpg", imageExt: ".jpg" }
    ]), "123");
    assert.deepEqual(result, { successCount: 1, failedCount: 0, handedOffCount: 1 });
    assert.equal(clicks.length, 1);
    assert.deepEqual(toastMessages, ["已发起 1 个文件的下载；请查看浏览器下载列表"]);
});

test("X public media fallback omits credentials while Weibo retains them", async () => {
    for (const [hostname, url, credentials] of [
        ["x.com", "https://video.twimg.com/tweet_video/demo.mp4", "omit"],
        ["weibo.com", "https://wx4.sinaimg.cn/large/demo.jpg", "include"]
    ]) {
        const { utils, clicks } = createTestUtils({
            windowOverrides: { location: { hostname } },
            fetchRef: async (_, options) => {
                assert.equal(options!.credentials, credentials);
                return { ok: true, blob: async () => new Blob(["media"]) } as Response;
            }
        });
        assert.equal(await utils.downloadImageFallback(url, "media"), "started");
        assert.equal(clicks.length, 1);
    }
});
