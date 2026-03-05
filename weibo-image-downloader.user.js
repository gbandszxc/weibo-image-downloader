// ==UserScript==
// @name         微博图片批量下载器
// @namespace    http://tampermonkey.net/
// @version      1.1.8
// @description  一键下载微博/X帖子中的所有图片为原图
// @author       Sisyphus
// @match        https://weibo.com/*
// @match        https://www.weibo.com/*
// @match        https://weibo.com.cn/*
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
        ],
        // X平台配置
        X_CONFIG: {
            POST_SELECTORS: [
                'article[data-testid="tweet"]'
            ],
            IMG_SELECTORS: [
                'article img[src*="twimg.com"]'
            ],
            ACTION_GROUP_SELECTORS: [
                '[role="group"]'
            ]
        }
    };

    // ==================== 平台检测 ====================
    function isWeibo() {
        return window.location.hostname.includes('weibo');
    }

    function isX() {
        return window.location.hostname.includes('x.com') || 
               window.location.hostname.includes('twitter');
    }

    function getCurrentPlatform() {
        if (isX()) return 'x';
        return 'weibo';
    }

    function log(...args) {
        if (CONFIG.DEBUG) {
            const platform = getCurrentPlatform();
            console.log(`[${platform} Downloader]`, ...args);
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

        if (isX()) {
            return getXOriginalImageUrl(url);
        }

        return getWeiboOriginalImageUrl(url);
    }

    function getWeiboOriginalImageUrl(url) {
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

    function getXOriginalImageUrl(url) {
        if (!url || typeof url !== 'string') return null;
        if (!url.includes('pbs.twimg.com')) {
            return null;
        }

        try {
            // 确保 URL 是完整的
            let fullUrl = url;
            if (!url.startsWith('http')) {
                fullUrl = 'https://' + url;
            }
            
            const urlObj = new URL(fullUrl);
            const name = urlObj.searchParams.get('name');
            if (name === 'orig' || name === 'large') {
                return fullUrl;
            }
            // 先删除原有的 name 参数，再设置新的
            urlObj.searchParams.delete('name');
            urlObj.searchParams.set('name', 'orig');
            return urlObj.toString();
        } catch (e) {
            if (url.includes('name=orig') || url.includes('name=large')) {
                return url;
            }
            // 简单替换 name=xxx 为 name=orig
            return url.replace(/name=[^&]*/, 'name=orig');
        }
    }

    /**
     * 获取文件名
     */
    function getFilename(postId, index) {
        const platform = getCurrentPlatform();
        return `${platform}_${postId}_${index}.jpg`;
    }

    /**
     * 下载单张图片
     */
    async function downloadImage(url, filename) {
        // 使用GM_download
        if (typeof GM_download === 'function') {
            return new Promise((resolve) => {
                try {
                    const downloadId = GM_download({
                        url: url,
                        name: filename,
                        onload: function() {
                            log(`下载完成: ${filename}`);
                            resolve(true);
                        },
                        onerror: function(error) {
                            log(`下载失败: ${error.error || error.message || '未知错误'}`);
                            resolve(false);
                        },
                        onprogress: function(progress) {}
                    });
                    
                    // 如果立即返回false，说明立即失败了
                    if (downloadId === false) {
                        log(`GM_download返回false: ${filename}`);
                        resolve(false);
                    }
                } catch (e) {
                    log('GM_download异常:', e.message);
                    resolve(false);
                }
            });
        }

        // 没有GM_download时使用备用方案
        return downloadImageFallback(url, filename);
    }

    /**
     * 备用下载方案（fetch + blob）
     */
    async function downloadImageFallback(url, filename) {
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
            await downloadImage(url, filename);
            
            if (i < urls.length - 1) {
                await new Promise(r => setTimeout(r, CONFIG.DELAY_MS));
            }
        }

        log(`已下载 ${urls.length} 张图片`);
        alert(`已下载 ${urls.length} 张图片`);
    }

    // ==================== DOM操作 ====================

    /**
     * 查找帖子中的所有图片元素
     */
    function findImagesInPost(container) {
        const images = [];
        
        if (isX()) {
            return findXImagesInPost(container);
        }
        
        const selectors = CONFIG.IMG_SELECTORS;

        for (const selector of selectors) {
            try {
                const elements = container.querySelectorAll(selector);
                elements.forEach(img => {
                    if (!img.src) return;
                    
                    if (isWeibo()) {
                        if (isAvatarImage(img.src)) return;
                        if (img.src.includes('default_avatar')) return;
                        if (!img.src.includes('sinaimg') && !img.src.includes('sina.cn')) return;
                    }
                    
                    images.push(img);
                });
            } catch (e) {}
        }

        return images;
    }

    function findXImagesInPost(container) {
        const images = [];
        const seen = new Set();
        
        const selectors = CONFIG.X_CONFIG.IMG_SELECTORS;

        for (const selector of selectors) {
            try {
                const elements = container.querySelectorAll(selector);
                elements.forEach(img => {
                    const src = img.src;
                    if (!src || typeof src !== 'string') return;
                    if (!src.includes('pbs.twimg.com')) return;
                    
                    const srcKey = src.split('?')[0];
                    if (seen.has(srcKey)) return;
                    seen.add(srcKey);
                    
                    // 过滤头像图片
                    if (src.includes('/profile_images/')) return;
                    
                    // 过滤表情符号
                    if (src.includes('/emoji/')) return;
                    
                    // 过滤 alt 包含 avatar/profile 的图片
                    const alt = img.alt || '';
                    if (alt.toLowerCase().includes('avatar') || alt.toLowerCase().includes('profile')) return;
                    
                    images.push(img);
                });
            } catch (e) {}
        }

        return images;
    }

    function isMainTweet(container) {
        if (!isX()) return true;
        
        const article = container.closest('article[data-testid="tweet"]');
        if (!article) return false;
        
        const timeEl = article.querySelector('time');
        const actionGroup = article.querySelector('[role="group"]');
        
        return timeEl !== null;
    }

    function isDetailPage() {
        if (!isX()) return false;
        
        const path = window.location.pathname;
        return /\/[\w_]+\/status\/\d+/.test(path);
    }

    /**
     * 获取所有图片URL - 正确去重
     */
    function getImageUrls(container) {
        const images = findImagesInPost(container);
        const seen = new Set();
        const urls = [];

        images.forEach(img => {
            let url = getOriginalImageUrl(img.src);
            if (url) {
                const key = url.split('?')[0];
                if (!seen.has(key)) {
                    seen.add(key);
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
            
            let postId;
            if (isX()) {
                const timeEl = postContainer.querySelector('time');
                if (timeEl && timeEl.parentElement) {
                    const linkEl = timeEl.parentElement.querySelector('a[href*="/status/"]');
                    if (linkEl) {
                        const match = linkEl.href.match(/\/status\/(\d+)/);
                        if (match) {
                            postId = match[1];
                        }
                    }
                }
                postId = postId || 'x_' + Date.now();
            } else {
                postId = postContainer.getAttribute('mid') || 
                       postContainer.getAttribute('data-mid') || 
                       'weibo_' + Date.now();
            }
            
            downloadAllImages(urls, postId);
        };

        return btn;
    }

    /**
     * 注入下载按钮
     */
    function injectDownloadButtons() {
        let postsAdded = 0;
        const selectors = isX() ? CONFIG.X_CONFIG.POST_SELECTORS : CONFIG.POST_SELECTORS;

        for (const selector of selectors) {
            const posts = document.querySelectorAll(selector);
            posts.forEach(post => {
                if (post.querySelector('.weibo-img-download-btn')) return;

                if (isX() && !isMainTweet(post)) {
                    return;
                }

                const btn = createDownloadButton(post);
                if (!btn) return;

                let inserted = false;

                if (isX()) {
                    if (isDetailPage()) {
                        const usernameEl = post.querySelector('[data-testid="User-Name"]');
                        if (usernameEl) {
                            const parent = usernameEl.parentElement;
                            if (parent) {
                                parent.parentNode.insertBefore(btn, parent.nextSibling);
                                postsAdded++;
                                inserted = true;
                                log('X详情页：按钮插入到用户名区域右侧');
                            }
                        }
                    } else {
                        const timeEl = post.querySelector('time');
                        if (timeEl) {
                            const timeParent = timeEl.parentElement;
                            if (timeParent && timeParent.nextElementSibling) {
                                timeParent.parentNode.insertBefore(btn, timeParent.nextElementSibling);
                                postsAdded++;
                                inserted = true;
                                log('X时间线：按钮插入到时间右边');
                            } else if (timeParent) {
                                timeParent.parentNode.insertBefore(btn, timeParent.nextSibling);
                                postsAdded++;
                                inserted = true;
                            }
                        }
                    }
                    
                    if (!inserted) {
                        const actionGroup = post.querySelector('[role="group"]');
                        if (actionGroup && actionGroup.parentElement) {
                            actionGroup.parentElement.insertBefore(btn, actionGroup);
                            postsAdded++;
                            inserted = true;
                            log('X平台：按钮插入到操作按钮组之前');
                        }
                    }
                } else {
                    const iconsPlusEl = post.querySelector('div[class*="_iconsPlus_"]');
                    if (iconsPlusEl && iconsPlusEl.parentNode) {
                        iconsPlusEl.parentNode.insertBefore(btn, iconsPlusEl);
                        postsAdded++;
                        inserted = true;
                        log('微博：按钮插入到 iconsPlus 之前');
                    }

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
                }

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
        const platform = getCurrentPlatform();
        log(`${platform === 'x' ? 'X' : '微博'}图片批量下载器 v1.1.5 加载中...`);

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
