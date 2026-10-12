import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { CONFIG } from "../src/config.ts";
import { createUi } from "../src/ui.ts";
import type { MediaItem, UiConfig, UiDownloadResult, UiPlatformAdapter, UiUtils } from "../src/ui.ts";

type MediaItemSeed = Partial<MediaItem> & Pick<MediaItem, "kind" | "imageUrl">;

/** 测试侧类型辅助：允许只写断言关心的字段，运行时原样返回同一对象。 */
function asMediaItem(seed: MediaItemSeed): MediaItem {
    return seed as MediaItem;
}

function deferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

interface MockEvent {
    pointerType?: string;
    button?: number;
    detail?: number;
    preventDefault?(): void;
    stopPropagation?(): void;
}

interface MockElement {
    tagName: string;
    children: MockElement[];
    className: string;
    attributes: Record<string, string>;
    handlers: Record<string, (event: MockEvent) => unknown>;
    style: Record<string, string>;
    id?: string;
    type?: string;
    checked?: boolean;
    innerHTML?: string;
    disabled?: boolean;
    parentNode?: MockElement | null;
    setAttribute(name: string, value: string): void;
    appendChild(child: MockElement): void;
    removeChild(child: MockElement): void;
    remove(): void;
    addEventListener(type: string, handler: (event: MockEvent) => unknown): void;
    removeEventListener(type: string): void;
    fire(type: string, overrides?: Partial<MockEvent>): unknown;
    querySelectorAll(selector: string): MockElement[];
    querySelector(selector: string): MockElement | null;
}

function element(tagName: string): MockElement {
    return {
        tagName, children: [], className: "", attributes: {}, handlers: {}, style: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        appendChild(child) { child.parentNode = this; this.children.push(child); },
        removeChild(child) { this.children = this.children.filter((node) => node !== child); child.parentNode = null; },
        remove() { this.parentNode?.removeChild(this); },
        addEventListener(type, handler) { this.handlers[type] = handler; },
        removeEventListener(type) { delete this.handlers[type]; },
        fire(type, overrides = {}) {
            return this.handlers[type]?.({
                pointerType: "mouse", button: 0, detail: 1,
                preventDefault() {}, stopPropagation() {}, ...overrides
            });
        },
        querySelectorAll(selector) {
            const descendants = this.children.flatMap((child) => [child, ...child.querySelectorAll("*")]);
            if (selector === "*") return descendants;
            if (selector.startsWith(".")) return descendants.filter((child) => child.className.split(" ").includes(selector.slice(1)));
            return descendants.filter((child) => child.tagName === "input" && child.type === "checkbox" &&
                (!selector.endsWith(":checked") || child.checked));
        },
        querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    };
}

interface HarnessOptions {
    resolveMedia?: (post: Element, items: MediaItem[]) => MediaItem[] | Promise<MediaItem[]>;
    download?: (items: MediaItem[] | null, id: string) => Promise<UiDownloadResult>;
    shouldResolveEmptyMediaItems?: () => boolean;
    configOverrides?: Partial<UiConfig>;
}

function harness({
    resolveMedia = (_post, items) => items,
    download = async () => ({ successCount: 1, failedCount: 0, handedOffCount: 0 }),
    shouldResolveEmptyMediaItems = () => false,
    configOverrides = {}
}: HarnessOptions = {}) {
    const calls: { items: MediaItem[]; id: string }[] = [];
    const document = {
        head: element("head"), body: element("body"),
        createElement: element,
        getElementById(id: string) { return this.body.querySelectorAll("*").find((node) => node.id === id) || null; },
        querySelectorAll(selector: string) { return this.body.querySelectorAll(selector); },
        addEventListener() {}, removeEventListener() {}
    };
    const media: MediaItem[] = [asMediaItem({ kind: "gif", imageUrl: "https://video.twimg.com/tweet_video/mock.mp4" })];
    const ui = createUi({
        config: { ...CONFIG, ...configOverrides }, documentRef: document as unknown as Document, windowRef: {} as Window, addStyle() {},
        utils: {
            log() {},
            async downloadMediaItems(items: MediaItem[] | null, id: string) { calls.push({ items: items as MediaItem[], id }); return download(items, id); },
            getPlatformAdapter() {
                return {
                    getDomMediaItems() { return media; },
                    resolvePostMediaItems: resolveMedia,
                    getPostId(post: Element) { return post.id; },
                    getPostSelectors() { return [".post"]; },
                    shouldSkipPost() { return false; },
                    shouldResolveEmptyMediaItems,
                    insertDownloadButton({ post, btn }: { post: Element; btn: HTMLElement }) { post.appendChild(btn); return true; }
                } as unknown as UiPlatformAdapter;
            }
        } as UiUtils
    });
    function addPost(id: string): { post: MockElement; button: MockElement } {
        const post = element("article");
        post.id = id;
        post.className = "post";
        document.body.appendChild(post);
        const button = ui.createDownloadButton(post as unknown as Element) as unknown as MockElement;
        post.appendChild(button);
        return { post, button };
    }
    return { ui, document, addPost, calls, media };
}

