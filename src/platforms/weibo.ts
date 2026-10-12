const IMAGE_SIZE_PATTERNS = ["thumb180", "thumb300", "square", "bmiddle", "mw690", "mw1024", "orj360", "orj480", "webp720"] as const;
const VIDEO_FALLBACK_KEYS = [
    "mp4_2160p_mp4",
    "mp4_1080p_mp4",
    "mp4_720p_mp4",
    "hevc_mp4_720p",
    "h265_mp4_hd",
    "inch_5_5_mp4_hd",
    "inch_5_mp4_hd",
    "inch_4_mp4_hd",
    "mp4_hd_url",
    "stream_url_hd",
    "mp4_sd_url",
    "stream_url"
] as const;

export type WeiboMediaKind = "image" | "gif" | "livephoto" | "video";

export interface WeiboMediaItem {
    id: string;
    kind: WeiboMediaKind;
    label: string;
    imageUrl: string | null;
    videoUrl: string | null;
    imageExt: string;
    videoExt: string;
}

export interface WeiboPicVariant {
    url?: string;
}

export interface WeiboPlaybackItem {
    meta?: {
        quality_index?: unknown;
    } | null;
    play_info?: {
        url?: string;
        bitrate?: unknown;
        width?: unknown;
        height?: unknown;
    } | null;
}

export interface WeiboMediaInfo {
    playback_list?: WeiboPlaybackItem[] | null;
    [key: string]: unknown;
}

export interface WeiboPicInfo {
    type?: unknown;
    url?: string;
    pid?: string;
    video?: string;
    videoSrc?: string;
    media_info?: WeiboMediaInfo | null;
    pic_info?: WeiboPicInfo | null;
    pic_big?: string | null;
    pic_middle?: string | null;
    pic_small?: string | null;
    largest?: WeiboPicVariant | string | null;
    original?: WeiboPicVariant | string | null;
    large?: WeiboPicVariant | string | null;
    bmiddle?: WeiboPicVariant | string | null;
    thumbnail?: WeiboPicVariant | string | null;
}

export interface WeiboMixMediaData extends WeiboPicInfo {
    object_type?: unknown;
    id?: string;
    media_id?: string;
    stream_url_hd?: string;
    stream_url?: string;
}

export interface WeiboMixMediaItem {
    type?: unknown;
    data?: WeiboMixMediaData | null;
}

export interface WeiboPageInfo {
    type?: unknown;
    object_type?: unknown;
    media_info?: WeiboMediaInfo | null;
}

export interface WeiboStatus {
    mid?: string;
    idstr?: string;
    mblogid?: string;
    pic_ids?: string[];
    pics?: WeiboPicInfo[];
    pic_infos?: Record<string, WeiboPicInfo>;
    mix_media_info?: {
        items?: WeiboMixMediaItem[];
    } | null;
    retweeted_status?: WeiboStatus | null;
    page_info?: WeiboPageInfo | null;
}

export interface WeiboVueInstance {
    _props?: {
        item?: WeiboStatus | null;
    };
    item?: WeiboStatus | null;
    $options?: {
        propsData?: {
            item?: WeiboStatus | null;
        };
    };
}

export type WeiboVueElement = Element & {
    __vue__?: WeiboVueInstance;
};

export interface WeiboPlatformConfig {
    ENABLE_VIDEO_DOWNLOAD?: boolean;
}

export interface WeiboPlatformWindow {
    location: {
        hostname: string;
        pathname?: string;
    };
    open(url?: string | URL, target?: string, features?: string): unknown;
    MutationObserver?: typeof MutationObserver;
}

export interface WeiboGmXmlhttpRequestDetails {
    method: "GET";
    url: string;
    anonymous: boolean;
    withCredentials: boolean;
    headers: Record<string, string>;
    onload(response: { status: number; responseText: string }): void;
    onerror(error?: { error?: string; message?: string }): void;
    ontimeout(): void;
}

export type WeiboGmXmlhttpRequest = (details: WeiboGmXmlhttpRequestDetails) => unknown;

