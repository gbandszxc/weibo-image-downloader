import { createPlatformAdapter } from "./platforms/index.ts";
import type { PlatformAdapter } from "./platforms/index.ts";
import { convertXVideoToGif } from "./x-gif.ts";
import { buildMotionPhoto } from "./livephoto.ts";
import { pairAppleLivePhoto } from "./apple-pair.ts";
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
    LIVEPHOTO_AUTO_MERGE?: boolean;
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
    /** 开启 LivePhoto 自动合并时：与图片合并为单文件 Motion Photo 的视频地址 */
    livePhotoVideoUrl?: string;
    /** 关闭自动合并时：与 livePhotoVideoUrl 分别保存并注入 Apple Live Photo 配对元数据（同名 jpg + mov） */
    livePhotoPair?: boolean;
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

            // 平台回退 postId 可能自带同名前缀（如 weibo_1791...），避免拼出 weibo_weibo_...
            const normalizedPostId = postId.startsWith(`${platform}_`) ? postId.slice(platform.length + 1) : postId;
            const baseName = `${platform}_${normalizedPostId}_${index + 1}`;
            // 微博 LivePhoto：开启合并时输出单文件 Motion Photo（JPEG 内嵌视频），
            // 关闭合并时输出 Apple Live Photo 配对文件（jpg + mov 同名、携带同一 ContentIdentifier）
            const isWeiboLivePhoto = platform === "weibo"
                && item.kind === "livephoto"
                && !!item.videoUrl;
            const mergeLivePhoto = isWeiboLivePhoto
                && !!config.LIVEPHOTO_AUTO_MERGE
                && getFileExtensionFromUrl(item.imageUrl, ".jpg") === ".jpg";

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
                if (mergeLivePhoto) {
                    job.livePhotoVideoUrl = item.videoUrl!;
                    // 官方 Motion Photo 规范建议产物命名为 *.MP.jpg
                    job.filename = `${baseName}.MP.jpg`;
                } else if (isWeiboLivePhoto) {
                    // Apple 配对要求 jpg 与 mov 同名（仅扩展名不同），故不再加 _live 后缀
                    job.livePhotoVideoUrl = item.videoUrl!;
                    job.livePhotoPair = true;
                }
                jobs.push(job);
            }

            if (item.videoUrl && !mergeLivePhoto && !isWeiboLivePhoto) {
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

    /** GM_download 单次尝试结果；error 为 "unavailable" 表示脚本管理器未提供 GM_download */
    interface GmDownloadAttempt {
        ok: boolean;
        error?: string;
    }

    async function tryGmDownload(resource: string | Blob, filename: string): Promise<GmDownloadAttempt> {
        if (typeof gmDownload !== "function") {
            return { ok: false, error: "unavailable" };
        }

        try {
            return await new Promise<GmDownloadAttempt>((resolve) => {
                try {
                    const downloadId = gmDownload({
                        url: resource,
                        name: filename,
                        headers: getDownloadRequestHeaders(resource),
                        saveAs: false,
                        onload() {
                            resolve({ ok: true });
                        },
                        onerror(error) {
                            const reason = error.error || error.message || "未知错误";
                            log(`GM_download失败: ${reason}`);
                            resolve({ ok: false, error: reason });
                        },
                        onprogress: () => {}
                    });

                    if (downloadId === false) {
                        log("GM_download返回false，尝试备用方案:", filename);
                        resolve({ ok: false, error: "rejected" });
                    }
                } catch (error) {
                    log("GM_download异常:", (error as Error).message);
                    resolve({ ok: false, error: (error as Error).message });
                }
            });
        } catch (error) {
            log("GM_download异常，尝试备用方案:", (error as Error).message);
            return { ok: false, error: (error as Error).message };
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

    /** 优先走 GM_xmlhttpRequest 拉取二进制，失败时退回页面 fetch（与 GIF 转换下载同一套策略）。 */
    async function fetchMediaBlob(url: string): Promise<Blob> {
        try {
            if (typeof gmXmlhttpRequest !== "function") {
                return await fetchBlobWithWindowFetch(url);
            }
            return (await fetchBlobWithXmlHttpRequest(url))!;
        } catch (error) {
            if (typeof gmXmlhttpRequest !== "function") {
                throw error;
            }
            return await fetchBlobWithWindowFetch(url);
        }
    }

    async function downloadBlob(blob: Blob, filename: string): Promise<boolean | "started"> {
        // Blob 优先走浏览器原生 a[download] 保存：部分浏览器/下载管理器会忽略 GM_download 对 Blob
        // 的命名，以内部 UUID + 内容嗅探扩展名落盘（如合并产物被存成 *.exif），a[download] 是
        // 唯一稳定保留文件名的通道；直链下载（downloadImage）仍优先 GM_download，不受此影响。
        try {
            return downloadBlobWithAnchor(blob, filename);
        } catch (error) {
            log("浏览器原生保存失败，回退 GM_download:", filename, (error as Error).message);
            const gmResult = await tryGmDownload(blob, filename);
            return gmResult.ok || downloadBlobWithAnchor(blob, filename);
        }
    }

    /** 本次批量中 GM_download 失败后改走浏览器原生保存的文件数，用于批量结束时的授权提示 */
    let directDownloadFallbackCount = 0;

    async function downloadImage(url: string, filename: string): Promise<boolean | "started"> {
        // 直链优先 GM_download(saveAs:false)：由 Tampermonkey 经浏览器下载 API 直连保存，
        // 显式 saveAs:false 在用户开启「下载前询问每个文件的保存位置」时依然静默落盘且
        // 命名正确，onload/onerror 可确认结果，按钮显示「完成」。a[download] 通道严格遵循
        // 该用户设置，开启时逐文件弹保存对话框，网页侧无法绕过，故只作回退使用；TM 未
        // 提供下载权限或直链下载失败时回退，并在批量结束时提示用户授权。
        const direct = await tryGmDownload(url, filename);
        if (direct.ok) {
            return true;
        }
        if (direct.error !== "unavailable") {
            directDownloadFallbackCount++;
        }

        try {
            const blob = await fetchMediaBlob(url);
            return downloadBlobWithAnchor(blob, filename);
        } catch (error) {
            log("浏览器原生保存失败，回退二进制兜底:", filename, (error as Error).message);
        }

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

    /** 将微博 LivePhoto 的图片与视频合并为单文件 Motion Photo 后保存；任何一步失败返回 false，由调用方回退。 */
    async function downloadMergedLivePhoto(imageUrl: string, videoUrl: string, filename: string): Promise<boolean | "started"> {
        try {
            const [imageBlob, videoBlob] = await Promise.all([
                fetchMediaBlob(imageUrl),
                fetchMediaBlob(videoUrl)
            ]);
            const mergedBytes = buildMotionPhoto(
                new Uint8Array(await imageBlob.arrayBuffer()),
                new Uint8Array(await videoBlob.arrayBuffer())
            );
            return await downloadBlob(new Blob([mergedBytes as BlobPart], { type: "image/jpeg" }), filename);
        } catch (error) {
            log("LivePhoto合并失败:", filename, (error as Error).message);
            return false;
        }
    }

    /** 配对保存结果：图片/视频各自的成功状态（false 表示该侧保存失败） */
    interface PairedLivePhotoResult {
        image: boolean | "started";
        video: boolean | "started";
    }

    /**
     * 将微博 LivePhoto 的图片与视频注入 Apple 配对元数据后按同名两文件保存
     * （图片用传入的 filename，视频取同主干 + .mov）。任一侧注入失败只影响该侧的
     * 配对标记，不会中断保存；单侧拉流失败时仍保存另一侧（无配对标记），
     * 双侧都失败返回 null，由调用方按两个文件失败计。
     */
    async function downloadPairedLivePhoto(imageUrl: string, videoUrl: string, filename: string): Promise<PairedLivePhotoResult | null> {
        const [imageSettled, videoSettled] = await Promise.allSettled([
            fetchMediaBlob(imageUrl),
            fetchMediaBlob(videoUrl)
        ]);
        if (imageSettled.status === "rejected" && videoSettled.status === "rejected") {
            log("LivePhoto配对拉流失败:", filename, (imageSettled.reason as Error)?.message);
            return null;
        }

        let imageResult: boolean | "started" = false;
        let videoResult: boolean | "started" = false;
        if (imageSettled.status === "fulfilled" && videoSettled.status === "fulfilled") {
            // 现场配对：优先复用图片 EXIF 中已有的 Apple ContentIdentifier，缺失时生成新 UUID
            const pair = pairAppleLivePhoto(
                new Uint8Array(await imageSettled.value.arrayBuffer()),
                new Uint8Array(await videoSettled.value.arrayBuffer())
            );
            const videoFilename = `${filename.replace(/\.[^.]+$/, "")}.mov`;
            imageResult = await downloadBlob(new Blob([pair.jpeg as BlobPart], { type: "image/jpeg" }), filename);
            videoResult = await downloadBlob(new Blob([pair.video as BlobPart], { type: "video/quicktime" }), videoFilename);
            return { image: imageResult, video: videoResult };
        }

        // 单侧拉流失败：能下载的一侧按原始字节保存（缺少配对标记，但文件不丢）
        const videoFilename = `${filename.replace(/\.[^.]+$/, "")}.mov`;
        if (imageSettled.status === "fulfilled") {
            imageResult = await downloadBlob(imageSettled.value, filename);
        } else {
            log("LivePhoto图片拉流失败:", filename, (imageSettled.reason as Error)?.message);
        }
        if (videoSettled.status === "fulfilled") {
            videoResult = await downloadBlob(videoSettled.value, videoFilename);
        } else {
            log("LivePhoto视频拉流失败:", videoFilename, (videoSettled.reason as Error)?.message);
        }
        return { image: imageResult, video: videoResult };
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
        let failedLivePhotoMergeCount = 0;
        let livePhotoFallbackSavedCount = 0;
        let handedOffCount = 0;
        directDownloadFallbackCount = 0;

        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];
            const isLastJob = i === jobs.length - 1;
            const delayBetweenJobs = async () => {
                if (!isLastJob) {
                    await new Promise((resolve) => setTimeout(resolve, config.DELAY_MS));
                }
            };

            if (job.livePhotoVideoUrl && job.livePhotoPair) {
                // 关闭合并：分开保存并注入 Apple Live Photo 配对元数据（jpg + mov 同名）
                const pairResult = await downloadPairedLivePhoto(job.url, job.livePhotoVideoUrl, job.filename);
                for (const outcome of pairResult ? [pairResult.image, pairResult.video] : [false as const, false as const]) {
                    if (outcome) {
                        successCount++;
                        if (outcome === "started") {
                            handedOffCount++;
                        }
                    } else {
                        failedCount++;
                    }
                }
                await delayBetweenJobs();
                continue;
            }

            if (job.livePhotoVideoUrl) {
                const merged = await downloadMergedLivePhoto(job.url, job.livePhotoVideoUrl, job.filename);
                if (merged) {
                    successCount++;
                    if (merged === "started") {
                        handedOffCount++;
                    }
                } else {
                    // 合并失败：回退为 Apple 配对方式分别保存同名 jpg 与 mov（去掉 .MP/_live 标记）
                    failedLivePhotoMergeCount++;
                    log("LivePhoto合并失败，回退为分别下载:", job.filename);
                    const baseName = job.filename.replace(/(\.MP)?\.[a-z0-9]+$/i, "") || job.filename;
                    const pairResult = await downloadPairedLivePhoto(job.url, job.livePhotoVideoUrl, `${baseName}.jpg`);
                    for (const outcome of pairResult ? [pairResult.image, pairResult.video] : [false as const, false as const]) {
                        if (outcome) {
                            successCount++;
                            livePhotoFallbackSavedCount++;
                            if (outcome === "started") {
                                handedOffCount++;
                            }
                        } else {
                            failedCount++;
                        }
                    }
                }
                await delayBetweenJobs();
                continue;
            }

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
            await delayBetweenJobs();
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
        if (livePhotoFallbackSavedCount > 0) {
            message += "；部分LivePhoto未能合并，已分别保存图片与视频";
        }
        if (directDownloadFallbackCount > 0) {
            message += "；部分文件已改用浏览器保存，若弹出保存位置询问，请在 Tampermonkey 中允许下载权限";
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
