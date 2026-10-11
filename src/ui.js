const SELECTION_LABEL_PREFIXES = {
    image: "p",
    livephoto: "lp",
    gif: "a",
    video: "v"
};

export function createUi({ config, utils, windowRef, documentRef, addStyle }) {
    const platform = utils.getPlatformAdapter();
    let resolvedMediaItemsCache = new WeakMap();
    const resolveFailureCooldowns = new WeakMap();
    const buttonDetails = new WeakMap();
    const postDownloads = new Map();
    const downloadButtonTitle = "点击下载全部，长按选择下载；Live Photo 会同时下载 JPG 和 MOV";

    function showToast(message, duration = 3000) {
        const existing = documentRef.getElementById("weibo-img-toast");
        if (existing) {
            existing.remove();
        }

        const toast = documentRef.createElement("div");
        toast.id = "weibo-img-toast";
        toast.role = "status";
        toast.ariaLive = "polite";

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

        const details = buttonDetails.get(btn);
        if (details) {
            details.count = mediaItems.length;
            renderDownloadButton(btn);
        } else {
            btn.innerHTML = `↓${mediaItems.length}`;
        }
    }

    function renderDownloadButton(btn) {
        const details = buttonDetails.get(btn);
        const { postId, count } = details;
        const status = postDownloads.get(postId)?.status || "idle";
        const labels = {
            selecting: "选择中",
            downloading: "下载中",
            completed: "完成",
            failed: "失败",
            started: "已发起"
        };
        const busy = status === "downloading" || status === "selecting";
        const label = labels[status] || (count > 0 ? `↓${count}` : "↓...");
        const labelChanged = btn.innerHTML !== label;
        const previousWidth = labelChanged && btn.isConnected ? btn.getBoundingClientRect().width : 0;
        if (labelChanged) {
            details.animation?.cancel();
            // 标签未变化时不动 DOM，避免触发 MutationObserver 造成注入循环。
            btn.innerHTML = label;
        }
        btn.disabled = busy;
        btn.setAttribute("data-download-state", status);
        btn.setAttribute("aria-busy", String(busy));
        btn.title = status === "started" ? "已发起下载，请查看浏览器下载列表"
            : (status === "failed" ? "下载失败，请重试"
                : (labels[status] ? `${labels[status]}${busy ? "，请稍候" : ""}` : downloadButtonTitle));
        btn.setAttribute("aria-label", labels[status] ? btn.title : `下载 ${count} 个媒体项；${downloadButtonTitle}`);
        if (previousWidth > 0 && typeof btn.animate === "function" &&
            !windowRef.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
            const nextWidth = btn.getBoundingClientRect().width;
            if (previousWidth !== nextWidth) {
                // 限定实际宽度，避免拉伸文字；中途切换状态时从当前宽度继续。
                details.animation = btn.animate([
                    { minWidth: `${previousWidth}px`, maxWidth: `${previousWidth}px` },
                    { minWidth: `${nextWidth}px`, maxWidth: `${nextWidth}px` }
                ], { duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
            }
        }
    }

    function refreshPostDownloadState(postId) {
        documentRef.querySelectorAll(".weibo-img-download-btn").forEach((btn) => {
            if (buttonDetails.get(btn)?.postId === postId) {
                renderDownloadButton(btn);
            }
        });
    }

    // X 详情页等场景媒体是渐进挂载的，只有 DOM 快照变化时才能重新解析，
    // 否则缓存会让按钮计数和下载内容停留在注入瞬间的状态。
    function getMediaItemsFingerprint(fallbackItems, postContainer) {
        const needsApiResolve = typeof platform.shouldResolveEmptyMediaItems === "function" &&
            platform.shouldResolveEmptyMediaItems(postContainer);
        const items = Array.isArray(fallbackItems) ? fallbackItems : [];
        return `${needsApiResolve ? "api" : "dom"}:${items.map((item) =>
            `${item && item.kind ? item.kind : "image"}:${((item && (item.imageUrl || item.videoUrl)) || "").split("?")[0]}`
        ).join("|")}`;
    }

    function resolvePostMediaItems(postContainer, initialFallbackItems = null) {
        const fallbackItems = initialFallbackItems || getFallbackMediaItems(postContainer);
        const fingerprint = getMediaItemsFingerprint(fallbackItems, postContainer);
        const cached = resolvedMediaItemsCache.get(postContainer);
        if (cached && cached.fingerprint === fingerprint) {
            return cached.promise;
        }

        const cooldowns = resolveFailureCooldowns.get(postContainer);
        if (cooldowns && Date.now() - (cooldowns.get(fingerprint) || 0) < config.MEDIA_RESOLVE_RETRY_COOLDOWN_MS) {
            return Promise.resolve(fallbackItems);
        }

        const mediaPromise = Promise.resolve(platform.resolvePostMediaItems(postContainer, fallbackItems)).catch((error) => {
            const current = resolvedMediaItemsCache.get(postContainer);
            if (current?.promise === mediaPromise) {
                resolvedMediaItemsCache.delete(postContainer);
                const cooldownMap = resolveFailureCooldowns.get(postContainer) || new Map();
                cooldownMap.set(fingerprint, Date.now());
                resolveFailureCooldowns.set(postContainer, cooldownMap);
            }
            throw error;
        });
        resolvedMediaItemsCache.set(postContainer, { fingerprint, promise: mediaPromise });
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
        typeCounters[typeKey] = (typeCounters[typeKey] || 0) + 1;
        return {
            text: `${SELECTION_LABEL_PREFIXES[typeKey]}${typeCounters[typeKey]}`,
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

    function insertDownloadButtonIntoPost(post, btn) {
        if (!btn) {
            return;
        }

        const inserted = platform.insertDownloadButton({ post, btn, documentRef, windowRef });
        if (!inserted) {
            post.appendChild(btn);
        }
    }

    function buildDownloadButton(postContainer, initialMediaItems, resolvedPromise = null) {
        const btn = documentRef.createElement("button");
        btn.type = "button";
        btn.className = "weibo-img-download-btn";
        const postId = getPostId(postContainer);
        buttonDetails.set(btn, { postId, count: initialMediaItems.length });
        renderDownloadButton(btn);

        const syncPromise = resolvedPromise || resolvePostMediaItems(postContainer, initialMediaItems);
        syncPromise.then((mediaItems) => {
            syncDownloadButtonState(btn, mediaItems);
        }).catch((error) => {
            utils.log("媒体解析失败:", error.message);
        });

        let longPressTimer = null;
        let longPressTriggered = false;

        const clearLongPressTimer = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        const startDownload = async (selectMedia = false) => {
            const current = postDownloads.get(postId);
            if (current?.status === "downloading" || current?.status === "selecting") {
                return;
            }
            const task = { status: selectMedia ? "selecting" : "downloading" };
            postDownloads.set(postId, task);
            renderDownloadButton(btn);
            refreshPostDownloadState(postId);
            try {
                // 下载时重新扫描 DOM，避免使用按钮创建瞬间的过期媒体列表。
                let mediaItems = await resolvePostMediaItems(postContainer, getFallbackMediaItems(postContainer));
                if (selectMedia) {
                    mediaItems = await showImageSelectModal(mediaItems);
                    if (!mediaItems || mediaItems.length === 0) {
                        postDownloads.delete(postId);
                        renderDownloadButton(btn);
                        refreshPostDownloadState(postId);
                        return;
                    }
                    task.status = "downloading";
                    renderDownloadButton(btn);
                    refreshPostDownloadState(postId);
                }
                const result = await utils.downloadMediaItems(mediaItems, postId);
                task.status = !result || result.failedCount > 0 || result.successCount === 0
                    ? "failed" : (result.handedOffCount > 0 ? "started" : "completed");
            } catch (error) {
                utils.log("下载失败:", error.message);
                task.status = "failed";
                showToast("下载失败，请重试");
            } finally {
                if (postDownloads.get(postId) === task) {
                    renderDownloadButton(btn);
                    refreshPostDownloadState(postId);
                    setTimeout(() => {
                        if (postDownloads.get(postId) === task) {
                            postDownloads.delete(postId);
                            renderDownloadButton(btn);
                            refreshPostDownloadState(postId);
                        }
                    }, 1200);
                }
            }
        };

        btn.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            event.stopPropagation();
        });

        btn.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.detail === 0) {
                startDownload();
            }
        });

        btn.addEventListener("pointerdown", (event) => {
            if (event.pointerType === "mouse" && event.button !== 0) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            if (btn.disabled) {
                return;
            }
            longPressTriggered = false;
            clearLongPressTimer();
            longPressTimer = setTimeout(() => {
                longPressTriggered = true;
                clearLongPressTimer();
                startDownload(true);
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
                await startDownload();
            }
        });

        btn.addEventListener("pointerleave", clearLongPressTimer);
        btn.addEventListener("pointercancel", clearLongPressTimer);

        return btn;
    }

    function createDownloadButton(postContainer) {
        if (postContainer.querySelector(".weibo-img-download-btn")) {
            return null;
        }

        const initialMediaItems = getFallbackMediaItems(postContainer);
        if (initialMediaItems.length > 0) {
            return buildDownloadButton(postContainer, initialMediaItems);
        }

        const shouldResolveEmptyMediaItems = typeof platform.shouldResolveEmptyMediaItems === "function" &&
            platform.shouldResolveEmptyMediaItems(postContainer);
        if (!shouldResolveEmptyMediaItems) {
            return null;
        }

        // DOM 中没有媒体时是否真有内容（如仅视频帖）需接口确认，确认非空后再插入按钮，
        // 避免按钮先以空计数闪现、解析为空后又被移除。
        resolvePostMediaItems(postContainer, initialMediaItems).then((mediaItems) => {
            if (!Array.isArray(mediaItems) || mediaItems.length === 0 ||
                postContainer.querySelector(".weibo-img-download-btn")) {
                return;
            }

            insertDownloadButtonIntoPost(postContainer, buildDownloadButton(postContainer, mediaItems, Promise.resolve(mediaItems)));
        }).catch((error) => {
            utils.log("媒体解析失败:", error.message);
        });
        return null;
    }

    function syncExistingButtonMedia(post, btn) {
        resolvePostMediaItems(post, getFallbackMediaItems(post)).then((mediaItems) => {
            if (btn.parentNode) {
                syncDownloadButtonState(btn, mediaItems);
            }
        }).catch((error) => {
            utils.log("媒体刷新失败:", error.message);
        });
    }

    function injectDownloadButtons() {
        const selectors = platform.getPostSelectors();

        for (const selector of selectors) {
            const posts = documentRef.querySelectorAll(selector);
            posts.forEach((post) => {
                const existingBtn = post.querySelector(".weibo-img-download-btn");
                if (existingBtn) {
                    // 媒体元素可能晚于首次注入挂载（如 X 详情页渐进加载），周期性校正计数与内容。
                    syncExistingButtonMedia(post, existingBtn);
                    return;
                }

                if (platform.shouldSkipPost(post)) {
                    return;
                }

                const btn = createDownloadButton(post);
                if (!btn) {
                    return;
                }

                insertDownloadButtonIntoPost(post, btn);
            });
        }

        if (typeof platform.afterInjectDownloadButtons === "function") {
            platform.afterInjectDownloadButtons({ documentRef, windowRef });
        }
    }

    function refreshDownloadButtons() {
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
