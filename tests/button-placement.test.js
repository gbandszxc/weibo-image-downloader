import test from "node:test";
import assert from "node:assert/strict";

import { createWeiboPlatform } from "../src/platforms/weibo.js";
import { createXPlatform } from "../src/platforms/x.js";

function createWeiboPlatformForHost(hostname) {
    return createWeiboPlatform({
        windowRef: {
            location: { hostname },
            open() {}
        },
        fetchRef: async () => {
            throw new Error("fetch should not be called in placement tests");
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

function createXPlatformForTests() {
    return createXPlatform({
        windowRef: {
            location: {
                hostname: "x.com",
                pathname: "/home"
            }
        },
        log() {},
        getFileExtensionFromUrl(_url, fallback = ".jpg") {
            return fallback;
        }
    });
}

function createAppendRecorder(label) {
    return {
        label,
        appended: [],
        styles: {},
        classList: {
            contains(className) {
                return className === "menu" ? label === "menu" : false;
            }
        },
        appendChild(node) {
            this.appended.push(node);
        },
        style: {}
    };
}

function createInsertRecorder(label) {
    return {
        label,
        calls: [],
        insertBefore(node, before) {
            this.calls.push({ node, before });
        }
    };
}

test("button placement matches current weibo and x page rules", async (t) => {
    await t.test("weibo timeline inserts before icons-plus block", () => {
        const platform = createWeiboPlatformForHost("weibo.com");
        const btn = { id: "btn" };
        const parent = createInsertRecorder("timeline-parent");
        const iconsPlusEl = { id: "icons-plus", parentNode: parent };

        const post = {
            querySelector(selector) {
                if (selector === 'div[class*="_iconsPlus_"]') {
                    return iconsPlusEl;
                }
                return null;
            },
            querySelectorAll() {
                return [];
            }
        };

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(parent.calls, [{ node: btn, before: iconsPlusEl }]);
    });

    await t.test("weibo user page appends into header nickname area", () => {
        const platform = createWeiboPlatformForHost("weibo.com");
        const btn = { id: "btn" };
        const headerEl = createAppendRecorder("woo-nickname");

        const post = {
            querySelector(selector) {
                if (selector === ".woo-nickname") {
                    return headerEl;
                }
                return null;
            },
            querySelectorAll() {
                return [];
            }
        };

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(headerEl.appended, [btn]);
    });

    await t.test("weibo detail page appends into suffix box", () => {
        const platform = createWeiboPlatformForHost("weibo.com");
        const btn = { id: "btn" };
        const suffixBox = createAppendRecorder("suffix-box");

        const post = {
            querySelector(selector) {
                if (selector === 'div[class*="_suffixbox"]') {
                    return suffixBox;
                }
                return null;
            },
            querySelectorAll() {
                return [];
            }
        };

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(suffixBox.appended, [btn]);
    });

    await t.test("weibo search page appends to author info row and normalizes layout", () => {
        const platform = createWeiboPlatformForHost("s.weibo.com");
        const btn = { id: "btn" };
        const nameDiv = createAppendRecorder("name");
        const menuDiv = createAppendRecorder("menu");
        const infoEl = {
            children: [nameDiv, menuDiv]
        };

        const post = {
            querySelector(selector) {
                if (selector === ".content .info") {
                    return infoEl;
                }
                return null;
            },
            querySelectorAll() {
                return [];
            }
        };

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(nameDiv.appended, [btn]);
        assert.equal(nameDiv.style.display, "flex");
        assert.equal(nameDiv.style.alignItems, "center");
        assert.equal(nameDiv.style.gap, "4px");
    });

    await t.test("weibo retweet row inserts after the '转发微博' label", () => {
        const platform = createWeiboPlatformForHost("weibo.com");
        const btn = { id: "btn" };
        const parent = createInsertRecorder("retweet-parent");
        const retweetSpan = {
            textContent: "转发微博",
            nextSibling: { id: "after-retweet" },
            parentNode: parent
        };

        const post = {
            querySelector() {
                return null;
            },
            querySelectorAll(selector) {
                if (selector === "span") {
                    return [retweetSpan];
                }
                return [];
            }
        };

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(parent.calls, [{ node: btn, before: retweetSpan.nextSibling }]);
    });

    await t.test("x timeline inserts into header row beside user name", () => {
        const platform = createXPlatformForTests();
        const btn = { id: "btn" };
        const headerRow = createInsertRecorder("header-row");
        const userNameParent = {
            nextSibling: { id: "header-after" },
            parentNode: headerRow
        };

        const post = {
            querySelector(selector) {
                if (selector === '[data-testid="User-Name"]') {
                    return { parentElement: userNameParent };
                }
                return null;
            }
        };

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(headerRow.calls, [{ node: btn, before: userNameParent.nextSibling }]);
    });

    await t.test("x user page shares the same header-row placement as timeline", () => {
        const platform = createXPlatformForTests();
        const btn = { id: "btn" };
        const headerRow = createInsertRecorder("profile-header-row");
        const userNameParent = {
            nextSibling: null,
            parentNode: headerRow
        };

        const post = {
            querySelector(selector) {
                if (selector === '[data-testid="User-Name"]') {
                    return { parentElement: userNameParent };
                }
                return null;
            }
        };

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(headerRow.calls, [{ node: btn, before: null }]);
    });

    await t.test("x detail page prefers the top header row instead of the bottom timestamp row", () => {
        const platform = createXPlatformForTests();
        const btn = { id: "btn" };
        const headerRow = createInsertRecorder("detail-header-row");
        const timeRow = createInsertRecorder("detail-time-row");
        const userNameParent = {
            nextSibling: { id: "header-after" },
            parentNode: headerRow
        };
        const timeParent = {
            nextSibling: { id: "time-after" },
            parentNode: timeRow
        };

        const post = {
            querySelector(selector) {
                if (selector === '[data-testid="User-Name"]') {
                    return { parentElement: userNameParent };
                }
                if (selector === "time") {
                    return { parentElement: timeParent };
                }
                return null;
            }
        };

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(headerRow.calls, [{ node: btn, before: userNameParent.nextSibling }]);
        assert.deepEqual(timeRow.calls, []);
    });

    await t.test("x falls back to the time row when header row is unavailable", () => {
        const platform = createXPlatformForTests();
        const btn = { id: "btn" };
        const timeRow = createInsertRecorder("time-row");
        const timeParent = {
            nextElementSibling: { id: "after-time" },
            nextSibling: { id: "time-sibling" },
            parentNode: timeRow
        };

        const post = {
            querySelector(selector) {
                if (selector === "time") {
                    return { parentElement: timeParent };
                }
                return null;
            }
        };

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(timeRow.calls, [{ node: btn, before: timeParent.nextElementSibling }]);
    });

    await t.test("x finally falls back to the action group when neither header nor time row exists", () => {
        const platform = createXPlatformForTests();
        const btn = { id: "btn" };
        const actionParent = createInsertRecorder("action-parent");
        const actionGroup = {
            id: "group",
            parentElement: actionParent
        };

        const post = {
            querySelector(selector) {
                if (selector === '[role="group"]') {
                    return actionGroup;
                }
                return null;
            }
        };

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(actionParent.calls, [{ node: btn, before: actionGroup }]);
    });
});
