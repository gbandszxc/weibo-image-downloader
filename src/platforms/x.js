export function createXPlatform({ config = {}, windowRef, fetchRef, log, getFileExtensionFromUrl }) {
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

    function getCookieValue(name) {
        const cookie = windowRef.document && windowRef.document.cookie;
        if (!cookie || typeof cookie !== "string") {
            return "";
        }

        const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
        return match ? decodeURIComponent(match[1]) : "";
    }

    function getBestXVideoVariant(variants) {
        const candidates = (Array.isArray(variants) ? variants : [])
            .filter((variant) => variant &&
                variant.content_type === "video/mp4" &&
                typeof variant.url === "string" &&
                variant.url)
            .sort((a, b) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0));

        return candidates.length > 0 ? candidates[0].url : null;
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
        if (!isVideoDownloadEnabled() || fallbackItems.length > 0) {
            return fallbackItems;
        }

        const statusId = getPostId(_postContainer);
        if (!statusId) {
            return fallbackItems;
        }

        return getXMediaItemsById(statusId).then((mediaItems) =>
            mediaItems.length > 0 ? mediaItems : fallbackItems
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

        const links = typeof postContainer.querySelectorAll === "function"
            ? postContainer.querySelectorAll('a[href*="/status/"]')
            : [];
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
        return isVideoDownloadEnabled() && /^\d+$/.test(getPostId(postContainer));
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
        const media = status &&
            status.data &&
            status.data.tweetResult &&
            status.data.tweetResult.result &&
            status.data.tweetResult.result.legacy &&
            status.data.tweetResult.result.legacy.extended_entities &&
            Array.isArray(status.data.tweetResult.result.legacy.extended_entities.media)
            ? status.data.tweetResult.result.legacy.extended_entities.media
            : [];

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
        afterInjectDownloadButtons() {},
        initObservers() {}
    };
}
