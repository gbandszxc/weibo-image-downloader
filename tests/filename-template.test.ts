import test from "node:test";
import assert from "node:assert/strict";

import { CONFIG, DEFAULT_FILENAME_TEMPLATE } from "../src/config.ts";
import { createUtils, renderFilenameTemplate } from "../src/utils.ts";
import type { UtilsConfig, UtilsMediaItem, UtilsWindowRef } from "../src/utils.ts";
import { createWeiboPlatform } from "../src/platforms/weibo.ts";
import { createXPlatform } from "../src/platforms/x.ts";

/**
 * 自定义文件命名模板：renderFilenameTemplate 纯函数（占位符替换/清洗/回退）、
 * buildMediaDownloadJobs 按平台模板出文件名（扩展名仍由脚本控制）、
 * 两平台 getPostAuthor 的 DOM 提取。
 */

function asMediaItems(items: readonly Partial<UtilsMediaItem>[]): UtilsMediaItem[] {
    return items as UtilsMediaItem[];
}

function createTestUtils(configOverrides: Partial<UtilsConfig>, hostname = "weibo.com") {
    return createUtils({
        config: {
            ...CONFIG,
            DEBUG: false,
            ...configOverrides
        },
        windowRef: {
            location: { hostname }
        } as unknown as UtilsWindowRef,
        fetchRef: async () => {
            throw new Error("fetch should not be called in filename template tests");
        }
    });
}

test("default template renders the legacy platform_postId_index name", () => {
    assert.equal(DEFAULT_FILENAME_TEMPLATE, "{platform}_{postId}_{index}");
    assert.equal(renderFilenameTemplate(DEFAULT_FILENAME_TEMPLATE, { platform: "x", postId: "123", index: 1 }), "x_123_1");
    assert.equal(renderFilenameTemplate(DEFAULT_FILENAME_TEMPLATE, { platform: "weibo", postId: "77", index: 2 }), "weibo_77_2");
});

test("custom template substitutes author and source placeholders", () => {
    const name = renderFilenameTemplate("{author}_{postId}_{index}_{source}", {
        platform: "weibo",
        postId: "77",
        index: 3,
        author: "小明",
        source: "008abcly1gw91"
    });
    assert.equal(name, "小明_77_3_008abcly1gw91");
});

test("missing author collapses empty separators instead of leaving holes", () => {
    assert.equal(
        renderFilenameTemplate("{author}_{postId}_{index}", { platform: "x", postId: "123", index: 1, author: "" }),
        "123_1"
    );
    // 全部占位符为空时回退默认命名
    assert.equal(
        renderFilenameTemplate("{author}", { platform: "x", postId: "123", index: 1, author: "" }),
        "x_123_1"
    );
});

test("illegal filename characters are sanitized in substituted values", () => {
    const name = renderFilenameTemplate("{author}_{index}", {
        platform: "weibo",
        postId: "77",
        index: 1,
        author: 'a<b>:"c/d\\e|f?g*h'
    });
    assert.equal(name, "a_b_c_d_e_f_g_h_1");
});

test("unknown placeholders are kept as-is so users can spot typos", () => {
    assert.equal(
        renderFilenameTemplate("{date}_{index}", { platform: "x", postId: "123", index: 1 }),
        "{date}_1"
    );
});

test("blank template falls back to the default", () => {
    assert.equal(renderFilenameTemplate("   ", { platform: "x", postId: "123", index: 1 }), "x_123_1");
});

test("trailing dots and spaces are trimmed and names are capped at 100 chars", () => {
    assert.equal(renderFilenameTemplate("{postId}. ", { platform: "x", postId: "abc", index: 1 }), "abc");

    const longId = "9".repeat(150);
    const name = renderFilenameTemplate("{postId}", { platform: "x", postId: longId, index: 1 });
    assert.equal(name.length, 100);
    assert.equal(name, "9".repeat(100));
});

test("invalid index values render as 1", () => {
    assert.equal(renderFilenameTemplate("{index}", { platform: "x", postId: "123", index: 0 }), "1");
    assert.equal(renderFilenameTemplate("{index}", { platform: "x", postId: "123", index: Number.NaN }), "1");
});

test("buildMediaDownloadJobs uses the per-platform template and keeps script-controlled extensions", () => {
    const utils = createTestUtils({
        FILENAME_TEMPLATE_WEIBO: "{author}_{index}",
        FILENAME_TEMPLATE_X: "{author}_{postId}_{index}"
    }, "x.com");

    const jobs = utils.buildMediaDownloadJobs(asMediaItems([
        { kind: "image", imageUrl: "https://pbs.twimg.com/media/demo.jpg", imageExt: ".jpg" },
        { kind: "gif", imageUrl: "https://pbs.twimg.com/media/anim.png", imageExt: ".png" },
        { kind: "video", videoUrl: "https://video.twimg.com/tweet_video/demo.mp4", videoExt: ".mp4" }
    ]), "123", { author: "elonmusk" });

    assert.deepEqual(jobs.map((job) => job.filename), [
        "elonmusk_123_1.jpg",
        "elonmusk_123_2.gif",
        "elonmusk_123_3.mp4"
    ]);
    assert.equal(jobs[1].convertToGif, true, "GIF 自动转换仍由脚本控制扩展名");
});

