# 微博图片批量下载器项目文档

## 项目概述

这是一个 Tampermonkey/油猴脚本，用于一键下载微博帖子中的所有图片为原图。

## 技术栈

- JavaScript (Vanilla)
- Tampermonkey/Violentmonkey API

## 核心实现逻辑

### 1. 图片URL转换

微博图片使用以下尺寸标识：
- `thumb180`, `orj360` - 缩略图
- `bmiddle` - 中图  
- `mw690`, `mw1024` - 大图
- `large` - 原图

通过正则替换将任意尺寸标识替换为 `large`：
```javascript
url.replace(/\/(mw690|mw1024|thumb180|square|bmiddle|orj360)\//, '/large/')
```

### 2. DOM选择器

支持多种微博DOM结构：
```javascript
const SELECTORS = [
    '.media-pic',
    '.pic-list img',
    '.WB_feed_expand .pic-content img',
    '[action-type="feed_list_pic"] img',
    '.photo_grid img',
    '.image-grid img'
];
```

### 3. 下载策略

- 每批5张图片
- 批次间500ms延迟
- 避免浏览器并发限制

## 文件说明

| 文件 | 说明 |
|------|------|
| `weibo-image-downloader.user.js` | 主脚本文件 |
| `README.md` | 使用说明文档 |

## 使用方式

1. 安装 Tampermonkey 扩展
2. 添加新脚本，粘贴 `weibo-image-downloader.user.js` 内容
3. 访问微博，查看带图片的帖子
4. 点击帖子下方的橙色"下载原图"按钮

## 注意事项

- 需要登录微博才能下载原图
- 部分图片可能因微博防盗链无法下载
- 建议批量下载时保持网络稳定
