import { createPlatformAdapter } from "./platforms/index.js";

export function createUtils({ config, windowRef, fetchRef, gmDownload, ui }) {
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
                jobs.push({
                    type: "video",
                    url: item.videoUrl,
                    filename: `${baseName}_live${item.videoExt || getFileExtensionFromUrl(item.videoUrl, ".mov")}`
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

    async function downloadImage(url, filename) {
        if (typeof gmDownload === "function") {
            try {
                const success = await new Promise((resolve) => {
                    try {
                        const downloadId = gmDownload({
                            url,
                            name: filename,
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
            return true;
        } catch (error) {
            log("fetch下载失败，改为新标签页打开:", filename, error?.message || "未知错误");
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
