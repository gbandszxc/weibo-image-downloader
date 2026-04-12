import test from "node:test";
import assert from "node:assert/strict";

import { CONFIG } from "../src/config.js";
import { createUi } from "../src/ui.js";
import { createXPlatform } from "../src/platforms/x.js";

function createXPlatformForTests() {
    return createXPlatform({
        windowRef: {
            location: {
                hostname: "x.com",
                pathname: "/home"
            }
        },
        log() {},
        getFileExtensionFromUrl(url, fallback = ".jpg") {
            if (!url || typeof url !== "string") {
                return fallback;
            }

            try {
                const pathname = new URL(url.startsWith("http") ? url : `https://${url}`).pathname;
                const match = pathname.match(/(\.[a-z0-9]+)$/i);
                return match ? match[1].toLowerCase() : fallback;
            } catch {
                const cleanUrl = url.split("?")[0];
                const match = cleanUrl.match(/(\.[a-z0-9]+)$/i);
                return match ? match[1].toLowerCase() : fallback;
            }
        }
    });
}

function createQueryContainer(selectorMap) {
    return {
        querySelectorAll(selector) {
            return selectorMap[selector] || [];
        },
        querySelector(selector) {
            const value = selectorMap[selector];
            if (Array.isArray(value)) {
                return value[0] || null;
            }
            return value || null;
        }
    };
}

function createButtonElement() {
    return {
        className: "",
        innerHTML: "",
        title: "",
        style: {},
        addEventListener() {},
        remove() {}
    };
}

test("x platform keeps photo items, converts GIF videos to downloadable media, and skips pure videos", () => {
    const platform = createXPlatformForTests();

    const gifContainer = { textContent: "Play GIF" };
    const videoContainer = { textContent: "0:12" };

    const post = createQueryContainer({
        'article img[src*="twimg.com"]': [
            {
                src: "https://pbs.twimg.com/media/PhotoOne?format=jpg&name=large",
                alt: ""
            },
            {
                src: "https://pbs.twimg.com/tweet_video_thumb/GifThumb.jpg?name=small",
                alt: ""
            },
            {
                src: "https://pbs.twimg.com/amplify_video_thumb/VideoThumb.jpg",
                alt: ""
            }
        ],
        video: [
            {
                currentSrc: "https://video.twimg.com/tweet_video/GifOne.mp4",
                src: "https://video.twimg.com/tweet_video/GifOne.mp4",
                poster: "https://pbs.twimg.com/tweet_video_thumb/GifThumb.jpg",
                querySelectorAll() {
                    return [];
                },
                closest() {
                    return gifContainer;
                }
            },
            {
                currentSrc: "",
                src: "blob:https://x.com/demo-video",
                poster: "https://pbs.twimg.com/amplify_video_thumb/VideoThumb.jpg",
                querySelectorAll() {
                    return [];
                },
                closest() {
                    return videoContainer;
                }
            }
        ]
    });

    const mediaItems = platform.getDomMediaItems(post);

    assert.equal(mediaItems.length, 2);
    assert.equal(mediaItems[0].kind, "image");
    assert.equal(mediaItems[0].imageUrl, "https://pbs.twimg.com/media/PhotoOne?format=jpg&name=orig");
    assert.equal(mediaItems[0].imageExt, ".jpg");
    assert.equal(mediaItems[1].kind, "gif");
    assert.equal(mediaItems[1].imageUrl, "https://video.twimg.com/tweet_video/GifOne.mp4");
    assert.equal(mediaItems[1].imageExt, ".mp4");
    assert.equal(mediaItems[1].videoUrl, null);
});

test("x platform inserts download button beside the time link on any tweet layout", () => {
    const platform = createXPlatformForTests();
    const btn = { id: "download-btn" };
    const afterNode = { id: "after-time-link" };
    let insertedNode = null;
    let insertedBefore = null;

    const timeLinkParent = {
        insertBefore(node, before) {
            insertedNode = node;
            insertedBefore = before;
        }
    };

    const timeLink = {
        nextSibling: afterNode,
        parentNode: timeLinkParent
    };

    const timeEl = {
        parentElement: timeLink
    };

    const post = {
        querySelector(selector) {
            if (selector === "time") {
                return timeEl;
            }

            return null;
        }
    };

    const inserted = platform.insertDownloadButton({ post, btn });

    assert.equal(inserted, true);
    assert.equal(insertedNode, btn);
    assert.equal(insertedBefore, afterNode);
});

test("x platform prefers the header row over the detail timestamp row", () => {
    const platform = createXPlatformForTests();
    const btn = { id: "download-btn" };
    const headerAfterNode = { id: "header-after" };
    const timeAfterNode = { id: "time-after" };
    const calls = [];

    const headerRow = {
        insertBefore(node, before) {
            calls.push({ target: "header", node, before });
        }
    };

    const timeRow = {
        insertBefore(node, before) {
            calls.push({ target: "time", node, before });
        }
    };

    const userNameParent = {
        nextSibling: headerAfterNode,
        parentNode: headerRow
    };

    const timeParent = {
        nextSibling: timeAfterNode,
        parentNode: timeRow
    };

    const post = {
        querySelector(selector) {
            if (selector === '[data-testid="User-Name"]') {
                return {
                    parentElement: userNameParent
                };
            }

            if (selector === "time") {
                return {
                    parentElement: timeParent
                };
            }

            return null;
        }
    };

    const inserted = platform.insertDownloadButton({ post, btn });

    assert.equal(inserted, true);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], {
        target: "header",
        node: btn,
        before: headerAfterNode
    });
});

test("ui creates an initial X download button for GIF media discovered from DOM videos", () => {
    const gifItem = {
        id: "dom-gif-1",
        kind: "gif",
        label: "GIF 1",
        imageUrl: "https://video.twimg.com/tweet_video/GifOne.mp4",
        videoUrl: null,
        imageExt: ".mp4",
        videoExt: ".mov"
    };

    const ui = createUi({
        config: {
            ...CONFIG,
            DEBUG: false
        },
        utils: {
            getOriginalImageUrl: (url) => url,
            getFileExtensionFromUrl: () => ".jpg",
            downloadMediaItems() {},
            getPlatformAdapter() {
                return {
                    getDomMediaItems() {
                        return [gifItem];
                    },
                    findImagesInPost() {
                        return [];
                    },
                    resolvePostMediaItems() {
                        return [gifItem];
                    },
                    getPostId() {
                        return "x_test";
                    },
                    getPostSelectors() {
                        return [];
                    },
                    shouldSkipPost() {
                        return false;
                    },
                    insertDownloadButton() {
                        return true;
                    },
                    afterInjectDownloadButtons() {},
                    initObservers() {}
                };
            }
        },
        windowRef: {},
        documentRef: {
            getElementById() {
                return null;
            },
            createElement() {
                return createButtonElement();
            },
            head: {
                appendChild() {}
            },
            body: {
                appendChild() {}
            },
            addEventListener() {},
            removeEventListener() {}
        },
        addStyle() {}
    });

    const post = {
        querySelector() {
            return null;
        }
    };

    const btn = ui.createDownloadButton(post);

    assert.ok(btn);
    assert.equal(btn.innerHTML, "↓1");
});
