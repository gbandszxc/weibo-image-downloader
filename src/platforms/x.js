export function createXPlatform({ config = {}, windowRef, log, getFileExtensionFromUrl }) {
    const imageSelectors = ['article img[src*="twimg.com"]'];
    const postSelectors = ['article[data-testid="tweet"]'];
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

        return node.closest('[data-testid="videoComponent"]') ||
            node.closest('[data-testid="videoPlayer"]') ||
            node.closest("[data-testid]");
    }

    function isGifVideo(video) {
        const container = getVideoMediaContainer(video);
        const text = container?.textContent || "";
        return /\bGIF\b/i.test(text);
    }

    function isVideoDownloadEnabled() {
        return !!config.ENABLE_VIDEO_DOWNLOAD;
    }

    function findImagesInPost(container) {
        const images = [];
        const seen = new Set();

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
        const seen = new Set();

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

            const mediaCount = mediaItems.filter((item) => item.kind === kind).length + 1;
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
        return fallbackItems;
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

        return postId || `x_${Date.now()}`;
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
        resolvePostMediaItems,
        getPostSelectors,
        shouldSkipPost,
        getPostId,
        insertDownloadButton,
        afterInjectDownloadButtons() {},
        initObservers() {}
    };
}
