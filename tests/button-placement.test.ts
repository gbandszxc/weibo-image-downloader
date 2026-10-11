import test from "node:test";
import assert from "node:assert/strict";

import { createWeiboPlatform } from "../src/platforms/weibo.ts";
import { createXPlatform } from "../src/platforms/x.ts";

function createWeiboPlatformForLocation({ hostname, pathname = "/" }: { hostname: string; pathname?: string }) {
    return createWeiboPlatform({
        windowRef: {
            location: { hostname, pathname },
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
            } as Location
        },
        log() {},
        getFileExtensionFromUrl(_url, fallback = ".jpg") {
            return fallback;
        }
    });
}

function createAppendRecorder(label: string) {
    return {
        label,
        appended: [] as unknown[],
        styles: {},
        classList: {
            contains(className: string) {
                return className === "menu" ? label === "menu" : false;
            }
        },
        appendChild(node: unknown) {
            this.appended.push(node);
        },
        style: {} as Record<string, string>
    };
}

function createInsertRecorder(label: string) {
    return {
        label,
        calls: [] as { node: unknown; before: unknown }[],
        insertBefore(node: unknown, before: unknown) {
            this.calls.push({ node, before });
        }
    };
}

test("button placement matches current weibo and x page rules", async (t) => {
    await t.test("weibo timeline inserts before icons-plus block", () => {
        const platform = createWeiboPlatformForLocation({ hostname: "weibo.com" });
        const btn = { id: "btn" } as HTMLElement;
        const parent = createInsertRecorder("timeline-parent");
        const iconsPlusEl = { id: "icons-plus", parentNode: parent };

        const post = {
            querySelector(selector: string) {
                if (selector === 'div[class*="_iconsPlus_"]') {
                    return iconsPlusEl;
                }
                return null;
            },
            querySelectorAll() {
                return [];
            }
        } as unknown as Element;

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(parent.calls, [{ node: btn, before: iconsPlusEl }]);
    });

    await t.test("weibo user page appends into header nickname area", () => {
        const platform = createWeiboPlatformForLocation({ hostname: "weibo.com" });
        const btn = { id: "btn" } as HTMLElement;
        const headerEl = createAppendRecorder("woo-nickname");

        const post = {
            querySelector(selector: string) {
                if (selector === ".woo-nickname") {
                    return headerEl;
                }
                return null;
            },
            querySelectorAll() {
                return [];
            }
        } as unknown as Element;

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(headerEl.appended, [btn]);
    });

    await t.test("weibo detail page appends into suffix box", () => {
        const platform = createWeiboPlatformForLocation({ hostname: "weibo.com" });
        const btn = { id: "btn" } as HTMLElement;
        const suffixBox = createAppendRecorder("suffix-box");

        const post = {
            querySelector(selector: string) {
                if (selector === 'div[class*="_suffixbox"]') {
                    return suffixBox;
                }
                return null;
            },
            querySelectorAll() {
                return [];
            }
        } as unknown as Element;

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(suffixBox.appended, [btn]);
    });

    await t.test("weibo search page appends to author info row and normalizes layout", () => {
        const platform = createWeiboPlatformForLocation({ hostname: "s.weibo.com" });
        const btn = { id: "btn" } as HTMLElement;
        const nameDiv = createAppendRecorder("name");
        const menuDiv = createAppendRecorder("menu");
        const infoEl = {
            children: [nameDiv, menuDiv]
        };

        const post = {
            querySelector(selector: string) {
                if (selector === ".content .info") {
                    return infoEl;
                }
                return null;
            },
            querySelectorAll() {
                return [];
            }
        } as unknown as Element;

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(nameDiv.appended, [btn]);
        assert.equal(nameDiv.style.display, "flex");
        assert.equal(nameDiv.style.alignItems, "center");
        assert.equal(nameDiv.style.gap, "4px");
    });

    await t.test("weibo retweet row inserts after the '转发微博' label", () => {
        const platform = createWeiboPlatformForLocation({ hostname: "weibo.com" });
        const btn = { id: "btn" } as HTMLElement;
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
            querySelectorAll(selector: string) {
                if (selector === "span") {
                    return [retweetSpan];
                }
                return [];
            }
        } as unknown as Element;

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(parent.calls, [{ node: btn, before: retweetSpan.nextSibling }]);
    });

    await t.test("mobile weibo timeline appends into the username row", () => {
        const platform = createWeiboPlatformForLocation({ hostname: "m.weibo.cn" });
        const btn = { id: "btn" } as HTMLElement;
        const nameRow = createAppendRecorder("mobile-name-row");

        const post = {
            querySelector(selector: string) {
                if (selector === "header.weibo-top .m-text-box h3.m-text-cut") {
                    return nameRow;
                }
                return null;
            },
            querySelectorAll() {
                return [];
            }
        } as unknown as Element;

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(nameRow.appended, [btn]);
        assert.equal(nameRow.style.display, "inline-flex");
        assert.equal(nameRow.style.alignItems, "center");
        assert.equal(nameRow.style.flexWrap, "nowrap");
        assert.equal(nameRow.style.columnGap, "4px");
    });

    await t.test("mobile weibo profile appends to username row when there is no follow block", () => {
        const platform = createWeiboPlatformForLocation({ hostname: "m.weibo.cn", pathname: "/profile/7971151006" });
        const btn = { id: "btn" } as HTMLElement;
        const nameRow = createAppendRecorder("mobile-profile-name-row");

        const post = {
            querySelector(selector: string) {
                if (selector === "header.weibo-top .m-text-box h3.m-text-cut") {
                    return nameRow;
                }
                return null;
            },
            querySelectorAll() {
                return [];
            }
        } as unknown as Element;

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(nameRow.appended, [btn]);
    });

    await t.test("mobile weibo search uses the username row placement", () => {
        const platform = createWeiboPlatformForLocation({ hostname: "m.weibo.cn", pathname: "/search" });
        const btn = { id: "btn" } as HTMLElement;
        const nameRow = createAppendRecorder("mobile-search-name-row");

        const post = {
            querySelector(selector: string) {
                if (selector === "header.weibo-top .m-text-box h3.m-text-cut") {
                    return nameRow;
                }
                return null;
            },
            querySelectorAll() {
                return [];
            }
        } as unknown as Element;

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(nameRow.appended, [btn]);
    });

    await t.test("mobile weibo falls back to appending the whole header when the username row is unavailable", () => {
        const platform = createWeiboPlatformForLocation({ hostname: "m.weibo.cn", pathname: "/search" });
        const btn = { id: "btn" } as HTMLElement;
        const header = createAppendRecorder("mobile-search-header");

        const post = {
            querySelector(selector: string) {
                if (selector === "header.weibo-top .m-text-box h3.m-text-cut") {
                    return null;
                }
                if (selector === "header.weibo-top") {
                    return header;
                }
                return null;
            },
            querySelectorAll() {
                return [];
            }
        } as unknown as Element;

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(header.appended, [btn]);
    });

    await t.test("mobile weibo skips nested article nodes to avoid duplicate buttons", () => {
        const platform = createWeiboPlatformForLocation({ hostname: "m.weibo.cn", pathname: "/profile/7971151006" });

        const nestedArticle = {
            matches(selector: string) {
                return selector === "article.weibo-main";
            }
        } as unknown as Element;

        const rootCard = {
            matches(selector: string) {
                return selector === ".card.m-panel.card9";
            }
        } as unknown as Element;

        assert.equal(platform.shouldSkipPost(nestedArticle), true);
        assert.equal(platform.shouldSkipPost(rootCard), false);
    });

    await t.test("x timeline inserts into header row beside user name", () => {
        const platform = createXPlatformForTests();
        const btn = { id: "btn" } as HTMLElement;
        const headerRow = createInsertRecorder("header-row");
        const userNameParent = {
            nextSibling: { id: "header-after" },
            parentNode: headerRow
        };

        const post = {
            querySelector(selector: string) {
                if (selector === '[data-testid="User-Name"]') {
                    return { parentElement: userNameParent };
                }
                return null;
            }
        } as unknown as Element;

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(headerRow.calls, [{ node: btn, before: userNameParent.nextSibling }]);
    });

    await t.test("x user page shares the same header-row placement as timeline", () => {
        const platform = createXPlatformForTests();
        const btn = { id: "btn" } as HTMLElement;
        const headerRow = createInsertRecorder("profile-header-row");
        const userNameParent = {
            nextSibling: null,
            parentNode: headerRow
        };

        const post = {
            querySelector(selector: string) {
                if (selector === '[data-testid="User-Name"]') {
                    return { parentElement: userNameParent };
                }
                return null;
            }
        } as unknown as Element;

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(headerRow.calls, [{ node: btn, before: null }]);
    });

    await t.test("x detail page prefers the top header row instead of the bottom timestamp row", () => {
        const platform = createXPlatformForTests();
        const btn = { id: "btn" } as HTMLElement;
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
            querySelector(selector: string) {
                if (selector === '[data-testid="User-Name"]') {
                    return { parentElement: userNameParent };
                }
                if (selector === "time") {
                    return { parentElement: timeParent };
                }
                return null;
            }
        } as unknown as Element;

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(headerRow.calls, [{ node: btn, before: userNameParent.nextSibling }]);
        assert.deepEqual(timeRow.calls, []);
    });

    await t.test("x falls back to the time row when header row is unavailable", () => {
        const platform = createXPlatformForTests();
        const btn = { id: "btn" } as HTMLElement;
        const timeRow = createInsertRecorder("time-row");
        const timeParent = {
            nextElementSibling: { id: "after-time" },
            nextSibling: { id: "time-sibling" },
            parentNode: timeRow
        };

        const post = {
            querySelector(selector: string) {
                if (selector === "time") {
                    return { parentElement: timeParent };
                }
                return null;
            }
        } as unknown as Element;

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(timeRow.calls, [{ node: btn, before: timeParent.nextElementSibling }]);
    });

    await t.test("x finally falls back to the action group when neither header nor time row exists", () => {
        const platform = createXPlatformForTests();
        const btn = { id: "btn" } as HTMLElement;
        const actionParent = createInsertRecorder("action-parent");
        const actionGroup = {
            id: "group",
            parentElement: actionParent
        };

        const post = {
            querySelector(selector: string) {
                if (selector === '[role="group"]') {
                    return actionGroup;
                }
                return null;
            }
        } as unknown as Element;

        const inserted = platform.insertDownloadButton({ post, btn });

        assert.equal(inserted, true);
        assert.deepEqual(actionParent.calls, [{ node: btn, before: actionGroup }]);
    });
});
