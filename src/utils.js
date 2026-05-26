import { createPlatformAdapter } from "./platforms/index.js";

export function createUtils({ config, windowRef, fetchRef, gmDownload, gmXmlhttpRequest, ui }) {
    let platformLabel = "weibo";

    function log(...args) {
        if (config.DEBUG) {
            console.log(`[${platformLabel} Downloader]`, ...args);
        }
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

    const platform = createPlatformAdapter({
        config,
        windowRef,
        fetchRef,
        gmXmlhttpRequest,
        log,
        getFileBasenameFromUrl,
        getFileExtensionFromUrl
    });
    platformLabel = platform.id;

    function getCurrentPlatform() {
        return platform.id;
    }

    function getCurrentPlatformDisplayName() {
        return platform.displayName || platform.id;
    }

    function getOriginalImageUrl(url) {
        return platform.getOriginalImageUrl(url);
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
                const isStandaloneVideo = item.kind === "video";
                jobs.push({
                    type: "video",
                    url: item.videoUrl,
                    filename: `${baseName}${isStandaloneVideo ? "" : "_live"}${item.videoExt || getFileExtensionFromUrl(item.videoUrl, ".mov")}`
                });
            }
        });

        return jobs;
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

    function getDownloadRequestHeaders(url) {
        if (!url || typeof url !== "string") {
            return {};
        }

        try {
            const { hostname } = new URL(url);
            if (hostname.endsWith("sinaimg.cn") || hostname.endsWith("sina.cn")) {
                return {
                    Referer: "https://www.weibo.com/",
                    Origin: "https://www.weibo.com"
                };
            }
        } catch {
            return {};
        }

        return {};
    }

    async function tryGmDownload(resource, filename) {
        if (typeof gmDownload !== "function") {
            return false;
        }

        try {
            return await new Promise((resolve) => {
                try {
                    const downloadId = gmDownload({
                        url: resource,
                        name: filename,
                        headers: getDownloadRequestHeaders(resource),
                        saveAs: false,
                        onload() {
                            resolve(true);
                        },
                        onerror(error) {
                            log(`GM_download失败: ${error.error || error.message || "未知错误"}`);
                            resolve(false);
                        },
                        onprogress: () => {}
                    });

                    if (downloadId === false) {
                        log("GM_download返回false，尝试备用方案:", filename);
                        resolve(false);
                    }
                } catch (error) {
                    log("GM_download异常:", error.message);
                    resolve(false);
                }
            });
        } catch (error) {
            log("GM_download异常，尝试备用方案:", error.message);
            return false;
        }
    }

    function downloadBlobWithAnchor(blob, filename) {
        const blobUrl = windowRef.URL.createObjectURL(blob);
        const anchor = windowRef.document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = filename;

        const mountPoint = windowRef.document.body || windowRef.document.documentElement;
        if (mountPoint && typeof mountPoint.appendChild === "function") {
            mountPoint.appendChild(anchor);
        }

        anchor.click();

        if (anchor.parentNode && typeof anchor.parentNode.removeChild === "function") {
            anchor.parentNode.removeChild(anchor);
        }

        setTimeout(() => windowRef.URL.revokeObjectURL(blobUrl), 1000);
        return true;
    }

    async function fetchBlobWithXmlHttpRequest(url) {
        if (typeof gmXmlhttpRequest !== "function") {
            return null;
        }

        const headers = getDownloadRequestHeaders(url);

        return new Promise((resolve, reject) => {
            try {
                gmXmlhttpRequest({
                    method: "GET",
                    url,
                    headers,
                    responseType: "blob",
                    onload(response) {
                        if (response.status >= 200 && response.status < 300 && response.response) {
                            resolve(response.response);
                            return;
                        }

                        reject(new Error(`GM_xmlhttpRequest状态异常: ${response.status}`));
                    },
                    onerror(error) {
                        reject(new Error(error?.error || error?.message || "GM_xmlhttpRequest失败"));
                    },
                    ontimeout() {
                        reject(new Error("GM_xmlhttpRequest超时"));
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    async function fetchBlobWithWindowFetch(url) {
        const response = await fetchRef(url, {
            credentials: "include"
        });

        if (!response || !response.ok) {
            throw new Error(`fetch状态异常: ${response?.status ?? "unknown"}`);
        }

        return response.blob();
    }

    async function downloadBlob(blob, filename) {
        const gmSuccess = await tryGmDownload(blob, filename);
        if (gmSuccess) {
            return true;
        }

        return downloadBlobWithAnchor(blob, filename);
    }

    async function downloadImage(url, filename) {
        const directDownloadSuccess = await tryGmDownload(url, filename);
        if (directDownloadSuccess) {
            return true;
        }

        log("GM_download失败，尝试二进制兜底下载");
        return downloadImageFallback(url, filename);
    }

    async function downloadImageFallback(url, filename) {
        try {
            let blob = null;

            if (typeof gmXmlhttpRequest === "function") {
                blob = await fetchBlobWithXmlHttpRequest(url);
            } else {
                blob = await fetchBlobWithWindowFetch(url);
            }

            return downloadBlob(blob, filename);
        } catch (primaryError) {
            if (typeof gmXmlhttpRequest === "function") {
                try {
                    const blob = await fetchBlobWithWindowFetch(url);
                    return downloadBlob(blob, filename);
                } catch (secondaryError) {
                    log(
                        "二进制兜底下载失败:",
                        filename,
                        primaryError?.message || "未知错误",
                        secondaryError?.message || "未知错误"
                    );
                    return false;
                }
            }

            log("二进制兜底下载失败:", filename, primaryError?.message || "未知错误");
            return false;
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

        let successCount = 0;
        let failedCount = 0;

        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];
            const success = await downloadImage(job.url, job.filename);
            if (success) {
                successCount++;
            } else {
                failedCount++;
            }
            if (i < jobs.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, config.DELAY_MS));
            }
        }

        let message = "";
        if (failedCount === 0) {
            message = jobs.length === mediaItems.length
                ? `已下载 ${jobs.length} 张图片`
                : `已下载 ${mediaItems.length} 个媒体项，共 ${jobs.length} 个文件`;
        } else if (successCount === 0) {
            message = `下载失败，共 ${failedCount} 个文件未完成`;
        } else {
            message = `已下载 ${successCount} 个文件，${failedCount} 个失败`;
        }

        log(message);
        if (ui && typeof ui.showToast === "function") {
            ui.showToast(message);
        }
    }

    return {
        getCurrentPlatform,
        getCurrentPlatformDisplayName,
        getPlatformAdapter: () => platform,
        log,
        getOriginalImageUrl,
        getFileExtensionFromUrl,
        getFileBasenameFromUrl,
        getFilename,
        buildMediaDownloadJobs,
        downloadImage,
        downloadImageFallback,
        downloadAllImages,
        downloadMediaItems
    };
}
