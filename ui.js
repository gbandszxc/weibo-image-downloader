// ==UserScript==
// @name         Weibo Image Downloader - UI
// @version      1.3.2
// ==/UserScript==

(function(global) {
    'use strict';

    var WID_UI = {};
    const postMediaItemsCache = new WeakMap();

    // ==================== Toast 提示 ====================

    function showToast(message, duration = 3000) {
        const existing = document.getElementById('weibo-img-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'weibo-img-toast';

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.className = 'close-btn';
        closeBtn.onclick = () => toast.remove();

        const text = document.createElement('span');
        text.textContent = message;

        toast.appendChild(text);
        toast.appendChild(closeBtn);
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }

    WID_UI.showToast = showToast;

    // ==================== DOM操作 ====================

    /**
     * 查找帖子中的所有图片元素
     */
    function findImagesInPost(container) {
        const images = [];

        if (WID_UTILS.isX()) {
            return findXImagesInPost(container);
        }

        const selectors = WID_CONFIG.IMG_SELECTORS;

        for (const selector of selectors) {
            try {
                const elements = container.querySelectorAll(selector);
                elements.forEach(img => {
                    if (!img.src) return;

                    if (WID_UTILS.isWeibo()) {
                        if (WID_UTILS.isAvatarImage(img.src)) return;
                        if (img.src.includes('default_avatar')) return;
                        if (img.src.includes('h5.sinaimg.cn')) return; // 过滤徽章/图标
                        if (!img.src.includes('sinaimg') && !img.src.includes('sina.cn')) return;
                    }

                    images.push(img);
                });
            } catch (e) { WID_UTILS.log('findImagesInPost selector error:', e.message); }
        }

        return images;
    }

    function findXImagesInPost(container) {
        const images = [];
        const seen = new Set();

        const selectors = WID_CONFIG.X_CONFIG.IMG_SELECTORS;

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
            } catch (e) { WID_UTILS.log('findXImagesInPost selector error:', e.message); }
        }

        return images;
    }

    function isMainTweet(container) {
        if (!WID_UTILS.isX()) return true;

        const article = container.closest('article[data-testid="tweet"]');
        if (!article) return false;

        const timeEl = article.querySelector('time');

        return timeEl !== null;
    }

    function isDetailPage() {
        if (!WID_UTILS.isX()) return false;

        const path = window.location.pathname;
        return /\/[\w_]+\/status\/\d+/.test(path);
    }

    /**
     * 获取所有图片URL - 正确去重
     */
    function getFallbackMediaItems(container) {
        const images = findImagesInPost(container);
        const seen = new Set();
        const mediaItems = [];

        images.forEach(img => {
            let url = WID_UTILS.getOriginalImageUrl(img.src);
            if (url) {
                const key = url.split('?')[0];
                if (!seen.has(key)) {
                    seen.add(key);
                    mediaItems.push({
                        id: `dom-${mediaItems.length + 1}`,
                        kind: 'image',
                        label: `图片 ${mediaItems.length + 1}`,
                        imageUrl: url,
                        videoUrl: null,
                        imageExt: WID_UTILS.getFileExtensionFromUrl(url, '.jpg'),
                        videoExt: '.mov'
                    });
                }
            }
        });

        WID_UTILS.log(`DOM兜底找到 ${mediaItems.length} 张图片`);
        return mediaItems;
    }

    function getImageUrls(container) {
        return getFallbackMediaItems(container).map((item) => item.imageUrl);
    }

    function getWeiboStatusLookupId(postContainer) {
        const mid = postContainer.getAttribute('mid') || postContainer.getAttribute('data-mid');
        if (mid) {
            return mid;
        }

        const links = postContainer.querySelectorAll('a[href]');
        for (const link of links) {
            const href = link.href || '';
            const match = href.match(/weibo\.com\/(?:u\/)?\d+\/([A-Za-z0-9]+)/);
            if (match && !href.includes('/u/')) {
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
            if (!WID_UTILS.isWeibo()) {
                return fallbackItems;
            }

            const statusId = getWeiboStatusLookupId(postContainer);
            if (!statusId) {
                return fallbackItems;
            }

            try {
                const weiboMediaItems = await WID_UTILS.getWeiboMediaItemsById(statusId);
                if (weiboMediaItems.length > 0) {
                    WID_UTILS.log(`微博接口找到 ${weiboMediaItems.length} 个媒体项: ${statusId}`);
                    return weiboMediaItems;
                }
            } catch (error) {
                WID_UTILS.log('微博接口解析失败，回退DOM:', error.message);
            }

            return fallbackItems;
        })();

        postMediaItemsCache.set(postContainer, mediaPromise);
        return mediaPromise;
    }

    function getPostId(postContainer) {
        let postId;
        if (WID_UTILS.isX()) {
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

        return postId;
    }

    // ==================== 图片选择弹窗 ====================

    function ensureImageSelectModalStyles() {
        if (document.getElementById('weibo-img-select-modal-style')) {
            return;
        }

        const css = `
            .weibo-img-select-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.16);
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                box-sizing: border-box;
            }
            .weibo-img-select-modal {
                width: 100%;
                max-width: 420px;
                max-height: 80vh;
                background: #fff;
                border-radius: 8px;
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
            .weibo-img-select-header {
                padding: 14px 16px;
                border-bottom: 1px solid #eee;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
            }
            .weibo-img-select-header-title {
                font-size: 15px;
                font-weight: 600;
                color: #222;
            }
            .weibo-img-select-toggle-btn {
                height: 28px;
                padding: 0 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
                background: #fff;
                color: #333;
                font-size: 12px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                line-height: 1;
                cursor: pointer;
                box-sizing: border-box;
                white-space: nowrap;
            }
            .weibo-img-select-list {
                padding: 12px 16px;
                overflow: auto;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                gap: 10px;
            }
            .weibo-img-select-item {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 8px;
                border: 1px solid #eee;
                border-radius: 6px;
                user-select: none;
                font-size: 14px;
                color: #333;
            }
            .weibo-img-select-actions {
                padding: 12px 16px;
                border-top: 1px solid #eee;
                display: flex;
                justify-content: flex-end;
                gap: 8px;
            }
            .weibo-img-select-btn {
                min-width: 90px;
                height: 32px;
                padding: 0 12px;
                border-radius: 4px;
                border: 1px solid transparent;
                font-size: 13px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                line-height: 1;
                box-sizing: border-box;
            }
            .weibo-img-select-modal button {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                vertical-align: middle;
            }
            .weibo-img-select-btn-cancel {
                background: #fff;
                border-color: #ccc;
                color: #333;
            }
            .weibo-img-select-btn-confirm {
                background: #ff8200;
                color: #fff;
            }
        `;

        if (typeof GM_addStyle === 'function') {
            GM_addStyle(css);
        } else {
            const style = document.createElement('style');
            style.id = 'weibo-img-select-modal-style';
            style.textContent = css;
            document.head.appendChild(style);
            return;
        }

        const marker = document.createElement('style');
        marker.id = 'weibo-img-select-modal-style';
        marker.textContent = '';
        document.head.appendChild(marker);
    }

    function showImageSelectModal(mediaItems) {
        return new Promise((resolve) => {
            ensureImageSelectModalStyles();

            const overlay = document.createElement('div');
            overlay.className = 'weibo-img-select-overlay';

            const modal = document.createElement('div');
            modal.className = 'weibo-img-select-modal';

            const header = document.createElement('div');
            header.className = 'weibo-img-select-header';
            const toggleAllBtn = document.createElement('button');
            toggleAllBtn.type = 'button';
            toggleAllBtn.className = 'weibo-img-select-toggle-btn';

            const headerTitle = document.createElement('div');
            headerTitle.className = 'weibo-img-select-header-title';
            headerTitle.textContent = `选择要下载的内容（共 ${mediaItems.length} 项）`;

            header.appendChild(toggleAllBtn);
            header.appendChild(headerTitle);

            const list = document.createElement('div');
            list.className = 'weibo-img-select-list';
            mediaItems.forEach((item, index) => {
                const label = document.createElement('label');
                label.className = 'weibo-img-select-item';

                const input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = true;
                input.value = String(index);

                const text = document.createElement('span');
                text.textContent = item.label || (item.videoUrl ? `Live Photo ${index + 1}` : `图片 ${index + 1}`);

                label.appendChild(input);
                label.appendChild(text);
                list.appendChild(label);
            });

            const actions = document.createElement('div');
            actions.className = 'weibo-img-select-actions';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'weibo-img-select-btn weibo-img-select-btn-cancel';
            cancelBtn.textContent = '取消';

            const confirmBtn = document.createElement('button');
            confirmBtn.type = 'button';
            confirmBtn.className = 'weibo-img-select-btn weibo-img-select-btn-confirm';
            confirmBtn.textContent = '下载所选';

            actions.appendChild(cancelBtn);
            actions.appendChild(confirmBtn);

            const getInputs = () => Array.from(list.querySelectorAll('input[type="checkbox"]'));
            const areAllChecked = () => {
                const inputs = getInputs();
                return inputs.length > 0 && inputs.every((input) => input.checked);
            };
            const updateToggleText = () => {
                toggleAllBtn.textContent = areAllChecked() ? '全不选' : '全选';
            };

            getInputs().forEach((input) => {
                input.addEventListener('change', updateToggleText);
            });

            toggleAllBtn.addEventListener('click', () => {
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
                document.removeEventListener('keydown', onKeyDown);
                overlay.removeEventListener('wheel', preventScroll, { passive: false });
                overlay.removeEventListener('touchmove', preventScroll, { passive: false });
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            };

            const closeWithResult = (result) => {
                cleanup();
                resolve(result);
            };

            const onKeyDown = (event) => {
                if (event.key === 'Escape') {
                    closeWithResult(null);
                }
            };

            cancelBtn.addEventListener('click', () => closeWithResult(null));
            confirmBtn.addEventListener('click', () => {
                const selected = Array.from(
                    list.querySelectorAll('input[type="checkbox"]:checked')
                ).map((el) => Number(el.value));

                if (selected.length === 0) {
                    showToast('请至少选择一项内容');
                    return;
                }

                const selectedItems = selected
                    .map((index) => mediaItems[index])
                    .filter(Boolean);

                closeWithResult(selectedItems);
            });

            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    closeWithResult(null);
                }
            });

            const preventScroll = (event) => {
                event.preventDefault();
            };

            modal.addEventListener('click', (event) => {
                event.stopPropagation();
            });

            overlay.addEventListener('wheel', preventScroll, { passive: false });
            overlay.addEventListener('touchmove', preventScroll, { passive: false });

            document.addEventListener('keydown', onKeyDown);
            document.body.appendChild(overlay);
        });
    }

    WID_UI.ensureImageSelectModalStyles = ensureImageSelectModalStyles;
    WID_UI.showImageSelectModal = showImageSelectModal;

    // ==================== 下载按钮 ====================

    /**
     * 创建下载按钮 - 简洁样式
     */
    function createDownloadButton(postContainer) {
        if (postContainer.querySelector('.weibo-img-download-btn')) {
            return null;
        }

        const initialMediaItems = getFallbackMediaItems(postContainer);
        if (initialMediaItems.length === 0) {
            return null;
        }

        WID_UTILS.log(`创建按钮: ${initialMediaItems.length} 个媒体项`);

        const btn = document.createElement('span');
        btn.className = 'weibo-img-download-btn';
        btn.innerHTML = '↓' + initialMediaItems.length;
        btn.title = '点击下载全部，长按选择下载；Live Photo 会同时下载 JPG 和 MOV';

        if (WID_UTILS.isWeibo()) {
            resolvePostMediaItems(postContainer).then((mediaItems) => {
                if (mediaItems && mediaItems.length > 0) {
                    btn.innerHTML = '↓' + mediaItems.length;
                }
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
            await WID_UTILS.downloadMediaItems(targetMediaItems, postId);
        };

        btn.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });

        btn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (suppressNextClick) {
                suppressNextClick = false;
            }
        });

        btn.addEventListener('pointerdown', (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) {
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
            }, WID_CONFIG.LONG_PRESS_MS);
        });

        btn.addEventListener('pointerup', async (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) {
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

        btn.addEventListener('pointerleave', clearLongPressTimer);
        btn.addEventListener('pointercancel', clearLongPressTimer);

        return btn;
    }

    WID_UI.createDownloadButton = createDownloadButton;

    /**
     * 注入下载按钮
     */
    function injectDownloadButtons() {
        let postsAdded = 0;
        const selectors = WID_UTILS.isX() ? WID_CONFIG.X_CONFIG.POST_SELECTORS : WID_CONFIG.POST_SELECTORS;

        for (const selector of selectors) {
            const posts = document.querySelectorAll(selector);
            posts.forEach(post => {
                if (post.querySelector('.weibo-img-download-btn')) return;

                if (WID_UTILS.isX() && !isMainTweet(post)) {
                    return;
                }

                const btn = createDownloadButton(post);
                if (!btn) return;

                let inserted = false;

                if (WID_UTILS.isX()) {
                    if (isDetailPage()) {
                        const usernameEl = post.querySelector('[data-testid="User-Name"]');
                        if (usernameEl) {
                            const parent = usernameEl.parentElement;
                            if (parent) {
                                parent.parentNode.insertBefore(btn, parent.nextSibling);
                                postsAdded++;
                                inserted = true;
                                WID_UTILS.log('X详情页：按钮插入到用户名区域右侧');
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
                                WID_UTILS.log('X时间线：按钮插入到时间右边');
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
                            WID_UTILS.log('X平台：按钮插入到操作按钮组之前');
                        }
                    }
                } else {
                    // 搜索页专属处理：追加到作者名行（.info 内非 .menu 的 div），改为 flex 布局
                    if (!inserted && WID_UTILS.isSearchPage()) {
                        const infoEl = post.querySelector('.content .info');
                        if (infoEl) {
                            const nameDiv = Array.from(infoEl.children).find(el => !el.classList.contains('menu'));
                            if (nameDiv) {
                                nameDiv.style.display = 'flex';
                                nameDiv.style.alignItems = 'center';
                                nameDiv.style.gap = '4px';
                                nameDiv.appendChild(btn);
                                postsAdded++;
                                inserted = true;
                                WID_UTILS.log('搜索页：按钮插入到作者名行末尾');
                            }
                        }
                    }

                    // 优先检查是否是转发微博，如果是则插入到"转发微博"文字后面
                    const retweetSpan = Array.from(post.querySelectorAll('span')).find(el =>
                        el.textContent.trim() === '转发微博'
                    );
                    if (retweetSpan && retweetSpan.parentNode) {
                        retweetSpan.parentNode.insertBefore(btn, retweetSpan.nextSibling);
                        postsAdded++;
                        inserted = true;
                        WID_UTILS.log('微博：按钮插入到"转发微博"文字后面');
                    }

                    // 对于非转发微博，尝试插入到suffixbox容器末尾（用户名/超话标签同一行）
                    if (!inserted) {
                        const suffixBox = post.querySelector('div[class*="_suffixbox"]');
                        if (suffixBox) {
                            suffixBox.appendChild(btn);
                            postsAdded++;
                            inserted = true;
                            WID_UTILS.log('微博：按钮插入到用户名/超话标签右侧');
                        }
                    }

                    if (!inserted) {
                        const iconsPlusEl = post.querySelector('div[class*="_iconsPlus_"]');
                        if (iconsPlusEl && iconsPlusEl.parentNode) {
                            iconsPlusEl.parentNode.insertBefore(btn, iconsPlusEl);
                            postsAdded++;
                            inserted = true;
                            WID_UTILS.log('微博：按钮插入到 iconsPlus 之前');
                        }
                    }

                    if (!inserted) {
                        for (const headerSelector of WID_CONFIG.HEADER_SELECTORS) {
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
            WID_UTILS.log(`成功注入 ${postsAdded} 个下载按钮`);
        }

        // 搜索页：同步注入"跳转原文"菜单项
        if (WID_UTILS.isSearchPage()) {
            injectSearchPageGotoOriginal();
        }
    }

    WID_UI.injectDownloadButtons = injectDownloadButtons;

    // ==================== 跳转原文菜单项 ====================

    function getWeiboPostUrl(article) {
        if (!article) return null;
        const links = article.querySelectorAll('a[href]');
        for (const link of links) {
            const href = link.href;
            // 匹配 weibo.com/{user_id}/{post_id}，排除用户主页 /u/
            if (/weibo\.com\/\d+\/\w+/.test(href) && !href.includes('/u/')) {
                return href;
            }
        }
        return null;
    }

    function injectGotoOriginalMenuItem(popMain, article) {
        if (!popMain || popMain.dataset.gotoInjected) return;

        const postUrl = getWeiboPostUrl(article);
        if (!postUrl) return;

        const wrapMain = popMain.querySelector('.woo-pop-wrap-main');
        if (!wrapMain) return;

        // 找"分享"所在的第一个子元素
        const shareItem = wrapMain.firstElementChild;
        if (!shareItem) return;

        const item = document.createElement('div');
        item.setAttribute('role', 'button');
        item.className = 'woo-box-flex woo-box-alignCenter woo-pop-item-main woo-pop-item-main';
        item.innerHTML = `<div class="woo-box-flex woo-box-column" style="width:100%"><div class="woo-box-flex woo-box-justifyBetween"><div>跳转原文</div></div><div class="_desc_1v5ao_2"></div></div>`;

        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(postUrl, '_blank');
        });

        wrapMain.insertBefore(item, shareItem.nextSibling);
        popMain.dataset.gotoInjected = '1';
        WID_UTILS.log(`已注入"跳转原文"菜单项: ${postUrl}`);
    }

    /**
     * 搜索页：直接注入"跳转原文"到静态下拉菜单
     */
    function injectSearchPageGotoOriginal() {
        document.querySelectorAll('div[action-type="feed_list_item"]').forEach(post => {
            const menuUl = post.querySelector('ul[node-type="fl_menu_right"]');
            if (!menuUl || menuUl.dataset.gotoInjected) return;

            const postUrl = getWeiboPostUrl(post);
            if (!postUrl) return;

            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = 'javascript:void(0);';
            a.textContent = '跳转原文';
            a.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(postUrl, '_blank');
            });
            li.appendChild(a);
            menuUl.insertBefore(li, menuUl.firstChild);
            menuUl.dataset.gotoInjected = '1';
            WID_UTILS.log(`搜索页：已注入"跳转原文"菜单项: ${postUrl}`);
        });
    }

    function initGotoOriginalMenuObserver() {        if (!WID_UTILS.isWeibo()) return;

        const menuObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (!(node instanceof Element)) continue;

                    // woo-pop-main 直接被加入 DOM
                    if (node.classList.contains('woo-pop-main')) {
                        const article = node.closest('article');
                        if (article) {
                            // 确认是帖子操作菜单（含"分享"项）
                            const hasShare = node.textContent.includes('分享');
                            if (hasShare) {
                                injectGotoOriginalMenuItem(node, article);
                            }
                        }
                    }
                }
            }
        });

        menuObserver.observe(document.body, { childList: true, subtree: true });
    }

    WID_UI.getWeiboPostUrl = getWeiboPostUrl;
    WID_UI.injectGotoOriginalMenuItem = injectGotoOriginalMenuItem;
    WID_UI.initGotoOriginalMenuObserver = initGotoOriginalMenuObserver;

    // ==================== 导出 ====================

    global.WID_UI = WID_UI;

})(window);
