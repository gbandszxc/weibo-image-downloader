import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CONFIG } from "../src/config.ts";
import { createUi } from "../src/ui.ts";
import { createXPlatform } from "../src/platforms/x.ts";

function createXPlatformForTests(configOverrides = {}) {
    return createXPlatform({
        config: {
            ...CONFIG,
            DEBUG: false,
            ...configOverrides
        },
        windowRef: {
            location: {
                hostname: "x.com",
                pathname: "/home"
            }
        },
        log() {},
        fetchRef: async () => {
            throw new Error("fetch should not be called in unit tests");
        },
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

function createXPlatformWithFetch({ configOverrides = {}, response }) {
    return createXPlatform({
        config: {
            ...CONFIG,
            DEBUG: false,
            ...configOverrides
        },
        windowRef: {
            location: {
                hostname: "x.com",
                pathname: "/TimJayas/status/2058971197417914571",
                href: "https://x.com/TimJayas/status/2058971197417914571"
            }
        },
        log() {},
        fetchRef: async () => ({
            ok: true,
            json: async () => response
        }),
        getFileExtensionFromUrl(url, fallback = ".jpg") {
            const match = url.split("?")[0].match(/(\.[a-z0-9]+)$/i);
            return match ? match[1].toLowerCase() : fallback;
        }
    });
}

function createButtonElement() {
    return {
        setAttribute() {},
        className: "",
        innerHTML: "",
        title: "",
        style: {},
        addEventListener() {},
        remove() {}
    };
}

test("captured X GIF posts remain GIF items with video download disabled", () => {
    const fixture = JSON.parse(readFileSync(new URL("./fixtures/x-gif-dom.json", import.meta.url), "utf8"));
    const platform = createXPlatformForTests();
    for (const post of fixture.posts) {
        const mediaItems = platform.getDomMediaItems(createQueryContainer({
            'article img[src*="twimg.com"]': [{ src: post.video.poster }],
            video: [{
                ...post.video,
                closest(selector) {
                    return selector === '[data-testid="videoComponent"]' ? post.container : null;
                }
            }]
        }));
        assert.equal(mediaItems.length, 1);
        assert.equal(mediaItems[0].kind, "gif");
        assert.equal(mediaItems[0].imageUrl, post.video.src);
        assert.equal(mediaItems[0].imageExt, ".mp4");
    }
});

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

test("video-enabled x platform includes regular videos when a direct source is available", () => {
    const platform = createXPlatformForTests({ ENABLE_VIDEO_DOWNLOAD: true });

    const videoContainer = { textContent: "0:12" };
    const post = createQueryContainer({
        'article img[src*="twimg.com"]': [],
        video: [
            {
                currentSrc: "https://video.twimg.com/amplify_video/VideoOne.mp4",
                src: "https://video.twimg.com/amplify_video/VideoOne.mp4",
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

    assert.equal(mediaItems.length, 1);
    assert.equal(mediaItems[0].kind, "video");
    assert.equal(mediaItems[0].imageUrl, null);
    assert.equal(mediaItems[0].videoUrl, "https://video.twimg.com/amplify_video/VideoOne.mp4");
    assert.equal(mediaItems[0].videoExt, ".mp4");
});

test("x platform skips video cover images inside previewInterstitial containers", () => {
    const platform = createXPlatformForTests();

    const post = createQueryContainer({
        'article img[src*="twimg.com"]': [
            {
                src: "https://pbs.twimg.com/media/HO5QDQfbQAA3Rcq?format=jpg&name=360x360",
                alt: "嵌入式视频",
                closest(selector) {
                    return selector.includes("previewInterstitial") ? {} : null;
                }
            }
        ],
        video: []
    });

    const mediaItems = platform.getDomMediaItems(post);

    assert.equal(mediaItems.length, 0);
});

test("video-enabled x platform resolves highest bitrate video from TweetResultByRestId", async () => {
    const platform = createXPlatformWithFetch({
        configOverrides: { ENABLE_VIDEO_DOWNLOAD: true },
        response: {
            data: {
                tweetResult: {
                    result: {
                        legacy: {
                            extended_entities: {
                                media: [
                                    {
                                        id_str: "2058970349124136960",
                                        type: "video",
                                        video_info: {
                                            variants: [
                                                {
                                                    content_type: "application/x-mpegURL",
                                                    url: "https://video.twimg.com/amplify_video/demo/pl/list.m3u8"
                                                },
                                                {
                                                    bitrate: 2176000,
                                                    content_type: "video/mp4",
                                                    url: "https://video.twimg.com/amplify_video/demo/720.mp4"
                                                },
                                                {
                                                    bitrate: 10368000,
                                                    content_type: "video/mp4",
                                                    url: "https://video.twimg.com/amplify_video/demo/1080.mp4"
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        }
    });

    const mediaItems = await platform.resolvePostMediaItems({
        querySelector(selector) {
            if (selector.includes("previewInterstitial")) {
                return {};
            }
            return null;
        }
    }, []);

    assert.equal(mediaItems.length, 1);
    assert.equal(mediaItems[0].kind, "video");
    assert.equal(mediaItems[0].videoUrl, "https://video.twimg.com/amplify_video/demo/1080.mp4");
});

test("video-enabled x platform merges GraphQL videos with DOM photos for mixed posts", async () => {
    const platform = createXPlatformWithFetch({
        configOverrides: { ENABLE_VIDEO_DOWNLOAD: true },
        response: {
            data: {
                tweetResult: {
                    result: {
                        legacy: {
                            extended_entities: {
                                media: [
                                    {
                                        id_str: "2084954783560146944",
                                        type: "video",
                                        video_info: {
                                            variants: [
                                                {
                                                    bitrate: 832000,
                                                    content_type: "video/mp4",
                                                    url: "https://video.twimg.com/amplify_video/demo/832.mp4"
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        }
    });
    const post = {
        querySelector(selector) {
            if (selector.includes("previewInterstitial")) {
                return {};
            }
            return null;
        }
    };
    const photoItem = {
        id: "p1",
        kind: "image",
        label: "图片 1",
        imageUrl: "https://pbs.twimg.com/media/PhotoOne?format=jpg&name=orig",
        videoUrl: null,
        imageExt: ".jpg",
        videoExt: ".mov"
    };

    const mediaItems = await platform.resolvePostMediaItems(post, [photoItem]);

    assert.equal(mediaItems.length, 2);
    assert.equal(mediaItems[0].kind, "image");
    assert.equal(mediaItems[1].kind, "video");
    assert.equal(mediaItems[1].videoUrl, "https://video.twimg.com/amplify_video/demo/832.mp4");
});

test("video-enabled x platform resolves quoted photos when their DOM has not loaded", async () => {
    const platform = createXPlatformWithFetch({
        configOverrides: { ENABLE_VIDEO_DOWNLOAD: true },
        response: {
            data: {
                tweetResult: {
                    result: {
                        legacy: {
                            extended_entities: {
                                media: [{
                                    type: "video",
                                    video_info: {
                                        variants: [{
                                            bitrate: 832000,
                                            content_type: "video/mp4",
                                            url: "https://video.twimg.com/amplify_video/demo/832.mp4"
                                        }]
                                    }
                                }]
                            }
                        },
                        quoted_status_result: {
                            result: {
                                legacy: {
                                    extended_entities: {
                                        media: [{
                                            id_str: "2083542370659004416",
                                            type: "photo",
                                            media_url_https: "https://pbs.twimg.com/media/HOo6vz2a8AAtgUx.jpg"
                                        }]
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    const post = {
        querySelector(selector) {
            return selector.includes("previewInterstitial") ? {} : null;
        }
    };

    const mediaItems = await platform.resolvePostMediaItems(post, []);

    assert.equal(mediaItems.length, 2);
    assert.equal(mediaItems[0].imageUrl, "https://pbs.twimg.com/media/HOo6vz2a8AAtgUx.jpg?name=orig");
    assert.equal(mediaItems[1].videoUrl, "https://video.twimg.com/amplify_video/demo/832.mp4");
});

function createStatusPostWithVideo() {
    return {
        querySelectorAll(selector) {
            if (selector === "time") {
                return [{
                    closest(sel) {
                        return sel.includes("/status/")
                            ? { href: "https://x.com/Enorez2/status/2108593257039221196" }
                            : null;
                    }
                }];
            }
            return [];
        },
        querySelector(selector) {
            return selector.includes("previewInterstitial") ? {} : null;
        }
    };
}

function createVideoDomItem(url) {
    return {
        id: "dom-video-1",
        kind: "video",
        label: "视频 1",
        imageUrl: null,
        videoUrl: url,
        imageExt: ".jpg",
        videoExt: ".mp4"
    };
}

function createXPlatformForResolve({ fetchImpl }) {
    let fetchCount = 0;
    const platform = createXPlatform({
        config: { ...CONFIG, DEBUG: false, ENABLE_VIDEO_DOWNLOAD: true },
        windowRef: {
            location: {
                hostname: "x.com",
                pathname: "/Enorez2/status/2108593257039221196",
                href: "https://x.com/Enorez2/status/2108593257039221196"
            }
        },
        log() {},
        fetchRef: async (...args) => {
            fetchCount++;
            return fetchImpl(...args);
        },
        getFileExtensionFromUrl(url, fallback = ".jpg") {
            const match = url.split("?")[0].match(/(\.[a-z0-9]+)$/i);
            return match ? match[1].toLowerCase() : fallback;
        }
    });
    return { platform, getFetchCount: () => fetchCount };
}

test("video-enabled x platform corrects DOM video kind to GIF when API reports animated_gif", async () => {
    const { platform, getFetchCount } = createXPlatformForResolve({
        fetchImpl: async () => ({
            ok: true,
            json: async () => ({
                data: {
                    tweetResult: {
                        result: {
                            legacy: {
                                extended_entities: {
                                    media: [{
                                        id_str: "gif-media-1",
                                        type: "animated_gif",
                                        video_info: {
                                            variants: [{
                                                bitrate: 1280000,
                                                content_type: "video/mp4",
                                                url: "https://video.twimg.com/tweet_video/HUM5447X0AIfFa3.mp4"
                                            }]
                                        }
                                    }]
                                }
                            }
                        }
                    }
                }
            })
        })
    });

    const mediaItems = await platform.resolvePostMediaItems(
        createStatusPostWithVideo(),
        [createVideoDomItem("https://video.twimg.com/tweet_video/HUM5447X0AIfFa3.mp4?tag=12")]
    );

    assert.equal(getFetchCount(), 1);
    assert.equal(mediaItems.length, 1);
    assert.equal(mediaItems[0].kind, "gif");
    assert.equal(mediaItems[0].imageUrl, "https://video.twimg.com/tweet_video/HUM5447X0AIfFa3.mp4");
    assert.equal(mediaItems[0].videoUrl, null);
});

test("video-enabled x platform keeps DOM video without duplicating other API variants", async () => {
    const { platform, getFetchCount } = createXPlatformForResolve({
        fetchImpl: async () => ({
            ok: true,
            json: async () => ({
                data: {
                    tweetResult: {
                        result: {
                            legacy: {
                                extended_entities: {
                                    media: [{
                                        id_str: "video-media-1",
                                        type: "video",
                                        video_info: {
                                            variants: [{
                                                bitrate: 2176000,
                                                content_type: "video/mp4",
                                                url: "https://video.twimg.com/amplify_video/demo/720.mp4"
                                            }]
                                        }
                                    }]
                                }
                            }
                        }
                    }
                }
            })
        })
    });

    const mediaItems = await platform.resolvePostMediaItems(
        createStatusPostWithVideo(),
        [createVideoDomItem("https://video.twimg.com/amplify_video/demo/480.mp4")]
    );

    assert.equal(getFetchCount(), 1);
    assert.equal(mediaItems.length, 1);
    assert.equal(mediaItems[0].kind, "video");
    assert.equal(mediaItems[0].videoUrl, "https://video.twimg.com/amplify_video/demo/480.mp4");
});

test("video-enabled x platform skips API fetch when DOM already found a GIF badge", async () => {
    let fetchCalled = false;
    const { platform } = createXPlatformForResolve({
        fetchImpl: async () => {
            fetchCalled = true;
            throw new Error("fetch should not be called");
        }
    });
    const gifItem = {
        id: "dom-gif-1",
        kind: "gif",
        label: "GIF 1",
        imageUrl: "https://video.twimg.com/tweet_video/HUM5447X0AIfFa3.mp4",
        videoUrl: null,
        imageExt: ".mp4",
        videoExt: ".mov"
    };

    const mediaItems = await platform.resolvePostMediaItems(createStatusPostWithVideo(), [gifItem]);

    assert.equal(mediaItems.length, 1);
    assert.equal(mediaItems[0].kind, "gif");
    assert.equal(fetchCalled, false);
});

test("x platform with video disabled resolves only DOM photos for mixed posts", async () => {
    let fetchCalled = false;
    const platform = createXPlatform({
        configOverrides: { ENABLE_VIDEO_DOWNLOAD: false },
        fetchRef: async () => {
            fetchCalled = true;
            throw new Error("fetch should not be called");
        }
    });
    const post = {
        querySelector() {
            return {};
        }
    };
    const photoItem = {
        id: "p1",
        kind: "image",
        label: "图片 1",
        imageUrl: "https://pbs.twimg.com/media/PhotoOne?format=jpg&name=orig",
        videoUrl: null,
        imageExt: ".jpg",
        videoExt: ".mov"
    };

    const mediaItems = await platform.resolvePostMediaItems(post, [photoItem]);

    assert.equal(mediaItems.length, 1);
    assert.equal(mediaItems[0].kind, "image");
    assert.equal(fetchCalled, false);
});

test("video-enabled x platform allows async resolution for video-only detail posts", () => {
    const platform = createXPlatformWithFetch({
        configOverrides: { ENABLE_VIDEO_DOWNLOAD: true },
        response: {}
    });
    const post = {
        querySelector(selector) {
            if (selector === 'img[src*="video_thumb"], img[src*="amplify_video_thumb"], img[src*="ext_tw_video_thumb"], a[href*="/video/"], video, [data-testid="previewInterstitial"]') {
                return { src: "https://pbs.twimg.com/amplify_video_thumb/demo.jpg" };
            }
            return null;
        }
    };

    assert.equal(platform.shouldResolveEmptyMediaItems(post), true);
    assert.equal(platform.getPostId(post), "2058971197417914571");
});

test("x platform uses the timestamp link instead of a quoted post link", () => {
    const platform = createXPlatformForTests();
    const quotedTime = {
        closest() {
            return null;
        },
        parentElement: {
            querySelector() {
                return { href: "https://x.com/XaiabP/status/2083542379030835397/photo/1" };
            }
        }
    };
    const mainTime = {
        closest() {
            return { href: "https://x.com/XaiabP/status/2084954812937117767" };
        }
    };
    const post = {
        querySelector(selector) {
            return selector === "time" ? quotedTime : null;
        },
        querySelectorAll(selector) {
            if (selector === "time") {
                return [quotedTime, mainTime];
            }
            return [
                { href: "https://x.com/XaiabP/status/2083542379030835397/photo/1" },
                { href: "https://x.com/XaiabP/status/2084954812937117767" }
            ];
        }
    };

    assert.equal(platform.getPostId(post), "2084954812937117767");
});

test("video-enabled x platform does not inject placeholder buttons for plain detail posts", () => {
    const platform = createXPlatformWithFetch({
        configOverrides: { ENABLE_VIDEO_DOWNLOAD: true },
        response: {}
    });
    const post = {
        querySelector() {
            return null;
        },
        querySelectorAll() {
            return [];
        }
    };

    assert.equal(platform.shouldResolveEmptyMediaItems(post), false);
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

function createViewerArticle({ statusId, inLayers = true }) {
    return {
        closest(selector) {
            return inLayers && selector === "#layers" ? {} : null;
        },
        querySelectorAll(selector) {
            if (selector === "time") {
                return [{
                    closest(sel) {
                        return sel.includes("/status/")
                            ? { href: `https://x.com/someone/status/${statusId}` }
                            : null;
                    }
                }];
            }
            return [];
        },
        querySelector() {
            return null;
        }
    };
}

function createXPlatformForViewer({ configOverrides = {}, pathname, response }) {
    let fetchCount = 0;
    const platform = createXPlatform({
        config: { ...CONFIG, DEBUG: false, ...configOverrides },
        windowRef: {
            location: {
                hostname: "x.com",
                pathname
            }
        },
        log() {},
        fetchRef: async () => {
            fetchCount++;
            return {
                ok: true,
                json: async () => response
            };
        },
        getFileExtensionFromUrl(url, fallback = ".jpg") {
            const match = url.split("?")[0].match(/(\.[a-z0-9]+)$/i);
            return match ? match[1].toLowerCase() : fallback;
        }
    });
    return { platform, getFetchCount: () => fetchCount };
}

const photoViewerStatusId = "2108945148247744602";
const videoViewerStatusId = "2108443410713772335";

const photoStatusResponse = {
    data: {
        tweetResult: {
            result: {
                legacy: {
                    extended_entities: {
                        media: [
                            {
                                id_str: "photo-1",
                                type: "photo",
                                media_url_https: "https://pbs.twimg.com/media/PhotoA.jpg"
                            },
                            {
                                id_str: "photo-2",
                                type: "photo",
                                media_url_https: "https://pbs.twimg.com/media/PhotoB.jpg"
                            }
                        ]
                    }
                }
            }
        }
    }
};

const videoStatusResponse = {
    data: {
        tweetResult: {
            result: {
                legacy: {
                    extended_entities: {
                        media: [
                            {
                                id_str: "video-1",
                                type: "video",
                                video_info: {
                                    variants: [
                                        {
                                            bitrate: 832000,
                                            content_type: "video/mp4",
                                            url: "https://video.twimg.com/amplify_video/demo/832.mp4"
                                        },
                                        {
                                            bitrate: 2176000,
                                            content_type: "video/mp4",
                                            url: "https://video.twimg.com/amplify_video/demo/720.mp4"
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            }
        }
    }
};

test("media viewer main article resolves own photos via API with video download disabled", async () => {
    const { platform, getFetchCount } = createXPlatformForViewer({
        configOverrides: { ENABLE_VIDEO_DOWNLOAD: false },
        pathname: `/leo114119/status/${photoViewerStatusId}/photo/1`,
        response: photoStatusResponse
    });
    const viewerArticle = createViewerArticle({ statusId: photoViewerStatusId });

    assert.equal(platform.shouldResolveEmptyMediaItems(viewerArticle), true);

    const mediaItems = await platform.resolvePostMediaItems(viewerArticle, []);

    assert.equal(getFetchCount(), 1);
    assert.equal(mediaItems.length, 2);
    assert.equal(mediaItems[0].kind, "image");
    assert.equal(mediaItems[0].imageUrl, "https://pbs.twimg.com/media/PhotoA.jpg?name=orig");
    assert.equal(mediaItems[1].kind, "image");
    assert.equal(mediaItems[1].imageUrl, "https://pbs.twimg.com/media/PhotoB.jpg?name=orig");
});

test("media viewer main article hides video-only tweets when video download is disabled", async () => {
    const { platform, getFetchCount } = createXPlatformForViewer({
        configOverrides: { ENABLE_VIDEO_DOWNLOAD: false },
        pathname: `/AI_oldwang/status/${videoViewerStatusId}/video/1`,
        response: videoStatusResponse
    });
    const viewerArticle = createViewerArticle({ statusId: videoViewerStatusId });

    const mediaItems = await platform.resolvePostMediaItems(viewerArticle, []);

    assert.equal(getFetchCount(), 1);
    assert.deepEqual(mediaItems, []);
});

test("media viewer main article keeps videos when video download is enabled", async () => {
    const { platform } = createXPlatformForViewer({
        configOverrides: { ENABLE_VIDEO_DOWNLOAD: true },
        pathname: `/AI_oldwang/status/${videoViewerStatusId}/video/1`,
        response: videoStatusResponse
    });
    const viewerArticle = createViewerArticle({ statusId: videoViewerStatusId });

    const mediaItems = await platform.resolvePostMediaItems(viewerArticle, []);

    assert.equal(mediaItems.length, 1);
    assert.equal(mediaItems[0].kind, "video");
    assert.equal(mediaItems[0].videoUrl, "https://video.twimg.com/amplify_video/demo/720.mp4");
});

test("reply articles inside the media viewer never trigger API resolution with video download disabled", async () => {
    const { platform, getFetchCount } = createXPlatformForViewer({
        configOverrides: { ENABLE_VIDEO_DOWNLOAD: false },
        pathname: `/AI_oldwang/status/${videoViewerStatusId}/video/1`,
        response: {}
    });
    const replyArticle = createViewerArticle({ statusId: "2108799767946162176" });
    const photoItem = {
        id: "p1",
        kind: "image",
        label: "图片 1",
        imageUrl: "https://pbs.twimg.com/media/PhotoOne?format=jpg&name=orig",
        videoUrl: null,
        imageExt: ".jpg",
        videoExt: ".mov"
    };

    assert.equal(platform.shouldResolveEmptyMediaItems(replyArticle), false);

    const mediaItems = await platform.resolvePostMediaItems(replyArticle, [photoItem]);

    assert.equal(getFetchCount(), 0);
    assert.deepEqual(mediaItems, [photoItem]);
});

test("mixed posts do not duplicate photos whose DOM URLs omit the file extension", async () => {
    const { platform, getFetchCount } = createXPlatformForViewer({
        configOverrides: { ENABLE_VIDEO_DOWNLOAD: true },
        pathname: "/TimJayas/status/2058971197417914571",
        response: {
            data: {
                tweetResult: {
                    result: {
                        legacy: {
                            extended_entities: {
                                media: [
                                    {
                                        id_str: "photo-1",
                                        type: "photo",
                                        media_url_https: "https://pbs.twimg.com/media/PhotoOne.jpg"
                                    },
                                    {
                                        id_str: "video-1",
                                        type: "video",
                                        video_info: {
                                            variants: [{
                                                bitrate: 832000,
                                                content_type: "video/mp4",
                                                url: "https://video.twimg.com/amplify_video/demo/832.mp4"
                                            }]
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        }
    });
    const post = createStatusPostWithVideo();
    const domPhotoItem = {
        id: "dom-photo-1",
        kind: "image",
        label: "图片 1",
        imageUrl: "https://pbs.twimg.com/media/PhotoOne?format=jpg&name=orig",
        videoUrl: null,
        imageExt: ".jpg",
        videoExt: ".mov"
    };

    const mediaItems = await platform.resolvePostMediaItems(post, [domPhotoItem]);

    assert.equal(getFetchCount(), 1);
    assert.equal(mediaItems.length, 2);
    assert.equal(mediaItems[0].kind, "image");
    assert.equal(mediaItems[0].imageUrl, "https://pbs.twimg.com/media/PhotoOne?format=jpg&name=orig");
    assert.equal(mediaItems[1].kind, "video");
});

test("x platform API result lists own photos before quoted photos and videos", () => {
    const platform = createXPlatformForTests();
    const mediaItems = platform.getXMediaItemsFromStatus({
        data: {
            tweetResult: {
                result: {
                    legacy: {
                        extended_entities: {
                            media: [
                                {
                                    id_str: "video-1",
                                    type: "animated_gif",
                                    video_info: {
                                        variants: [{
                                            bitrate: 1280000,
                                            content_type: "video/mp4",
                                            url: "https://video.twimg.com/tweet_video/GifOne.mp4"
                                        }]
                                    }
                                },
                                {
                                    id_str: "photo-1",
                                    type: "photo",
                                    media_url_https: "https://pbs.twimg.com/media/PhotoA.jpg"
                                }
                            ]
                        }
                    },
                    quoted_status_result: {
                        result: {
                            legacy: {
                                extended_entities: {
                                    media: [{
                                        id_str: "quoted-photo-1",
                                        type: "photo",
                                        media_url_https: "https://pbs.twimg.com/media/QuotedPhoto.jpg"
                                    }]
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    assert.equal(mediaItems.length, 3);
    assert.deepEqual(mediaItems.map((item) => item.kind), ["image", "image", "gif"]);
    assert.equal(mediaItems[0].imageUrl, "https://pbs.twimg.com/media/PhotoA.jpg?name=orig");
    assert.equal(mediaItems[1].imageUrl, "https://pbs.twimg.com/media/QuotedPhoto.jpg?name=orig");
    assert.equal(mediaItems[2].imageUrl, "https://video.twimg.com/tweet_video/GifOne.mp4");
});