export interface WeiboPlatformDeps {
    config?: WeiboPlatformConfig;
    windowRef: WeiboPlatformWindow;
    fetchRef: typeof fetch;
    gmXmlhttpRequest?: WeiboGmXmlhttpRequest | null;
    log: (...args: unknown[]) => void;
    getFileBasenameFromUrl: (url: unknown, fallback: string) => string;
    getFileExtensionFromUrl: (url: unknown, fallback: string) => string;
}

export interface WeiboPlatform {
    id: string;
    displayName: string;
    isSearchPage(): boolean;
    isAvatarImage(url: string | null | undefined): boolean;
    getOriginalImageUrl(url: unknown): string | null;
    getBestWeiboImageUrl(picInfo: WeiboPicInfo | null | undefined): string | null;
    getWeiboMixMediaItems(status: WeiboStatus | null | undefined): WeiboMediaItem[];
    createWeiboMediaItem(picId: string, picInfo: WeiboPicInfo | null | undefined, index: number): WeiboMediaItem | null;
    getWeiboMediaSourceStatus(status: WeiboStatus | null | undefined): WeiboStatus | null;
    getWeiboMediaItemsFromStatus(status: WeiboStatus | null | undefined): WeiboMediaItem[];
    getDomMediaItems(postContainer: Element): WeiboMediaItem[] | null;
    fetchWeiboStatus(statusId: string | null | undefined): Promise<WeiboStatus | null>;
    getWeiboMediaItemsById(statusId: string | null | undefined): Promise<WeiboMediaItem[]>;
    isVideoThumbnailImage(img: Element | null | undefined): boolean;
    findImagesInPost(container: Element): HTMLImageElement[];
    selectPreferredMediaItems<T>(fallbackItems: T[], resolvedMediaItems: T[], apiResolved: boolean): T[];
    resolvePostMediaItems(postContainer: Element, fallbackItems: WeiboMediaItem[]): Promise<WeiboMediaItem[]>;
    getPostSelectors(): string[];
    shouldSkipPost(post: Element | null | undefined): boolean;
    shouldResolveEmptyMediaItems(postContainer: Element): boolean;
    getPostId(postContainer: Element): string;
    insertDownloadButton(options: { post: Element; btn: HTMLElement }): boolean;
    getPostUrl(article: Element | null | undefined): string | null;
    injectGotoOriginalMenuItem(popMain: HTMLElement, article: Element | null | undefined, documentRef: Document): void;
    afterInjectDownloadButtons(options: { documentRef: Document }): void;
    initObservers(options: { documentRef: Document }): void;
}

