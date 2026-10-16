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

test("direct image downloads prefer GM_download with saveAs:false and report completion", async () => {
    const gmCalls: GmDownloadOptions[] = [];
    const { utils, clicks } = createTestUtils({
        gmDownload(details) {
            gmCalls.push(details);
            queueMicrotask(() => details.onload());
            return { abort() {} };
        }
    });

    const success = await utils.downloadImage("https://pbs.twimg.com/media/demo.jpg?name=orig", "x_123_1.jpg");

    assert.equal(success, true, "GM_download onload 已确认落盘，应返回 true（按钮「完成」）");
    assert.equal(gmCalls.length, 1, "直链应优先走 GM_download");
    assert.equal(gmCalls[0].saveAs, false, "显式 saveAs:false 在用户开启「每次询问保存位置」时依然静默下载");
    assert.equal(gmCalls[0].name, "x_123_1.jpg");
    assert.equal(clicks.length, 0, "直链成功时不应回退 anchor");
});

test("direct downloads fall back to the browser anchor when GM_download fails and hint at TM permission", async () => {
    const { utils, clicks, toastMessages } = createTestUtils({
        windowOverrides: { location: { hostname: "x.com" } },
        gmDownload(details) {
            queueMicrotask(() => details.onerror({ error: "not_permitted" }));
        },
        gmXmlhttpRequest(details) {
            queueMicrotask(() => details.onload({
                status: 200,
                response: new Blob(["image"], { type: "image/jpeg" })
            }));
        }
    });

    const result = await utils.downloadMediaItems(asMediaItems([
        { kind: "image", imageUrl: "https://pbs.twimg.com/media/demo.jpg", imageExt: ".jpg" }
    ]), "123");

    assert.deepEqual(result, { successCount: 1, failedCount: 0, handedOffCount: 1 });
    assert.equal(clicks.length, 1, "GM_download 失败后应回退浏览器原生保存");
    assert.equal(clicks[0].download, "x_123_1.jpg");
    assert.match(
        toastMessages[toastMessages.length - 1],
        /若弹出保存位置询问，请在 Tampermonkey 中允许下载权限$/
    );
});

test("downloadImage returns false when GM_download and byte fetching both fail", async () => {
    const gmCalls: GmDownloadOptions[] = [];
    const { utils, clicks } = createTestUtils({
        gmDownload(details) {
            gmCalls.push(details);
            queueMicrotask(() => details.onerror({ error: "download failed" }));
        },
        gmXmlhttpRequest(details) {
            queueMicrotask(() => details.onerror({ message: "network blocked" }));
        },
        fetchRef: async () => {
            throw new Error("blocked");
        }
    });

    const success = await utils.downloadImage("https://wx2.sinaimg.cn/large/demo.jpg", "weibo_demo_1.jpg");

    assert.equal(success, false, "GM_download 与拉流兜底全部失败时应如实报告失败");
    assert.equal(gmCalls.length, 1);
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
    const { utils, toastMessages } = createTestUtils({
        windowOverrides: mock.windowRef,
        gmXmlhttpRequest(details) {
            assert.equal(details.responseType, "blob");
            queueMicrotask(() => details.onload({ status: 200, response: new Blob(["mp4"]) }));
        }
    });
    await utils.downloadMediaItems(asMediaItems([
        { kind: "gif", imageUrl: "https://video.twimg.com/tweet_video/demo.mp4", imageExt: ".mp4" }
    ]), "123");
    assert.equal(mock.anchors.length, 1);
    assert.equal(mock.anchors[0].download, "x_123_1.gif");
    assert.equal(toastMessages[toastMessages.length - 1], "已发起 1 个文件的下载；请查看浏览器下载列表");
});

