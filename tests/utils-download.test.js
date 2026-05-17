import test from "node:test";
import assert from "node:assert/strict";

import { CONFIG } from "../src/config.js";
import { createUtils } from "../src/utils.js";

function createTestUtils({
    gmDownload = null,
    gmXmlhttpRequest = null,
    fetchRef = async () => {
        throw new Error("fetch not mocked");
    },
    windowOverrides = {}
} = {}) {
    const clicks = [];
    const appendedNodes = [];
    const removedNodes = [];

    const documentRef = {
        body: {
            appendChild(node) {
                appendedNodes.push(node);
                node.parentNode = this;
            },
            removeChild(node) {
                removedNodes.push(node);
                node.parentNode = null;
            }
        },
        createElement(tagName) {
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

    const openCalls = [];
    const createObjectUrlCalls = [];
    const revokeObjectUrlCalls = [];

    const windowRef = {
        location: {
            hostname: "weibo.com"
        },
        URL: {
            createObjectURL(blob) {
                createObjectUrlCalls.push(blob);
                return "blob:test-url";
            },
            revokeObjectURL(url) {
                revokeObjectUrlCalls.push(url);
            }
        },
        document: documentRef,
        open(...args) {
            openCalls.push(args);
        },
        ...windowOverrides
    };

    const toastMessages = [];
    const utils = createUtils({
        config: {
            ...CONFIG,
            DEBUG: false
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
    const gmCalls = [];
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
        })
    });

    const success = await utils.downloadImage("https://wx2.sinaimg.cn/large/demo.jpg", "weibo_demo_1.jpg");

    assert.equal(success, true);
    assert.equal(gmCalls.length, 2);
    assert.equal(gmCalls[0].url, "https://wx2.sinaimg.cn/large/demo.jpg");
    assert.ok(gmCalls[1].url instanceof Blob);
    assert.equal(openCalls.length, 0);
    assert.equal(clicks.length, 0);
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

test("downloadImage uses GM_xmlhttpRequest blob fallback when direct download fails", async () => {
    const gmCalls = [];
    const xhrCalls = [];
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
