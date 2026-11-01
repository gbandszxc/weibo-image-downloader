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

function createWeiboPlatformForHostname(hostname: string) {
    return createWeiboPlatform({
        windowRef: { location: { hostname }, open() {} },
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
}

test("weibo getPostAuthor reads the mobile nickname node excluding the injected button", () => {
    const platform = createWeiboPlatformForHostname("m.weibo.cn");

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
});

test("weibo getPostAuthor takes the header author link and ignores @mentions in the body", () => {
    const platform = createWeiboPlatformForHostname("weibo.com");

    const headerEl = {
        querySelectorAll(selector: string) {
            if (selector === "a[href]") {
                return [
                    { getAttribute: () => "https://weibo.com/u/123456", textContent: "" },
                    { getAttribute: () => "/n/发帖人", textContent: "发帖人" }
                ];
            }
            return [];
        }
    };
    const post = {
        querySelector(selector: string) {
            return selector === "header" ? headerEl : null;
        },
        querySelectorAll() {
            // 旧实现会全帖扫描并误取正文第一个 @提及（同样是 /n/ 链接）
            return [{ getAttribute: () => "/n/正文提到的人", textContent: "正文提到的人" }];
        }
    };
    assert.equal(platform.getPostAuthor(post as unknown as Element), "发帖人", "应取头部作者链接而非正文 @提及");
});

test("weibo getPostAuthor accepts the profile URL formats used by desktop pages", () => {
    const platform = createWeiboPlatformForHostname("weibo.com");
    for (const href of [
        "//weibo.com/u/5650270572",
        "//www.weibo.com/u/5650270572",
        "https://weibo.com/5650270572?refer_flag=1001030103_",
        "/u/5650270572",
        "/n/Hetin奶茶"
    ]) {
        const post = {
            querySelector(selector: string) {
                return selector === "header" ? {
                    querySelectorAll() {
                        return [
                            { getAttribute: () => href, textContent: "" },
                            { getAttribute: () => href, textContent: "Hetin奶茶" }
                        ];
                    }
                } : null;
            }
        };
        assert.equal(platform.getPostAuthor(post as unknown as Element), "Hetin奶茶", href);
    }
});

test("weibo getPostAuthor falls back to header nickname text and never scans the body", () => {
    const platform = createWeiboPlatformForHostname("weibo.com");

    const nicknameEl = {
        textContent: "纯文本昵称 ↓2",
        querySelector(selector: string) {
            return selector === ".weibo-img-download-btn" ? { textContent: "↓2" } : null;
        }
    };
    const post = {
        querySelector(selector: string) {
            return selector === ".woo-nickname" ? nicknameEl : null;
        },
        querySelectorAll() {
            return [{ getAttribute: () => "/n/正文提到的人", textContent: "正文提到的人" }];
        }
    };
    assert.equal(platform.getPostAuthor(post as unknown as Element), "纯文本昵称");

    // 搜索页：.name 即作者链接本身
    const nameLink = { textContent: "搜索页作者", querySelectorAll: () => [] };
    const searchPost = {
        querySelector(selector: string) {
            return selector === ".name" ? nameLink : null;
        },
        querySelectorAll() {
            return [{ getAttribute: () => "/n/正文提到的人", textContent: "正文提到的人" }];
        }
    };
    assert.equal(platform.getPostAuthor(searchPost as unknown as Element), "搜索页作者");

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

test("weibo getPostAuthor never substitutes the detail-page author for another post without a header", () => {
    const windowRef = {
        location: { hostname: "weibo.com", pathname: "/5650270572/Rppb9eovC" },
        open() {},
        document: {
            querySelectorAll(selector: string) {
                if (selector === 'a[href*="/u/5650270572"]') {
                    return [
                        { getAttribute: () => "//weibo.com/u/5650270572", textContent: "" },
                        { getAttribute: () => "//weibo.com/u/5650270572", textContent: "Hetin 奶茶" }
                    ];
                }
                return [];
            }
        }
    };
    const platform = createWeiboPlatform({
        windowRef,
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

    // 详情页也可能出现其他帖子，不能借用页面主帖作者作为兜底。
    const detailArticle = {
        querySelector() {
            return null;
        },
        querySelectorAll() {
            return [];
        }
    };
    assert.equal(
        platform.getPostAuthor(detailArticle as unknown as Element),
        "",
        "无法识别当前帖子作者时留空，避免错误标成详情页主帖作者"
    );
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
