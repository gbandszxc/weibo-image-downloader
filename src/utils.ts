import { createPlatformAdapter } from "./platforms/index.ts";
import type { PlatformAdapter } from "./platforms/index.ts";
import { convertXVideoToGif } from "./x-gif.ts";
import type { WeiboMediaItem, WeiboPlatformWindow } from "./platforms/weibo.ts";
import type { XMediaItem, XPlatformWindowRef } from "./platforms/x.ts";
import type { GifWindowLike } from "./x-gif-workers.ts";

/** createUtils 与平台工厂共同依赖的 window 结构子集（允许传入裁剪过的伪 window）。 */
export type UtilsWindowRef = WeiboPlatformWindow & XPlatformWindowRef & GifWindowLike;

/** 两个平台媒体项的结构联合；本模块只消费 imageUrl/videoUrl/kind/ext 等公共字段。 */
export type UtilsMediaItem = WeiboMediaItem | XMediaItem;

export interface UtilsConfig {
    DEBUG?: boolean;
    DELAY_MS: number;
    ENABLE_VIDEO_DOWNLOAD?: boolean;
    X_GIF_AUTO_CONVERT?: boolean;
}

export interface GmDownloadOptions {
    url: string | Blob;
    name: string;
    headers: Record<string, string>;
    saveAs: boolean;
    onload(): void;
    onerror(error: { error?: string; message?: string }): void;
    onprogress: () => void;
}

export type GmDownload = (options: GmDownloadOptions) => unknown;

/** 下载 Blob 用的 GM_xmlhttpRequest 请求结构；方法语法保持参数双变以兼容各平台的请求类型。 */
export interface GmBlobRequestDetails {
    method: "GET";
    url: string;
    headers: Record<string, string>;
    responseType?: "blob";
    onload(response: { status: number; response?: unknown }): void;
    onerror(error?: { error?: string; message?: string }): void;
    ontimeout(): void;
}

export type GmXmlBlobRequest = (details: GmBlobRequestDetails) => unknown;

export interface UtilsUi {
    showToast?: (message: string) => void;
}

export interface UtilsDeps {
    config: UtilsConfig;
    windowRef: UtilsWindowRef;
    fetchRef: typeof fetch;
    gmDownload?: GmDownload | null;
    gmXmlhttpRequest?: GmXmlBlobRequest | null;
    ui?: UtilsUi | null;
}

export interface MediaDownloadJob {
    type: "image" | "video";
    url: string;
    filename: string;
    convertToGif?: boolean;
}

export interface DownloadResult {
    successCount: number;
    failedCount: number;
    handedOffCount: number;
}

export interface Utils {
    getCurrentPlatform(): string;
    getCurrentPlatformDisplayName(): string;
    getPlatformAdapter(): PlatformAdapter;
    log(...args: unknown[]): void;
    getOriginalImageUrl(url: unknown): string | null;
    getFileExtensionFromUrl(url: unknown, fallback?: string): string;
    getFileBasenameFromUrl(url: unknown, fallback: string): string;
    getFilename(postId: string, index: number): string;
    buildMediaDownloadJobs(mediaItems: readonly UtilsMediaItem[], postId: string): MediaDownloadJob[];
    downloadImage(url: string, filename: string): Promise<boolean | "started">;
    downloadImageFallback(url: string, filename: string): Promise<boolean | "started">;
    downloadAllImages(urls: readonly (string | null)[] | null | undefined, postId: string): Promise<DownloadResult>;
    downloadMediaItems(mediaItems: readonly UtilsMediaItem[] | null | undefined, postId: string): Promise<DownloadResult>;
}

