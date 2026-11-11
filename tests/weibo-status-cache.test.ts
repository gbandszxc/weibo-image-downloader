import test from "node:test";
import assert from "node:assert/strict";

import { createWeiboPlatform } from "../src/platforms/weibo.ts";
import type { WeiboPlatform, WeiboPlatformWindow } from "../src/platforms/weibo.ts";

/** 构造带请求计数的微博平台适配器：fetchRef 按请求 URL 中的 id 记录真实发网络请求的次数。 */
function createPlatform() {
    const requestedIds: string[] = [];
    const platform: WeiboPlatform = createWeiboPlatform({
        windowRef: {
            location: { hostname: "weibo.com" },
            open() {}
        } as WeiboPlatformWindow,
        fetchRef: (async (url: unknown) => {
            const id = new URL(String(url), "https://weibo.com").searchParams.get("id");
            requestedIds.push(id!);
            return { ok: true, json: async () => ({ id }) };
        }) as typeof fetch,
        log() {},
        getFileBasenameFromUrl: () => "",
        getFileExtensionFromUrl: () => ".jpg"
    });
    return { platform, requestedIds };
}

test("weibo status cache keeps at most 50 entries with LRU eviction", async () => {
    const { platform, requestedIds } = createPlatform();

    for (let index = 1; index <= 50; index++) {
        await platform.fetchWeiboStatus(`id${index}`);
    }
    assert.equal(requestedIds.length, 50, "首次获取每个 status 均真实请求");

    await platform.fetchWeiboStatus("id50");
    await platform.fetchWeiboStatus("id1");
    assert.equal(requestedIds.length, 50, "未超限时命中缓存不重新请求");

    // 触碰过 id50 与 id1 后，队首最旧的是 id2；插入 id51 应逐出 id2 而非 id1
    await platform.fetchWeiboStatus("id51");
    assert.equal(requestedIds.length, 51);

    await platform.fetchWeiboStatus("id1");
    assert.equal(requestedIds.length, 51, "刚被触碰的 id1 不应被逐出");

    await platform.fetchWeiboStatus("id2");
    assert.equal(requestedIds.length, 52, "最旧的 id2 应已按 LRU 逐出并重新请求");

    await platform.fetchWeiboStatus("id51");
    assert.equal(requestedIds.length, 52, "id51 仍在缓存容量内，命中不重新请求");
});