test("click feedback precedes media resolution and prevents same-post duplicates across refresh", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const media = deferred<MediaItem[]>();
    const downloads = deferred<UiDownloadResult>();
    const h = harness({ resolveMedia: () => media.promise, download: () => downloads.promise });
    const { button } = h.addPost("1");
    const other = h.addPost("2");
    const completion = button.fire("pointerup");
    assert.equal(button.innerHTML, "下载中");
    assert.equal(button.disabled, true);
    assert.equal(h.calls.length, 0);
    assert.equal(other.button.disabled, false);
    await button.fire("pointerup");
    h.ui.refreshDownloadButtons();
    const [replacement, otherReplacement] = h.document.querySelectorAll(".weibo-img-download-btn");
    assert.equal(replacement.innerHTML, "下载中");
    assert.equal(replacement.disabled, true);
    await replacement.fire("pointerup");
    media.resolve(h.media);
    await setImmediate();
    assert.equal(replacement.innerHTML, "下载中");
    assert.equal(h.calls.length, 1);
    const otherCompletion = otherReplacement.fire("pointerup");
    await setImmediate();
    assert.equal(h.calls.length, 2);
    downloads.resolve({ successCount: 1, failedCount: 0, handedOffCount: 0 });
    await Promise.all([completion, otherCompletion]);
    assert.equal(replacement.innerHTML, "完成");
    assert.equal(replacement.disabled, false);
    t.mock.timers.tick(1200);
    assert.equal(replacement.innerHTML, "↓1");
    assert.equal(replacement.attributes["aria-busy"], "false");
});

test("downloading one post never flips or blocks another post's button on the same page", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const pending = deferred<UiDownloadResult>();
    const h = harness({ download: () => pending.promise });
    const first = h.addPost("first");
    const second = h.addPost("second");

    const firstDownload = first.button.fire("pointerup");
    await setImmediate();
    assert.equal(first.button.innerHTML, "下载中");
    assert.equal(second.button.innerHTML, "↓1", "另一帖按钮不得跟随第一帖切换状态");
    assert.equal(second.button.disabled, false);

    const secondDownload = second.button.fire("pointerup");
    await setImmediate();
    assert.equal(h.calls.length, 2, "另一帖的下载不得被第一帖的在途任务拦截");
    assert.equal(second.button.innerHTML, "下载中");

    pending.resolve({ successCount: 1, failedCount: 0, handedOffCount: 0 });
    await Promise.all([firstDownload, secondDownload]);
    assert.equal(first.button.innerHTML, "完成");
    assert.equal(second.button.innerHTML, "完成");
});

test("failure, partial failure and browser handoff display truthful results and reset", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    for (const [result, label] of [
        [{ successCount: 0, failedCount: 1, handedOffCount: 0 }, "失败"],
        [{ successCount: 1, failedCount: 1, handedOffCount: 0 }, "失败"],
        [{ successCount: 1, failedCount: 0, handedOffCount: 1 }, "已发起"]
    ] as [UiDownloadResult, string][]) {
        const h = harness({ download: async () => result });
        const { button } = h.addPost(label);
        await button.fire("pointerup");
        assert.equal(button.innerHTML, label);
        assert.equal(button.disabled, false);
        t.mock.timers.tick(1200);
        assert.equal(button.innerHTML, "↓1");
    }
});

test("a resolution error unlocks the button and can be retried without caching the rejection", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let rejectResolution = true;
    const h = harness({ resolveMedia: (_post, items) => rejectResolution ? Promise.reject(new Error("offline")) : items });
    const { button } = h.addPost("1");
    await button.fire("pointerup");
    assert.equal(button.innerHTML, "失败");
    assert.equal(button.disabled, false);
    assert.equal(h.calls.length, 0);
    rejectResolution = false;
    await button.fire("pointerup");
    assert.equal(button.innerHTML, "完成");
    assert.equal(h.calls.length, 1);
    t.mock.timers.tick(1200);
    assert.equal(button.innerHTML, "↓1");
});