export function createUtils({ config, windowRef, fetchRef, gmDownload, gmXmlhttpRequest, ui }: UtilsDeps): Utils {
    let platformLabel = "weibo";

    function log(...args: unknown[]): void {
        if (config.DEBUG) {
            console.log(`[${platformLabel} Downloader]`, ...args);
        }
    }

    function getFileExtensionFromUrl(url: unknown, fallback = ".jpg"): string {
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

    function getFileBasenameFromUrl(url: unknown, fallback: string): string {
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

    function getCurrentPlatform(): string {
        return platform.id;
    }

    function getCurrentPlatformDisplayName(): string {
        return platform.displayName || platform.id;
    }

    function getOriginalImageUrl(url: unknown): string | null {
        return platform.getOriginalImageUrl(url);
    }

    function getFilename(postId: string, index: number): string {
        const platform = getCurrentPlatform();
        return `${platform}_${postId}_${index}.jpg`;
    }

    function buildMediaDownloadJobs(mediaItems: readonly UtilsMediaItem[], postId: string): MediaDownloadJob[] {
        const platform = getCurrentPlatform();
        const jobs: MediaDownloadJob[] = [];

        mediaItems.forEach((item, index) => {
            if (!item || typeof item !== "object") {
                return;
            }

            const baseName = `${platform}_${postId}_${index + 1}`;

            if (item.imageUrl) {
                const job: MediaDownloadJob = {
                    type: "image",
                    url: item.imageUrl,
                    filename: `${baseName}${item.imageExt || getFileExtensionFromUrl(item.imageUrl, ".jpg")}`
                };
                if (platform === "x" && item.kind === "gif" && config.X_GIF_AUTO_CONVERT &&
                    getFileExtensionFromUrl(item.imageUrl, item.imageExt) !== ".gif") {
                    job.convertToGif = true;
                    job.filename = `${baseName}.gif`;
                }
                jobs.push(job);
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

    function normalizeLegacyMediaItems(urls: readonly (string | null)[] | null | undefined): UtilsMediaItem[] {
        return (urls || []).map((url, index): UtilsMediaItem => ({
            id: `legacy-${index + 1}`,
            kind: "image",
            label: `图片 ${index + 1}`,
            imageUrl: url,
            videoUrl: null,
            imageExt: getFileExtensionFromUrl(url, ".jpg"),
            videoExt: ".mov"
        }));
    }

    function getDownloadRequestHeaders(url: unknown): Record<string, string> {
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

    async function tryGmDownload(resource: string | Blob, filename: string): Promise<boolean> {
        if (typeof gmDownload !== "function") {
            return false;
        }

        try {
            return await new Promise<boolean>((resolve) => {
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
                    log("GM_download异常:", (error as Error).message);
                    resolve(false);
                }
            });
        } catch (error) {
            log("GM_download异常，尝试备用方案:", (error as Error).message);
            return false;
        }
    }

    function downloadBlobWithAnchor(blob: Blob, filename: string): "started" {
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
        return "started";
    }

    async function fetchBlobWithXmlHttpRequest(url: string): Promise<Blob | null> {
        if (typeof gmXmlhttpRequest !== "function") {
            return null;
        }

        const headers = getDownloadRequestHeaders(url);

        return new Promise<Blob>((resolve, reject) => {
            try {
                gmXmlhttpRequest({
                    method: "GET",
                    url,
                    headers,
                    responseType: "blob",
                    onload(response) {
                        if (response.status >= 200 && response.status < 300 && response.response) {
                            resolve(response.response as Blob);
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

    async function fetchBlobWithWindowFetch(url: string): Promise<Blob> {
        const response = await fetchRef(url, {
            credentials: platform.id === "x" ? "omit" : "include"
        });

        if (!response || !response.ok) {
            throw new Error(`fetch状态异常: ${response?.status ?? "unknown"}`);
        }

        return response.blob();
    }

    async function downloadBlob(blob: Blob, filename: string): Promise<boolean | "started"> {
        const gmSuccess = await tryGmDownload(blob, filename);
        if (gmSuccess) {
            return true;
        }

        return downloadBlobWithAnchor(blob, filename);
    }

    async function downloadImage(url: string, filename: string): Promise<boolean | "started"> {
        const directDownloadSuccess = await tryGmDownload(url, filename);
        if (directDownloadSuccess) {
            return true;
        }

        log("GM_download失败，尝试二进制兜底下载");
        return downloadImageFallback(url, filename);
    }

    async function downloadImageFallback(url: string, filename: string): Promise<boolean | "started"> {
        try {
            let blob: Blob | null = null;

            if (typeof gmXmlhttpRequest === "function") {
                blob = await fetchBlobWithXmlHttpRequest(url);
            } else {
                blob = await fetchBlobWithWindowFetch(url);
            }

            return downloadBlob(blob!, filename);
        } catch (primaryError) {
            if (typeof gmXmlhttpRequest === "function") {
                try {
                    const blob = await fetchBlobWithWindowFetch(url);
                    return downloadBlob(blob, filename);
                } catch (secondaryError) {
                    log(
                        "二进制兜底下载失败:",
                        filename,
                        (primaryError as Error | undefined)?.message || "未知错误",
                        (secondaryError as Error | undefined)?.message || "未知错误"
                    );
                    return false;
                }
            }

            log("二进制兜底下载失败:", filename, (primaryError as Error | undefined)?.message || "未知错误");
            return false;
        }
    }

    async function downloadAllImages(urls: readonly (string | null)[] | null | undefined, postId: string): Promise<DownloadResult> {
        return downloadMediaItems(normalizeLegacyMediaItems(urls), postId);
    }

    async function downloadXGif(url: string, filename: string): Promise<boolean | "started"> {
        try {
            let blob: Blob | null;
            try {
                blob = typeof gmXmlhttpRequest === "function"
                    ? await fetchBlobWithXmlHttpRequest(url)
                    : await fetchBlobWithWindowFetch(url);
            } catch (error) {
                if (typeof gmXmlhttpRequest !== "function") {
                    throw error;
                }
                blob = await fetchBlobWithWindowFetch(url);
            }
            return await downloadBlob(await convertXVideoToGif(blob!, windowRef), filename);
        } catch (error) {
            log("X GIF转换失败:", filename, (error as Error).message);
            return false;
        }
    }

    async function downloadMediaItems(mediaItems: readonly UtilsMediaItem[] | null | undefined, postId: string): Promise<DownloadResult> {
        if (!mediaItems || mediaItems.length === 0) {
            if (ui && typeof ui.showToast === "function") {
                ui.showToast("未找到图片");
            }
            return { successCount: 0, failedCount: 0, handedOffCount: 0 };
        }

        const jobs = buildMediaDownloadJobs(mediaItems, postId);
        if (jobs.length === 0) {
            if (ui && typeof ui.showToast === "function") {
                ui.showToast("未找到图片");
            }
            return { successCount: 0, failedCount: 0, handedOffCount: 0 };
        }

        log(`开始下载 ${mediaItems.length} 个媒体项，共 ${jobs.length} 个文件...`);

        let successCount = 0;
        let failedCount = 0;
        let failedGifCount = 0;
        let handedOffCount = 0;

        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];
            const success = job.convertToGif
                ? await downloadXGif(job.url, job.filename)
                : await downloadImage(job.url, job.filename);
            if (success) {
                successCount++;
                if (success === "started") {
                    handedOffCount++;
                }
            } else {
                failedCount++;
                if (job.convertToGif) {
                    failedGifCount++;
                }
            }
            if (i < jobs.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, config.DELAY_MS));
            }
        }

        let message = "";
        if (failedCount === 0) {
            const allVideos = mediaItems.length > 0 && mediaItems.every((item) => item.kind === "video");
            const imageCount = jobs.filter((job) => job.type === "image").length;
            const videoCount = jobs.filter((job) => job.type === "video").length;
            if (jobs.length === mediaItems.length && imageCount > 0 && videoCount > 0) {
                message = `已下载 ${imageCount} 张图片和 ${videoCount} 个视频`;
            } else {
                message = jobs.length === mediaItems.length
                    ? (allVideos ? `已下载 ${jobs.length} 个视频` : `已下载 ${jobs.length} 张图片`)
                    : `已下载 ${mediaItems.length} 个媒体项，共 ${jobs.length} 个文件`;
            }
        } else if (successCount === 0) {
            message = `下载失败，共 ${failedCount} 个文件未完成`;
        } else {
            message = `已下载 ${successCount} 个文件，${failedCount} 个失败`;
        }

        if (handedOffCount > 0) {
            message = `已发起 ${successCount} 个文件的下载${failedCount > 0 ? `，${failedCount} 个失败` : ""}；请查看浏览器下载列表`;
        }
        if (failedGifCount > 0) {
            message += "；X GIF转换或保存失败，可关闭自动转换下载 MP4 源";
        }
        log(message);
        if (ui && typeof ui.showToast === "function") {
            ui.showToast(message);
        }
        return { successCount, failedCount, handedOffCount };
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
