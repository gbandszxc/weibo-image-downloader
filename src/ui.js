export function createUi({ config, utils, windowRef, documentRef, addStyle }) {
    const postMediaItemsCache = new WeakMap();

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
        const images = [];

        if (utils.isX()) {
            return findXImagesInPost(container);
        }

        const selectors = config.IMG_SELECTORS;
        for (const selector of selectors) {
            try {
                const elements = container.querySelectorAll(selector);
                elements.forEach((img) => {
                    if (!img.src) {
                        return;
                    }

                    if (utils.isWeibo()) {
                        if (utils.isAvatarImage(img.src)) {
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
                        if (isWeiboVideoThumbnailImage(img)) {
                            return;
                        }
                    }

                    images.push(img);
                });
            } catch (error) {
                utils.log("findImagesInPost selector error:", error.message);
            }
        }

        return images;
    }

    function isWeiboVideoThumbnailImage(img) {
        if (!img || typeof img.closest !== "function") {
            return false;
        }

        const pictureMain = img.closest(".woo-picture-main");
        if (!pictureMain || typeof pictureMain.querySelector !== "function") {
            return false;
        }

        return !!pictureMain.querySelector('[class*="_videotime_"], [class*="_videobox_"], .woo-font--play');
    }

    function findXImagesInPost(container) {
        const images = [];
        const seen = new Set();
        const selectors = config.X_CONFIG.IMG_SELECTORS;

        for (const selector of selectors) {
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
                utils.log("findXImagesInPost selector error:", error.message);
            }
        }

        return images;
    }

    function isMainTweet(container) {
        if (!utils.isX()) {
            return true;
        }

        const article = container.closest('article[data-testid="tweet"]');
        if (!article) {
            return false;
        }

        const timeEl = article.querySelector("time");
        return timeEl !== null;
    }

    function isDetailPage() {
        if (!utils.isX()) {
            return false;
        }

        const path = windowRef.location.pathname;
        return /\/[\w_]+\/status\/\d+/.test(path);
    }

    function getFallbackMediaItems(container) {
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

        utils.log(`DOM兜底找到 ${mediaItems.length} 张图片`);
        return mediaItems;
    }

    function getImageUrls(container) {
        return getFallbackMediaItems(container).map((item) => item.imageUrl);
    }

    function selectPreferredWeiboMediaItems(fallbackItems, resolvedMediaItems, apiResolved) {
        return apiResolved ? resolvedMediaItems : fallbackItems;
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

    function getWeiboStatusLookupId(postContainer) {
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

    async function resolvePostMediaItems(postContainer) {
        if (postMediaItemsCache.has(postContainer)) {
            return postMediaItemsCache.get(postContainer);
        }

        const fallbackItems = getFallbackMediaItems(postContainer);
        const mediaPromise = (async () => {
            if (!utils.isWeibo()) {
                return fallbackItems;
            }

            const statusId = getWeiboStatusLookupId(postContainer);
            if (!statusId) {
                return fallbackItems;
            }

            try {
                const weiboMediaItems = await utils.getWeiboMediaItemsById(statusId);
                utils.log(`微博接口找到 ${weiboMediaItems.length} 个媒体项: ${statusId}`);
                return selectPreferredWeiboMediaItems(fallbackItems, weiboMediaItems, true);
            } catch (error) {
                utils.log("微博接口解析失败，回退DOM:", error.message);
            }

            return selectPreferredWeiboMediaItems(fallbackItems, [], false);
        })();

        postMediaItemsCache.set(postContainer, mediaPromise);
        return mediaPromise;
    }

    function getPostId(postContainer) {
        let postId;
        if (utils.isX()) {
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
            postId = postId || `x_${Date.now()}`;
        } else {
            postId = postContainer.getAttribute("mid") ||
                postContainer.getAttribute("data-mid") ||
                `weibo_${Date.now()}`;
        }

        return postId;
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
            mediaItems.forEach((item, index) => {
                const label = documentRef.createElement("label");
                label.className = "weibo-img-select-item";

                const input = documentRef.createElement("input");
                input.type = "checkbox";
                input.checked = true;
                input.value = String(index);

                const text = documentRef.createElement("span");
                text.textContent = item.label || (item.videoUrl ? `Live Photo ${index + 1}` : `图片 ${index + 1}`);

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
        if (initialMediaItems.length === 0) {
            return null;
        }

        utils.log(`创建按钮: ${initialMediaItems.length} 个媒体项`);

        const btn = documentRef.createElement("span");
        btn.className = "weibo-img-download-btn";
        btn.innerHTML = `↓${initialMediaItems.length}`;
        btn.title = "点击下载全部，长按选择下载；Live Photo 会同时下载 JPG 和 MOV";

        if (utils.isWeibo()) {
            resolvePostMediaItems(postContainer).then((mediaItems) => {
                syncDownloadButtonState(btn, mediaItems);
            });
        }

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
                const mediaItems = await resolvePostMediaItems(postContainer);
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
                const mediaItems = await resolvePostMediaItems(postContainer);
                await startDownload(mediaItems);
            }
        });

        btn.addEventListener("pointerleave", clearLongPressTimer);
        btn.addEventListener("pointercancel", clearLongPressTimer);

        return btn;
    }

    function injectDownloadButtons() {
        let postsAdded = 0;
        const selectors = utils.isX() ? config.X_CONFIG.POST_SELECTORS : config.POST_SELECTORS;

        for (const selector of selectors) {
            const posts = documentRef.querySelectorAll(selector);
            posts.forEach((post) => {
                if (post.querySelector(".weibo-img-download-btn")) {
                    return;
                }

                if (utils.isX() && !isMainTweet(post)) {
                    return;
                }

                const btn = createDownloadButton(post);
                if (!btn) {
                    return;
                }

                let inserted = false;

                if (utils.isX()) {
                    if (isDetailPage()) {
                        const usernameEl = post.querySelector('[data-testid="User-Name"]');
                        if (usernameEl) {
                            const parent = usernameEl.parentElement;
                            if (parent && parent.parentNode) {
                                parent.parentNode.insertBefore(btn, parent.nextSibling);
                                postsAdded++;
                                inserted = true;
                                utils.log("X详情页：按钮插入到用户名区域右侧");
                            }
                        }
                    } else {
                        const timeEl = post.querySelector("time");
                        if (timeEl) {
                            const timeParent = timeEl.parentElement;
                            if (timeParent && timeParent.nextElementSibling && timeParent.parentNode) {
                                timeParent.parentNode.insertBefore(btn, timeParent.nextElementSibling);
                                postsAdded++;
                                inserted = true;
                                utils.log("X时间线：按钮插入到时间右边");
                            } else if (timeParent && timeParent.parentNode) {
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
                            utils.log("X平台：按钮插入到操作按钮组之前");
                        }
                    }
                } else {
                    if (!inserted && utils.isSearchPage()) {
                        const infoEl = post.querySelector(".content .info");
                        if (infoEl) {
                            const nameDiv = Array.from(infoEl.children).find((el) => !el.classList.contains("menu"));
                            if (nameDiv) {
                                nameDiv.style.display = "flex";
                                nameDiv.style.alignItems = "center";
                                nameDiv.style.gap = "4px";
                                nameDiv.appendChild(btn);
                                postsAdded++;
                                inserted = true;
                                utils.log("搜索页：按钮插入到作者名行末尾");
                            }
                        }
                    }

                    const retweetSpan = Array.from(post.querySelectorAll("span")).find((el) =>
                        el.textContent.trim() === "转发微博"
                    );
                    if (retweetSpan && retweetSpan.parentNode) {
                        retweetSpan.parentNode.insertBefore(btn, retweetSpan.nextSibling);
                        postsAdded++;
                        inserted = true;
                        utils.log('微博：按钮插入到"转发微博"文字后面');
                    }

                    if (!inserted) {
                        const suffixBox = post.querySelector('div[class*="_suffixbox"]');
                        if (suffixBox) {
                            suffixBox.appendChild(btn);
                            postsAdded++;
                            inserted = true;
                            utils.log("微博：按钮插入到用户名/超话标签右侧");
                        }
                    }

                    if (!inserted) {
                        const iconsPlusEl = post.querySelector('div[class*="_iconsPlus_"]');
                        if (iconsPlusEl && iconsPlusEl.parentNode) {
                            iconsPlusEl.parentNode.insertBefore(btn, iconsPlusEl);
                            postsAdded++;
                            inserted = true;
                            utils.log("微博：按钮插入到 iconsPlus 之前");
                        }
                    }

                    if (!inserted) {
                        for (const headerSelector of config.HEADER_SELECTORS) {
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
            utils.log(`成功注入 ${postsAdded} 个下载按钮`);
        }

        if (utils.isSearchPage()) {
            injectSearchPageGotoOriginal();
        }
    }

    function getWeiboPostUrl(article) {
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

    function injectGotoOriginalMenuItem(popMain, article) {
        if (!popMain || popMain.dataset.gotoInjected) {
            return;
        }

        const postUrl = getWeiboPostUrl(article);
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
        utils.log(`已注入"跳转原文"菜单项: ${postUrl}`);
    }

    function injectSearchPageGotoOriginal() {
        documentRef.querySelectorAll('div[action-type="feed_list_item"]').forEach((post) => {
            const menuUl = post.querySelector('ul[node-type="fl_menu_right"]');
            if (!menuUl || menuUl.dataset.gotoInjected) {
                return;
            }

            const postUrl = getWeiboPostUrl(post);
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
            utils.log(`搜索页：已注入"跳转原文"菜单项: ${postUrl}`);
        });
    }

    function initGotoOriginalMenuObserver() {
        if (!utils.isWeibo()) {
            return;
        }

        const MutationObserverRef = windowRef.MutationObserver || MutationObserver;
        const menuObserver = new MutationObserverRef((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (!(node instanceof Element)) {
                        continue;
                    }

                    if (node.classList.contains("woo-pop-main")) {
                        const article = node.closest("article");
                        if (article) {
                            const hasShare = node.textContent.includes("分享");
                            if (hasShare) {
                                injectGotoOriginalMenuItem(node, article);
                            }
                        }
                    }
                }
            }
        });

        menuObserver.observe(documentRef.body, { childList: true, subtree: true });
    }

    return {
        createDownloadButton,
        ensureImageSelectModalStyles,
        getWeiboPostUrl,
        initGotoOriginalMenuObserver,
        injectDownloadButtons,
        injectGotoOriginalMenuItem,
        isWeiboVideoThumbnailImage,
        selectPreferredWeiboMediaItems,
        showImageSelectModal,
        showToast,
        syncDownloadButtonState,
        getImageUrls
    };
}