test("failed X GIF conversion never saves an MP4 named GIF and continues other jobs", async () => {
    const mock = createGifVideoMock({ failOn: "load" });
    const { utils, toastMessages } = createTestUtils({
        windowOverrides: mock.windowRef,
        configOverrides: { DELAY_MS: 0 },
        fetchRef: async () => ({ ok: true, blob: async () => new Blob(["broken mp4"]) } as Response),
        gmDownload(details) {
            queueMicrotask(details.onload);
        }
    });
    await utils.downloadMediaItems(asMediaItems([
        { kind: "gif", imageUrl: "https://video.twimg.com/tweet_video/broken.mp4", imageExt: ".mp4" },
        { kind: "image", imageUrl: "https://pbs.twimg.com/media/photo.jpg", imageExt: ".jpg" }
    ]), "123");
    // GIF 转换失败不落盘；普通图片走 GM_download 直链，不经 anchor
    assert.deepEqual(mock.anchors.map((anchor) => anchor.download), []);
    assert.match(toastMessages[toastMessages.length - 1], /^已下载 1 个文件，1 个失败；X GIF转换或保存失败/);
    // anchor 保存的 blob URL 由 setTimeout 延迟回收，测试窗口内只观察到 GIF 转换的源 revoke
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

test("without GM_download, direct downloads fetch bytes and save via the browser anchor", async () => {
    const xhrCalls: GmBlobRequestDetails[] = [];
    const blob = new Blob(["detail-page-image"], { type: "image/jpeg" });
    const { utils, openCalls, clicks } = createTestUtils({
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

    assert.equal(success, "started", "anchor 保存无法确认落盘，应如实报告 started");
    assert.deepEqual(xhrCalls[0].headers, {
        Referer: "https://www.weibo.com/",
        Origin: "https://www.weibo.com"
    });
    assert.equal(clicks.length, 1);
    assert.equal(clicks[0].download, "weibo_detail_demo_1.jpg");
    assert.equal(openCalls.length, 0);
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
    // GM_download 缺失属正常降级（如 Violentmonkey），不应提示下载权限授权
    assert.ok(!toastMessages[0].includes("Tampermonkey"));
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

test("Weibo LivePhoto auto merge defaults on and produces a single Motion Photo job", () => {
    const items = asMediaItems([
        {
            kind: "livephoto",
            imageUrl: "https://wx3.sinaimg.cn/large/live.jpg",
            videoUrl: "https://livephoto.us.sinaimg.cn/live.mov",
            imageExt: ".jpg",
            videoExt: ".mov"
        },
        {
            kind: "image",
            imageUrl: "https://wx3.sinaimg.cn/large/plain.jpg",
            imageExt: ".jpg"
        }
    ]);
    const { utils } = createTestUtils();
    assert.equal(CONFIG.LIVEPHOTO_AUTO_MERGE, true);
    assert.deepEqual(utils.buildMediaDownloadJobs(items, "77"), [
        {
            type: "image",
            url: items[0].imageUrl,
            filename: "weibo_77_1.MP.jpg",
            livePhotoVideoUrl: items[0].videoUrl
        },
        { type: "image", url: items[1].imageUrl, filename: "weibo_77_2.jpg" }
    ]);
});

test("disabled LivePhoto auto merge yields a single same-name jpg+mov pair job", () => {
    const items = asMediaItems([
        {
            kind: "livephoto",
            imageUrl: "https://wx3.sinaimg.cn/large/live.jpg",
            videoUrl: "https://livephoto.us.sinaimg.cn/live.mov",
            imageExt: ".jpg",
            videoExt: ".mov"
        }
    ]);
    const { utils } = createTestUtils({
        configOverrides: { LIVEPHOTO_AUTO_MERGE: false }
    });
    assert.deepEqual(utils.buildMediaDownloadJobs(items, "77"), [
        {
            type: "image",
            url: items[0].imageUrl,
            filename: "weibo_77_1.jpg",
            livePhotoPair: true,
            livePhotoVideoUrl: items[0].videoUrl
        }
    ]);
});

test("LivePhoto merge downloads fetch image and video and save a single Motion Photo", async () => {
    const { utils, toastMessages, clicks, createObjectUrlCalls } = createTestUtils({
        configOverrides: { DELAY_MS: 0 },
        gmXmlhttpRequest(details) {
            const isImage = details.url.includes(".jpg");
            const bytes = isImage ? buildTestMotionJpeg() : buildTestMotionVideo();
            queueMicrotask(() => details.onload({
                status: 200,
                response: new Blob([bytes as BlobPart], { type: isImage ? "image/jpeg" : "video/quicktime" })
            }));
        }
    });
    await utils.downloadMediaItems(asMediaItems([
        {
            kind: "livephoto",
            imageUrl: "https://wx3.sinaimg.cn/large/live.jpg",
            videoUrl: "https://livephoto.us.sinaimg.cn/live.mov",
            imageExt: ".jpg",
            videoExt: ".mov"
        }
    ]), "77");
    assert.equal(clicks.length, 1);
    assert.equal(clicks[0].download, "weibo_77_1.MP.jpg");
    assert.equal(createObjectUrlCalls.length, 1);
    assert.equal(createObjectUrlCalls[0].type, "image/jpeg");
    const mergedText = new TextDecoder("latin1").decode(await createObjectUrlCalls[0].arrayBuffer());
    assert.ok(mergedText.includes("GCamera:MotionPhoto=\"1\""), "应包含 Motion Photo XMP");
    assert.ok(mergedText.includes("oplus_11534336"), "应包含 OPPO EXIF 识别标记");
    // 内嵌视频 QuickTime brand 已补丁为 MP4，且视频字节位于文件末尾（无尾部标记）
    assert.ok(/isom/.test(mergedText.slice(-40)), "内嵌视频 brand 应已补丁为 isom");
    assert.ok(mergedText.endsWith("free"), "应以视频原始字节结尾");
    assert.equal(toastMessages[toastMessages.length - 1], "已发起 1 个文件的下载；请查看浏览器下载列表");
});

test("failed LivePhoto merge falls back to a same-name jpg+mov pair download", async () => {
    const { utils, toastMessages, clicks } = createTestUtils({
        configOverrides: { DELAY_MS: 0 },
        gmXmlhttpRequest(details) {
            const isImage = details.url.includes(".jpg");
            const bytes = isImage ? buildTestMotionJpeg() : new Uint8Array([0x00, 0x01, 0x02, 0x03]);
            queueMicrotask(() => details.onload({
                status: 200,
                response: new Blob([bytes as BlobPart], { type: isImage ? "image/jpeg" : "video/quicktime" })
            }));
        }
    });
    await utils.downloadMediaItems(asMediaItems([
        {
            kind: "livephoto",
            imageUrl: "https://wx3.sinaimg.cn/large/live.jpg",
            videoUrl: "https://livephoto.us.sinaimg.cn/live.mov",
            imageExt: ".jpg",
            videoExt: ".mov"
        }
    ]), "77");
    assert.deepEqual(clicks.map((click) => click.download), [
        "weibo_77_1.jpg",
        "weibo_77_1.mov"
    ]);
    assert.match(toastMessages[toastMessages.length - 1], /已发起 2 个文件的下载；请查看浏览器下载列表；部分LivePhoto未能合并，已分别保存图片与视频$/);
});

/** 最小可用 JPEG（SOI + APP0 + APP1 Exif + DQT + SOS + EOI），供合并下载测试使用 */
function buildTestMotionJpeg(): Uint8Array {
    const ascii = (text: string) => Uint8Array.from(text, (ch) => ch.charCodeAt(0));
    const segment = (marker: number, payload: Uint8Array) => {
        const seg = new Uint8Array(4 + payload.length);
        seg[0] = 0xff;
        seg[1] = marker;
        seg[2] = ((payload.length + 2) >> 8) & 0xff;
        seg[3] = (payload.length + 2) & 0xff;
        seg.set(payload, 4);
        return seg;
    };
    // 结构合法的大端 TIFF：IFD0(Orientation + ExifIFD 指针@38) + ExifIFD(ExifVersion)
    const tiff = new Uint8Array(56);
    const view = new DataView(tiff.buffer);
    tiff.set(ascii("MM"), 0);
    view.setUint16(2, 42, false);
    view.setUint32(4, 8, false);
    view.setUint16(8, 2, false);
    view.setUint16(10, 0x0112, false);
    view.setUint16(12, 3, false);
    view.setUint32(14, 1, false);
    view.setUint16(18, 1, false);
    view.setUint16(20, 0, false);
    view.setUint16(22, 0x8769, false);
    view.setUint16(24, 4, false);
    view.setUint32(26, 1, false);
    view.setUint32(30, 38, false);
    view.setUint32(34, 0, false);
    view.setUint16(38, 1, false);
    view.setUint16(40, 0x9000, false);
    view.setUint16(42, 7, false);
    view.setUint32(44, 4, false);
    tiff.set(ascii("0232"), 48);
    view.setUint32(52, 0, false);
    const exifPayload = new Uint8Array(6 + tiff.length);
    exifPayload.set(ascii("Exif\0\0"), 0);
    exifPayload.set(tiff, 6);
    const parts = [
        new Uint8Array([0xff, 0xd8]),
        segment(0xe0, ascii("JFIF\0\x01\x02\x00\x00\x01\x00\x01\x00\x00")),
        segment(0xe1, exifPayload),
        segment(0xdb, new Uint8Array(16).fill(0x22)),
        segment(0xda, ascii("\x00\x01\x01\x00\x00\x3f\x00")),
        ascii("scan"),
        new Uint8Array([0xff, 0xd9])
    ];
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const jpeg = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
        jpeg.set(part, offset);
        offset += part.length;
    }
    return jpeg;
}

/** 最小 ISO-BMFF 视频（ftyp + free box），供合并下载测试使用 */
function buildTestMotionVideo(): Uint8Array {
    const ascii = (text: string) => Uint8Array.from(text, (ch) => ch.charCodeAt(0));
    const ftyp = new Uint8Array(24);
    ftyp.set(ascii("ftyp"), 4);
    ftyp.set(ascii("qt  "), 8);
    const free = new Uint8Array(8);
    free.set(ascii("free"), 4);
    return new Uint8Array([...ftyp, ...free]);
}
