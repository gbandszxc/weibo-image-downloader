export function createXPlatform({ windowRef, log }) {
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
            if (name === "orig" || name === "large") {
                return fullUrl;
            }
            urlObj.searchParams.delete("name");
            urlObj.searchParams.set("name", "orig");
            return urlObj.toString();
        } catch {
            if (url.includes("name=orig") || url.includes("name=large")) {
                return url;
            }
            return url.replace(/name=[^&]*/, "name=orig");
        }
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

    function isDetailPage() {
        const path = windowRef.location.pathname;
        return /\/[\w_]+\/status\/\d+/.test(path);
    }

    function insertDownloadButton({ post, btn }) {
        if (isDetailPage()) {
            const usernameEl = post.querySelector('[data-testid="User-Name"]');
            if (usernameEl) {
                const parent = usernameEl.parentElement;
                if (parent && parent.parentNode) {
                    parent.parentNode.insertBefore(btn, parent.nextSibling);
                    return true;
                }
            }
        } else {
            const timeEl = post.querySelector("time");
            if (timeEl) {
                const timeParent = timeEl.parentElement;
                if (timeParent && timeParent.nextElementSibling && timeParent.parentNode) {
                    timeParent.parentNode.insertBefore(btn, timeParent.nextElementSibling);
                    return true;
                }
                if (timeParent && timeParent.parentNode) {
                    timeParent.parentNode.insertBefore(btn, timeParent.nextSibling);
                    return true;
                }
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