export function createWeiboPlatform({
    config = {},
    windowRef,
    fetchRef,
    gmXmlhttpRequest,
    log,
    getFileBasenameFromUrl,
    getFileExtensionFromUrl
}: WeiboPlatformDeps): WeiboPlatform {
    const imageSelectors = [
        "img.woo-picture-img",
        ".picture img",
        ".m3 img",
        'div[class^="m"] img'
    ];
    const mobilePostSelectors = [
        ".card.m-panel.card9"
    ];
    const postSelectors = [
        ...mobilePostSelectors,
        "article",
        ".vue-feed-item",
        'div[action-type="feed_list_item"]'
    ];
    const headerSelectors = [
        'div[class*="_iconsPlus_"]',
        'header > div > div[class*="_nick_"]',
        "header > div > div.woo-box-flex",
        ".woo-nickname",
        ".name"
    ];
    const weiboStatusCache = new Map<string, Promise<WeiboStatus | null>>();

    function isVideoDownloadEnabled(): boolean {
        return !!config.ENABLE_VIDEO_DOWNLOAD;
    }

    function isSearchPage(): boolean {
        return windowRef.location.hostname === "s.weibo.com";
    }

    function isMobileWeiboPage(): boolean {
        return windowRef.location.hostname === "m.weibo.cn" || windowRef.location.hostname === "www.m.weibo.cn";
    }

    function isAvatarImage(url: string | null | undefined): boolean {
        if (!url) {
            return false;
        }

        return url.includes("/crop.") ||
            url.includes("/avatar") ||
            url.includes("_cute") ||
            url.includes("_online");
    }

    function getOriginalImageUrl(url: unknown): string | null {
        if (!url || typeof url !== "string") {
            return null;
        }

        if (!url.includes("sinaimg.cn") && !url.includes("sina.cn")) {
            return null;
        }

        if (isAvatarImage(url)) {
            return null;
        }

        if (url.includes("/large/")) {
            return url;
        }

        for (const size of IMAGE_SIZE_PATTERNS) {
            if (url.includes(`/${size}/`)) {
                return url.replace(`/${size}/`, "/large/");
            }
        }

        const match = url.match(/(\.sinaimg\.cn\/)([a-z0-9]+\/)/);
        if (match) {
            return url.replace(match[2], "large/");
        }

        return url;
    }

    function getBestWeiboImageUrl(picInfo: WeiboPicInfo | null | undefined): string | null {
        if (!picInfo || typeof picInfo !== "object") {
            return null;
        }

        const candidates = [
            picInfo.largest && (picInfo.largest as WeiboPicVariant).url,
            picInfo.original && (picInfo.original as WeiboPicVariant).url,
            picInfo.large && (picInfo.large as WeiboPicVariant).url,
            picInfo.bmiddle && (picInfo.bmiddle as WeiboPicVariant).url,
            picInfo.thumbnail && (picInfo.thumbnail as WeiboPicVariant).url,
            picInfo.url
        ];

        const imageUrl = candidates.find((url) => typeof url === "string" && url.length > 0);
        return getOriginalImageUrl(imageUrl) || imageUrl || null;
    }

    function getBestWeiboVideoUrl(mediaInfo: WeiboMediaInfo | null | undefined): string | null {
        if (!mediaInfo || typeof mediaInfo !== "object") {
            return null;
        }

        const playbackList = Array.isArray(mediaInfo.playback_list) ? mediaInfo.playback_list : [];
        const playbackCandidates = (playbackList
            .map((item) => {
                const playInfo = item && item.play_info;
                const url = playInfo && playInfo.url;
                if (typeof url !== "string" || !url) {
                    return null;
                }

                const qualityIndex = Number(item.meta && item.meta.quality_index) || 0;
                const bitrate = Number(playInfo!.bitrate) || 0;
                const pixels = (Number(playInfo!.width) || 0) * (Number(playInfo!.height) || 0);
                return {
                    url,
                    score: qualityIndex * 1000000000 + pixels * 1000 + bitrate
                };
            })
            .filter(Boolean) as { url: string; score: number }[])
            .sort((a, b) => b.score - a.score);

        if (playbackCandidates.length > 0) {
            return playbackCandidates[0].url;
        }

        for (const key of VIDEO_FALLBACK_KEYS) {
            if (typeof mediaInfo[key] === "string" && mediaInfo[key]) {
                return mediaInfo[key];
            }
        }

        return null;
    }

    function createWeiboVideoMediaItem({ id, videoUrl, index }: { id: string; videoUrl: string | null | undefined; index: number }): WeiboMediaItem | null {
        if (!videoUrl) {
            return null;
        }

        return {
            id,
            kind: "video",
            label: `视频 ${index + 1}`,
            imageUrl: null,
            videoUrl,
            imageExt: ".jpg",
            videoExt: getFileExtensionFromUrl(videoUrl, ".mp4")
        };
    }

    function getWeiboMixMediaItems(status: WeiboStatus | null | undefined): WeiboMediaItem[] {
        const mixMediaItems = status && status.mix_media_info && Array.isArray(status.mix_media_info.items)
            ? status.mix_media_info.items
            : [];

        return mixMediaItems.map((item, index) => {
            const data = item && item.data;
            if (!data || typeof data !== "object") {
                return null;
            }

            const mediaType = typeof item.type === "string" ? item.type.toLowerCase() : "";
            const objectType = typeof data.object_type === "string" ? data.object_type.toLowerCase() : "";
            if (mediaType === "video" || objectType === "video") {
                if (!isVideoDownloadEnabled()) {
                    return null;
                }

                return createWeiboVideoMediaItem({
                    id: data.id || data.media_id || `mix-video-${index + 1}`,
                    videoUrl: getBestWeiboVideoUrl(data.media_info) || data.videoSrc || data.stream_url_hd || data.stream_url,
                    index
                });
            }

            const picInfo = data.pic_info || data;
            const imageUrl = getBestWeiboImageUrl(picInfo) ||
                getBestWeiboImageUrl({
                    largest: data.pic_info && data.pic_info.pic_big,
                    bmiddle: data.pic_info && data.pic_info.pic_middle,
                    thumbnail: data.pic_info && data.pic_info.pic_small
                });

            if (!imageUrl) {
                return null;
            }

            return {
                id: getFileBasenameFromUrl(imageUrl, `mix-${index + 1}`),
                kind: "image",
                label: `图片 ${index + 1}`,
                imageUrl,
                videoUrl: null,
                imageExt: getFileExtensionFromUrl(imageUrl, ".jpg"),
                videoExt: ".mov"
            };
        }).filter(Boolean) as WeiboMediaItem[];
    }

    function createWeiboMediaItem(picId: string, picInfo: WeiboPicInfo | null | undefined, index: number): WeiboMediaItem | null {
        if (!picInfo || typeof picInfo !== "object") {
            return null;
        }

        const imageUrl = getBestWeiboImageUrl(picInfo);
        if (!imageUrl) {
            return null;
        }

        const mediaType = typeof picInfo.type === "string" ? picInfo.type.toLowerCase() : "pic";
        const isLivePhoto = mediaType === "livephoto";
        const isGif = mediaType === "gif" || getFileExtensionFromUrl(imageUrl, ".jpg") === ".gif";
        const candidateVideoUrl = typeof picInfo.video === "string"
            ? picInfo.video
            : (typeof picInfo.videoSrc === "string" ? picInfo.videoSrc : null);
        const videoUrl = isLivePhoto ? candidateVideoUrl : null;
        const kind = isLivePhoto ? "livephoto" : (isGif ? "gif" : "image");
        const label = isLivePhoto
            ? `Live Photo ${index + 1}`
            : (isGif ? `GIF ${index + 1}` : `图片 ${index + 1}`);

        return {
            id: picId,
            kind,
            label,
            imageUrl,
            videoUrl,
            imageExt: getFileExtensionFromUrl(imageUrl, ".jpg"),
            videoExt: getFileExtensionFromUrl(videoUrl, ".mov")
        };
    }

    function getWeiboMobileMediaItems(status: WeiboStatus | null | undefined): WeiboMediaItem[] {
        const pics = Array.isArray(status?.pics) ? status.pics : [];
        if (pics.length === 0) {
            return [];
        }

        return pics.map((pic, index) => {
            if (!pic || typeof pic !== "object") {
                return null;
            }

            const mediaType = typeof pic.type === "string" ? pic.type.toLowerCase() : "pic";
            if (mediaType === "video") {
                if (!isVideoDownloadEnabled()) {
                    return null;
                }

                return createWeiboVideoMediaItem({
                    id: pic.pid || `pic-video-${index + 1}`,
                    videoUrl: getBestWeiboVideoUrl(pic.media_info) || pic.videoSrc || pic.video,
                    index
                });
            }

            return createWeiboMediaItem(
                pic.pid || getFileBasenameFromUrl(getBestWeiboImageUrl(pic) || pic.url, `pic-${index + 1}`),
                pic,
                index
            );
        }).filter(Boolean) as WeiboMediaItem[];
    }

    function getWeiboMediaSourceStatus(status: WeiboStatus | null | undefined): WeiboStatus | null {
        if (!status || typeof status !== "object") {
            return null;
        }

        const hasPics = (Array.isArray(status.pic_ids) && status.pic_ids.length > 0) ||
            (Array.isArray(status.pics) && status.pics.length > 0);
        const hasMixMedia = status.mix_media_info && Array.isArray(status.mix_media_info.items) && status.mix_media_info.items.length > 0;
        if (hasPics || hasMixMedia) {
            return status;
        }

        if (status.retweeted_status) {
            return getWeiboMediaSourceStatus(status.retweeted_status);
        }

        return status;
    }

    function getWeiboMediaItemsFromStatus(status: WeiboStatus | null | undefined): WeiboMediaItem[] {
        const mediaSourceStatus = getWeiboMediaSourceStatus(status);
        if (!mediaSourceStatus || typeof mediaSourceStatus !== "object") {
            return [];
        }

        const picIds = Array.isArray(mediaSourceStatus.pic_ids) ? mediaSourceStatus.pic_ids : [];
        const picInfos = (mediaSourceStatus.pic_infos || {}) as Record<string, WeiboPicInfo>;
        const directMediaItems = picIds.map((picId, index) => createWeiboMediaItem(picId, picInfos[picId], index)).filter(Boolean) as WeiboMediaItem[];
        if (directMediaItems.length > 0) {
            return directMediaItems;
        }

        const mobileMediaItems = getWeiboMobileMediaItems(mediaSourceStatus);
        if (mobileMediaItems.length > 0) {
            return mobileMediaItems;
        }

        const mixMediaItems = getWeiboMixMediaItems(mediaSourceStatus);
        if (mixMediaItems.length > 0) {
            return mixMediaItems;
        }

        if (!isVideoDownloadEnabled()) {
            return [];
        }

        const pageInfo = (mediaSourceStatus.page_info || {}) as WeiboPageInfo;
        const pageInfoType = typeof pageInfo.type === "string" ? pageInfo.type.toLowerCase() : "";
        const objectType = typeof pageInfo.object_type === "string" ? pageInfo.object_type.toLowerCase() : "";
        if (pageInfoType === "video" || pageInfoType === "11" || objectType === "video") {
            const videoItem = createWeiboVideoMediaItem({
                id: mediaSourceStatus.mblogid || mediaSourceStatus.idstr || "video-1",
                videoUrl: getBestWeiboVideoUrl(pageInfo.media_info),
                index: 0
            });
            return videoItem ? [videoItem] : [];
        }

        return [];
    }

    async function fetchWeiboStatus(statusId: string | null | undefined): Promise<WeiboStatus | null> {
        if (!statusId) {
            return null;
        }

        if (weiboStatusCache.has(statusId)) {
            return weiboStatusCache.get(statusId)!;
        }

        const statusUrl = `${isSearchPage() ? "https://weibo.com" : ""}/ajax/statuses/show?id=${encodeURIComponent(statusId)}&locale=zh-CN&isGetLongText=true`;
        const request = (async () => {
            if (isSearchPage() && typeof gmXmlhttpRequest === "function") {
                return new Promise<WeiboStatus | null>((resolve, reject) => {
                    try {
                        gmXmlhttpRequest({
                            method: "GET",
                            url: statusUrl,
                            anonymous: false,
                            withCredentials: true,
                            headers: {
                                Accept: "application/json, text/plain, */*",
                                "X-Requested-With": "XMLHttpRequest",
                                Referer: "https://weibo.com/"
                            },
                            onload(response) {
                                if (response.status < 200 || response.status >= 300) {
                                    reject(new Error(`微博接口请求失败: ${response.status}`));
                                    return;
                                }

                                try {
                                    const data = JSON.parse(response.responseText);
                                    if (data && data.error) {
                                        reject(new Error(`微博接口请求失败: ${data.error}`));
                                        return;
                                    }

                                    resolve(data);
                                } catch (error) {
                                    reject(error);
                                }
                            },
                            onerror(error) {
                                reject(new Error(error?.error || error?.message || "微博接口请求失败"));
                            },
                            ontimeout() {
                                reject(new Error("微博接口请求超时"));
                            }
                        });
                    } catch (error) {
                        reject(error);
                    }
                });
            }

            const response = await fetchRef(statusUrl, {
                credentials: "same-origin",
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "X-Requested-With": "XMLHttpRequest"
                }
            });

            if (!response.ok) {
                throw new Error(`微博接口请求失败: ${response.status}`);
            }

            return response.json();
        })();

        weiboStatusCache.set(statusId, request);

        try {
            return await request;
        } catch (error) {
            weiboStatusCache.delete(statusId);
            throw error;
        }
    }

    async function getWeiboMediaItemsById(statusId: string | null | undefined): Promise<WeiboMediaItem[]> {
        const status = await fetchWeiboStatus(statusId);
        return getWeiboMediaItemsFromStatus(status);
    }

    function isVideoThumbnailImage(img: Element | null | undefined): boolean {
        if (!img || typeof img.closest !== "function") {
            return false;
        }

        const pictureMain = img.closest(".woo-picture-main");
        if (!pictureMain || typeof pictureMain.querySelector !== "function") {
            return false;
        }

        return !!pictureMain.querySelector('[class*="_videotime_"], [class*="_videobox_"], .woo-font--play');
    }

    function isArticleCoverImage(img: Element | null | undefined): boolean {
        if (!img || typeof img.closest !== "function") {
            return false;
        }

        // 头条文章卡片的封面图包在文章链接里，接口侧不算可下载图片；
        // 若不过滤，按钮会先按 DOM 计数插入、再被接口权威空结果移除，造成闪现。
        return !!img.closest('a[href*="ttarticle"]');
    }

    function findImagesInPost(container: Element): HTMLImageElement[] {
        const images: HTMLImageElement[] = [];

        for (const selector of imageSelectors) {
            try {
                const elements = container.querySelectorAll<HTMLImageElement>(selector);
                elements.forEach((img) => {
                    if (!img.src) {
                        return;
                    }

                    if (isAvatarImage(img.src)) {
                        return;
                    }
                    if (img.src.includes("default_avatar")) {
                        return;
                    }
                    if (img.src.includes("h5.sinaimg.cn")) {
                        return;
                    }
                    if (!img.src.includes("sinaimg") && !img.src.includes("sina.cn")) {
                        return;
                    }
                    if (isVideoThumbnailImage(img)) {
                        return;
                    }
                    if (isArticleCoverImage(img)) {
                        return;
                    }

                    images.push(img);
                });
            } catch (error) {
                log("微博图片选择器执行失败:", (error as Error).message);
            }
        }

        return images;
    }

    function getVueStatusItem(postContainer: Element): WeiboStatus | null {
        const candidateNodes = [
            postContainer,
            typeof postContainer.querySelector === "function" ? postContainer.querySelector(".card-wrap") : null,
            typeof postContainer.querySelector === "function" ? postContainer.querySelector(".card-main") : null
        ].filter(Boolean);

        for (const node of candidateNodes) {
            const vueInstance = node && (node as WeiboVueElement).__vue__;
            const item = vueInstance && (
                (vueInstance._props && vueInstance._props.item) ||
                vueInstance.item ||
                (vueInstance.$options && vueInstance.$options.propsData && vueInstance.$options.propsData.item)
            );

            if (item && typeof item === "object") {
                return item;
            }
        }

        return null;
    }

    function getDomMediaItems(postContainer: Element): WeiboMediaItem[] | null {
        if (!isMobileWeiboPage()) {
            return null;
        }

        const status = getVueStatusItem(postContainer);
        if (!status) {
            return null;
        }

        return getWeiboMediaItemsFromStatus(status);
    }

    function selectPreferredMediaItems<T>(fallbackItems: T[], resolvedMediaItems: T[], apiResolved: boolean): T[] {
        return apiResolved ? resolvedMediaItems : fallbackItems;
    }

    function getStatusLookupId(postContainer: Element): string | null {
        const mid = postContainer.getAttribute("mid") || postContainer.getAttribute("data-mid");
        if (mid) {
            return mid;
        }

        const links = postContainer.querySelectorAll<HTMLAnchorElement>("a[href]");
        for (const link of links) {
            const href = link.href || "";
            const match = href.match(/weibo\.com\/(?:u\/)?\d+\/([A-Za-z0-9]+)/);
            if (match && !href.includes("/u/")) {
                return match[1];
            }
        }

        return null;
    }

    async function resolvePostMediaItems(postContainer: Element, fallbackItems: WeiboMediaItem[]): Promise<WeiboMediaItem[]> {
        if (isMobileWeiboPage()) {
            const status = getVueStatusItem(postContainer);
            if (!status) {
                return fallbackItems;
            }

            const mediaItems = getWeiboMediaItemsFromStatus(status);
            return selectPreferredMediaItems(fallbackItems, mediaItems, true);
        }

        const statusId = getStatusLookupId(postContainer);
        if (!statusId) {
            return fallbackItems;
        }

        try {
            const mediaItems = await getWeiboMediaItemsById(statusId);
            return selectPreferredMediaItems(fallbackItems, mediaItems, true);
        } catch (error) {
            log("微博接口解析失败，回退DOM:", (error as Error).message);
        }

        return selectPreferredMediaItems(fallbackItems, [], false);
    }

    function getPostSelectors(): string[] {
        if (isMobileWeiboPage()) {
            return mobilePostSelectors;
        }

        return postSelectors;
    }

    function shouldSkipPost(post: Element | null | undefined): boolean {
        if (isMobileWeiboPage()) {
            return !post || typeof post.matches !== "function" || !post.matches(".card.m-panel.card9");
        }

        return false;
    }

    function shouldResolveEmptyMediaItems(postContainer: Element): boolean {
        return isVideoDownloadEnabled() && !!getStatusLookupId(postContainer);
    }

    // 时间线 article 普遍不带 mid，postId 回退顺序：帖子链接中的真实 statusId →
    // 每容器唯一合成 id。不能用 Date.now() 兜底：同一批同步注入的多个帖子会取到
    // 同一个毫秒值，下载状态机按 postId 归组时会把整页帖子当成同一帖互相串状态。
    const syntheticPostIds = new WeakMap<Element, string>();
    let syntheticPostIdSeq = 0;

    function getSyntheticPostId(postContainer: Element): string {
        let id = syntheticPostIds.get(postContainer);
        if (!id) {
            syntheticPostIdSeq += 1;
            id = `weibo_${syntheticPostIdSeq}`;
            syntheticPostIds.set(postContainer, id);
        }
        return id;
    }

    function getPostId(postContainer: Element): string {
        if (isMobileWeiboPage()) {
            const status = getVueStatusItem(postContainer);
            if (status && status.mid) {
                return status.mid;
            }
        }

        return getStatusLookupId(postContainer) || getSyntheticPostId(postContainer);
    }

    function insertMobileDownloadButton(post: Element, btn: HTMLElement): boolean {
        const nameRow = post.querySelector<HTMLElement>("header.weibo-top .m-text-box h3.m-text-cut");
        if (nameRow) {
            nameRow.style.display = "inline-flex";
            nameRow.style.alignItems = "center";
            nameRow.style.flexWrap = "nowrap";
            nameRow.style.columnGap = "4px";
            nameRow.appendChild(btn);
            return true;
        }

        const headerEl = post.querySelector("header.weibo-top");
        if (headerEl) {
            headerEl.appendChild(btn);
            return true;
        }

        return false;
    }

    function insertDownloadButton({ post, btn }: { post: Element; btn: HTMLElement }): boolean {
        if (isMobileWeiboPage()) {
            return insertMobileDownloadButton(post, btn);
        }

        if (isSearchPage()) {
            const infoEl = post.querySelector(".content .info");
            if (infoEl) {
                const nameDiv = Array.from(infoEl.children).find((el): el is HTMLDivElement => !el.classList.contains("menu"));
                if (nameDiv) {
                    nameDiv.style.display = "flex";
                    nameDiv.style.alignItems = "center";
                    nameDiv.style.gap = "4px";
                    nameDiv.appendChild(btn);
                    return true;
                }
            }
        }

        const retweetSpan = Array.from(post.querySelectorAll("span")).find((el) =>
            el.textContent.trim() === "转发微博"
        );
        if (retweetSpan && retweetSpan.parentNode) {
            retweetSpan.parentNode.insertBefore(btn, retweetSpan.nextSibling);
            return true;
        }

        const suffixBox = post.querySelector('div[class*="_suffixbox"]');
        if (suffixBox) {
            suffixBox.appendChild(btn);
            return true;
        }

        const iconsPlusEl = post.querySelector('div[class*="_iconsPlus_"]');
        if (iconsPlusEl && iconsPlusEl.parentNode) {
            iconsPlusEl.parentNode.insertBefore(btn, iconsPlusEl);
            return true;
        }

        for (const headerSelector of headerSelectors) {
            const headerEl = post.querySelector(headerSelector);
            if (headerEl) {
                headerEl.appendChild(btn);
                return true;
            }
        }

        return false;
    }

    function getPostUrl(article: Element | null | undefined): string | null {
        if (!article) {
            return null;
        }

        const links = article.querySelectorAll<HTMLAnchorElement>("a[href]");
        for (const link of links) {
            const href = link.href;
            if (/weibo\.com\/\d+\/\w+/.test(href) && !href.includes("/u/")) {
                return href;
            }
        }

        return null;
    }

    function injectGotoOriginalMenuItem(popMain: HTMLElement, article: Element | null | undefined, documentRef: Document): void {
        if (!popMain || popMain.dataset.gotoInjected) {
            return;
        }

        const postUrl = getPostUrl(article);
        if (!postUrl) {
            return;
        }

        const wrapMain = popMain.querySelector(".woo-pop-wrap-main");
        if (!wrapMain) {
            return;
        }

        const shareItem = wrapMain.firstElementChild;
        if (!shareItem) {
            return;
        }

        const item = documentRef.createElement("div");
        item.setAttribute("role", "button");
        item.className = "woo-box-flex woo-box-alignCenter woo-pop-item-main woo-pop-item-main";
        item.innerHTML = '<div class="woo-box-flex woo-box-column" style="width:100%"><div class="woo-box-flex woo-box-justifyBetween"><div>跳转原文</div></div><div class="_desc_1v5ao_2"></div></div>';

        item.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            windowRef.open(postUrl, "_blank");
        });

        wrapMain.insertBefore(item, shareItem.nextSibling);
        popMain.dataset.gotoInjected = "1";
    }

    function injectSearchPageGotoOriginal({ documentRef }: { documentRef: Document }): void {
        documentRef.querySelectorAll<HTMLDivElement>('div[action-type="feed_list_item"]').forEach((post) => {
            const menuUl = post.querySelector<HTMLUListElement>('ul[node-type="fl_menu_right"]');
            if (!menuUl || menuUl.dataset.gotoInjected) {
                return;
            }

            const postUrl = getPostUrl(post);
            if (!postUrl) {
                return;
            }

            const li = documentRef.createElement("li");
            const a = documentRef.createElement("a");
            a.href = "javascript:void(0);";
            a.textContent = "跳转原文";
            a.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                windowRef.open(postUrl, "_blank");
            });

            li.appendChild(a);
            menuUl.insertBefore(li, menuUl.firstChild);
            menuUl.dataset.gotoInjected = "1";
        });
    }

    function afterInjectDownloadButtons({ documentRef }: { documentRef: Document }): void {
        if (isSearchPage()) {
            injectSearchPageGotoOriginal({ documentRef });
        }
    }

    function initObservers({ documentRef }: { documentRef: Document }): void {
        const MutationObserverRef = windowRef.MutationObserver || MutationObserver;
        const menuObserver = new MutationObserverRef((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (!(node instanceof Element)) {
                        continue;
                    }

                    if (node.classList.contains("woo-pop-main")) {
                        const article = node.closest("article");
                        if (article && node.textContent.includes("分享")) {
                            injectGotoOriginalMenuItem(node as HTMLElement, article, documentRef);
                        }
                    }
                }
            }
        });

        menuObserver.observe(documentRef.body, { childList: true, subtree: true });
    }

    return {
        id: "weibo",
        displayName: "微博",
        isSearchPage,
        isAvatarImage,
        getOriginalImageUrl,
        getBestWeiboImageUrl,
        getWeiboMixMediaItems,
        createWeiboMediaItem,
        getWeiboMediaSourceStatus,
        getWeiboMediaItemsFromStatus,
        getDomMediaItems,
        fetchWeiboStatus,
        getWeiboMediaItemsById,
        isVideoThumbnailImage,
        findImagesInPost,
        selectPreferredMediaItems,
        resolvePostMediaItems,
        getPostSelectors,
        shouldSkipPost,
        shouldResolveEmptyMediaItems,
        getPostId,
        insertDownloadButton,
        getPostUrl,
        injectGotoOriginalMenuItem,
        afterInjectDownloadButtons,
        initObservers
    };
}
