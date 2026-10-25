import test from "node:test";
import assert from "node:assert/strict";

import { CONFIG } from "../src/config.ts";
import { createUtils } from "../src/utils.ts";
import type { UtilsWindowRef } from "../src/utils.ts";
import { createUi } from "../src/ui.ts";
import type { MediaItem, UiConfig, UiPlatformAdapter, UiUtils } from "../src/ui.ts";
import { createWeiboPlatform } from "../src/platforms/weibo.ts";
import type { WeiboGmXmlhttpRequestDetails, WeiboMediaItem, WeiboPlatform, WeiboPlatformConfig, WeiboStatus, WeiboVueElement } from "../src/platforms/weibo.ts";

type MediaItemSeed = Partial<MediaItem> & Pick<MediaItem, "kind" | "imageUrl">;

/** 测试侧类型辅助：允许只写断言关心的字段，运行时原样返回同一对象。 */
function asMediaItem(seed: MediaItemSeed): MediaItem {
    return seed as MediaItem;
}

function createUtilsForWeibo() {
    return createUtils({
        config: {
            ...CONFIG,
            DEBUG: false
        },
        windowRef: {
            location: {
                hostname: "weibo.com"
            },
            URL,
            document: {
                createElement() {
                    return {
                        click() {}
                    };
                }
            },
            open() {}
        } as unknown as UtilsWindowRef,
        fetchRef: async () => {
            throw new Error("fetch should not be called in unit tests");
        },
        gmDownload: null,
        ui: {
            showToast() {}
        }
    });
}

function createUiForWeibo() {
    return createUi({
        config: {
            ...CONFIG,
            DEBUG: false
        } as UiConfig,
        utils: {
            getOriginalImageUrl: (url: string) => url,
            getFileExtensionFromUrl: () => ".jpg",
            log() {},
            getPlatformAdapter(): UiPlatformAdapter {
                return {
                    findImagesInPost() {
                        return [];
                    },
                    isVideoThumbnailImage(img) {
                        if (!img || typeof img.closest !== "function") {
                            return false;
                        }

                        const pictureMain = img.closest(".woo-picture-main");
                        if (!pictureMain || typeof pictureMain.querySelector !== "function") {
                            return false;
                        }

                        return !!pictureMain.querySelector('[class*="_videotime_"], [class*="_videobox_"], .woo-font--play');
                    },
                    selectPreferredMediaItems(fallbackItems, resolvedMediaItems, apiResolved) {
                        return apiResolved ? resolvedMediaItems : fallbackItems;
                    },
                    resolvePostMediaItems(_postContainer, fallbackItems) {
                        return fallbackItems;
                    },
                    getPostId() {
                        return "weibo_test";
                    },
                    getPostSelectors() {
                        return [];
                    },
                    shouldSkipPost() {
                        return false;
                    },
                    insertDownloadButton() {
                        return false;
                    },
                    getPostUrl() {
                        return null;
                    },
                    injectGotoOriginalMenuItem() {},
                    afterInjectDownloadButtons() {},
                    initObservers() {}
                };
            }
        } as unknown as UiUtils,
        windowRef: {} as Window,
        documentRef: {
            getElementById() {
                return null;
            },
            createElement() {
                return {
                    id: "",
                    textContent: "",
                    appendChild() {},
                    addEventListener() {},
                    removeEventListener() {},
                    remove() {}
                };
            },
            head: {
                appendChild() {}
            },
            body: {
                appendChild() {}
            },
            addEventListener() {},
            removeEventListener() {}
        } as unknown as Document,
        addStyle() {}
    });
}

interface TestElement {
    tagName: string;
    id: string;
    type: string;
    value: string;
    checked: boolean;
    className: string;
    textContent: string;
    src: string;
    alt: string;
    title: string;
    loading: string;
    decoding: string;
    referrerPolicy: string;
    draggable: boolean;
    disabled: boolean;
    children: TestElement[];
    parentNode: TestElement | null;
    style: Record<string, string>;
    setAttribute(name: string, value: string): void;
    appendChild(child: TestElement): void;
    addEventListener(type: string, listener: () => void): void;
    removeEventListener(type: string): void;
    remove(): void;
    querySelectorAll(selector: string): TestElement[];
}

