export function createUi({ config, utils, windowRef, documentRef, addStyle }) {
    let postMediaItemsCache = new WeakMap();
    const platform = utils.getPlatformAdapter();
    let resolvedMediaItemsCache = new WeakMap();

    function showToast(message, duration = 3000) {
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
        const seen = new Set();
        const mediaItems = [];

        images.forEach((img) => {
            const url = utils.getOriginalImageUrl(img.src);
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
                imageExt: utils.getFileExtensionFromUrl(url, ".jpg"),
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
        const normalizedKind = item && item.kind ? item.kind : (item && item.videoUrl ? "livephoto" : "image");
        const typeKey = normalizedKind === "livephoto"
            ? "livephoto"
            : (normalizedKind === "gif" ? "gif" : (normalizedKind === "video" ? "video" : "image"));
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
                text.className = itemLabel.typeKey === "video"
                    ? "weibo-img-select-item-text weibo-img-select-item-text-video"
                    : "weibo-img-select-item-text";
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

                const selectedItems = selected
                    .map((index) => mediaItems[index])
                    .filter(Boolean);

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
        const shouldResolveEmptyMediaItems = typeof platform.shouldResolveEmptyMediaItems === "function" &&
            platform.shouldResolveEmptyMediaItems(postContainer);
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
            await utils.downloadMediaItems(targetMediaItems, postId);
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

    function refreshDownloadButtons() {
        postMediaItemsCache = new WeakMap();
        resolvedMediaItemsCache = new WeakMap();

        documentRef.querySelectorAll(".weibo-img-download-btn").forEach((btn) => {
            btn.remove();
        });

        injectDownloadButtons();
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
        refreshDownloadButtons,
        getImageUrls,
        getWeiboPostUrl: getPostUrl,
        initGotoOriginalMenuObserver: initPlatformObservers,
        isWeiboVideoThumbnailImage: isVideoThumbnailImage,
        selectPreferredWeiboMediaItems: selectPreferredMediaItems
    };
}
