export function createUtils({ config, windowRef, fetchRef, gmDownload, ui }) {
    const weiboStatusCache = new Map();

    function isWeibo() {
        return windowRef.location.hostname.includes("weibo");
    }

    function isSearchPage() {
        return windowRef.location.hostname === "s.weibo.com";
    }

    function isX() {
        return windowRef.location.hostname.includes("x.com") ||
            windowRef.location.hostname.includes("twitter");
    }

    function getCurrentPlatform() {
        if (isX()) {
            return "x";
        }
        return "weibo";
    }

    function log(...args) {
        if (config.DEBUG) {
            const platform = getCurrentPlatform();
            console.log(`[${platform} Downloader]`, ...args);
        }
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

        if (isX()) {
            return getXOriginalImageUrl(url);
        }

        return getWeiboOriginalImageUrl(url);
    }

    function getWeiboOriginalImageUrl(url) {
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

    function getFileExtensionFromUrl(url, fallback = ".jpg") {
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

    function getBestWeiboImageUrl(picInfo) {
        if (!picInfo || typeof picInfo !== "object") {
            return null;
        }

        const candidates = [
            picInfo.largest && picInfo.largest.url,
            picInfo.original && picInfo.original.url,
            picInfo.large && picInfo.large.url,
            picInfo.bmiddle && picInfo.bmiddle.url,
            picInfo.thumbnail && picInfo.thumbnail.url
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

    function getFileBasenameFromUrl(url, fallback) {
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
        const videoUrl = isLivePhoto && typeof picInfo.video === "string" ? picInfo.video : null;
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

    function getWeiboMediaSourceStatus(status) {
        if (!status || typeof status !== "object") {
            return null;
        }

        const hasPics = Array.isArray(status.pic_ids) && status.pic_ids.length > 0;
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

        return getWeiboMixMediaItems(mediaSourceStatus);
    }

    function getXOriginalImageUrl(url) {
        if (!url || typeof url !== "string") {
            return null;
        }
        if (!url.includes("pbs.twimg.com")) {
            return null;
        }

        try {
            let fullUrl = url;
            if (!url.startsWith("http")) {
                fullUrl = `https://${url}`;
            }

            const urlObj = new URL(fullUrl);
            const name = urlObj.searchParams.get("name");
            if (name === "orig" || name === "large") {
                return fullUrl;
            }
            urlObj.searchParams.delete("name");
            urlObj.searchParams.set("name", "orig");
            return urlObj.toString();
        } catch {
            if (url.includes("name=orig") || url.includes("name=large")) {
                return url;
            }
            return url.replace(/name=[^&]*/, "name=orig");
        }
    }

    function getFilename(postId, index) {
        const platform = getCurrentPlatform();
        return `${platform}_${postId}_${index}.jpg`;
    }

    function buildMediaDownloadJobs(mediaItems, postId) {
        const platform = getCurrentPlatform();
        const jobs = [];

        mediaItems.forEach((item, index) => {
            if (!item || typeof item !== "object") {
                return;
            }

            const baseName = `${platform}_${postId}_${index + 1}`;

            if (item.imageUrl) {
                jobs.push({
                    type: "image",
                    url: item.imageUrl,
                    filename: `${baseName}${item.imageExt || getFileExtensionFromUrl(item.imageUrl, ".jpg")}`
                });
            }

            if (item.videoUrl) {
                jobs.push({
                    type: "video",
                    url: item.videoUrl,
                    filename: `${baseName}_live${item.videoExt || getFileExtensionFromUrl(item.videoUrl, ".mov")}`
                });
            }
        });

        return jobs;
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

    function normalizeLegacyMediaItems(urls) {
        return (urls || []).map((url, index) => ({
            id: `legacy-${index + 1}`,
            kind: "image",
            label: `图片 ${index + 1}`,
            imageUrl: url,
            videoUrl: null,
            imageExt: getFileExtensionFromUrl(url, ".jpg"),
            videoExt: ".mov"
        }));
    }

    async function downloadImage(url, filename) {
        if (typeof gmDownload === "function") {
            try {
                const success = await new Promise((resolve) => {
                    try {
                        const downloadId = gmDownload({
                            url,
                            name: filename,
                            onload() {
                                log(`下载完成: ${filename}`);
                                resolve(true);
                            },
                            onerror(error) {
                                log(`GM_download失败: ${error.error || error.message || "未知错误"}`);
                                resolve(false);
                            },
                            onprogress: () => {}
                        });

                        if (downloadId === false) {
                            log(`GM_download返回false: ${filename}`);
                            resolve(false);
                        }
                    } catch (error) {
                        log("GM_download异常:", error.message);
                        resolve(false);
                    }
                });

                if (success) {
                    return true;
                }

                log("GM_download失败，尝试备用方案");
            } catch (error) {
                log("GM_download异常，尝试备用方案:", error.message);
            }
        }

        return downloadImageFallback(url, filename);
    }

    async function downloadImageFallback(url, filename) {
        try {
            const response = await fetchRef(url);
            const blob = await response.blob();
            const blobUrl = windowRef.URL.createObjectURL(blob);
            const anchor = windowRef.document.createElement("a");
            anchor.href = blobUrl;
            anchor.download = filename;
            anchor.click();
            setTimeout(() => windowRef.URL.revokeObjectURL(blobUrl), 1000);
            log(`fetch下载成功: ${filename}`);
            return true;
        } catch {
            log(`打开图片: ${filename}`);
            windowRef.open(url, "_blank");
            return true;
        }
    }

    async function downloadAllImages(urls, postId) {
        return downloadMediaItems(normalizeLegacyMediaItems(urls), postId);
    }

    async function downloadMediaItems(mediaItems, postId) {
        if (!mediaItems || mediaItems.length === 0) {
            if (ui && typeof ui.showToast === "function") {
                ui.showToast("未找到图片");
            }
            return;
        }

        const jobs = buildMediaDownloadJobs(mediaItems, postId);
        if (jobs.length === 0) {
            if (ui && typeof ui.showToast === "function") {
                ui.showToast("未找到图片");
            }
            return;
        }

        log(`开始下载 ${mediaItems.length} 个媒体项，共 ${jobs.length} 个文件...`);

        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];
            await downloadImage(job.url, job.filename);
            if (i < jobs.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, config.DELAY_MS));
            }
        }

        const message = jobs.length === mediaItems.length
            ? `已下载 ${jobs.length} 张图片`
            : `已下载 ${mediaItems.length} 个媒体项，共 ${jobs.length} 个文件`;

        log(message);
        if (ui && typeof ui.showToast === "function") {
            ui.showToast(message);
        }
    }

    return {
        isWeibo,
        isSearchPage,
        isX,
        getCurrentPlatform,
        log,
        isAvatarImage,
        getOriginalImageUrl,
        getWeiboOriginalImageUrl,
        getFileExtensionFromUrl,
        getBestWeiboImageUrl,
        getFileBasenameFromUrl,
        createWeiboMediaItem,
        getWeiboMixMediaItems,
        getWeiboMediaSourceStatus,
        getWeiboMediaItemsFromStatus,
        getXOriginalImageUrl,
        getFilename,
        buildMediaDownloadJobs,
        fetchWeiboStatus,
        getWeiboMediaItemsById,
        downloadImage,
        downloadImageFallback,
        downloadAllImages,
        downloadMediaItems
    };
}
