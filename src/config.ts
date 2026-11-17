/** 下载文件名默认模板；占位符见 renderFilenameTemplate。 */
export const DEFAULT_FILENAME_TEMPLATE = "{platform}_{postId}_{index}";

export const CONFIG = {
    DELAY_MS: 300,
    LONG_PRESS_MS: 500,
    MEDIA_RESOLVE_RETRY_COOLDOWN_MS: 60000,
    /** Blob 资源经 GM_download 保存的超时；不回调的引擎（如 X浏览器）靠它主动降级。 */
    BLOB_GM_DOWNLOAD_TIMEOUT_MS: 8000,
    VIDEO_DOWNLOAD_SETTING_KEY: "weiboImageDownloader.enableVideoDownload",
    ENABLE_VIDEO_DOWNLOAD: false,
    X_GIF_AUTO_CONVERT_SETTING_KEY: "weiboImageDownloader.xGifAutoConvert",
    X_GIF_AUTO_CONVERT: true,
    LIVEPHOTO_AUTO_MERGE_SETTING_KEY: "weiboImageDownloader.livephotoAutoMerge",
    LIVEPHOTO_AUTO_MERGE: true,
    FILENAME_TEMPLATE_WEIBO_SETTING_KEY: "weiboImageDownloader.filenameTemplate.weibo",
    FILENAME_TEMPLATE_X_SETTING_KEY: "weiboImageDownloader.filenameTemplate.x",
    FILENAME_TEMPLATE_WEIBO: DEFAULT_FILENAME_TEMPLATE,
    FILENAME_TEMPLATE_X: DEFAULT_FILENAME_TEMPLATE,
    DEBUG: true
};

export default CONFIG;
