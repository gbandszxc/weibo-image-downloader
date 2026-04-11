// ==UserScript==
// @name         Weibo Image Downloader - Utils
// @version      1.3.2
// ==/UserScript==

(function(global) {
    'use strict';

    const weiboStatusCache = new Map();

    // ==================== 平台检测 ====================

    function isWeibo() {
        return window.location.hostname.includes('weibo');
    }

    function isSearchPage() {
        return window.location.hostname === 's.weibo.com';
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

    function getFileExtensionFromUrl(url, fallback = '.jpg') {
        if (!url || typeof url !== 'string') {
            return fallback;
        }

        try {
            const fullUrl = url.startsWith('http') ? url : `https://${url}`;
            const pathname = new URL(fullUrl).pathname;
            const match = pathname.match(/(\.[a-z0-9]+)$/i);
            return match ? match[1].toLowerCase() : fallback;
        } catch (e) {
            const cleanUrl = url.split('?')[0];
            const match = cleanUrl.match(/(\.[a-z0-9]+)$/i);
            return match ? match[1].toLowerCase() : fallback;
        }
    }

    function getBestWeiboImageUrl(picInfo) {
        if (!picInfo || typeof picInfo !== 'object') {
            return null;
        }

        const candidates = [
            picInfo.largest && picInfo.largest.url,
            picInfo.original && picInfo.original.url,
            picInfo.large && picInfo.large.url,
            picInfo.bmiddle && picInfo.bmiddle.url,
            picInfo.thumbnail && picInfo.thumbnail.url
        ];

        return candidates.find((url) => typeof url === 'string' && url.length > 0) || null;
    }

    function getWeiboMediaSourceStatus(status) {
        if (!status || typeof status !== 'object') {
            return null;
        }

        const hasPics = Array.isArray(status.pic_ids) && status.pic_ids.length > 0;
        if (hasPics) {
            return status;
        }

        if (status.retweeted_status) {
            return getWeiboMediaSourceStatus(status.retweeted_status);
        }

        return status;
    }

    function getWeiboMediaItemsFromStatus(status) {
        const mediaSourceStatus = getWeiboMediaSourceStatus(status);
        if (!mediaSourceStatus || typeof mediaSourceStatus !== 'object') {
            return [];
        }

        const picIds = Array.isArray(mediaSourceStatus.pic_ids) ? mediaSourceStatus.pic_ids : [];
        const picInfos = mediaSourceStatus.pic_infos || {};

        return picIds.map((picId, index) => {
            const picInfo = picInfos[picId];
            if (!picInfo) {
                return null;
            }

            const imageUrl = getBestWeiboImageUrl(picInfo);
            if (!imageUrl) {
                return null;
            }

            const videoUrl = typeof picInfo.video === 'string' ? picInfo.video : null;

            return {
                id: picId,
                kind: videoUrl ? 'livephoto' : 'image',
                label: videoUrl ? `Live Photo ${index + 1}` : `图片 ${index + 1}`,
                imageUrl,
                videoUrl,
                imageExt: getFileExtensionFromUrl(imageUrl, '.jpg'),
                videoExt: getFileExtensionFromUrl(videoUrl, '.mov')
            };
        }).filter(Boolean);
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

    function buildMediaDownloadJobs(mediaItems, postId) {
        const platform = getCurrentPlatform();
        const jobs = [];

        mediaItems.forEach((item, index) => {
            if (!item || typeof item !== 'object') {
                return;
            }

            const baseName = `${platform}_${postId}_${index + 1}`;

            if (item.imageUrl) {
                jobs.push({
                    type: 'image',
                    url: item.imageUrl,
                    filename: `${baseName}${item.imageExt || getFileExtensionFromUrl(item.imageUrl, '.jpg')}`
                });
            }

            if (item.videoUrl) {
                jobs.push({
                    type: 'video',
                    url: item.videoUrl,
                    filename: `${baseName}_live${item.videoExt || getFileExtensionFromUrl(item.videoUrl, '.mov')}`
                });
            }
        });

        return jobs;
    }

    async function fetchWeiboStatus(statusId) {
        if (!statusId) {
            return null;
        }

        if (weiboStatusCache.has(statusId)) {
            return weiboStatusCache.get(statusId);
        }

        const request = (async () => {
            const response = await fetch(`/ajax/statuses/show?id=${encodeURIComponent(statusId)}&locale=zh-CN&isGetLongText=true`, {
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`微博接口请求失败: ${response.status}`);
            }

            return response.json();
        })();

        weiboStatusCache.set(statusId, request);

        try {
            return await request;
        } catch (error) {
            weiboStatusCache.delete(statusId);
            throw error;
        }
    }

    async function getWeiboMediaItemsById(statusId) {
        const status = await fetchWeiboStatus(statusId);
        return getWeiboMediaItemsFromStatus(status);
    }

    function normalizeLegacyMediaItems(urls) {
        return (urls || []).map((url, index) => ({
            id: `legacy-${index + 1}`,
            kind: 'image',
            label: `图片 ${index + 1}`,
            imageUrl: url,
            videoUrl: null,
            imageExt: getFileExtensionFromUrl(url, '.jpg'),
            videoExt: '.mov'
        }));
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
        return downloadMediaItems(normalizeLegacyMediaItems(urls), postId);
    }

    async function downloadMediaItems(mediaItems, postId) {
        if (!mediaItems || mediaItems.length === 0) {
            WID_UI.showToast('未找到图片');
            return;
        }

        const jobs = buildMediaDownloadJobs(mediaItems, postId);
        if (jobs.length === 0) {
            WID_UI.showToast('未找到图片');
            return;
        }

        log(`开始下载 ${mediaItems.length} 个媒体项，共 ${jobs.length} 个文件...`);

        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];
            await downloadImage(job.url, job.filename);

            if (i < jobs.length - 1) {
                await new Promise(r => setTimeout(r, WID_CONFIG.DELAY_MS));
            }
        }

        const message = jobs.length === mediaItems.length
            ? `已下载 ${jobs.length} 张图片`
            : `已下载 ${mediaItems.length} 个媒体项，共 ${jobs.length} 个文件`;

        log(message);
        WID_UI.showToast(message);
    }

    // ==================== 导出 ====================

    global.WID_UTILS = {
        isWeibo,
        isSearchPage,
        isX,
        getCurrentPlatform,
        log,
        isAvatarImage,
        getOriginalImageUrl,
        getWeiboOriginalImageUrl,
        getFileExtensionFromUrl,
        getBestWeiboImageUrl,
        getWeiboMediaSourceStatus,
        getWeiboMediaItemsFromStatus,
        getXOriginalImageUrl,
        getFilename,
        buildMediaDownloadJobs,
        fetchWeiboStatus,
        getWeiboMediaItemsById,
        downloadImage,
        downloadImageFallback,
        downloadAllImages,
        downloadMediaItems
    };

})(window);
