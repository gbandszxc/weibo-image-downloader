// ==UserScript==
// @name         Weibo Image Downloader - Utils
// @version      1.3.0
// ==/UserScript==

(function(global) {
    'use strict';

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
        if (WID_CONFIG.DEBUG) {
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

    // ==================== 下载函数 ====================

    /**
     * 下载单张图片
     */
    async function downloadImage(url, filename) {
        // 使用GM_download
        if (typeof GM_download === 'function') {
            try {
                const success = await new Promise((resolve) => {
                    try {
                        const downloadId = GM_download({
                            url: url,
                            name: filename,
                            onload: function() {
                                log(`下载完成: ${filename}`);
                                resolve(true);
                            },
                            onerror: function(error) {
                                log(`GM_download失败: ${error.error || error.message || '未知错误'}`);
                                resolve(false);
                            },
                            onprogress: () => {}
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

                if (success) {
                    return true;
                }

                // GM_download 失败，尝试备用方案
                log('GM_download失败，尝试备用方案');
            } catch (e) {
                log('GM_download异常，尝试备用方案:', e.message);
            }
        }

        // 没有GM_download或GM_download失败时使用备用方案
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
     * 批量下载图片
     */
    async function downloadAllImages(urls, postId) {
        if (!urls || urls.length === 0) {
            WID_UI.showToast('未找到图片');
            return;
        }

        log(`开始下载 ${urls.length} 张图片...`);

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const filename = getFilename(postId, i + 1);
            await downloadImage(url, filename);

            if (i < urls.length - 1) {
                await new Promise(r => setTimeout(r, WID_CONFIG.DELAY_MS));
            }
        }

        log(`已下载 ${urls.length} 张图片`);
        WID_UI.showToast(`已下载 ${urls.length} 张图片`);
    }

    // ==================== 导出 ====================

    global.WID_UTILS = {
        isWeibo,
        isX,
        getCurrentPlatform,
        log,
        isAvatarImage,
        getOriginalImageUrl,
        getWeiboOriginalImageUrl,
        getXOriginalImageUrl,
        getFilename,
        downloadImage,
        downloadImageFallback,
        downloadAllImages
    };

})(window);
