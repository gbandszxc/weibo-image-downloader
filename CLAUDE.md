# 微博图片批量下载器

## 项目概述
Tampermonkey/油猴脚本，一键下载微博帖子中的所有图片为原图。

## 核心实现

### 图片URL转换
尺寸标识: `thumb180` → `bmiddle` → `mw690` → `large`(原图)
```javascript
const sizePatterns = ['thumb180', 'thumb300', 'square', 'bmiddle', 'mw690', 'mw1024', 'orj360', 'orj480', 'webp720'];
```

### 图片选择器
```javascript
IMG_SELECTORS: ['img.woo-picture-img', '.picture img']
POST_SELECTORS: ['article', '.vue-feed-item']
HEADER_SELECTORS: ['div[class*="_iconsPlus_"]', 'header > div > div[class*="_nick_"]', ...]
```

### 下载策略
- GM_download (Tampermonkey API)
- 备用: fetch + blob → window.open
- 延迟: 300ms/张

### 按钮位置
插入到 header 区域的 `_iconsPlus_` div 之前（用户昵称旁边）

## 文件
| 文件 | 说明 |
|------|------|
| `weibo-image-downloader.user.js` | 主脚本 (v1.0.4) |
| `README.md` | 使用说明 |
