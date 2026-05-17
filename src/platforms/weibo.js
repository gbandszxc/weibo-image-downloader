export function createWeiboPlatform({
    windowRef,
    fetchRef,
    log,
    getFileBasenameFromUrl,
    getFileExtensionFromUrl
}) {
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
    const weiboStatusCache = new Map();

    function isSearchPage() {
        return windowRef.location.hostname === "s.weibo.com";
    }

    function isMobileWeiboPage() {
        return windowRef.location.hostname === "m.weibo.cn";
    }

    function isAvatarImage(url) {
        if (!url) {
            return false;
        }

        return url.includes("/crop.") ||
            url.includes("/avatar") ||
            url.includes("_cute") ||
            url.includes("_online");
    }

    function getOriginalImageUrl(url) {
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

        const sizePatterns = ["thumb180", "thumb300", "square", "bmiddle", "mw690", "mw1024", "orj360", "orj480", "webp720"];
        for (const size of sizePatterns) {
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

    function getBestWeiboImageUrl(picInfo) {
        if (!picInfo || typeof picInfo !== "object") {
            return null;
        }

        const candidates = [
            picInfo.largest && picInfo.largest.url,
            picInfo.original && picInfo.original.url,
            picInfo.large && picInfo.large.url,
            picInfo.bmiddle && picInfo.bmiddle.url,
            picInfo.thumbnail && picInfo.thumbnail.url,
            picInfo.url
        ];

        return candidates.find((url) => typeof url === "string" && url.length > 0) || null;
    }

    function getWeiboMixMediaItems(status) {
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
                return null;
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
        }).filter(Boolean);
    }

    function createWeiboMediaItem(picId, picInfo, index) {
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

    function getWeiboMobileMediaItems(status) {
        const pics = Array.isArray(status && status.pics) ? status.pics : [];
        if (pics.length === 0) {
            return [];
        }

        return pics.map((pic, index) => {
            if (!pic || typeof pic !== "object") {
                return null;
            }

            const mediaType = typeof pic.type === "string" ? pic.type.toLowerCase() : "pic";
            if (mediaType === "video") {
                return null;
            }

            return createWeiboMediaItem(
                pic.pid || getFileBasenameFromUrl(getBestWeiboImageUrl(pic) || pic.url, `pic-${index + 1}`),
                pic,
                index
            );
        }).filter(Boolean);
    }

    function getWeiboMediaSourceStatus(status) {
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

    function getWeiboMediaItemsFromStatus(status) {
        const mediaSourceStatus = getWeiboMediaSourceStatus(status);
        if (!mediaSourceStatus || typeof mediaSourceStatus !== "object") {
            return [];
        }

        const picIds = Array.isArray(mediaSourceStatus.pic_ids) ? mediaSourceStatus.pic_ids : [];
        const picInfos = mediaSourceStatus.pic_infos || {};
        const directMediaItems = picIds.map((picId, index) => createWeiboMediaItem(picId, picInfos[picId], index)).filter(Boolean);
        if (directMediaItems.length > 0) {
            return directMediaItems;
        }

        const mobileMediaItems = getWeiboMobileMediaItems(mediaSourceStatus);
        if (mobileMediaItems.length > 0) {
            return mobileMediaItems;
        }

        return getWeiboMixMediaItems(mediaSourceStatus);
    }

    async function fetchWeiboStatus(statusId) {
        if (!statusId) {
            return null;
        }

        if (weiboStatusCache.has(statusId)) {
            return weiboStatusCache.get(statusId);
        }

        const request = (async () => {
            const response = await fetchRef(`/ajax/statuses/show?id=${encodeURIComponent(statusId)}&locale=zh-CN&isGetLongText=true`, {
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

    async function getWeiboMediaItemsById(statusId) {
        const status = await fetchWeiboStatus(statusId);
        return getWeiboMediaItemsFromStatus(status);
    }

    function isVideoThumbnailImage(img) {
        if (!img || typeof img.closest !== "function") {
            return false;
        }

        const pictureMain = img.closest(".woo-picture-main");
        if (!pictureMain || typeof pictureMain.querySelector !== "function") {
            return false;
        }

        return !!pictureMain.querySelector('[class*="_videotime_"], [class*="_videobox_"], .woo-font--play');
    }

    function findImagesInPost(container) {
        const images = [];

        for (const selector of imageSelectors) {
            try {
                const elements = container.querySelectorAll(selector);
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

                    images.push(img);
                });
            } catch (error) {
                log("微博图片选择器执行失败:", error.message);
            }
        }

        return images;
    }

    function getVueStatusItem(postContainer) {
        const candidateNodes = [
            postContainer,
            typeof postContainer.querySelector === "function" ? postContainer.querySelector(".card-wrap") : null,
            typeof postContainer.querySelector === "function" ? postContainer.querySelector(".card-main") : null
        ].filter(Boolean);

        for (const node of candidateNodes) {
            const vueInstance = node && node.__vue__;
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

    function getDomMediaItems(postContainer) {
        if (!isMobileWeiboPage()) {
            return null;
        }

        const status = getVueStatusItem(postContainer);
        if (!status) {
            return null;
        }

        return getWeiboMediaItemsFromStatus(status);
    }

    function selectPreferredMediaItems(fallbackItems, resolvedMediaItems, apiResolved) {
        return apiResolved ? resolvedMediaItems : fallbackItems;
    }

    function getStatusLookupId(postContainer) {
        const mid = postContainer.getAttribute("mid") || postContainer.getAttribute("data-mid");
        if (mid) {
            return mid;
        }

        const links = postContainer.querySelectorAll("a[href]");
        for (const link of links) {
            const href = link.href || "";
            const match = href.match(/weibo\.com\/(?:u\/)?\d+\/([A-Za-z0-9]+)/);
            if (match && !href.includes("/u/")) {
                return match[1];
            }
        }

        return null;
    }

    async function resolvePostMediaItems(postContainer, fallbackItems) {
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
            log("微博接口解析失败，回退DOM:", error.message);
        }

        return selectPreferredMediaItems(fallbackItems, [], false);
    }

    function getPostSelectors() {
        if (isMobileWeiboPage()) {
            return mobilePostSelectors;
        }

        return postSelectors;
    }

    function shouldSkipPost(post) {
        if (isMobileWeiboPage()) {
            return !post || typeof post.matches !== "function" || !post.matches(".card.m-panel.card9");
        }

        return false;
    }

    function getPostId(postContainer) {
        if (isMobileWeiboPage()) {
            const status = getVueStatusItem(postContainer);
            if (status && status.mid) {
                return status.mid;
            }
        }

        return postContainer.getAttribute("mid") ||
            postContainer.getAttribute("data-mid") ||
            `weibo_${Date.now()}`;
    }

    function insertMobileDownloadButton(post, btn) {
        const nameRow = post.querySelector("header.weibo-top .m-text-box h3.m-text-cut");
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

    function insertDownloadButton({ post, btn }) {
        if (isMobileWeiboPage()) {
            return insertMobileDownloadButton(post, btn);
        }

        if (isSearchPage()) {
            const infoEl = post.querySelector(".content .info");
            if (infoEl) {
                const nameDiv = Array.from(infoEl.children).find((el) => !el.classList.contains("menu"));
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

    function getPostUrl(article) {
        if (!article) {
            return null;
        }

        const links = article.querySelectorAll("a[href]");
        for (const link of links) {
            const href = link.href;
            if (/weibo\.com\/\d+\/\w+/.test(href) && !href.includes("/u/")) {
                return href;
            }
        }

        return null;
    }

    function injectGotoOriginalMenuItem(popMain, article, documentRef) {
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

    function injectSearchPageGotoOriginal({ documentRef }) {
        documentRef.querySelectorAll('div[action-type="feed_list_item"]').forEach((post) => {
            const menuUl = post.querySelector('ul[node-type="fl_menu_right"]');
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

    function afterInjectDownloadButtons({ documentRef }) {
        if (isSearchPage()) {
            injectSearchPageGotoOriginal({ documentRef });
        }
    }

    function initObservers({ documentRef }) {
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
                            injectGotoOriginalMenuItem(node, article, documentRef);
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
        getPostId,
        insertDownloadButton,
        getPostUrl,
        injectGotoOriginalMenuItem,
        afterInjectDownloadButtons,
        initObservers
    };
}
