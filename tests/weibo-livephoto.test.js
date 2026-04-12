import test from "node:test";
import assert from "node:assert/strict";

import { CONFIG } from "../src/config.js";
import { createUtils } from "../src/utils.js";
import { createUi } from "../src/ui.js";
import { createWeiboPlatform } from "../src/platforms/weibo.js";

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
        },
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
        },
        utils: {
            getOriginalImageUrl: (url) => url,
            getFileExtensionFromUrl: () => ".jpg",
            log() {},
            getPlatformAdapter() {
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
        },
        windowRef: {},
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
        },
        addStyle() {}
    });
}

function createWeiboPlatformForTests() {
    return createWeiboPlatform({
        windowRef: {
            location: {
                hostname: "weibo.com"
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
});

test("live photo expands to stable jpg and mov jobs", () => {
    const utils = createUtilsForWeibo();
    const platform = createWeiboPlatformForTests();
    const mediaItems = platform.getWeiboMediaItemsFromStatus(sampleStatus);
    const jobs = utils.buildMediaDownloadJobs(mediaItems, "5286555824429155");

    assert.equal(jobs.length, 6);
    assert.deepEqual(
        jobs.map((job) => job.filename),
        [
            "weibo_5286555824429155_1.jpg",
            "weibo_5286555824429155_1_live.mov",
            "weibo_5286555824429155_2.jpg",
            "weibo_5286555824429155_2_live.mov",
            "weibo_5286555824429155_3.jpg",
            "weibo_5286555824429155_3_live.mov"
        ]
    );
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

test("api result selection prefers authoritative empty list", () => {
    const ui = createUiForWeibo();
    const fallbackDomItems = [
        { id: "dom-1", kind: "image", imageUrl: "https://wx1.sinaimg.cn/large/a.jpg", videoUrl: null },
        { id: "dom-2", kind: "image", imageUrl: "https://wx2.sinaimg.cn/large/b.jpg", videoUrl: null }
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

    ui.syncDownloadButtonState(button, []);
    assert.equal(button.removed, true);
});

test("weibo video thumbnail image is filtered from fallback matching", () => {
    const ui = createUiForWeibo();
    const videoThumbImage = {
        closest(selector) {
            if (selector === ".woo-picture-main") {
                return {
                    querySelector(query) {
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

    assert.equal(ui.isVideoThumbnailImage(videoThumbImage), true);
});
