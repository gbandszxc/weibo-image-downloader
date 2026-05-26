import cssText from "./style.css";
import { CONFIG } from "./config.js";
import { createUtils } from "./utils.js";
import { createUi } from "./ui.js";

const styleId = "weibo-image-downloader-style";
const runtimeConfig = {
    ...CONFIG,
    ENABLE_VIDEO_DOWNLOAD: typeof GM_getValue === "function"
        ? Boolean(GM_getValue(CONFIG.VIDEO_DOWNLOAD_SETTING_KEY, CONFIG.ENABLE_VIDEO_DOWNLOAD))
        : CONFIG.ENABLE_VIDEO_DOWNLOAD
};

function injectStyles() {
    if (document.getElementById(styleId)) {
        return;
    }

    if (typeof GM_addStyle === "function") {
        GM_addStyle(cssText);
        const marker = document.createElement("style");
        marker.id = styleId;
        marker.textContent = "";
        document.head.appendChild(marker);
        return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = cssText;
    document.head.appendChild(style);
}

let ui;
const utils = createUtils({
    config: runtimeConfig,
    windowRef: window,
    fetchRef: window.fetch.bind(window),
    gmDownload: typeof GM_download === "function" ? GM_download : null,
    gmXmlhttpRequest: typeof GM_xmlhttpRequest === "function" ? GM_xmlhttpRequest : null,
    ui: {
        showToast(message) {
            if (ui) {
                ui.showToast(message);
            }
        }
    }
});

ui = createUi({
    config: runtimeConfig,
    utils,
    windowRef: window,
    documentRef: document,
    addStyle: injectStyles
});

function init() {
    injectStyles();
    ui.ensureImageSelectModalStyles();

    setTimeout(() => {
        ui.injectDownloadButtons();
    }, 2000);

    let injectTimer = null;
    const observer = new MutationObserver(() => {
        if (injectTimer) {
            return;
        }

        injectTimer = setTimeout(() => {
            injectTimer = null;
            ui.injectDownloadButtons();
        }, 300);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    setInterval(() => {
        ui.injectDownloadButtons();
    }, 5000);

    ui.initPlatformObservers();
    utils.log(`${utils.getCurrentPlatformDisplayName()}图片批量下载器初始化完成！`);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

if (typeof GM_registerMenuCommand === "function") {
    let videoDownloadMenuId = null;
    let videoDownloadMenuRegistered = false;

    function getVideoDownloadMenuText() {
        return `视频下载：[${runtimeConfig.ENABLE_VIDEO_DOWNLOAD ? "开启" : "关闭"}]`;
    }

    function registerVideoDownloadMenu() {
        if (videoDownloadMenuRegistered) {
            if (videoDownloadMenuId === null || typeof GM_unregisterMenuCommand !== "function") {
                return;
            }

            GM_unregisterMenuCommand(videoDownloadMenuId);
        }

        videoDownloadMenuId = GM_registerMenuCommand(getVideoDownloadMenuText(), () => {
            const nextValue = !runtimeConfig.ENABLE_VIDEO_DOWNLOAD;
            if (typeof GM_setValue === "function") {
                GM_setValue(CONFIG.VIDEO_DOWNLOAD_SETTING_KEY, nextValue);
            }
            runtimeConfig.ENABLE_VIDEO_DOWNLOAD = nextValue;
            registerVideoDownloadMenu();
            if (ui) {
                ui.refreshDownloadButtons();
                ui.showToast(`视频下载已${nextValue ? "开启" : "关闭"}，当前页面已更新`);
            }
        });
        videoDownloadMenuRegistered = true;
    }

    GM_registerMenuCommand("刷新按钮", () => {
        ui.refreshDownloadButtons();
    });

    registerVideoDownloadMenu();
}