function createTestElement(tagName: string): TestElement {
    return {
        tagName,
        id: "",
        type: "",
        value: "",
        checked: false,
        className: "",
        textContent: "",
        src: "",
        alt: "",
        title: "",
        loading: "",
        decoding: "",
        referrerPolicy: "",
        draggable: false,
        disabled: false,
        children: [],
        parentNode: null,
        style: {},
        setAttribute(name, value) {
            Object.assign(this, { [name]: value });
        },
        appendChild(child) {
            child.parentNode = this;
            this.children.push(child);
        },
        addEventListener() {},
        removeEventListener() {},
        remove() {
            if (!this.parentNode) {
                return;
            }

            this.parentNode.children = this.parentNode.children.filter((node) => node !== this);
            this.parentNode = null;
        },
        querySelectorAll(selector) {
            const results: TestElement[] = [];
            const visit = (node: TestElement) => {
                if (selector === 'input[type="checkbox"]' && node.tagName === "input" && node.type === "checkbox") {
                    results.push(node);
                }

                if (
                    selector === 'input[type="checkbox"]:checked' &&
                    node.tagName === "input" &&
                    node.type === "checkbox" &&
                    node.checked
                ) {
                    results.push(node);
                }

                node.children.forEach(visit);
            };

            this.children.forEach(visit);
            return results;
        }
    };
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

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

function findElementsByClassName(root: TestElement, className: string) {
    const results: TestElement[] = [];
    const expectedClassNames = className.split(/\s+/).filter(Boolean);
    const visit = (node: TestElement) => {
        const actualClassNames = String(node.className || "").split(/\s+/).filter(Boolean);
        if (expectedClassNames.every((name) => actualClassNames.includes(name))) {
            results.push(node);
        }

        node.children.forEach(visit);
    };

    visit(root);
    return results;
}

function createUiForModalTests() {
    const head = createTestElement("head");
    const body = createTestElement("body");

    const documentRef = {
        getElementById() {
            return null;
        },
        createElement(tagName: string) {
            return createTestElement(tagName);
        },
        head,
        body,
        addEventListener() {},
        removeEventListener() {}
    };

    const ui = createUi({
        config: {
            ...CONFIG,
            DEBUG: false
        } as UiConfig,
        utils: {
            getOriginalImageUrl: (url: string) => url,
            getFileExtensionFromUrl: () => ".jpg",
            log() {},
            getPlatformAdapter(): UiPlatformAdapter {
                return {
                    findImagesInPost() {
                        return [];
                    },
                    resolvePostMediaItems(_postContainer, fallbackItems) {
                        return fallbackItems;
                    },
                    getPostId() {
                        return "weibo_test";
                    },
                    getPostSelectors() {
                        return [];
                    },
                    shouldSkipPost() {
                        return false;
                    },
                    insertDownloadButton() {
                        return false;
                    },
                    afterInjectDownloadButtons() {},
                    initObservers() {}
                };
            }
        } as unknown as UiUtils,
        windowRef: {} as Window,
        documentRef: documentRef as unknown as Document,
        addStyle() {}
    });

    return { ui, documentRef };
}

function createWeiboPlatformForTests(configOverrides: WeiboPlatformConfig = {}) {
    return createWeiboPlatform({
        config: {
            ...CONFIG,
            DEBUG: false,
            ...configOverrides
        } as WeiboPlatformConfig,
        windowRef: {
            location: {
                hostname: "weibo.com",
                pathname: "/"
            },
            open() {}
        },
        fetchRef: async () => {
            throw new Error("fetch should not be called in unit tests");
        },
        log() {},
        getFileBasenameFromUrl(url, fallback) {
            if (!url || typeof url !== "string") {
                return fallback;
            }

            try {
                const pathname = new URL(url.startsWith("http") ? url : `https://${url}`).pathname;
                const parts = pathname.split("/");
                const lastSegment = parts[parts.length - 1] || "";
                return lastSegment.replace(/\.[^.]+$/, "") || fallback;
            } catch {
                const cleanUrl = url.split("?")[0];
                const parts = cleanUrl.split("/");
                const lastSegment = parts[parts.length - 1] || "";
                return lastSegment.replace(/\.[^.]+$/, "") || fallback;
            }
        },
        getFileExtensionFromUrl(url, fallback = ".jpg") {
            if (!url || typeof url !== "string") {
                return fallback;
            }

            try {
                const fullUrl = url.startsWith("http") ? url : `https://${url}`;
                const pathname = new URL(fullUrl).pathname;
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

function createSearchWeiboPlatformWithGm({ configOverrides = {}, response }: {
    configOverrides?: WeiboPlatformConfig;
    response: unknown;
}) {
    let lastGmOptions: WeiboGmXmlhttpRequestDetails | null = null;
    const platform = createWeiboPlatform({
        config: {
            ...CONFIG,
            DEBUG: false,
            ...configOverrides
        } as WeiboPlatformConfig,
        windowRef: {
            location: {
                hostname: "s.weibo.com",
                pathname: "/weibo"
            },
            open() {}
        },
        fetchRef: async () => {
            throw new Error("search page should use GM_xmlhttpRequest for cross-origin status fetch");
        },
        gmXmlhttpRequest(options) {
            lastGmOptions = options;
            options.onload({
                status: 200,
                responseText: JSON.stringify(response)
            });
        },
        log() {},
        getFileBasenameFromUrl(url, fallback) {
            const parts = String(url || "").split("/");
            const lastSegment = parts[parts.length - 1] || "";
            return lastSegment.replace(/\.[^.]+$/, "") || fallback;
        },
        getFileExtensionFromUrl(url, fallback = ".jpg") {
            const match = String(url || "").split("?")[0].match(/(\.[a-z0-9]+)$/i);
            return match ? match[1].toLowerCase() : fallback;
        }
    }) as WeiboPlatform & { getLastGmOptions(): WeiboGmXmlhttpRequestDetails };

    platform.getLastGmOptions = () => lastGmOptions as WeiboGmXmlhttpRequestDetails;
    return platform;
}

function createSearchWeiboPlatformWithForbiddenGm() {
    return createWeiboPlatform({
        config: {
            ...CONFIG,
            DEBUG: false,
            ENABLE_VIDEO_DOWNLOAD: true
        } as WeiboPlatformConfig,
        windowRef: {
            location: {
                hostname: "s.weibo.com",
                pathname: "/weibo"
            },
            open() {}
        },
        fetchRef: async () => {
            throw new Error("search page should use GM_xmlhttpRequest for cross-origin status fetch");
        },
        gmXmlhttpRequest(options) {
            options.onload({
                status: 200,
                responseText: JSON.stringify({ error: "Forbidden" })
            });
        },
        log() {},
        getFileBasenameFromUrl(url, fallback) {
            return fallback || String(url || "");
        },
        getFileExtensionFromUrl(url, fallback = ".jpg") {
            const match = String(url || "").split("?")[0].match(/(\.[a-z0-9]+)$/i);
            return match ? match[1].toLowerCase() : fallback;
        }
    });
}

const sampleStatus = {
    pic_ids: [
        "ba6a4518gy1ic2xakxgvwj23b04eoe83",
        "ba6a4518gy1ic2xnphrkkj22c0340u0y",
        "ba6a4518gy1ic2xnuzaokj22c0340u0y"
    ],
    pic_infos: {
        ba6a4518gy1ic2xakxgvwj23b04eoe83: {
            largest: {
                url: "https://wx4.sinaimg.cn/large/ba6a4518gy1ic2xakxgvwj23b04eoe83.jpg"
            },
            original: {
                url: "https://wx4.sinaimg.cn/orj1080/ba6a4518gy1ic2xakxgvwj23b04eoe83.jpg"
            },
            video: "https://livephoto.us.sinaimg.cn/004cDa3fgx08wMoVqJUz0f0f0100qXbm0k01.mov?Expires=1775909582&ssig=ShZymldLgC&KID=unistore,video",
            type: "livephoto"
        },
        ba6a4518gy1ic2xnphrkkj22c0340u0y: {
            largest: {
                url: "https://wx3.sinaimg.cn/large/ba6a4518gy1ic2xnphrkkj22c0340u0y.jpg"
            },
            original: {
                url: "https://wx3.sinaimg.cn/orj1080/ba6a4518gy1ic2xnphrkkj22c0340u0y.jpg"
            },
            video: "https://livephoto.us.sinaimg.cn/003vMf1agx08wMpMmwr60f0f0100r4Jm0k01.mov?Expires=1775909582&ssig=fO0sqteRS%2B&KID=unistore,video",
            type: "livephoto"
        },
        ba6a4518gy1ic2xnuzaokj22c0340u0y: {
            largest: {
                url: "https://wx4.sinaimg.cn/large/ba6a4518gy1ic2xnuzaokj22c0340u0y.jpg"
            },
            original: {
                url: "https://wx4.sinaimg.cn/orj1080/ba6a4518gy1ic2xnuzaokj22c0340u0y.jpg"
            },
            video: "https://livephoto.us.sinaimg.cn/001osVaCgx08wMpL0C3C0f0f0100r0cu0k01.mov?Expires=1775909582&ssig=Hvzd%2F086pX&KID=unistore,video",
            type: "livephoto"
        }
    }
};

const sampleRetweetStatus = {
    mblogid: "QzYBrcwa8",
    pic_num: 0,
    pic_ids: [],
    pic_infos: {},
    retweeted_status: {
        mblogid: "QzScRjYtN",
        pic_num: 9,
        pic_ids: [
            "006QzRougy1ibzk7pm7ecj32c0340b29",
            "006QzRougy1ibzk6ragnij32c03407wh",
            "006QzRougy1ibzk6mb4ntj32c0340e81",
            "006QzRougy1ibzk6w2mzwj31o02804hz",
            "006QzRougy1ibzk74uxc4j32c0340b29",
            "006QzRougy1ibzk70dt1dj32dc35shdt",
            "006QzRougy1ibzk6nn7ykj32dc35sb2b",
            "006QzRougy1ibzk6pkpwdj33b04iuhdu",
            "006QzRougy1ibzk6qluc9j334445hhdu"
        ],
        pic_infos: {
            "006QzRougy1ibzk7pm7ecj32c0340b29": {
                largest: { url: "https://wx1.sinaimg.cn/large/006QzRougy1ibzk7pm7ecj32c0340b29.jpg" },
                video: "https://livephoto.us.sinaimg.cn/0011jHTRgx08wHLddcBN0f0f0100vWoO0k01.mov"
            },
            "006QzRougy1ibzk6ragnij32c03407wh": {
                largest: { url: "https://wx3.sinaimg.cn/large/006QzRougy1ibzk6ragnij32c03407wh.jpg" },
                video: "https://livephoto.us.sinaimg.cn/0047acw4gx08wHL9DYJV0f0f0100j65f0k01.mov"
            },
            "006QzRougy1ibzk6mb4ntj32c0340e81": {
                largest: { url: "https://wx4.sinaimg.cn/large/006QzRougy1ibzk6mb4ntj32c0340e81.jpg" },
                video: "https://livephoto.us.sinaimg.cn/004C0IHygx08wHL9Shvp0f0f0100j6t20k01.mov"
            },
            "006QzRougy1ibzk6w2mzwj31o02804hz": {
                largest: { url: "https://wx4.sinaimg.cn/large/006QzRougy1ibzk6w2mzwj31o02804hz.jpg" },
                video: "https://livephoto.us.sinaimg.cn/002oLAhhgx08wHLakvvW0f0f0100y3YA0k01.mov"
            },
            "006QzRougy1ibzk74uxc4j32c0340b29": {
                largest: { url: "https://wx1.sinaimg.cn/large/006QzRougy1ibzk74uxc4j32c0340b29.jpg" }
            },
            "006QzRougy1ibzk70dt1dj32dc35shdt": {
                largest: { url: "https://wx3.sinaimg.cn/large/006QzRougy1ibzk70dt1dj32dc35shdt.jpg" }
            },
            "006QzRougy1ibzk6nn7ykj32dc35sb2b": {
                largest: { url: "https://wx1.sinaimg.cn/large/006QzRougy1ibzk6nn7ykj32dc35sb2b.jpg" }
            },
            "006QzRougy1ibzk6pkpwdj33b04iuhdu": {
                largest: { url: "https://wx2.sinaimg.cn/large/006QzRougy1ibzk6pkpwdj33b04iuhdu.jpg" }
            },
            "006QzRougy1ibzk6qluc9j334445hhdu": {
                largest: { url: "https://wx4.sinaimg.cn/large/006QzRougy1ibzk6qluc9j334445hhdu.jpg" }
            }
        }
    }
};

const sampleGifStatus = {
    pic_ids: [
        "006g4E90ly1ic0o6472r0g30ha0cub2d",
        "006g4E90ly1ic0o67wxswj30ta0gi48x"
    ],
    pic_infos: {
        "006g4E90ly1ic0o6472r0g30ha0cub2d": {
            type: "gif",
            largest: {
                url: "https://wx1.sinaimg.cn/large/006g4E90ly1ic0o6472r0g30ha0cub2d.gif"
            },
            original: {
                url: "https://wx1.sinaimg.cn/orj1080/006g4E90ly1ic0o6472r0g30ha0cub2d.gif"
            },
            video: "http://g.us.sinaimg.cn/o0/8xaw2eGLlx08wJk0Niso010412000yee0E010.mp4?label=gif_mp4"
        },
        "006g4E90ly1ic0o67wxswj30ta0gi48x": {
            type: "pic",
            largest: {
                url: "https://wx1.sinaimg.cn/large/006g4E90ly1ic0o67wxswj30ta0gi48x.jpg"
            },
            original: {
                url: "https://wx1.sinaimg.cn/orj1080/006g4E90ly1ic0o67wxswj30ta0gi48x.jpg"
            }
        }
    }
};

const sampleMixMediaStatus = {
    pic_num: 2,
    pic_ids: [
        "bc6e55efly1ic2uitv1fxj20p00xctem"
    ],
    pic_infos: {},
    mix_media_info: {
        items: [
            {
                type: "video",
                data: {
                    object_type: "video",
                    media_info: {
                        stream_url_hd: "https://video.weibo.com/media/play?livephoto=0"
                    },
                    pic_info: {
                        pic_big: {
                            url: "https://wx3.sinaimg.cn/orj480/bc6e55efly1ic2ukvy56dj20zk0k03zx.jpg"
                        }
                    }
                }
            },
            {
                type: "pic",
                data: {
                    object_type: "pic",
                    largest: {
                        url: "https://wx4.sinaimg.cn/large/bc6e55efly1ic2uitv1fxj20p00xctem.jpg"
                    }
                }
            }
        ]
    }
} as unknown as WeiboStatus;

const sampleMobilePicsStatus = {
    mid: "5299112496859176",
    pic_ids: [
        "008vVtgily1id6q9sht56j30wr1dzk2k"
    ],
    pics: [
        {
            pid: "008vVtgily1id6q9sht56j30wr1dzk2k",
            url: "https://wx3.sinaimg.cn/orj360/008vVtgily1id6q9sht56j30wr1dzk2k.jpg",
            large: {
                url: "https://wx3.sinaimg.cn/large/008vVtgily1id6q9sht56j30wr1dzk2k.jpg"
            }
        }
    ]
};

const sampleMobileMixedPicsStatus = {
    mid: "5299576766727808",
    page_info: {
        type: "video"
    },
    pic_ids: [
        "6da17e26ly1id8h34rrpbj20k00zk0uu",
        "6da17e26gy1id8h2xwky9j20xb188dud"
    ],
    pics: [
        {
            pid: "6da17e26ly1id8h34rrpbj20k00zk0uu",
            type: "video",
            url: "https://wx4.sinaimg.cn/orj360/6da17e26ly1id8h34rrpbj20k00zk0uu.jpg",
            large: {
                url: "https://wx4.sinaimg.cn/large/6da17e26ly1id8h34rrpbj20k00zk0uu.jpg"
            },
            videoSrc: "https://f.video.weibocdn.com/demo-video.mp4"
        },
        {
            pid: "6da17e26gy1id8h2xwky9j20xb188dud",
            url: "https://wx2.sinaimg.cn/orj360/6da17e26gy1id8h2xwky9j20xb188dud.jpg",
            large: {
                url: "https://wx2.sinaimg.cn/mw2000/6da17e26gy1id8h2xwky9j20xb188dud.jpg"
            }
        }
    ]
};

const samplePureVideoStatus = {
    mblogid: "R1c9AwALf",
    page_info: {
        type: "11",
        object_type: "video",
        page_pic: "https://wx1.sinaimg.cn/orj480/demo-cover.jpg",
        media_info: {
            playback_list: [
                {
                    meta: {
                        label: "mp4_720p",
                        quality_index: 720
                    },
                    play_info: {
                        url: "https://f.video.weibocdn.com/demo-720.mp4?label=mp4_720p",
                        quality_label: "720p"
                    }
                },
                {
                    meta: {
                        label: "mp4_1080p",
                        quality_index: 1080
                    },
                    play_info: {
                        url: "https://f.video.weibocdn.com/demo-1080.mp4?label=mp4_1080p",
                        quality_label: "1080p"
                    }
                }
            ],
            mp4_hd_url: "https://f.video.weibocdn.com/demo-hd.mp4"
        }
    }
};

test("live photo status resolves full media list", () => {
    const platform = createWeiboPlatformForTests();
    const mediaItems = platform.getWeiboMediaItemsFromStatus(sampleStatus);

    assert.equal(mediaItems.length, 3);
    assert.deepEqual(
        mediaItems.map((item) => item.id),
        sampleStatus.pic_ids
    );
    assert.ok(mediaItems.every((item) => item.videoUrl && item.kind === "livephoto"));
    assert.deepEqual(
        mediaItems.map((item) => item.thumbnailUrl),
        [
            "https://wx4.sinaimg.cn/orj360/ba6a4518gy1ic2xakxgvwj23b04eoe83.jpg",
            "https://wx3.sinaimg.cn/orj360/ba6a4518gy1ic2xnphrkkj22c0340u0y.jpg",
            "https://wx4.sinaimg.cn/orj360/ba6a4518gy1ic2xnuzaokj22c0340u0y.jpg"
        ]
    );
});

test("live photo expands to a merged Motion Photo job by default and jpg+mov pair when merge is off", () => {
    const platform = createWeiboPlatformForTests();
    const mediaItems = platform.getWeiboMediaItemsFromStatus(sampleStatus);

    const mergedUtils = createUtilsForWeibo();
    const mergedJobs = mergedUtils.buildMediaDownloadJobs(mediaItems, "5286555824429155");
    assert.equal(CONFIG.LIVEPHOTO_AUTO_MERGE, true);
    assert.equal(mergedJobs.length, 3);
    assert.deepEqual(
        mergedJobs.map((job) => job.filename),
        [
            "weibo_5286555824429155_1.MP.jpg",
            "weibo_5286555824429155_2.MP.jpg",
            "weibo_5286555824429155_3.MP.jpg"
        ]
    );
    assert.ok(mergedJobs.every((job) => job.livePhotoVideoUrl));

    const legacyUtils = createUtils({
        config: {
            ...CONFIG,
            DEBUG: false,
            LIVEPHOTO_AUTO_MERGE: false
        },
        windowRef: {
            location: {
                hostname: "weibo.com"
            },
            URL,
            document: {
                createElement() {
                    return {
                        click() {}
                    };
                }
            },
            open() {}
        } as unknown as UtilsWindowRef,
        fetchRef: async () => {
            throw new Error("fetch not mocked");
        }
    });
    const legacyJobs = legacyUtils.buildMediaDownloadJobs(mediaItems, "5286555824429155");
    // 关闭合并：每个 LivePhoto 收敛为一个 job（图片文件名 + 配对视频地址），保存为同名 jpg+mov
    assert.equal(legacyJobs.length, 3);
    assert.deepEqual(
        legacyJobs.map((job) => job.filename),
        [
            "weibo_5286555824429155_1.jpg",
            "weibo_5286555824429155_2.jpg",
            "weibo_5286555824429155_3.jpg"
        ]
    );
    assert.ok(legacyJobs.every((job) => job.livePhotoPair && job.livePhotoVideoUrl));
});

test("retweeted status resolves original media order", () => {
    const platform = createWeiboPlatformForTests();
    const retweetMediaItems = platform.getWeiboMediaItemsFromStatus(sampleRetweetStatus);

    assert.equal(retweetMediaItems.length, 9);
    assert.equal(retweetMediaItems[0].id, "006QzRougy1ibzk7pm7ecj32c0340b29");
});

test("gif media only creates image download jobs", () => {
    const utils = createUtilsForWeibo();
    const platform = createWeiboPlatformForTests();
    const gifMediaItems = platform.getWeiboMediaItemsFromStatus(sampleGifStatus);
    const gifJobs = utils.buildMediaDownloadJobs(gifMediaItems, "5280000000000001");

    assert.equal(gifMediaItems.length, 2);
    assert.equal(gifMediaItems[0].kind, "gif");
    assert.equal(gifMediaItems[0].videoUrl, null);
    assert.equal(gifMediaItems[0].imageExt, ".gif");
    assert.equal(
        gifMediaItems[0].thumbnailUrl,
        "https://wx1.sinaimg.cn/orj360/006g4E90ly1ic0o6472r0g30ha0cub2d.gif"
    );
    assert.equal(
        gifMediaItems[1].thumbnailUrl,
        "https://wx1.sinaimg.cn/orj360/006g4E90ly1ic0o67wxswj30ta0gi48x.jpg"
    );
    assert.deepEqual(
        gifJobs.map((job) => job.filename),
        [
            "weibo_5280000000000001_1.gif",
            "weibo_5280000000000001_2.jpg"
        ]
    );
});

test("mixed media status keeps image items", () => {
    const utils = createUtilsForWeibo();
    const platform = createWeiboPlatformForTests();
    const mixMediaItems = platform.getWeiboMediaItemsFromStatus(sampleMixMediaStatus);
    const mixJobs = utils.buildMediaDownloadJobs(mixMediaItems, "5286590000000000");

    assert.equal(mixMediaItems.length, 1);
    assert.equal(mixMediaItems[0].kind, "image");
    assert.equal(
        mixMediaItems[0].imageUrl,
        "https://wx4.sinaimg.cn/large/bc6e55efly1ic2uitv1fxj20p00xctem.jpg"
    );
    assert.deepEqual(
        mixJobs.map((job) => job.filename),
        ["weibo_5286590000000000_1.jpg"]
    );
});

test("standalone video media creates a normal mp4 job without live suffix", () => {
    const utils = createUtilsForWeibo();
    const jobs = utils.buildMediaDownloadJobs([
        asMediaItem({
            id: "video-1",
            kind: "video",
            imageUrl: null,
            videoUrl: "https://f.video.weibocdn.com/demo.mp4",
            videoExt: ".mp4"
        })
    ], "5286555824429155");

    assert.deepEqual(
        jobs.map((job) => job.filename),
        ["weibo_5286555824429155_1.mp4"]
    );
});

test("pure video status is skipped while video download is disabled", () => {
    const platform = createWeiboPlatformForTests();
    const mediaItems = platform.getWeiboMediaItemsFromStatus(samplePureVideoStatus);

    assert.equal(mediaItems.length, 0);
});

test("video-enabled weibo status resolves highest quality video item", () => {
    const platform = createWeiboPlatformForTests({ ENABLE_VIDEO_DOWNLOAD: true });
    const mediaItems = platform.getWeiboMediaItemsFromStatus(samplePureVideoStatus);

    assert.equal(mediaItems.length, 1);
    assert.equal(mediaItems[0].kind, "video");
    assert.equal(mediaItems[0].imageUrl, null);
    assert.equal(
        mediaItems[0].videoUrl,
        "https://f.video.weibocdn.com/demo-1080.mp4?label=mp4_1080p"
    );
    assert.equal(mediaItems[0].videoExt, ".mp4");
    assert.equal(mediaItems[0].thumbnailUrl, "https://wx1.sinaimg.cn/orj480/demo-cover.jpg");
});

test("search weibo video status resolves through GM cross-origin request", async () => {
    const platform = createSearchWeiboPlatformWithGm({
        configOverrides: { ENABLE_VIDEO_DOWNLOAD: true },
        response: samplePureVideoStatus
    });

    const mediaItems = await platform.resolvePostMediaItems({
        getAttribute(name: string) {
            return name === "mid" ? "5302940270073103" : null;
        },
        querySelectorAll() {
            return [];
        }
    } as unknown as Element, []);

    assert.equal(mediaItems.length, 1);
    assert.equal(mediaItems[0].kind, "video");
    assert.equal(
        mediaItems[0].videoUrl,
        "https://f.video.weibocdn.com/demo-1080.mp4?label=mp4_1080p"
    );
    assert.equal(platform.getLastGmOptions().url, "https://weibo.com/ajax/statuses/show?id=5302940270073103&locale=zh-CN&isGetLongText=true");
    assert.equal(platform.getLastGmOptions().anonymous, false);
    assert.equal(platform.getLastGmOptions().withCredentials, true);
    assert.equal(platform.getLastGmOptions().headers.Referer, "https://weibo.com/");
});

test("search weibo forbidden GM response falls back instead of becoming authoritative empty media", async () => {
    const platform = createSearchWeiboPlatformWithForbiddenGm();
    const fallbackItems = [
        asMediaItem({
            id: "pending-video",
            kind: "video",
            label: "视频 1",
            imageUrl: null,
            videoUrl: "https://f.video.weibocdn.com/fallback.mp4",
            videoExt: ".mp4"
        })
    ];

    const mediaItems = await platform.resolvePostMediaItems({
        getAttribute(name: string) {
            return name === "mid" ? "5302940270073103" : null;
        },
        querySelectorAll() {
            return [];
        }
    } as unknown as Element, fallbackItems);

    assert.equal(mediaItems, fallbackItems);
});

test("video-enabled mixed media status keeps images and appends videos", () => {
    const platform = createWeiboPlatformForTests({ ENABLE_VIDEO_DOWNLOAD: true });
    const mediaItems = platform.getWeiboMediaItemsFromStatus(sampleMixMediaStatus);

    assert.equal(mediaItems.length, 2);
    assert.equal(mediaItems[0].kind, "video");
    assert.equal(mediaItems[1].kind, "image");
    assert.equal(mediaItems[0].videoUrl, "https://video.weibo.com/media/play?livephoto=0");
    assert.equal(
        mediaItems[0].thumbnailUrl,
        "https://wx3.sinaimg.cn/orj360/bc6e55efly1ic2ukvy56dj20zk0k03zx.jpg"
    );
    assert.equal(
        mediaItems[1].thumbnailUrl,
        "https://wx4.sinaimg.cn/orj360/bc6e55efly1ic2uitv1fxj20p00xctem.jpg"
    );
});

test("mobile weibo status resolves image items from pics array", () => {
    const platform = createWeiboPlatformForTests();
    const mediaItems = platform.getWeiboMediaItemsFromStatus(sampleMobilePicsStatus);

    assert.equal(mediaItems.length, 1);
    assert.equal(mediaItems[0].id, "008vVtgily1id6q9sht56j30wr1dzk2k");
    assert.equal(
        mediaItems[0].imageUrl,
        "https://wx3.sinaimg.cn/large/008vVtgily1id6q9sht56j30wr1dzk2k.jpg"
    );
    assert.equal(mediaItems[0].kind, "image");
});

test("mobile weibo mixed video and image pics skip the video cover", () => {
    const platform = createWeiboPlatformForTests();
    const mediaItems = platform.getWeiboMediaItemsFromStatus(sampleMobileMixedPicsStatus);

    assert.equal(mediaItems.length, 1);
    assert.equal(mediaItems[0].id, "6da17e26gy1id8h2xwky9j20xb188dud");
    assert.equal(
        mediaItems[0].imageUrl,
        "https://wx2.sinaimg.cn/large/6da17e26gy1id8h2xwky9j20xb188dud.jpg"
    );
});

test("video-enabled mobile weibo mixed pics include video source without downloading the cover", () => {
    const platform = createWeiboPlatformForTests({ ENABLE_VIDEO_DOWNLOAD: true });
    const mediaItems = platform.getWeiboMediaItemsFromStatus(sampleMobileMixedPicsStatus);

    assert.equal(mediaItems.length, 2);
    assert.equal(mediaItems[0].kind, "video");
    assert.equal(mediaItems[0].imageUrl, null);
    assert.equal(mediaItems[0].videoUrl, "https://f.video.weibocdn.com/demo-video.mp4");
    assert.equal(mediaItems[1].kind, "image");
});

test("mobile weibo card reads media items from vue item data without desktop fetch", () => {
    const platform = createWeiboPlatform({
        windowRef: {
            location: {
                hostname: "m.weibo.cn",
                pathname: "/"
            },
            open() {}
        },
        fetchRef: async () => {
            throw new Error("mobile cards should not fetch desktop status api");
        },
        log() {},
        getFileBasenameFromUrl(url, fallback) {
            if (!url || typeof url !== "string") {
                return fallback;
            }

            const parts = url.split("/");
            const lastSegment = parts[parts.length - 1] || "";
            return lastSegment.replace(/\.[^.]+$/, "") || fallback;
        },
        getFileExtensionFromUrl(url, fallback = ".jpg") {
            if (!url || typeof url !== "string") {
                return fallback;
            }

            const match = url.split("?")[0].match(/(\.[a-z0-9]+)$/i);
            return match ? match[1].toLowerCase() : fallback;
        }
    });

    const postContainer = {
        __vue__: {
            _props: {
                item: sampleMobilePicsStatus
            }
        }
    } as unknown as WeiboVueElement;

    const mediaItems = platform.getDomMediaItems(postContainer) as WeiboMediaItem[];

    assert.equal(mediaItems.length, 1);
    assert.equal(mediaItems[0].id, "008vVtgily1id6q9sht56j30wr1dzk2k");
});

test("article cover images wrapped in ttarticle links are excluded from the DOM fallback scan", () => {
    const platform = createWeiboPlatformForTests();

    function createMockImage(src: string, { articleLink = false, videoMarkers = false }: {
        articleLink?: boolean;
        videoMarkers?: boolean;
    } = {}) {
        const pictureMain = videoMarkers
            ? { querySelector: () => ({} as Element) }
            : null;
        return {
            src,
            closest(selector: string) {
                if (selector === 'a[href*="ttarticle"]') {
                    return articleLink ? { tagName: "a" } : null;
                }
                if (selector === ".woo-picture-main") {
                    return pictureMain;
                }
                return null;
            }
        } as HTMLImageElement;
    }

    const articleCover = createMockImage(
        "https://wx3.sinaimg.cn/large/006llPhJly1iewdb4jb9gj30zk0jzq8b.jpg",
        { articleLink: true }
    );
    const normalImage = createMockImage("https://wx1.sinaimg.cn/large/006llPhJly1normalab.jpg");
    const container = {
        querySelectorAll(selector: string) {
            return selector === "img.woo-picture-img" ? [articleCover, normalImage] : [];
        }
    };

    const images = platform.findImagesInPost(container as unknown as Element);

    assert.deepEqual(images, [normalImage]);
});

test("api result selection prefers authoritative empty list", () => {
    const ui = createUiForWeibo();
    const fallbackDomItems: MediaItem[] = [
        asMediaItem({ id: "dom-1", kind: "image", imageUrl: "https://wx1.sinaimg.cn/large/a.jpg", videoUrl: null }),
        asMediaItem({ id: "dom-2", kind: "image", imageUrl: "https://wx2.sinaimg.cn/large/b.jpg", videoUrl: null })
    ];

    const authoritativeEmptyItems = ui.selectPreferredMediaItems(fallbackDomItems, [], true);
    const fallbackOnErrorItems = ui.selectPreferredMediaItems(fallbackDomItems, [], false);

    assert.equal(authoritativeEmptyItems.length, 0);
    assert.equal(fallbackOnErrorItems.length, 2);
});

test("pure video result removes download button", () => {
    const ui = createUiForWeibo();
    const button = {
        innerHTML: "",
        removed: false,
        remove() {
            this.removed = true;
        }
    };

    ui.syncDownloadButtonState(button as unknown as HTMLButtonElement, []);
    assert.equal(button.removed, true);
});

function createEmptyDomWeiboUi({ resolveItems, onInsert }: {
    resolveItems: MediaItem[];
    onInsert: (btn: HTMLElement) => void;
}) {
    return createUi({
        config: {
            ...CONFIG,
            DEBUG: false,
            ENABLE_VIDEO_DOWNLOAD: true
        } as UiConfig,
        utils: {
            getOriginalImageUrl: (url: string) => url,
            getFileExtensionFromUrl: () => ".jpg",
            downloadMediaItems() {},
            log() {},
            getPlatformAdapter(): UiPlatformAdapter {
                return {
                    getDomMediaItems() {
                        return null;
                    },
                    findImagesInPost() {
                        return [];
                    },
                    shouldResolveEmptyMediaItems() {
                        return true;
                    },
                    resolvePostMediaItems() {
                        return resolveItems;
                    },
                    getPostId() {
                        return "weibo_empty_dom";
                    },
                    getPostSelectors() {
                        return [];
                    },
                    shouldSkipPost() {
                        return false;
                    },
                    insertDownloadButton({ btn }) {
                        onInsert(btn);
                        return true;
                    },
                    afterInjectDownloadButtons() {},
                    initObservers() {}
                };
            }
        } as unknown as UiUtils,
        windowRef: {} as Window,
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
        } as unknown as Document,
        addStyle() {}
    });
}

test("ui creates a weibo button for video-only posts only after async resolution confirms media", async () => {
    const videoItem = asMediaItem({
        id: "video-1",
        kind: "video",
        label: "视频 1",
        imageUrl: null,
        videoUrl: "https://f.video.weibocdn.com/a.mp4",
        videoExt: ".mp4"
    });
    const insertedButtons: HTMLElement[] = [];
    const ui = createEmptyDomWeiboUi({
        resolveItems: [videoItem],
        onInsert(btn) {
            insertedButtons.push(btn);
        }
    });

    const btn = ui.createDownloadButton({
        querySelector(): Element | null {
            return null;
        }
    } as unknown as Element);

    // 媒体确认非空前不插入按钮，避免按钮闪现
    assert.equal(btn, null);
    assert.equal(insertedButtons.length, 0);
    await flushPromises();
    assert.equal(insertedButtons.length, 1);
    assert.equal(insertedButtons[0].innerHTML, "↓1");
});

test("ui never inserts a weibo button for posts whose async resolution is empty", async () => {
    const insertedButtons: HTMLElement[] = [];
    const ui = createEmptyDomWeiboUi({
        resolveItems: [],
        onInsert(btn) {
            insertedButtons.push(btn);
        }
    });

    const btn = ui.createDownloadButton({
        querySelector(): Element | null {
            return null;
        }
    } as unknown as Element);

    assert.equal(btn, null);
    await flushPromises();
    assert.equal(insertedButtons.length, 0);
});

test("ui refreshDownloadButtons clears existing buttons and reinjects with fresh caches", () => {
    const oldButton = {
        removed: false,
        remove() {
            this.removed = true;
        }
    };
    const post = {
        querySelector() {
            return null;
        },
        appendChild() {}
    };
    let insertedCount = 0;

    const ui = createUi({
        config: {
            ...CONFIG,
            DEBUG: false
        } as UiConfig,
        utils: {
            getOriginalImageUrl: (url: string) => url,
            getFileExtensionFromUrl: () => ".jpg",
            downloadMediaItems() {},
            log() {},
            getPlatformAdapter(): UiPlatformAdapter {
                return {
                    getDomMediaItems() {
                        return [
                            asMediaItem({
                                id: "img-1",
                                kind: "image",
                                label: "图片 1",
                                imageUrl: "https://wx1.sinaimg.cn/large/a.jpg",
                                videoUrl: null
                            })
                        ];
                    },
                    findImagesInPost() {
                        return [];
                    },
                    resolvePostMediaItems(_postContainer, fallbackItems) {
                        return fallbackItems;
                    },
                    getPostId() {
                        return "weibo_test";
                    },
                    getPostSelectors() {
                        return [".post"];
                    },
                    shouldSkipPost() {
                        return false;
                    },
                    insertDownloadButton() {
                        insertedCount++;
                        return true;
                    },
                    afterInjectDownloadButtons() {},
                    initObservers() {}
                };
            }
        } as unknown as UiUtils,
        windowRef: {} as Window,
        documentRef: {
            getElementById() {
                return null;
            },
            createElement() {
                return createButtonElement();
            },
            querySelectorAll(selector: string) {
                if (selector === ".weibo-img-download-btn") {
                    return [oldButton];
                }
                if (selector === ".post") {
                    return [post];
                }
                return [];
            },
            head: {
                appendChild() {}
            },
            body: {
                appendChild() {}
            },
            addEventListener() {},
            removeEventListener() {}
        } as unknown as Document,
        addStyle() {}
    });

    ui.refreshDownloadButtons();

    assert.equal(oldButton.removed, true);
    assert.equal(insertedCount, 1);
});

test("weibo video thumbnail image is filtered from fallback matching", () => {
    const ui = createUiForWeibo();
    const videoThumbImage = {
        closest(selector: string) {
            if (selector === ".woo-picture-main") {
                return {
                    querySelector(query: string) {
                        if (query === '[class*="_videotime_"], [class*="_videobox_"], .woo-font--play') {
                            return { textContent: "00:22" };
                        }
                        return null;
                    }
                };
            }
            return null;
        }
    };

    assert.equal(ui.isVideoThumbnailImage(videoThumbImage as HTMLImageElement), true);
});

test("image selection modal uses compact p lp a labels by media type", () => {
    const { ui, documentRef } = createUiForModalTests();

    ui.showImageSelectModal([
        asMediaItem({ id: "img-1", kind: "image", imageUrl: "https://wx1.sinaimg.cn/large/a.jpg", videoUrl: null }),
        asMediaItem({ id: "live-1", kind: "livephoto", imageUrl: "https://wx1.sinaimg.cn/large/b.jpg", videoUrl: "https://livephoto.us.sinaimg.cn/a.mov" }),
        asMediaItem({ id: "gif-1", kind: "gif", imageUrl: "https://wx1.sinaimg.cn/large/c.gif", videoUrl: null })
    ]);

    const overlay = documentRef.body.children[0];
    const labelNodes = findElementsByClassName(overlay, "weibo-img-select-label");

    assert.deepEqual(
        labelNodes.map((node) => node.textContent),
        ["p1", "lp1", "a1"]
    );
});

test("image selection modal uses compact v labels and kind badges", () => {
    const { ui, documentRef } = createUiForModalTests();

    ui.showImageSelectModal([
        asMediaItem({ id: "img-1", kind: "image", imageUrl: "https://wx1.sinaimg.cn/large/a.jpg", videoUrl: null }),
        asMediaItem({
            id: "video-1",
            kind: "video",
            imageUrl: null,
            videoUrl: "https://f.video.weibocdn.com/a.mp4",
            thumbnailUrl: "https://wx1.sinaimg.cn/orj480/a.jpg"
        }),
        asMediaItem({ id: "video-2", kind: "video", imageUrl: null, videoUrl: "https://f.video.weibocdn.com/b.mp4" })
    ]);

    const overlay = documentRef.body.children[0];
    const labelNodes = findElementsByClassName(overlay, "weibo-img-select-label");
    const kindNodes = findElementsByClassName(overlay, "weibo-img-select-kind");
    const videoItems = findElementsByClassName(overlay, "weibo-img-select-item-video");
    const placeholderNodes = findElementsByClassName(overlay, "weibo-img-select-placeholder");

    assert.deepEqual(
        labelNodes.map((node) => node.textContent),
        ["p1", "v1", "v2"]
    );
    assert.deepEqual(
        kindNodes.map((node) => node.textContent),
        ["视频", "视频"]
    );
    assert.equal(videoItems.length, 2);
    assert.deepEqual(
        placeholderNodes.map((node) => node.textContent),
        ["无预览", "▶", "▶"]
    );
});

test("image selection modal renders one list thumbnail per media item and falls back to imageUrl", () => {
    const { ui, documentRef } = createUiForModalTests();
    const mediaItems = Array.from({ length: 12 }, (_, index) => asMediaItem({
        id: `img-${index + 1}`,
        kind: "image",
        imageUrl: `https://wx1.sinaimg.cn/large/${index + 1}.jpg`,
        videoUrl: null,
        thumbnailUrl: index === 0 ? null : `https://wx1.sinaimg.cn/orj360/${index + 1}.jpg`
    }));

    ui.showImageSelectModal(mediaItems);

    const overlay = documentRef.body.children[0];
    const thumbs = findElementsByClassName(overlay, "weibo-img-select-thumb");
    const images = thumbs
        .map((thumb) => thumb.children.find((child) => child.tagName === "img"))
        .filter(Boolean) as TestElement[];

    assert.equal(thumbs.length, 12);
    assert.equal(images.length, 12);
    assert.deepEqual(
        images.map((img) => img.src),
        mediaItems.map((_, index) => index === 0
            ? "https://wx1.sinaimg.cn/large/1.jpg"
            : `https://wx1.sinaimg.cn/orj360/${index + 1}.jpg`)
    );
    assert.equal(images.every((img) => img.loading === "lazy" && img.referrerPolicy === "no-referrer"), true);
    assert.deepEqual(
        findElementsByClassName(overlay, "weibo-img-select-label").map((node) => node.textContent),
        Array.from({ length: 12 }, (_, index) => `p${index + 1}`)
    );
});
