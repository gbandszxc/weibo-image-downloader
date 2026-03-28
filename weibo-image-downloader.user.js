// ==UserScript==
// @name         微博/X图片批量下载器
// @namespace    http://tampermonkey.net/
// @version      1.3.2
// @description  一键下载微博和X帖子中的所有图片为原图
// @author       gbandszxc
// @match        https://weibo.com/*
// @match        https://www.weibo.com/*
// @match        https://weibo.com.cn/*
// @match        https://s.weibo.com/*
// @match        https://x.com/*
// @match        https://www.x.com/*
// @match        https://twitter.com/*
// @match        https://www.twitter.com/*
// @connect      *.sinaimg.cn
// @connect      *.sina.cn
// @connect      *.twimg.com
// @grant        GM_download
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_log
// @grant        GM_addElement
// @grant        GM_getResourceText
// @require      https://raw.githubusercontent.com/gbandszxc/weibo-image-downloader/refs/heads/main/style.css.js
// @require      https://raw.githubusercontent.com/gbandszxc/weibo-image-downloader/refs/heads/main/config.js
// @require      https://raw.githubusercontent.com/gbandszxc/weibo-image-downloader/refs/heads/main/utils.js
// @require      https://raw.githubusercontent.com/gbandszxc/weibo-image-downloader/refs/heads/main/ui.js
// @downloadURL  https://raw.githubusercontent.com/gbandszxc/weibo-image-downloader/refs/heads/main/weibo-image-downloader.user.js
// @updateURL    https://raw.githubusercontent.com/gbandszxc/weibo-image-downloader/refs/heads/main/weibo-image-downloader.user.js
// @supportURL   https://github.com/gbandszxc/weibo-image-downloader/issues
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 注入 CSS
    GM_addStyle(WID_CSS);

    // ==================== 初始化 ====================

    function init() {
        const platform = WID_UTILS.getCurrentPlatform();
        WID_UI.ensureImageSelectModalStyles();

        setTimeout(() => {
            WID_UI.injectDownloadButtons();
        }, 2000);

        let injectTimer = null;
        const observer = new MutationObserver(() => {
            if (injectTimer) return;
            injectTimer = setTimeout(() => {
                injectTimer = null;
                WID_UI.injectDownloadButtons();
            }, 300);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setInterval(WID_UI.injectDownloadButtons, 5000);

        WID_UI.initGotoOriginalMenuObserver();
        WID_UTILS.log(`${platform === 'x' ? 'X' : '微博'}图片批量下载器初始化完成！`);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    GM_registerMenuCommand('刷新按钮', () => {
        WID_UI.injectDownloadButtons();
    });

})();
