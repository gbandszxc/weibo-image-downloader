// ==UserScript==
// @name         微博/X图片批量下载器
// @namespace    http://tampermonkey.net/
// @version      1.4.2
// @description  一键下载微博和X帖子中的所有图片为原图，可选开启视频下载
// @author       gbandszxc
// @match        https://weibo.com/*
// @match        https://www.weibo.com/*
// @match        https://weibo.com.cn/*
// @match        https://m.weibo.cn/*
// @match        https://www.m.weibo.cn/*
// @match        https://s.weibo.com/*
// @match        https://x.com/*
// @match        https://www.x.com/*
// @match        https://twitter.com/*
// @match        https://www.twitter.com/*
// @connect      sinaimg.cn
// @connect      sina.cn
// @connect      twimg.com
// @connect      *
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_log
// @grant        GM_addElement
// @updateURL    https://raw.githubusercontent.com/gbandszxc/weibo-image-downloader/main/dist/weibo-image-downloader.user.js
// @downloadURL  https://raw.githubusercontent.com/gbandszxc/weibo-image-downloader/main/dist/weibo-image-downloader.user.js
// @supportURL   https://github.com/gbandszxc/weibo-image-downloader/issues
// @license      MIT
// ==/UserScript==

(() => {
  // src/style.css
  var style_default = '#weibo-img-toast {\r\n    position: fixed;\r\n    top: 20px;\r\n    left: 50%;\r\n    transform: translateX(-50%);\r\n    background: rgba(0, 0, 0, 0.75);\r\n    color: #fff;\r\n    padding: 10px 20px;\r\n    border-radius: 4px;\r\n    font-size: 14px;\r\n    z-index: 2147483647;\r\n    display: flex;\r\n    align-items: center;\r\n    gap: 10px;\r\n    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\r\n    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);\r\n}\r\n\r\n#weibo-img-toast .close-btn {\r\n    font-size: 18px;\r\n    cursor: pointer;\r\n    opacity: 0.7;\r\n    line-height: 1;\r\n}\r\n\r\n#weibo-img-toast .close-btn:hover {\r\n    opacity: 1;\r\n}\r\n\r\n.weibo-img-select-overlay {\r\n    position: fixed;\r\n    inset: 0;\r\n    background: rgba(15, 23, 42, 0.24);\r\n    backdrop-filter: blur(10px);\r\n    z-index: 2147483647;\r\n    display: flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    padding: 16px;\r\n    box-sizing: border-box;\r\n}\r\n\r\n.weibo-img-select-modal {\r\n    width: 100%;\r\n    max-width: 448px;\r\n    max-height: 80vh;\r\n    background: linear-gradient(180deg, #fffdf9 0%, #ffffff 100%);\r\n    border: 1px solid rgba(255, 130, 0, 0.12);\r\n    border-radius: 16px;\r\n    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);\r\n    display: flex;\r\n    flex-direction: column;\r\n    overflow: hidden;\r\n    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\r\n}\r\n\r\n.weibo-img-select-header {\r\n    padding: 16px 18px 14px;\r\n    border-bottom: 1px solid rgba(255, 130, 0, 0.12);\r\n    display: flex;\r\n    align-items: center;\r\n    justify-content: space-between;\r\n    gap: 12px;\r\n}\r\n\r\n.weibo-img-select-header-title {\r\n    font-size: 15px;\r\n    font-weight: 600;\r\n    color: #1f2937;\r\n}\r\n\r\n.weibo-img-select-toggle-btn {\r\n    height: 30px;\r\n    padding: 0 12px;\r\n    border: 1px solid rgba(255, 130, 0, 0.18);\r\n    border-radius: 999px;\r\n    background: #fff7ed;\r\n    color: #c2410c;\r\n    font-size: 12px;\r\n    font-weight: 600;\r\n    display: inline-flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    text-align: center;\r\n    line-height: 1;\r\n    cursor: pointer;\r\n    box-sizing: border-box;\r\n    white-space: nowrap;\r\n}\r\n\r\n.weibo-img-select-list {\r\n    padding: 14px 18px 18px;\r\n    overflow: auto;\r\n    display: grid;\r\n    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));\r\n    gap: 12px;\r\n}\r\n\r\n.weibo-img-select-item {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    min-width: 0;\n    height: 48px;\n    padding: 10px 12px;\n    border: 1px solid rgba(255, 130, 0, 0.14);\n    border-radius: 12px;\n    background: linear-gradient(180deg, #fffaf3 0%, #ffffff 100%);\n    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);\n    user-select: none;\r\n    font-size: 14px;\n    color: #374151;\n    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;\n    box-sizing: border-box;\n}\n\r\n.weibo-img-select-item:hover {\n    border-color: rgba(255, 130, 0, 0.32);\n    box-shadow: 0 8px 18px rgba(255, 130, 0, 0.1);\n    transform: translateY(-1px);\n}\n\n.weibo-img-select-item-video {\n    border-color: rgba(59, 130, 246, 0.28);\n    background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);\n}\n\n.weibo-img-select-item-video:hover {\n    border-color: rgba(59, 130, 246, 0.42);\n    box-shadow: 0 8px 18px rgba(59, 130, 246, 0.12);\n}\n\n.weibo-img-select-item input {\n    flex: 0 0 auto;\n    width: 16px;\n    height: 16px;\n    margin: 0;\n    display: block;\n    accent-color: #ff8200;\n}\n\n.weibo-img-select-item-video input {\n    accent-color: #2563eb;\n}\n\r\n.weibo-img-select-item-text {\n    display: inline-flex;\n    align-items: center;\n    min-width: 0;\n    min-height: 16px;\n    line-height: 16px;\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    font-weight: 600;\n    letter-spacing: 0.01em;\n}\n\n.weibo-img-select-item-text-video {\n    color: #1d4ed8;\n}\n\r\n.weibo-img-select-actions {\r\n    padding: 14px 18px 18px;\r\n    border-top: 1px solid rgba(255, 130, 0, 0.12);\r\n    display: flex;\r\n    justify-content: flex-end;\r\n    gap: 8px;\r\n}\r\n\r\n.weibo-img-select-btn {\r\n    min-width: 90px;\r\n    height: 34px;\r\n    padding: 0 14px;\r\n    border-radius: 999px;\r\n    border: 1px solid transparent;\r\n    font-size: 13px;\r\n    font-weight: 600;\r\n    cursor: pointer;\r\n    display: inline-flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    text-align: center;\r\n    line-height: 1;\r\n    box-sizing: border-box;\r\n}\r\n\r\n.weibo-img-select-modal button {\r\n    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\r\n    vertical-align: middle;\r\n}\r\n\r\n.weibo-img-select-btn-cancel {\r\n    background: #fff;\r\n    border-color: rgba(148, 163, 184, 0.35);\r\n    color: #475569;\r\n}\r\n\r\n.weibo-img-select-btn-confirm {\r\n    background: linear-gradient(135deg, #ff8200 0%, #ff6a00 100%);\r\n    color: #fff;\r\n    box-shadow: 0 10px 22px rgba(255, 130, 0, 0.26);\r\n}\r\n\r\n.weibo-img-download-btn {\r\n    display: inline-flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    width: auto !important;\r\n    height: 20px;\r\n    padding: 0 6px !important;\r\n    margin-left: 8px;\r\n    background: #ff8200;\r\n    color: white;\r\n    border-radius: 3px;\r\n    font-size: 11px;\r\n    font-weight: bold;\r\n    cursor: pointer;\r\n    vertical-align: middle;\r\n    white-space: nowrap;\r\n    box-sizing: content-box;\r\n}\r\n\r\n.weibo-img-download-btn:hover {\r\n    background: #ff6a00;\r\n}\r\n';

  // src/config.js
  var CONFIG = {
    DELAY_MS: 300,
    LONG_PRESS_MS: 500,
    VIDEO_DOWNLOAD_SETTING_KEY: "weiboImageDownloader.enableVideoDownload",
    ENABLE_VIDEO_DOWNLOAD: false,
    DEBUG: true
  };

  // src/platforms/weibo.js
  function createWeiboPlatform({
    config = {},
    windowRef,
    fetchRef,
    gmXmlhttpRequest,
    log,
    getFileBasenameFromUrl,
    getFileExtensionFromUrl
  }) {
    const imageSelectors = [
      "img.woo-picture-img",
      ".picture img",
      ".m3 img",
      'div[class^="m"] img'
    ];
    const mobilePostSelectors = [
      ".card.m-panel.card9"
    ];
    const postSelectors = [
      ...mobilePostSelectors,
      "article",
      ".vue-feed-item",
      'div[action-type="feed_list_item"]'
    ];
    const headerSelectors = [
      'div[class*="_iconsPlus_"]',
      'header > div > div[class*="_nick_"]',
      "header > div > div.woo-box-flex",
      ".woo-nickname",
      ".name"
    ];
    const weiboStatusCache = /* @__PURE__ */ new Map();
    function isVideoDownloadEnabled() {
      return !!config.ENABLE_VIDEO_DOWNLOAD;
    }
    function isSearchPage() {
      return windowRef.location.hostname === "s.weibo.com";
    }
    function isMobileWeiboPage() {
      return windowRef.location.hostname === "m.weibo.cn" || windowRef.location.hostname === "www.m.weibo.cn";
    }
    function isAvatarImage(url) {
      if (!url) {
        return false;
      }
      return url.includes("/crop.") || url.includes("/avatar") || url.includes("_cute") || url.includes("_online");
    }
    function getOriginalImageUrl(url) {
      if (!url || typeof url !== "string") {
        return null;
      }
      if (!url.includes("sinaimg.cn") && !url.includes("sina.cn")) {
        return null;
      }
      if (isAvatarImage(url)) {
        return null;
      }
      if (url.includes("/large/")) {
        return url;
      }
      const sizePatterns = ["thumb180", "thumb300", "square", "bmiddle", "mw690", "mw1024", "orj360", "orj480", "webp720"];
      for (const size of sizePatterns) {
        if (url.includes(`/${size}/`)) {
          return url.replace(`/${size}/`, "/large/");
        }
      }
      const match = url.match(/(\.sinaimg\.cn\/)([a-z0-9]+\/)/);
      if (match) {
        return url.replace(match[2], "large/");
      }
      return url;
    }
    function getBestWeiboImageUrl(picInfo) {
      if (!picInfo || typeof picInfo !== "object") {
        return null;
      }
      const candidates = [
        picInfo.largest && picInfo.largest.url,
        picInfo.original && picInfo.original.url,
        picInfo.large && picInfo.large.url,
        picInfo.bmiddle && picInfo.bmiddle.url,
        picInfo.thumbnail && picInfo.thumbnail.url,
        picInfo.url
      ];
      const imageUrl = candidates.find((url) => typeof url === "string" && url.length > 0);
      return getOriginalImageUrl(imageUrl) || imageUrl || null;
    }
    function getBestWeiboVideoUrl(mediaInfo) {
      if (!mediaInfo || typeof mediaInfo !== "object") {
        return null;
      }
      const playbackList = Array.isArray(mediaInfo.playback_list) ? mediaInfo.playback_list : [];
      const playbackCandidates = playbackList.map((item) => {
        const playInfo = item && item.play_info;
        const url = playInfo && playInfo.url;
        if (typeof url !== "string" || !url) {
          return null;
        }
        const qualityIndex = Number(item.meta && item.meta.quality_index) || 0;
        const bitrate = Number(playInfo.bitrate) || 0;
        const pixels = (Number(playInfo.width) || 0) * (Number(playInfo.height) || 0);
        return {
          url,
          score: qualityIndex * 1e9 + pixels * 1e3 + bitrate
        };
      }).filter(Boolean).sort((a, b) => b.score - a.score);
      if (playbackCandidates.length > 0) {
        return playbackCandidates[0].url;
      }
      const fallbackKeys = [
        "mp4_2160p_mp4",
        "mp4_1080p_mp4",
        "mp4_720p_mp4",
        "hevc_mp4_720p",
        "h265_mp4_hd",
        "inch_5_5_mp4_hd",
        "inch_5_mp4_hd",
        "inch_4_mp4_hd",
        "mp4_hd_url",
        "stream_url_hd",
        "mp4_sd_url",
        "stream_url"
      ];
      for (const key of fallbackKeys) {
        if (typeof mediaInfo[key] === "string" && mediaInfo[key]) {
          return mediaInfo[key];
        }
      }
      return null;
    }
    function createWeiboVideoMediaItem({ id, videoUrl, index }) {
      if (!videoUrl) {
        return null;
      }
      return {
        id,
        kind: "video",
        label: `视频 ${index + 1}`,
        imageUrl: null,
        videoUrl,
        imageExt: ".jpg",
        videoExt: getFileExtensionFromUrl(videoUrl, ".mp4")
      };
    }
    function getWeiboMixMediaItems(status) {
      const mixMediaItems = status && status.mix_media_info && Array.isArray(status.mix_media_info.items) ? status.mix_media_info.items : [];
      return mixMediaItems.map((item, index) => {
        const data = item && item.data;
        if (!data || typeof data !== "object") {
          return null;
        }
        const mediaType = typeof item.type === "string" ? item.type.toLowerCase() : "";
        const objectType = typeof data.object_type === "string" ? data.object_type.toLowerCase() : "";
        if (mediaType === "video" || objectType === "video") {
          if (!isVideoDownloadEnabled()) {
            return null;
          }
          return createWeiboVideoMediaItem({
            id: data.id || data.media_id || `mix-video-${index + 1}`,
            videoUrl: getBestWeiboVideoUrl(data.media_info) || data.videoSrc || data.stream_url_hd || data.stream_url,
            index
          });
        }
        const picInfo = data.pic_info || data;
        const imageUrl = getBestWeiboImageUrl(picInfo) || getBestWeiboImageUrl({
          largest: data.pic_info && data.pic_info.pic_big,
          bmiddle: data.pic_info && data.pic_info.pic_middle,
          thumbnail: data.pic_info && data.pic_info.pic_small
        });
        if (!imageUrl) {
          return null;
        }
        return {
          id: getFileBasenameFromUrl(imageUrl, `mix-${index + 1}`),
          kind: "image",
          label: `图片 ${index + 1}`,
          imageUrl,
          videoUrl: null,
          imageExt: getFileExtensionFromUrl(imageUrl, ".jpg"),
          videoExt: ".mov"
        };
      }).filter(Boolean);
    }
    function createWeiboMediaItem(picId, picInfo, index) {
      if (!picInfo || typeof picInfo !== "object") {
        return null;
      }
      const imageUrl = getBestWeiboImageUrl(picInfo);
      if (!imageUrl) {
        return null;
      }
      const mediaType = typeof picInfo.type === "string" ? picInfo.type.toLowerCase() : "pic";
      const isLivePhoto = mediaType === "livephoto";
      const isGif = mediaType === "gif" || getFileExtensionFromUrl(imageUrl, ".jpg") === ".gif";
      const candidateVideoUrl = typeof picInfo.video === "string" ? picInfo.video : typeof picInfo.videoSrc === "string" ? picInfo.videoSrc : null;
      const videoUrl = isLivePhoto ? candidateVideoUrl : null;
      const kind = isLivePhoto ? "livephoto" : isGif ? "gif" : "image";
      const label = isLivePhoto ? `Live Photo ${index + 1}` : isGif ? `GIF ${index + 1}` : `图片 ${index + 1}`;
      return {
        id: picId,
        kind,
        label,
        imageUrl,
        videoUrl,
        imageExt: getFileExtensionFromUrl(imageUrl, ".jpg"),
        videoExt: getFileExtensionFromUrl(videoUrl, ".mov")
      };
    }
    function getWeiboMobileMediaItems(status) {
      const pics = Array.isArray(status && status.pics) ? status.pics : [];
      if (pics.length === 0) {
        return [];
      }
      return pics.map((pic, index) => {
        if (!pic || typeof pic !== "object") {
          return null;
        }
        const mediaType = typeof pic.type === "string" ? pic.type.toLowerCase() : "pic";
        if (mediaType === "video") {
          if (!isVideoDownloadEnabled()) {
            return null;
          }
          return createWeiboVideoMediaItem({
            id: pic.pid || `pic-video-${index + 1}`,
            videoUrl: getBestWeiboVideoUrl(pic.media_info) || pic.videoSrc || pic.video,
            index
          });
        }
        return createWeiboMediaItem(
          pic.pid || getFileBasenameFromUrl(getBestWeiboImageUrl(pic) || pic.url, `pic-${index + 1}`),
          pic,
          index
        );
      }).filter(Boolean);
    }
    function getWeiboMediaSourceStatus(status) {
      if (!status || typeof status !== "object") {
        return null;
      }
      const hasPics = Array.isArray(status.pic_ids) && status.pic_ids.length > 0 || Array.isArray(status.pics) && status.pics.length > 0;
      const hasMixMedia = status.mix_media_info && Array.isArray(status.mix_media_info.items) && status.mix_media_info.items.length > 0;
      if (hasPics || hasMixMedia) {
        return status;
      }
      if (status.retweeted_status) {
        return getWeiboMediaSourceStatus(status.retweeted_status);
      }
      return status;
    }
    function getWeiboMediaItemsFromStatus(status) {
      const mediaSourceStatus = getWeiboMediaSourceStatus(status);
      if (!mediaSourceStatus || typeof mediaSourceStatus !== "object") {
        return [];
      }
      const picIds = Array.isArray(mediaSourceStatus.pic_ids) ? mediaSourceStatus.pic_ids : [];
      const picInfos = mediaSourceStatus.pic_infos || {};
      const directMediaItems = picIds.map((picId, index) => createWeiboMediaItem(picId, picInfos[picId], index)).filter(Boolean);
      if (directMediaItems.length > 0) {
        return directMediaItems;
      }
      const mobileMediaItems = getWeiboMobileMediaItems(mediaSourceStatus);
      if (mobileMediaItems.length > 0) {
        return mobileMediaItems;
      }
      const mixMediaItems = getWeiboMixMediaItems(mediaSourceStatus);
      if (mixMediaItems.length > 0) {
        return mixMediaItems;
      }
      if (!isVideoDownloadEnabled()) {
        return [];
      }
      const pageInfo = mediaSourceStatus.page_info || {};
      const pageInfoType = typeof pageInfo.type === "string" ? pageInfo.type.toLowerCase() : "";
      const objectType = typeof pageInfo.object_type === "string" ? pageInfo.object_type.toLowerCase() : "";
      if (pageInfoType === "video" || pageInfoType === "11" || objectType === "video") {
        const videoItem = createWeiboVideoMediaItem({
          id: mediaSourceStatus.mblogid || mediaSourceStatus.idstr || "video-1",
          videoUrl: getBestWeiboVideoUrl(pageInfo.media_info),
          index: 0
        });
        return videoItem ? [videoItem] : [];
      }
      return [];
    }
    async function fetchWeiboStatus(statusId) {
      if (!statusId) {
        return null;
      }
      if (weiboStatusCache.has(statusId)) {
        return weiboStatusCache.get(statusId);
      }
      const statusUrl = `${isSearchPage() ? "https://weibo.com" : ""}/ajax/statuses/show?id=${encodeURIComponent(statusId)}&locale=zh-CN&isGetLongText=true`;
      const request = (async () => {
        if (isSearchPage() && typeof gmXmlhttpRequest === "function") {
          return new Promise((resolve, reject) => {
            try {
              gmXmlhttpRequest({
                method: "GET",
                url: statusUrl,
                anonymous: false,
                withCredentials: true,
                headers: {
                  Accept: "application/json, text/plain, */*",
                  "X-Requested-With": "XMLHttpRequest",
                  Referer: "https://weibo.com/"
                },
                onload(response2) {
                  if (response2.status < 200 || response2.status >= 300) {
                    reject(new Error(`微博接口请求失败: ${response2.status}`));
                    return;
                  }
                  try {
                    const data = JSON.parse(response2.responseText);
                    if (data && data.error) {
                      reject(new Error(`微博接口请求失败: ${data.error}`));
                      return;
                    }
                    resolve(data);
                  } catch (error) {
                    reject(error);
                  }
                },
                onerror(error) {
                  reject(new Error(error?.error || error?.message || "微博接口请求失败"));
                },
                ontimeout() {
                  reject(new Error("微博接口请求超时"));
                }
              });
            } catch (error) {
              reject(error);
            }
          });
        }
        const response = await fetchRef(statusUrl, {
          credentials: "same-origin",
          headers: {
            Accept: "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest"
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
    function isVideoThumbnailImage(img) {
      if (!img || typeof img.closest !== "function") {
        return false;
      }
      const pictureMain = img.closest(".woo-picture-main");
      if (!pictureMain || typeof pictureMain.querySelector !== "function") {
        return false;
      }
      return !!pictureMain.querySelector('[class*="_videotime_"], [class*="_videobox_"], .woo-font--play');
    }
    function findImagesInPost(container) {
      const images = [];
      for (const selector of imageSelectors) {
        try {
          const elements = container.querySelectorAll(selector);
          elements.forEach((img) => {
            if (!img.src) {
              return;
            }
            if (isAvatarImage(img.src)) {
              return;
            }
            if (img.src.includes("default_avatar")) {
              return;
            }
            if (img.src.includes("h5.sinaimg.cn")) {
              return;
            }
            if (!img.src.includes("sinaimg") && !img.src.includes("sina.cn")) {
              return;
            }
            if (isVideoThumbnailImage(img)) {
              return;
            }
            images.push(img);
          });
        } catch (error) {
          log("微博图片选择器执行失败:", error.message);
        }
      }
      return images;
    }
    function getVueStatusItem(postContainer) {
      const candidateNodes = [
        postContainer,
        typeof postContainer.querySelector === "function" ? postContainer.querySelector(".card-wrap") : null,
        typeof postContainer.querySelector === "function" ? postContainer.querySelector(".card-main") : null
      ].filter(Boolean);
      for (const node of candidateNodes) {
        const vueInstance = node && node.__vue__;
        const item = vueInstance && (vueInstance._props && vueInstance._props.item || vueInstance.item || vueInstance.$options && vueInstance.$options.propsData && vueInstance.$options.propsData.item);
        if (item && typeof item === "object") {
          return item;
        }
      }
      return null;
    }
    function getDomMediaItems(postContainer) {
      if (!isMobileWeiboPage()) {
        return null;
      }
      const status = getVueStatusItem(postContainer);
      if (!status) {
        return null;
      }
      return getWeiboMediaItemsFromStatus(status);
    }
    function selectPreferredMediaItems(fallbackItems, resolvedMediaItems, apiResolved) {
      return apiResolved ? resolvedMediaItems : fallbackItems;
    }
    function getStatusLookupId(postContainer) {
      const mid = postContainer.getAttribute("mid") || postContainer.getAttribute("data-mid");
      if (mid) {
        return mid;
      }
      const links = postContainer.querySelectorAll("a[href]");
      for (const link of links) {
        const href = link.href || "";
        const match = href.match(/weibo\.com\/(?:u\/)?\d+\/([A-Za-z0-9]+)/);
        if (match && !href.includes("/u/")) {
          return match[1];
        }
      }
      return null;
    }
    async function resolvePostMediaItems(postContainer, fallbackItems) {
      if (isMobileWeiboPage()) {
        const status = getVueStatusItem(postContainer);
        if (!status) {
          return fallbackItems;
        }
        const mediaItems = getWeiboMediaItemsFromStatus(status);
        return selectPreferredMediaItems(fallbackItems, mediaItems, true);
      }
      const statusId = getStatusLookupId(postContainer);
      if (!statusId) {
        return fallbackItems;
      }
      try {
        const mediaItems = await getWeiboMediaItemsById(statusId);
        return selectPreferredMediaItems(fallbackItems, mediaItems, true);
      } catch (error) {
        log("微博接口解析失败，回退DOM:", error.message);
      }
      return selectPreferredMediaItems(fallbackItems, [], false);
    }
    function getPostSelectors() {
      if (isMobileWeiboPage()) {
        return mobilePostSelectors;
      }
      return postSelectors;
    }
    function shouldSkipPost(post) {
      if (isMobileWeiboPage()) {
        return !post || typeof post.matches !== "function" || !post.matches(".card.m-panel.card9");
      }
      return false;
    }
    function shouldResolveEmptyMediaItems(postContainer) {
      return isVideoDownloadEnabled() && !!getStatusLookupId(postContainer);
    }
    function getPostId(postContainer) {
      if (isMobileWeiboPage()) {
        const status = getVueStatusItem(postContainer);
        if (status && status.mid) {
          return status.mid;
        }
      }
      return postContainer.getAttribute("mid") || postContainer.getAttribute("data-mid") || `weibo_${Date.now()}`;
    }
    function insertMobileDownloadButton(post, btn) {
      const nameRow = post.querySelector("header.weibo-top .m-text-box h3.m-text-cut");
      if (nameRow) {
        nameRow.style.display = "inline-flex";
        nameRow.style.alignItems = "center";
        nameRow.style.flexWrap = "nowrap";
        nameRow.style.columnGap = "4px";
        nameRow.appendChild(btn);
        return true;
      }
      const headerEl = post.querySelector("header.weibo-top");
      if (headerEl) {
        headerEl.appendChild(btn);
        return true;
      }
      return false;
    }
    function insertDownloadButton({ post, btn }) {
      if (isMobileWeiboPage()) {
        return insertMobileDownloadButton(post, btn);
      }
      if (isSearchPage()) {
        const infoEl = post.querySelector(".content .info");
        if (infoEl) {
          const nameDiv = Array.from(infoEl.children).find((el) => !el.classList.contains("menu"));
          if (nameDiv) {
            nameDiv.style.display = "flex";
            nameDiv.style.alignItems = "center";
            nameDiv.style.gap = "4px";
            nameDiv.appendChild(btn);
            return true;
          }
        }
      }
      const retweetSpan = Array.from(post.querySelectorAll("span")).find(
        (el) => el.textContent.trim() === "转发微博"
      );
      if (retweetSpan && retweetSpan.parentNode) {
        retweetSpan.parentNode.insertBefore(btn, retweetSpan.nextSibling);
        return true;
      }
      const suffixBox = post.querySelector('div[class*="_suffixbox"]');
      if (suffixBox) {
        suffixBox.appendChild(btn);
        return true;
      }
      const iconsPlusEl = post.querySelector('div[class*="_iconsPlus_"]');
      if (iconsPlusEl && iconsPlusEl.parentNode) {
        iconsPlusEl.parentNode.insertBefore(btn, iconsPlusEl);
        return true;
      }
      for (const headerSelector of headerSelectors) {
        const headerEl = post.querySelector(headerSelector);
        if (headerEl) {
          headerEl.appendChild(btn);
          return true;
        }
      }
      return false;
    }
    function getPostUrl(article) {
      if (!article) {
        return null;
      }
      const links = article.querySelectorAll("a[href]");
      for (const link of links) {
        const href = link.href;
        if (/weibo\.com\/\d+\/\w+/.test(href) && !href.includes("/u/")) {
          return href;
        }
      }
      return null;
    }
    function injectGotoOriginalMenuItem(popMain, article, documentRef) {
      if (!popMain || popMain.dataset.gotoInjected) {
        return;
      }
      const postUrl = getPostUrl(article);
      if (!postUrl) {
        return;
      }
      const wrapMain = popMain.querySelector(".woo-pop-wrap-main");
      if (!wrapMain) {
        return;
      }
      const shareItem = wrapMain.firstElementChild;
      if (!shareItem) {
        return;
      }
      const item = documentRef.createElement("div");
      item.setAttribute("role", "button");
      item.className = "woo-box-flex woo-box-alignCenter woo-pop-item-main woo-pop-item-main";
      item.innerHTML = '<div class="woo-box-flex woo-box-column" style="width:100%"><div class="woo-box-flex woo-box-justifyBetween"><div>跳转原文</div></div><div class="_desc_1v5ao_2"></div></div>';
      item.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        windowRef.open(postUrl, "_blank");
      });
      wrapMain.insertBefore(item, shareItem.nextSibling);
      popMain.dataset.gotoInjected = "1";
    }
    function injectSearchPageGotoOriginal({ documentRef }) {
      documentRef.querySelectorAll('div[action-type="feed_list_item"]').forEach((post) => {
        const menuUl = post.querySelector('ul[node-type="fl_menu_right"]');
        if (!menuUl || menuUl.dataset.gotoInjected) {
          return;
        }
        const postUrl = getPostUrl(post);
        if (!postUrl) {
          return;
        }
        const li = documentRef.createElement("li");
        const a = documentRef.createElement("a");
        a.href = "javascript:void(0);";
        a.textContent = "跳转原文";
        a.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          windowRef.open(postUrl, "_blank");
        });
        li.appendChild(a);
        menuUl.insertBefore(li, menuUl.firstChild);
        menuUl.dataset.gotoInjected = "1";
      });
    }
    function afterInjectDownloadButtons({ documentRef }) {
      if (isSearchPage()) {
        injectSearchPageGotoOriginal({ documentRef });
      }
    }
    function initObservers({ documentRef }) {
      const MutationObserverRef = windowRef.MutationObserver || MutationObserver;
      const menuObserver = new MutationObserverRef((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (!(node instanceof Element)) {
              continue;
            }
            if (node.classList.contains("woo-pop-main")) {
              const article = node.closest("article");
              if (article && node.textContent.includes("分享")) {
                injectGotoOriginalMenuItem(node, article, documentRef);
              }
            }
          }
        }
      });
      menuObserver.observe(documentRef.body, { childList: true, subtree: true });
    }
    return {
      id: "weibo",
      displayName: "微博",
      isSearchPage,
      isAvatarImage,
      getOriginalImageUrl,
      getBestWeiboImageUrl,
      getWeiboMixMediaItems,
      createWeiboMediaItem,
      getWeiboMediaSourceStatus,
      getWeiboMediaItemsFromStatus,
      getDomMediaItems,
      fetchWeiboStatus,
      getWeiboMediaItemsById,
      isVideoThumbnailImage,
      findImagesInPost,
      selectPreferredMediaItems,
      resolvePostMediaItems,
      getPostSelectors,
      shouldSkipPost,
      shouldResolveEmptyMediaItems,
      getPostId,
      insertDownloadButton,
      getPostUrl,
      injectGotoOriginalMenuItem,
      afterInjectDownloadButtons,
      initObservers
    };
  }

  // src/platforms/x.js
  function createXPlatform({ config = {}, windowRef, fetchRef, log, getFileExtensionFromUrl }) {
    const imageSelectors = ['article img[src*="twimg.com"]'];
    const postSelectors = ['article[data-testid="tweet"]'];
    const tweetResultOperationId = "SgZWKwvBiOKrSC0QeOGvXw";
    const tweetResultFeatures = {
      creator_subscriptions_tweet_preview_api_enabled: true,
      premium_content_api_read_enabled: false,
      communities_web_enable_tweet_community_results_fetch: true,
      c9s_tweet_anatomy_moderator_badge_enabled: true,
      responsive_web_grok_analyze_button_fetch_trends_enabled: false,
      responsive_web_grok_analyze_post_followups_enabled: true,
      rweb_cashtags_composer_attachment_enabled: true,
      responsive_web_jetfuel_frame: true,
      responsive_web_grok_share_attachment_enabled: true,
      responsive_web_grok_annotations_enabled: true,
      articles_preview_enabled: true,
      responsive_web_edit_tweet_api_enabled: true,
      rweb_conversational_replies_downvote_enabled: false,
      graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
      view_counts_everywhere_api_enabled: true,
      longform_notetweets_consumption_enabled: true,
      responsive_web_twitter_article_tweet_consumption_enabled: true,
      content_disclosure_indicator_enabled: true,
      content_disclosure_ai_generated_indicator_enabled: true,
      responsive_web_grok_show_grok_translated_post: true,
      responsive_web_grok_analysis_button_from_backend: true,
      post_ctas_fetch_enabled: false,
      rweb_cashtags_enabled: true,
      freedom_of_speech_not_reach_fetch_enabled: true,
      standardized_nudges_misinfo: true,
      tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
      longform_notetweets_rich_text_read_enabled: true,
      longform_notetweets_inline_media_enabled: false,
      profile_label_improvements_pcf_label_in_post_enabled: true,
      responsive_web_profile_redirect_enabled: false,
      rweb_tipjar_consumption_enabled: false,
      verified_phone_label_enabled: false,
      responsive_web_grok_image_annotation_enabled: true,
      responsive_web_grok_imagine_annotation_enabled: true,
      responsive_web_grok_community_note_auto_translation_is_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true
    };
    const tweetResultFieldToggles = {
      withArticleRichContentState: true,
      withArticlePlainText: false,
      withArticleSummaryText: true,
      withArticleVoiceOver: true
    };
    function getOriginalImageUrl(url) {
      if (!url || typeof url !== "string") {
        return null;
      }
      if (!url.includes("pbs.twimg.com")) {
        return null;
      }
      try {
        let fullUrl = url;
        if (!url.startsWith("http")) {
          fullUrl = `https://${url}`;
        }
        const urlObj = new URL(fullUrl);
        const name = urlObj.searchParams.get("name");
        if (name === "orig") {
          return fullUrl;
        }
        urlObj.searchParams.delete("name");
        urlObj.searchParams.set("name", "orig");
        return urlObj.toString();
      } catch {
        if (url.includes("name=orig")) {
          return url;
        }
        return url.replace(/name=[^&]*/, "name=orig");
      }
    }
    function isPhotoImageUrl(url) {
      return typeof url === "string" && url.includes("pbs.twimg.com/media/");
    }
    function getVideoSourceUrl(video) {
      if (!video) {
        return null;
      }
      const directSrc = video.currentSrc || video.src || null;
      if (typeof directSrc === "string" && directSrc.startsWith("http")) {
        return directSrc;
      }
      if (typeof video.querySelectorAll === "function") {
        const sources = video.querySelectorAll("source");
        for (const source of sources) {
          const src = source?.src;
          if (typeof src === "string" && src.startsWith("http")) {
            return src;
          }
        }
      }
      return null;
    }
    function getVideoMediaContainer(node) {
      if (!node || typeof node.closest !== "function") {
        return null;
      }
      return node.closest('[data-testid="videoComponent"]') || node.closest('[data-testid="videoPlayer"]') || node.closest("[data-testid]");
    }
    function isGifVideo(video) {
      const container = getVideoMediaContainer(video);
      const text = container?.textContent || "";
      return /\bGIF\b/i.test(text);
    }
    function isVideoDownloadEnabled() {
      return !!config.ENABLE_VIDEO_DOWNLOAD;
    }
    function getCookieValue(name) {
      const cookie = windowRef.document && windowRef.document.cookie;
      if (!cookie || typeof cookie !== "string") {
        return "";
      }
      const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
      return match ? decodeURIComponent(match[1]) : "";
    }
    function getBestXVideoVariant(variants) {
      const candidates = (Array.isArray(variants) ? variants : []).filter((variant) => variant && variant.content_type === "video/mp4" && typeof variant.url === "string" && variant.url).sort((a, b) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0));
      return candidates.length > 0 ? candidates[0].url : null;
    }
    function findImagesInPost(container) {
      const images = [];
      const seen = /* @__PURE__ */ new Set();
      for (const selector of imageSelectors) {
        try {
          const elements = container.querySelectorAll(selector);
          elements.forEach((img) => {
            const src = img.src;
            if (!src || typeof src !== "string") {
              return;
            }
            if (!src.includes("pbs.twimg.com")) {
              return;
            }
            if (!isPhotoImageUrl(src)) {
              return;
            }
            const srcKey = src.split("?")[0];
            if (seen.has(srcKey)) {
              return;
            }
            seen.add(srcKey);
            if (src.includes("/profile_images/")) {
              return;
            }
            if (src.includes("/emoji/")) {
              return;
            }
            const alt = img.alt || "";
            if (alt.toLowerCase().includes("avatar") || alt.toLowerCase().includes("profile")) {
              return;
            }
            images.push(img);
          });
        } catch (error) {
          log("X 图片选择器执行失败:", error.message);
        }
      }
      return images;
    }
    function createMediaItem({ id, kind, label, url, fallbackExt }) {
      if (!url) {
        return null;
      }
      if (kind === "video") {
        return {
          id,
          kind,
          label,
          imageUrl: null,
          videoUrl: url,
          imageExt: ".jpg",
          videoExt: getFileExtensionFromUrl(url, fallbackExt)
        };
      }
      return {
        id,
        kind,
        label,
        imageUrl: url,
        videoUrl: null,
        imageExt: getFileExtensionFromUrl(url, fallbackExt),
        videoExt: ".mov"
      };
    }
    function getDomMediaItems(container) {
      const mediaItems = [];
      const seen = /* @__PURE__ */ new Set();
      const photoImages = findImagesInPost(container);
      photoImages.forEach((img) => {
        const url = getOriginalImageUrl(img.src);
        if (!url) {
          return;
        }
        const key = `photo:${url.split("?")[0]}`;
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        const item = createMediaItem({
          id: `dom-photo-${mediaItems.length + 1}`,
          kind: "image",
          label: `图片 ${mediaItems.length + 1}`,
          url,
          fallbackExt: ".jpg"
        });
        if (item) {
          mediaItems.push(item);
        }
      });
      if (typeof container.querySelectorAll !== "function") {
        return mediaItems;
      }
      const videos = container.querySelectorAll("video");
      videos.forEach((video) => {
        const isGif = isGifVideo(video);
        if (!isGif && !isVideoDownloadEnabled()) {
          return;
        }
        const url = getVideoSourceUrl(video);
        if (!url) {
          return;
        }
        const kind = isGif ? "gif" : "video";
        const key = `${kind}:${url.split("?")[0]}`;
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        const mediaCount = mediaItems.filter((item2) => item2.kind === kind).length + 1;
        const item = createMediaItem({
          id: `dom-${kind}-${mediaCount}`,
          kind,
          label: isGif ? `GIF ${mediaCount}` : `视频 ${mediaCount}`,
          url,
          fallbackExt: ".mp4"
        });
        if (item) {
          mediaItems.push(item);
        }
      });
      return mediaItems;
    }
    function resolvePostMediaItems(_postContainer, fallbackItems) {
      if (!isVideoDownloadEnabled() || fallbackItems.length > 0) {
        return fallbackItems;
      }
      const statusId = getPostId(_postContainer);
      if (!statusId) {
        return fallbackItems;
      }
      return getXMediaItemsById(statusId).then(
        (mediaItems) => mediaItems.length > 0 ? mediaItems : fallbackItems
      );
    }
    function getPostSelectors() {
      return postSelectors;
    }
    function isMainTweet(container) {
      const article = container.closest('article[data-testid="tweet"]');
      if (!article) {
        return false;
      }
      const timeEl = article.querySelector("time");
      return timeEl !== null;
    }
    function shouldSkipPost(post) {
      return !isMainTweet(post);
    }
    function getPostId(postContainer) {
      let postId;
      const timeEl = postContainer.querySelector("time");
      if (timeEl && timeEl.parentElement) {
        const linkEl = timeEl.parentElement.querySelector('a[href*="/status/"]');
        if (linkEl) {
          const match = linkEl.href.match(/\/status\/(\d+)/);
          if (match) {
            postId = match[1];
          }
        }
      }
      if (postId) {
        return postId;
      }
      const links = typeof postContainer.querySelectorAll === "function" ? postContainer.querySelectorAll('a[href*="/status/"]') : [];
      for (const link of links) {
        const match = link.href && link.href.match(/\/status\/(\d+)/);
        if (match) {
          return match[1];
        }
      }
      const currentPath = windowRef.location && (windowRef.location.pathname || windowRef.location.href || "");
      const currentMatch = currentPath.match(/\/status\/(\d+)/);
      return currentMatch ? currentMatch[1] : `x_${Date.now()}`;
    }
    function shouldResolveEmptyMediaItems(postContainer) {
      if (!isVideoDownloadEnabled() || !/^\d+$/.test(getPostId(postContainer))) {
        return false;
      }
      if (!postContainer || typeof postContainer.querySelector !== "function") {
        return false;
      }
      return !!postContainer.querySelector(
        'img[src*="video_thumb"], img[src*="amplify_video_thumb"], img[src*="ext_tw_video_thumb"], a[href*="/video/"], video'
      );
    }
    function buildTweetResultUrl(tweetId) {
      const variables = {
        tweetId,
        includePromotedContent: true,
        withBirdwatchNotes: true,
        withVoice: true,
        withCommunity: true
      };
      return `/i/api/graphql/${tweetResultOperationId}/TweetResultByRestId?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(tweetResultFeatures))}&fieldToggles=${encodeURIComponent(JSON.stringify(tweetResultFieldToggles))}`;
    }
    async function fetchXStatus(tweetId) {
      if (typeof fetchRef !== "function") {
        return null;
      }
      const response = await fetchRef(buildTweetResultUrl(tweetId), {
        credentials: "include",
        headers: {
          Accept: "*/*",
          Authorization: "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
          "X-Twitter-Active-User": "yes",
          "X-Twitter-Client-Language": "zh-cn",
          "X-CSRF-Token": getCookieValue("ct0")
        }
      });
      if (!response || !response.ok) {
        return null;
      }
      return response.json();
    }
    function getXMediaItemsFromStatus(status) {
      const media = status && status.data && status.data.tweetResult && status.data.tweetResult.result && status.data.tweetResult.result.legacy && status.data.tweetResult.result.legacy.extended_entities && Array.isArray(status.data.tweetResult.result.legacy.extended_entities.media) ? status.data.tweetResult.result.legacy.extended_entities.media : [];
      return media.map((item, index) => {
        const mediaType = typeof item.type === "string" ? item.type.toLowerCase() : "";
        if (mediaType !== "video" && mediaType !== "animated_gif") {
          return null;
        }
        const url = getBestXVideoVariant(item.video_info && item.video_info.variants);
        if (!url) {
          return null;
        }
        return createMediaItem({
          id: item.id_str || `graphql-video-${index + 1}`,
          kind: mediaType === "animated_gif" ? "gif" : "video",
          label: mediaType === "animated_gif" ? `GIF ${index + 1}` : `视频 ${index + 1}`,
          url,
          fallbackExt: ".mp4"
        });
      }).filter(Boolean);
    }
    async function getXMediaItemsById(tweetId) {
      try {
        const status = await fetchXStatus(tweetId);
        return getXMediaItemsFromStatus(status);
      } catch (error) {
        log("X 接口解析失败:", error.message);
        return [];
      }
    }
    function insertDownloadButton({ post, btn }) {
      const usernameEl = post.querySelector('[data-testid="User-Name"]');
      if (usernameEl) {
        const parent = usernameEl.parentElement;
        if (parent && parent.parentNode) {
          parent.parentNode.insertBefore(btn, parent.nextSibling || null);
          return true;
        }
      }
      const timeEl = post.querySelector("time");
      if (timeEl) {
        const timeParent = timeEl.parentElement;
        if (timeParent && timeParent.parentNode) {
          const beforeNode = timeParent.nextElementSibling || timeParent.nextSibling || null;
          timeParent.parentNode.insertBefore(btn, beforeNode);
          return true;
        }
      }
      const actionGroup = post.querySelector('[role="group"]');
      if (actionGroup && actionGroup.parentElement) {
        actionGroup.parentElement.insertBefore(btn, actionGroup);
        return true;
      }
      return false;
    }
    return {
      id: "x",
      displayName: "X",
      isSearchPage: () => false,
      isAvatarImage: () => false,
      getOriginalImageUrl,
      getXOriginalImageUrl: getOriginalImageUrl,
      getDomMediaItems,
      findImagesInPost,
      getBestXVideoVariant,
      getXMediaItemsFromStatus,
      getXMediaItemsById,
      resolvePostMediaItems,
      getPostSelectors,
      shouldSkipPost,
      shouldResolveEmptyMediaItems,
      getPostId,
      insertDownloadButton,
      afterInjectDownloadButtons() {
      },
      initObservers() {
      }
    };
  }

  // src/platforms/index.js
  function createPlatformAdapter(deps) {
    const hostname = deps.windowRef.location.hostname || "";
    if (hostname.includes("x.com") || hostname.includes("twitter")) {
      return createXPlatform(deps);
    }
    return createWeiboPlatform(deps);
  }

  // src/utils.js
  function createUtils({ config, windowRef, fetchRef, gmDownload, gmXmlhttpRequest, ui: ui2 }) {
    let platformLabel = "weibo";
    function log(...args) {
      if (config.DEBUG) {
        console.log(`[${platformLabel} Downloader]`, ...args);
      }
    }
    function getFileExtensionFromUrl(url, fallback = ".jpg") {
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
    function getFileBasenameFromUrl(url, fallback) {
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
    function getCurrentPlatform() {
      return platform.id;
    }
    function getCurrentPlatformDisplayName() {
      return platform.displayName || platform.id;
    }
    function getOriginalImageUrl(url) {
      return platform.getOriginalImageUrl(url);
    }
    function getFilename(postId, index) {
      const platform2 = getCurrentPlatform();
      return `${platform2}_${postId}_${index}.jpg`;
    }
    function buildMediaDownloadJobs(mediaItems, postId) {
      const platform2 = getCurrentPlatform();
      const jobs = [];
      mediaItems.forEach((item, index) => {
        if (!item || typeof item !== "object") {
          return;
        }
        const baseName = `${platform2}_${postId}_${index + 1}`;
        if (item.imageUrl) {
          jobs.push({
            type: "image",
            url: item.imageUrl,
            filename: `${baseName}${item.imageExt || getFileExtensionFromUrl(item.imageUrl, ".jpg")}`
          });
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
    function normalizeLegacyMediaItems(urls) {
      return (urls || []).map((url, index) => ({
        id: `legacy-${index + 1}`,
        kind: "image",
        label: `图片 ${index + 1}`,
        imageUrl: url,
        videoUrl: null,
        imageExt: getFileExtensionFromUrl(url, ".jpg"),
        videoExt: ".mov"
      }));
    }
    function getDownloadRequestHeaders(url) {
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
    async function tryGmDownload(resource, filename) {
      if (typeof gmDownload !== "function") {
        return false;
      }
      try {
        return await new Promise((resolve) => {
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
              onprogress: () => {
              }
            });
            if (downloadId === false) {
              log("GM_download返回false，尝试备用方案:", filename);
              resolve(false);
            }
          } catch (error) {
            log("GM_download异常:", error.message);
            resolve(false);
          }
        });
      } catch (error) {
        log("GM_download异常，尝试备用方案:", error.message);
        return false;
      }
    }
    function downloadBlobWithAnchor(blob, filename) {
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
      setTimeout(() => windowRef.URL.revokeObjectURL(blobUrl), 1e3);
      return true;
    }
    async function fetchBlobWithXmlHttpRequest(url) {
      if (typeof gmXmlhttpRequest !== "function") {
        return null;
      }
      const headers = getDownloadRequestHeaders(url);
      return new Promise((resolve, reject) => {
        try {
          gmXmlhttpRequest({
            method: "GET",
            url,
            headers,
            responseType: "blob",
            onload(response) {
              if (response.status >= 200 && response.status < 300 && response.response) {
                resolve(response.response);
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
    async function fetchBlobWithWindowFetch(url) {
      const response = await fetchRef(url, {
        credentials: "include"
      });
      if (!response || !response.ok) {
        throw new Error(`fetch状态异常: ${response?.status ?? "unknown"}`);
      }
      return response.blob();
    }
    async function downloadBlob(blob, filename) {
      const gmSuccess = await tryGmDownload(blob, filename);
      if (gmSuccess) {
        return true;
      }
      return downloadBlobWithAnchor(blob, filename);
    }
    async function downloadImage(url, filename) {
      const directDownloadSuccess = await tryGmDownload(url, filename);
      if (directDownloadSuccess) {
        return true;
      }
      log("GM_download失败，尝试二进制兜底下载");
      return downloadImageFallback(url, filename);
    }
    async function downloadImageFallback(url, filename) {
      try {
        let blob = null;
        if (typeof gmXmlhttpRequest === "function") {
          blob = await fetchBlobWithXmlHttpRequest(url);
        } else {
          blob = await fetchBlobWithWindowFetch(url);
        }
        return downloadBlob(blob, filename);
      } catch (primaryError) {
        if (typeof gmXmlhttpRequest === "function") {
          try {
            const blob = await fetchBlobWithWindowFetch(url);
            return downloadBlob(blob, filename);
          } catch (secondaryError) {
            log(
              "二进制兜底下载失败:",
              filename,
              primaryError?.message || "未知错误",
              secondaryError?.message || "未知错误"
            );
            return false;
          }
        }
        log("二进制兜底下载失败:", filename, primaryError?.message || "未知错误");
        return false;
      }
    }
    async function downloadAllImages(urls, postId) {
      return downloadMediaItems(normalizeLegacyMediaItems(urls), postId);
    }
    async function downloadMediaItems(mediaItems, postId) {
      if (!mediaItems || mediaItems.length === 0) {
        if (ui2 && typeof ui2.showToast === "function") {
          ui2.showToast("未找到图片");
        }
        return;
      }
      const jobs = buildMediaDownloadJobs(mediaItems, postId);
      if (jobs.length === 0) {
        if (ui2 && typeof ui2.showToast === "function") {
          ui2.showToast("未找到图片");
        }
        return;
      }
      log(`开始下载 ${mediaItems.length} 个媒体项，共 ${jobs.length} 个文件...`);
      let successCount = 0;
      let failedCount = 0;
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        const success = await downloadImage(job.url, job.filename);
        if (success) {
          successCount++;
        } else {
          failedCount++;
        }
        if (i < jobs.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, config.DELAY_MS));
        }
      }
      let message = "";
      if (failedCount === 0) {
        message = jobs.length === mediaItems.length ? `已下载 ${jobs.length} 张图片` : `已下载 ${mediaItems.length} 个媒体项，共 ${jobs.length} 个文件`;
      } else if (successCount === 0) {
        message = `下载失败，共 ${failedCount} 个文件未完成`;
      } else {
        message = `已下载 ${successCount} 个文件，${failedCount} 个失败`;
      }
      log(message);
      if (ui2 && typeof ui2.showToast === "function") {
        ui2.showToast(message);
      }
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

  // src/ui.js
  function createUi({ config, utils: utils2, windowRef, documentRef, addStyle }) {
    const postMediaItemsCache = /* @__PURE__ */ new WeakMap();
    const platform = utils2.getPlatformAdapter();
    const resolvedMediaItemsCache = /* @__PURE__ */ new WeakMap();
    function showToast(message, duration = 3e3) {
      const existing = documentRef.getElementById("weibo-img-toast");
      if (existing) {
        existing.remove();
      }
      const toast = documentRef.createElement("div");
      toast.id = "weibo-img-toast";
      const closeBtn = documentRef.createElement("span");
      closeBtn.textContent = "×";
      closeBtn.className = "close-btn";
      closeBtn.onclick = () => toast.remove();
      const text = documentRef.createElement("span");
      text.textContent = message;
      toast.appendChild(text);
      toast.appendChild(closeBtn);
      documentRef.body.appendChild(toast);
      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.opacity = "0";
          toast.style.transition = "opacity 0.3s";
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }
    function findImagesInPost(container) {
      return platform.findImagesInPost(container);
    }
    function isVideoThumbnailImage(img) {
      if (typeof platform.isVideoThumbnailImage === "function") {
        return platform.isVideoThumbnailImage(img);
      }
      return false;
    }
    function getFallbackMediaItems(container) {
      if (typeof platform.getDomMediaItems === "function") {
        const platformMediaItems = platform.getDomMediaItems(container);
        if (Array.isArray(platformMediaItems)) {
          return platformMediaItems;
        }
      }
      const images = findImagesInPost(container);
      const seen = /* @__PURE__ */ new Set();
      const mediaItems = [];
      images.forEach((img) => {
        const url = utils2.getOriginalImageUrl(img.src);
        if (!url) {
          return;
        }
        const key = url.split("?")[0];
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        mediaItems.push({
          id: `dom-${mediaItems.length + 1}`,
          kind: "image",
          label: `图片 ${mediaItems.length + 1}`,
          imageUrl: url,
          videoUrl: null,
          imageExt: utils2.getFileExtensionFromUrl(url, ".jpg"),
          videoExt: ".mov"
        });
      });
      return mediaItems;
    }
    function getImageUrls(container) {
      return getFallbackMediaItems(container).map((item) => item.imageUrl);
    }
    function selectPreferredMediaItems(fallbackItems, resolvedMediaItems, apiResolved) {
      if (typeof platform.selectPreferredMediaItems === "function") {
        return platform.selectPreferredMediaItems(fallbackItems, resolvedMediaItems, apiResolved);
      }
      return fallbackItems;
    }
    function syncDownloadButtonState(btn, mediaItems) {
      if (!btn) {
        return;
      }
      if (!Array.isArray(mediaItems) || mediaItems.length === 0) {
        btn.remove();
        return;
      }
      btn.innerHTML = `↓${mediaItems.length}`;
    }
    async function resolvePostMediaItems(postContainer, initialFallbackItems = null) {
      if (resolvedMediaItemsCache.has(postContainer)) {
        return resolvedMediaItemsCache.get(postContainer);
      }
      const fallbackItems = initialFallbackItems || getFallbackMediaItems(postContainer);
      const mediaPromise = Promise.resolve(platform.resolvePostMediaItems(postContainer, fallbackItems));
      resolvedMediaItemsCache.set(postContainer, mediaPromise);
      return mediaPromise;
    }
    function getPostId(postContainer) {
      return platform.getPostId(postContainer);
    }
    function ensureImageSelectModalStyles() {
      if (documentRef.getElementById("weibo-img-select-modal-style")) {
        return;
      }
      if (typeof addStyle === "function") {
        addStyle();
      }
      const marker = documentRef.createElement("style");
      marker.id = "weibo-img-select-modal-style";
      marker.textContent = "";
      documentRef.head.appendChild(marker);
    }
    function getSelectionItemLabel(item, typeCounters) {
      const normalizedKind = item && item.kind ? item.kind : item && item.videoUrl ? "livephoto" : "image";
      const typeKey = normalizedKind === "livephoto" ? "livephoto" : normalizedKind === "gif" ? "gif" : normalizedKind === "video" ? "video" : "image";
      const labelPrefixMap = {
        image: "p",
        livephoto: "lp",
        gif: "a",
        video: "v"
      };
      typeCounters[typeKey] = (typeCounters[typeKey] || 0) + 1;
      return {
        text: `${labelPrefixMap[typeKey]}${typeCounters[typeKey]}`,
        typeKey
      };
    }
    function showImageSelectModal(mediaItems) {
      return new Promise((resolve) => {
        ensureImageSelectModalStyles();
        const overlay = documentRef.createElement("div");
        overlay.className = "weibo-img-select-overlay";
        const modal = documentRef.createElement("div");
        modal.className = "weibo-img-select-modal";
        const header = documentRef.createElement("div");
        header.className = "weibo-img-select-header";
        const toggleAllBtn = documentRef.createElement("button");
        toggleAllBtn.type = "button";
        toggleAllBtn.className = "weibo-img-select-toggle-btn";
        const headerTitle = documentRef.createElement("div");
        headerTitle.className = "weibo-img-select-header-title";
        headerTitle.textContent = `选择要下载的内容（共 ${mediaItems.length} 项）`;
        header.appendChild(toggleAllBtn);
        header.appendChild(headerTitle);
        const list = documentRef.createElement("div");
        list.className = "weibo-img-select-list";
        const typeCounters = {};
        mediaItems.forEach((item, index) => {
          const label = documentRef.createElement("label");
          label.className = "weibo-img-select-item";
          const input = documentRef.createElement("input");
          input.type = "checkbox";
          input.checked = true;
          input.value = String(index);
          const text = documentRef.createElement("span");
          const itemLabel = getSelectionItemLabel(item, typeCounters);
          if (itemLabel.typeKey === "video") {
            label.className = "weibo-img-select-item weibo-img-select-item-video";
          }
          text.className = itemLabel.typeKey === "video" ? "weibo-img-select-item-text weibo-img-select-item-text-video" : "weibo-img-select-item-text";
          text.textContent = itemLabel.text;
          label.title = item && item.label ? item.label : text.textContent;
          label.appendChild(input);
          label.appendChild(text);
          list.appendChild(label);
        });
        const actions = documentRef.createElement("div");
        actions.className = "weibo-img-select-actions";
        const cancelBtn = documentRef.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "weibo-img-select-btn weibo-img-select-btn-cancel";
        cancelBtn.textContent = "取消";
        const confirmBtn = documentRef.createElement("button");
        confirmBtn.type = "button";
        confirmBtn.className = "weibo-img-select-btn weibo-img-select-btn-confirm";
        confirmBtn.textContent = "下载所选";
        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        const getInputs = () => Array.from(list.querySelectorAll('input[type="checkbox"]'));
        const areAllChecked = () => {
          const inputs = getInputs();
          return inputs.length > 0 && inputs.every((input) => input.checked);
        };
        const updateToggleText = () => {
          toggleAllBtn.textContent = areAllChecked() ? "全不选" : "全选";
        };
        getInputs().forEach((input) => {
          input.addEventListener("change", updateToggleText);
        });
        toggleAllBtn.addEventListener("click", () => {
          const shouldCheckAll = !areAllChecked();
          getInputs().forEach((input) => {
            input.checked = shouldCheckAll;
          });
          updateToggleText();
        });
        updateToggleText();
        modal.appendChild(header);
        modal.appendChild(list);
        modal.appendChild(actions);
        overlay.appendChild(modal);
        const cleanup = () => {
          documentRef.removeEventListener("keydown", onKeyDown);
          overlay.removeEventListener("wheel", preventScroll, { passive: false });
          overlay.removeEventListener("touchmove", preventScroll, { passive: false });
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        };
        const closeWithResult = (result) => {
          cleanup();
          resolve(result);
        };
        const onKeyDown = (event) => {
          if (event.key === "Escape") {
            closeWithResult(null);
          }
        };
        cancelBtn.addEventListener("click", () => closeWithResult(null));
        confirmBtn.addEventListener("click", () => {
          const selected = Array.from(
            list.querySelectorAll('input[type="checkbox"]:checked')
          ).map((el) => Number(el.value));
          if (selected.length === 0) {
            showToast("请至少选择一项内容");
            return;
          }
          const selectedItems = selected.map((index) => mediaItems[index]).filter(Boolean);
          closeWithResult(selectedItems);
        });
        overlay.addEventListener("click", (event) => {
          if (event.target === overlay) {
            closeWithResult(null);
          }
        });
        const preventScroll = (event) => {
          event.preventDefault();
        };
        modal.addEventListener("click", (event) => {
          event.stopPropagation();
        });
        overlay.addEventListener("wheel", preventScroll, { passive: false });
        overlay.addEventListener("touchmove", preventScroll, { passive: false });
        documentRef.addEventListener("keydown", onKeyDown);
        documentRef.body.appendChild(overlay);
      });
    }
    function createDownloadButton(postContainer) {
      if (postContainer.querySelector(".weibo-img-download-btn")) {
        return null;
      }
      const initialMediaItems = getFallbackMediaItems(postContainer);
      const shouldResolveEmptyMediaItems = typeof platform.shouldResolveEmptyMediaItems === "function" && platform.shouldResolveEmptyMediaItems(postContainer);
      if (initialMediaItems.length === 0 && !shouldResolveEmptyMediaItems) {
        return null;
      }
      postMediaItemsCache.set(postContainer, initialMediaItems);
      const btn = documentRef.createElement("span");
      btn.className = "weibo-img-download-btn";
      btn.innerHTML = initialMediaItems.length > 0 ? `↓${initialMediaItems.length}` : "↓...";
      btn.title = "点击下载全部，长按选择下载；Live Photo 会同时下载 JPG 和 MOV";
      resolvePostMediaItems(postContainer, initialMediaItems).then((mediaItems) => {
        syncDownloadButtonState(btn, mediaItems);
      });
      let longPressTimer = null;
      let longPressTriggered = false;
      let suppressNextClick = false;
      const clearLongPressTimer = () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };
      const startDownload = async (targetMediaItems) => {
        const postId = getPostId(postContainer);
        await utils2.downloadMediaItems(targetMediaItems, postId);
      };
      btn.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (suppressNextClick) {
          suppressNextClick = false;
        }
      });
      btn.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        longPressTriggered = false;
        clearLongPressTimer();
        longPressTimer = setTimeout(async () => {
          longPressTriggered = true;
          suppressNextClick = true;
          clearLongPressTimer();
          const mediaItems = await resolvePostMediaItems(
            postContainer,
            postMediaItemsCache.get(postContainer) || initialMediaItems
          );
          const selectedMediaItems = await showImageSelectModal(mediaItems);
          if (selectedMediaItems && selectedMediaItems.length > 0) {
            startDownload(selectedMediaItems);
          }
        }, config.LONG_PRESS_MS);
      });
      btn.addEventListener("pointerup", async (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const wasLongPress = longPressTriggered;
        clearLongPressTimer();
        longPressTriggered = false;
        if (!wasLongPress) {
          const mediaItems = await resolvePostMediaItems(
            postContainer,
            postMediaItemsCache.get(postContainer) || initialMediaItems
          );
          await startDownload(mediaItems);
        }
      });
      btn.addEventListener("pointerleave", clearLongPressTimer);
      btn.addEventListener("pointercancel", clearLongPressTimer);
      return btn;
    }
    function injectDownloadButtons() {
      let postsAdded = 0;
      const selectors = platform.getPostSelectors();
      for (const selector of selectors) {
        const posts = documentRef.querySelectorAll(selector);
        posts.forEach((post) => {
          if (post.querySelector(".weibo-img-download-btn")) {
            return;
          }
          if (platform.shouldSkipPost(post)) {
            return;
          }
          const btn = createDownloadButton(post);
          if (!btn) {
            return;
          }
          const inserted = platform.insertDownloadButton({ post, btn, documentRef, windowRef });
          if (!inserted) {
            post.appendChild(btn);
          }
          postsAdded++;
        });
      }
      if (typeof platform.afterInjectDownloadButtons === "function") {
        platform.afterInjectDownloadButtons({ documentRef, windowRef });
      }
    }
    function getPostUrl(article) {
      if (typeof platform.getPostUrl === "function") {
        return platform.getPostUrl(article);
      }
      return null;
    }
    function injectGotoOriginalMenuItem(popMain, article) {
      if (typeof platform.injectGotoOriginalMenuItem === "function") {
        platform.injectGotoOriginalMenuItem(popMain, article, documentRef);
      }
    }
    function initPlatformObservers() {
      if (typeof platform.initObservers === "function") {
        platform.initObservers({ documentRef, windowRef });
      }
    }
    return {
      createDownloadButton,
      ensureImageSelectModalStyles,
      getPostUrl,
      initPlatformObservers,
      injectDownloadButtons,
      injectGotoOriginalMenuItem,
      isVideoThumbnailImage,
      selectPreferredMediaItems,
      showImageSelectModal,
      showToast,
      syncDownloadButtonState,
      getImageUrls,
      getWeiboPostUrl: getPostUrl,
      initGotoOriginalMenuObserver: initPlatformObservers,
      isWeiboVideoThumbnailImage: isVideoThumbnailImage,
      selectPreferredWeiboMediaItems: selectPreferredMediaItems
    };
  }

  // src/main.js
  var styleId = "weibo-image-downloader-style";
  var runtimeConfig = {
    ...CONFIG,
    ENABLE_VIDEO_DOWNLOAD: typeof GM_getValue === "function" ? Boolean(GM_getValue(CONFIG.VIDEO_DOWNLOAD_SETTING_KEY, CONFIG.ENABLE_VIDEO_DOWNLOAD)) : CONFIG.ENABLE_VIDEO_DOWNLOAD
  };
  function injectStyles() {
    if (document.getElementById(styleId)) {
      return;
    }
    if (typeof GM_addStyle === "function") {
      GM_addStyle(style_default);
      const marker = document.createElement("style");
      marker.id = styleId;
      marker.textContent = "";
      document.head.appendChild(marker);
      return;
    }
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = style_default;
    document.head.appendChild(style);
  }
  var ui;
  var utils = createUtils({
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
    }, 2e3);
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
    }, 5e3);
    ui.initPlatformObservers();
    utils.log(`${utils.getCurrentPlatformDisplayName()}图片批量下载器初始化完成！`);
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
    GM_registerMenuCommand(`视频下载：${runtimeConfig.ENABLE_VIDEO_DOWNLOAD ? "开启" : "关闭"}`, () => {
      const nextValue = !runtimeConfig.ENABLE_VIDEO_DOWNLOAD;
      if (typeof GM_setValue === "function") {
        GM_setValue(CONFIG.VIDEO_DOWNLOAD_SETTING_KEY, nextValue);
      }
      runtimeConfig.ENABLE_VIDEO_DOWNLOAD = nextValue;
      if (ui) {
        ui.showToast(`视频下载已${nextValue ? "开启" : "关闭"}，刷新页面后生效`);
      }
    });
  }
})();
