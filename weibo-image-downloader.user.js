// ==UserScript==
// @name         微博图片批量下载器
// @namespace    http://tampermonkey.net/
// @version      1.0.4
// @description  一键下载微博帖子中的所有图片为原图
// @author       Sisyphus
// @match        https://weibo.com/*
// @match        https://www.weibo.com/*
// @match        https://weibo.com.cn/*
// @connect      *.sinaimg.cn
// @grant        GM_download
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_log
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置 ====================
    const CONFIG = {
        BATCH_SIZE: 5,
        DELAY_MS: 300,
        DEBUG: true,
        IMG_SELECTORS: [
            'img.woo-picture-img',
            '.picture img'
        ],
        POST_SELECTORS: [
            'article',
            '.vue-feed-item'
        ],
        // 头部区域选择器 - 按钮要插入到这个容器末尾
        HEADER_SELECTORS: [
            'div[class*="_iconsPlus_"]',
            'header > div > div[class*="_nick_"]',
            'header > div > div.woo-box-flex',
            '.woo-nickname',
            '.name'
        ]
    };

    function log(...args) {
        if (CONFIG.DEBUG) {
            console.log('[Weibo Downloader]', ...args);
        }
    }

    // ==================== 工具函数 ====================

    /**
     * 判断是否为头像图片
     */
    function isAvatarImage(url) {
        if (!url) return false;
        return url.includes('/crop.') || 
               url.includes('/avatar') ||
               url.includes('_cute') ||
               url.includes('_online');
    }

    /**
     * 获取图片原始URL
     */
    function getOriginalImageUrl(url) {
        if (!url || typeof url !== 'string') return null;

        if (!url.includes('sinaimg.cn') && !url.includes('sina.cn')) {
            return null;
        }

        if (isAvatarImage(url)) {
            return null;
        }

        if (url.includes('/large/')) return url;

        const sizePatterns = ['thumb180', 'thumb300', 'square', 'bmiddle', 'mw690', 'mw1024', 'orj360', 'orj480', 'webp720'];
        for (const size of sizePatterns) {
            if (url.includes(`/${size}/`)) {
                return url.replace(`/${size}/`, '/large/');
            }
        }

        const match = url.match(/(\.sinaimg\.cn\/)([a-z0-9]+\/)/);
        if (match) {
            return url.replace(match[2], 'large/');
        }

        return url;
    }

    /**
     * 获取文件名
     */
    function getFilename(postId, index) {
        return `weibo_${postId}_${index}.jpg`;
    }

    /**
     * 下载单张图片
     */
    async function downloadImage(url, filename) {
        // 使用GM_download（需要对象格式）
        if (typeof GM_download === 'function') {
            try {
                GM_download({
                    url: url,
                    name: filename,
                    saveAs: true
                });
                log(`GM_download已发起: ${filename}`);
                return true;
            } catch (e) {
                log('GM_download异常:', e.message);
            }
        }

        // 备用：使用fetch下载
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            log(`fetch下载成功: ${filename}`);
            return true;
        } catch (e2) {
            // 最后备用：打开新窗口
            log(`打开图片: ${filename}`);
            window.open(url, '_blank');
            return true;
        }
    }

    /**
     * 通过创建链接下载
     */
    function downloadViaLink(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 100);
    }

    /**
     * 批量下载图片
     */
    async function downloadAllImages(urls, postId) {
        if (!urls || urls.length === 0) {
            alert('未找到图片');
            return;
        }

        log(`开始下载 ${urls.length} 张图片...`);

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const filename = getFilename(postId, i + 1);
            downloadImage(url, filename);
            
            if (i < urls.length - 1) {
                await new Promise(r => setTimeout(r, CONFIG.DELAY_MS));
            }
        }

        log(`已发起 ${urls.length} 个下载`);
        alert(`已发起 ${urls.length} 个下载，请查看浏览器下载`);
    }

    // ==================== DOM操作 ====================

    /**
     * 查找帖子中的所有图片元素
     */
    function findImagesInPost(container) {
        const images = [];

        for (const selector of CONFIG.IMG_SELECTORS) {
            try {
                const elements = container.querySelectorAll(selector);
                elements.forEach(img => {
                    if (!img.src) return;
                    if (isAvatarImage(img.src)) return;
                    if (img.src.includes('default_avatar')) return;
                    if (!img.src.includes('sinaimg') && !img.src.includes('sina.cn')) return;
                    images.push(img);
                });
            } catch (e) {}
        }

        return images;
    }

    /**
     * 获取所有图片URL - 正确去重
     */
    function getImageUrls(container) {
        const images = findImagesInPost(container);
        const seen = new Set();
        const urls = [];

        images.forEach(img => {
            // 从src获取
            let url = getOriginalImageUrl(img.src);
            if (url && !seen.has(url)) {
                seen.add(url);
                urls.push(url);
            }
            
            // 从data-src获取
            const dataSrc = img.getAttribute('data-src');
            if (dataSrc) {
                url = getOriginalImageUrl(dataSrc);
                if (url && !seen.has(url)) {
                    seen.add(url);
                    urls.push(url);
                }
            }
        });

        log(`找到 ${urls.length} 张图片`);
        return urls;
    }

    /**
     * 创建下载按钮 - 简洁样式
     */
    function createDownloadButton(postContainer) {
        if (postContainer.querySelector('.weibo-img-download-btn')) {
            return null;
        }

        const urls = getImageUrls(postContainer);
        if (urls.length === 0) {
            return null;
        }

        log(`创建按钮: ${urls.length} 张图片`);

        const btn = document.createElement('span');
        btn.className = 'weibo-img-download-btn';
        btn.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            margin-left: 8px;
            background: #ff8200;
            color: white;
            border-radius: 3px;
            font-size: 11px;
            font-weight: bold;
            cursor: pointer;
            vertical-align: middle;
        `;
        btn.innerHTML = '↓' + urls.length;
        btn.title = '下载' + urls.length + '张原图';

        btn.onmouseenter = () => { btn.style.background = '#ff6a00'; };
        btn.onmouseleave = () => { btn.style.background = '#ff8200'; };

        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const postId = postContainer.getAttribute('mid') || 
                          postContainer.getAttribute('data-mid') || 
                          'weibo_' + Date.now();
            downloadAllImages(urls, postId);
        };

        return btn;
    }

    /**
     * 注入下载按钮 - 插入到header区域，_iconsPlus之前
     */
    function injectDownloadButtons() {
        let postsAdded = 0;

        for (const selector of CONFIG.POST_SELECTORS) {
            const posts = document.querySelectorAll(selector);
            posts.forEach(post => {
                if (post.querySelector('.weibo-img-download-btn')) return;

                const btn = createDownloadButton(post);
                if (!btn) return;

                // 优先：插入到 _iconsPlus_ 之前
                let inserted = false;
                const iconsPlusEl = post.querySelector('div[class*="_iconsPlus_"]');
                if (iconsPlusEl && iconsPlusEl.parentNode) {
                    iconsPlusEl.parentNode.insertBefore(btn, iconsPlusEl);
                    postsAdded++;
                    inserted = true;
                    log('按钮插入到 iconsPlus 之前');
                }

                // 备用：查找header区域
                if (!inserted) {
                    for (const headerSelector of CONFIG.HEADER_SELECTORS) {
                        const headerEl = post.querySelector(headerSelector);
                        if (headerEl) {
                            headerEl.appendChild(btn);
                            postsAdded++;
                            inserted = true;
                            break;
                        }
                    }
                }

                // 最后的fallback
                if (!inserted) {
                    post.appendChild(btn);
                    postsAdded++;
                }
            });
        }

        if (postsAdded > 0) {
            log(`成功注入 ${postsAdded} 个下载按钮`);
        }
    }

    // ==================== 初始化 ====================

    function init() {
        log('微博图片批量下载器 v1.0.4 加载中...');

        setTimeout(() => {
            injectDownloadButtons();
        }, 2000);

        const observer = new MutationObserver(() => {
            injectDownloadButtons();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setInterval(injectDownloadButtons, 5000);

        log('初始化完成');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    GM_registerMenuCommand('🔄 刷新按钮', () => {
        injectDownloadButtons();
    });

})();
