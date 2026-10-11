import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { CONFIG } from "../src/config.js";
import { createUi } from "../src/ui.js";

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function element(tagName) {
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

function harness({ resolveMedia = (_post, items) => items, download = async () => ({ successCount: 1, failedCount: 0, handedOffCount: 0 }) } = {}) {
    const calls = [];
    const document = {
        head: element("head"), body: element("body"),
        createElement: element,
        getElementById(id) { return this.body.querySelectorAll("*").find((node) => node.id === id) || null; },
        querySelectorAll(selector) { return this.body.querySelectorAll(selector); },
        addEventListener() {}, removeEventListener() {}
    };
    const media = [{ kind: "gif", imageUrl: "https://video.twimg.com/tweet_video/mock.mp4" }];
    const ui = createUi({
        config: CONFIG, documentRef: document, windowRef: {}, addStyle() {},
        utils: {
            log() {},
            async downloadMediaItems(items, id) { calls.push({ items, id }); return download(items, id); },
            getPlatformAdapter() {
                return {
                    getDomMediaItems() { return media; },
                    resolvePostMediaItems: resolveMedia,
                    getPostId(post) { return post.id; },
                    getPostSelectors() { return [".post"]; },
                    shouldSkipPost() { return false; },
                    insertDownloadButton({ post, btn }) { post.appendChild(btn); return true; }
                };
            }
        }
    });
    function addPost(id) {
        const post = element("article");
        post.id = id;
        post.className = "post";
        document.body.appendChild(post);
        const button = ui.createDownloadButton(post);
        post.appendChild(button);
        return { post, button };
    }
    return { ui, document, addPost, calls, media };
}

test("click feedback precedes media resolution and prevents same-post duplicates across refresh", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const media = deferred();
    const downloads = deferred();
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

test("failure, partial failure and browser handoff display truthful results and reset", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    for (const [result, label] of [
        [{ successCount: 0, failedCount: 1, handedOffCount: 0 }, "失败"],
        [{ successCount: 1, failedCount: 1, handedOffCount: 0 }, "失败"],
        [{ successCount: 1, failedCount: 0, handedOffCount: 1 }, "已发起"]
    ]) {
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
    const pending = deferred();
    const h = harness({ download: () => pending.promise });
    h.media.push({ kind: "image", imageUrl: "https://example.test/second.jpg" });
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
    const pending = deferred();
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
