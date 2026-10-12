import test from "node:test";
import assert from "node:assert/strict";

import { createWeiboPlatform } from "../src/platforms/weibo.ts";
import { createXPlatform } from "../src/platforms/x.ts";

/**
 * getPostId 唯一性回归：旧实现用 `weibo_${Date.now()}` / `x_${Date.now()}` 兜底，
 * 同一批同步注入的多个帖子取到同一个毫秒值，下载状态机把整页帖子当成同一帖，
 * 下载一条时其他帖子的按钮也跟着切换状态（issue 复现：微博首页 article 无 mid）。
 */

function createWeiboPlatformForLocation({ hostname, pathname = "/" }: { hostname: string; pathname?: string }) {
    return createWeiboPlatform({
        windowRef: {
            location: { hostname, pathname },
            open() {}
        },
        fetchRef: async () => {
            throw new Error("fetch should not be called in post id tests");
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

function createXPlatformAt(pathname: string) {
    return createXPlatform({
        windowRef: {
            location: { hostname: "x.com", pathname } as Location
        },
        log() {},
        getFileExtensionFromUrl(_url, fallback = ".jpg") {
            return fallback;
        }
    });
}

interface FakeLink {
    href: string;
}

interface FakePostOptions {
    attributes?: Record<string, string | null>;
    links?: FakeLink[];
}

/** 只实现平台 getPostId 用到的 DOM 能力：getAttribute 与 querySelectorAll。 */
function fakePost({ attributes = {}, links = [] }: FakePostOptions = {}): Element {
    return {
        getAttribute(name: string) {
            return attributes[name] ?? null;
        },
        querySelectorAll() {
            return links;
        }
    } as unknown as Element;
}

/** X 平台 getPostId 用到：querySelectorAll("time") 与 a[href] 列表。 */
function fakeTweetPost({ times = [], links = [] }: { times?: unknown[]; links?: FakeLink[] } = {}): Element {
    return {
        querySelector(selector: string) {
            return selector === "time" ? times[0] ?? null : null;
        },
        querySelectorAll(selector: string) {
            if (selector === "time") {
                return times;
            }
            return links;
        }
    } as unknown as Element;
}

test("weibo postId prefers mid, then the real status id from post links", () => {
    const platform = createWeiboPlatformForLocation({ hostname: "weibo.com" });

    assert.equal(platform.getPostId(fakePost({ attributes: { mid: "5123456789" } })), "5123456789");
    assert.equal(
        platform.getPostId(fakePost({
            links: [
                { href: "https://weibo.com/u/3146485692" },
                { href: "https://weibo.com/3146485692/RmjjpaGmw" }
            ]
        })),
        "RmjjpaGmw"
    );
});

test("weibo posts without mid fall back to a unique id per container instead of a shared Date.now value", () => {
    const platform = createWeiboPlatformForLocation({ hostname: "weibo.com" });

    const first = fakePost();
    const second = fakePost();

    const firstId = platform.getPostId(first);
    const secondId = platform.getPostId(second);

    assert.notEqual(firstId, secondId, "同一批注入的两个帖子不得共享 postId");
    assert.match(firstId, /^weibo_/);
    assert.match(secondId, /^weibo_/);
    assert.equal(platform.getPostId(first), firstId, "同一容器重复取 id 必须稳定，重建按钮才能继承下载状态");
});

test("x posts without any status link fall back to a unique id per container", () => {
    const platform = createXPlatformAt("/home");

    const first = fakeTweetPost();
    const second = fakeTweetPost();

    const firstId = platform.getPostId(first);
    const secondId = platform.getPostId(second);

    assert.notEqual(firstId, secondId, "同一批注入的两个容器不得共享 postId");
    assert.match(firstId, /^x_/);
    assert.equal(platform.getPostId(first), firstId, "同一容器重复取 id 必须稳定，重建按钮才能继承下载状态");
});

test("x media viewer style posts still resolve the id from the detail page url", () => {
    const platform = createXPlatformAt("/someuser/status/2058971197417914571");

    assert.equal(platform.getPostId(fakeTweetPost()), "2058971197417914571");
});