test("long press cancels without downloading and confirmation downloads only selected items", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const pending = deferred<UiDownloadResult>();
    const h = harness({ download: () => pending.promise });
    h.media.push(asMediaItem({ kind: "image", imageUrl: "https://example.test/second.jpg" }));
    const { button } = h.addPost("1");
    button.fire("pointerdown");
    t.mock.timers.tick(CONFIG.LONG_PRESS_MS);
    await setImmediate();
    assert.equal(button.innerHTML, "选择中");
    assert.equal(h.calls.length, 0);
    h.document.querySelectorAll(".weibo-img-select-btn-cancel")[0].fire("click");
    await setImmediate();
    assert.equal(button.innerHTML, "↓2");
    assert.equal(h.calls.length, 0);
    button.fire("pointerdown");
    t.mock.timers.tick(CONFIG.LONG_PRESS_MS);
    await setImmediate();
    h.document.querySelectorAll('input[type="checkbox"]')[1].checked = false;
    h.document.querySelectorAll(".weibo-img-select-btn-confirm")[0].fire("click");
    await setImmediate();
    assert.equal(button.innerHTML, "下载中");
    assert.deepEqual(h.calls[0].items, [h.media[0]]);
    await button.fire("pointerup");
    assert.equal(h.calls.length, 1);
    pending.resolve({ successCount: 1, failedCount: 0, handedOffCount: 0 });
    await setImmediate();
    assert.equal(button.innerHTML, "完成");
});

test("keyboard activation starts one download and pointer-generated clicks do not start another", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const pending = deferred<UiDownloadResult>();
    const h = harness({ download: () => pending.promise });
    const { button } = h.addPost("1");
    button.fire("click", { detail: 0 });
    assert.equal(button.innerHTML, "下载中");
    button.fire("click", { detail: 1 });
    await setImmediate();
    assert.equal(h.calls.length, 1);
    pending.resolve({ successCount: 1, failedCount: 0, handedOffCount: 0 });
    await setImmediate();
    assert.equal(button.innerHTML, "完成");
});

test("buttons re-resolve when media mounts after injection and update the count", async () => {
    let resolutions = 0;
    const h = harness({ resolveMedia: (_post, items) => { resolutions++; return items; } });
    const { button } = h.addPost("1");
    await setImmediate();
    assert.equal(button.innerHTML, "↓1");

    h.media.push(asMediaItem({ kind: "gif", imageUrl: "https://video.twimg.com/tweet_video/second.mp4" }));
    h.ui.injectDownloadButtons();
    await setImmediate();

    assert.equal(resolutions, 2);
    assert.equal(button.innerHTML, "↓2");
});

test("stable media avoids repeated platform resolution across injections", async () => {
    let resolutions = 0;
    const h = harness({ resolveMedia: (_post, items) => { resolutions++; return items; } });
    h.addPost("1");
    await setImmediate();

    h.ui.injectDownloadButtons();
    h.ui.injectDownloadButtons();
    await setImmediate();

    assert.equal(resolutions, 1);
});

test("mounting video elements re-resolve posts whose DOM snapshot did not change", async () => {
    let videoIndicatorMounted = false;
    let resolutions = 0;
    const h = harness({
        shouldResolveEmptyMediaItems: () => videoIndicatorMounted,
        resolveMedia: (_post, items) => { resolutions++; return items; }
    });
    const { button } = h.addPost("1");
    await setImmediate();
    assert.equal(button.innerHTML, "↓1");
    assert.equal(resolutions, 1);

    videoIndicatorMounted = true;
    h.ui.injectDownloadButtons();
    await setImmediate();

    assert.equal(resolutions, 2);
});

test("downloading rescans media so late-mounted items are included", async () => {
    const h = harness();
    const { button } = h.addPost("1");
    await setImmediate();

    h.media.push(asMediaItem({ kind: "image", imageUrl: "https://pbs.twimg.com/media/Late?name=orig" }));
    await button.fire("pointerup");

    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].items.length, 2);
});

test("failed resolutions back off per fingerprint and retry after the cooldown", async () => {
    let shouldFail = true;
    let resolutions = 0;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const h = harness({
        configOverrides: { MEDIA_RESOLVE_RETRY_COOLDOWN_MS: 20 },
        resolveMedia: (_post, items) => {
            resolutions++;
            return shouldFail ? Promise.reject(new Error("rate limited")) : items;
        }
    });
    const { button } = h.addPost("1");
    await setImmediate();
    assert.equal(resolutions, 1);

    h.ui.injectDownloadButtons();
    h.ui.injectDownloadButtons();
    await setImmediate();
    assert.equal(resolutions, 1);
    assert.equal(button.innerHTML, "↓1");

    await sleep(30);
    shouldFail = false;
    h.ui.injectDownloadButtons();
    await setImmediate();

    assert.equal(resolutions, 2);
    assert.equal(button.innerHTML, "↓1");
});
