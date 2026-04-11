export const CONFIG = {
    DELAY_MS: 300,
    LONG_PRESS_MS: 500,
    DEBUG: true,
    IMG_SELECTORS: [
        "img.woo-picture-img",
        ".picture img",
        ".m3 img",
        'div[class^="m"] img'
    ],
    POST_SELECTORS: [
        "article",
        ".vue-feed-item",
        'div[action-type="feed_list_item"]'
    ],
    HEADER_SELECTORS: [
        'div[class*="_iconsPlus_"]',
        'header > div > div[class*="_nick_"]',
        "header > div > div.woo-box-flex",
        ".woo-nickname",
        ".name"
    ],
    X_CONFIG: {
        POST_SELECTORS: ['article[data-testid="tweet"]'],
        IMG_SELECTORS: ['article img[src*="twimg.com"]'],
        ACTION_GROUP_SELECTORS: ['[role="group"]']
    }
};

export default CONFIG;