test("weibo template stays independent from the x template", () => {
    const utils = createTestUtils({ FILENAME_TEMPLATE_WEIBO: "{author}_{index}" });
    const jobs = utils.buildMediaDownloadJobs(asMediaItems([
        { kind: "image", imageUrl: "https://wx3.sinaimg.cn/large/plain.jpg", imageExt: ".jpg" }
    ]), "77", { author: "小明" });

    assert.deepEqual(jobs.map((job) => job.filename), ["小明_1.jpg"]);
});

test("weibo LivePhoto merge keeps .MP.jpg suffix with a custom template", () => {
    const utils = createTestUtils({ FILENAME_TEMPLATE_WEIBO: "{author}_{index}" });
    const jobs = utils.buildMediaDownloadJobs(asMediaItems([
        {
            kind: "livephoto",
            imageUrl: "https://wx3.sinaimg.cn/large/live.jpg",
            videoUrl: "https://livephoto.us.sinaimg.cn/live.mov",
            imageExt: ".jpg",
            videoExt: ".mov"
        }
    ]), "77", { author: "小明" });

    assert.deepEqual(jobs, [
        {
            type: "image",
            url: "https://wx3.sinaimg.cn/large/live.jpg",
            filename: "小明_1.MP.jpg",
            livePhotoVideoUrl: "https://livephoto.us.sinaimg.cn/live.mov"
        }
    ]);
});

test("weibo getPostAuthor reads mobile nickname, profile links and header nickname", () => {
    const platform = createWeiboPlatform({
        windowRef: { location: { hostname: "m.weibo.cn" }, open() {} },
        fetchRef: async () => {
            throw new Error("fetch should not be called");
        },
        log() {},
        getFileBasenameFromUrl(_url, fallback) {
            return fallback;
        },
        getFileExtensionFromUrl(_url, fallback = ".jpg") {
            return fallback;
        }
    });

    const mobilePost = {
        querySelector(selector: string) {
            if (selector === "header.weibo-top .m-text-box h3.m-text-cut") {
                return {
                    textContent: "小明 ↓3",
                    querySelector(selector: string) {
                        return selector === ".weibo-img-download-btn" ? { textContent: "↓3" } : null;
                    }
                };
            }
            return null;
        },
        querySelectorAll() {
            return [];
        }
    };
    assert.equal(platform.getPostAuthor(mobilePost as unknown as Element), "小明", "昵称节点应剔除注入按钮的文案");

    const linkPost = {
        querySelector() {
            return null;
        },
        querySelectorAll(selector: string) {
            if (selector === "a[href]") {
                return [
                    { getAttribute: () => "https://weibo.com/123456/bid", textContent: "123456" },
                    { getAttribute: () => "/n/爱吃西瓜", textContent: "爱吃西瓜" },
                    { getAttribute: () => "https://weibo.com/q/search", textContent: "搜索" }
                ];
            }
            return [];
        }
    };
    assert.equal(platform.getPostAuthor(linkPost as unknown as Element), "爱吃西瓜", "应取作者主页链接文本而非帖子链接");

    const headerPost = {
        querySelector(selector: string) {
            return selector === ".woo-nickname" ? { textContent: "头部昵称", querySelector: () => null } : null;
        },
        querySelectorAll() {
            return [];
        }
    };
    assert.equal(platform.getPostAuthor(headerPost as unknown as Element), "头部昵称");

    const emptyPost = {
        querySelector() {
            return null;
        },
        querySelectorAll() {
            return [];
        }
    };
    assert.equal(platform.getPostAuthor(emptyPost as unknown as Element), "");
});

test("x getPostAuthor prefers the @handle text and falls back to profile links", () => {
    const platform = createXPlatform({
        windowRef: { location: { hostname: "x.com", pathname: "/home" } as Location },
        log() {},
        getFileExtensionFromUrl(_url, fallback = ".jpg") {
            return fallback;
        }
    });

    const handlePost = {
        querySelector(selector: string) {
            return selector === '[data-testid="User-Name"]'
                ? { textContent: "Display Name @handle" }
                : null;
        },
        querySelectorAll() {
            return [];
        }
    };
    assert.equal(platform.getPostAuthor(handlePost as unknown as Element), "handle");

    const linkPost = {
        querySelector() {
            return null;
        },
        querySelectorAll(selector: string) {
            if (selector === 'a[href^="/"]') {
                return [
                    { getAttribute: () => "/i/status/123" },
                    { getAttribute: () => "/realhandle" }
                ];
            }
            return [];
        }
    };
    assert.equal(platform.getPostAuthor(linkPost as unknown as Element), "realhandle");

    const emptyPost = {
        querySelector() {
            return null;
        },
        querySelectorAll() {
            return [];
        }
    };
    assert.equal(platform.getPostAuthor(emptyPost as unknown as Element), "");
});
