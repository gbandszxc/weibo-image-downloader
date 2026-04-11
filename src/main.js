import cssText from "./style.css";
import { CONFIG } from "./config.js";
import { createUtils } from "./utils.js";
import { createUi } from "./ui.js";

const styleId = "weibo-image-downloader-style";

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
    config: CONFIG,
    windowRef: window,
    fetchRef: window.fetch.bind(window),
    gmDownload: typeof GM_download === "function" ? GM_download : null,
    ui: {
        showToast(message) {
            if (ui) {
                ui.showToast(message);
            }
        }
    }
});

ui = createUi({
    config: CONFIG,
    utils,
    windowRef: window,
    documentRef: document,
    addStyle: injectStyles
});

function init() {
    injectStyles();
    ui.ensureImageSelectModalStyles();

    const platform = utils.getCurrentPlatform();

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

    ui.initGotoOriginalMenuObserver();
    utils.log(`${platform === "x" ? "X" : "微博"}图片批量下载器初始化完成！`);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

if (typeof GM_registerMenuCommand === "function") {
    GM_registerMenuCommand("刷新按钮", () => {
        ui.injectDownloadButtons();
    });
}
