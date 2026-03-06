# 微博/X图片批量下载器

一键下载微博和X（原Twitter）帖子中的所有图片为原图。

## 功能特性

- 一键下载当前帖子中的所有图片为原图
- 自动将缩略图/中图转换为高质量原图
- 批量下载支持，避免浏览器并发限制
- 支持动态加载内容（无限滚动）
- 文件命名包含帖子ID，方便整理
- 单一脚本支持微博和X双平台

## 安装方法

### 方法1：Tampermonkey（推荐）

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击 [weibo-image-downloader.user.js](https://github.com/gbandszxc/weibo-image-downloader/raw/refs/heads/main/weibo-image-downloader.user.js) 文件
3. 或者在 Tampermonkey 面板中选择"添加新脚本"
4. 将 `weibo-image-downloader.user.js` 的内容粘贴进去并保存

### 方法2：Violentmonkey

1. 安装 [Violentmonkey](https://violentmonkey.github.io/) 浏览器扩展
2. 同样的方式添加脚本

## 使用方法

### 微博

1. 打开微博首页 https://weibo.com 或任意微博页面
2. 浏览微博，找到包含图片的帖子
3. 在每条微博的下方（点赞/评论/转发按钮旁边）会出现一个橙色的 **"↓N"** 按钮
4. 点击按钮即可批量下载该条微博的所有图片

### X（原Twitter）

1. 打开X首页 https://x.com 或任意X页面
2. 浏览推文，找到包含图片的帖子
3. 在每条推文的发送时间右侧会出现一个橙色的 **"↓N"** 按钮
4. 点击按钮即可批量下载该条推文的所有图片

## 支持的页面

### 微博
- 微博首页 feed 流
- 用户主页
- 微博搜索结果页
- 微博详情页

### X（原Twitter）
- X首页 feed 流
- 用户主页
- 搜索结果页
- 推文详情页

## 常见问题

### Q: 点击按钮没有反应？

A: 请确保已正确安装 Tampermonkey 扩展，并且脚本已启用。可以在浏览器右上角的 Tampermonkey 图标查看。

### Q: 下载的图片不清晰？

A: 本脚本会自动将图片URL中的尺寸标识替换为原图：
- 微博：将 mw690、bmiddle、orj360 等替换为 large
- X：将 name=small、name=large 替换为 name=orig

### Q: 下载失败怎么办？

A: 
- 检查网络连接
- 尝试刷新页面后重新下载
- 如果是部分图片失败，可能是微博图片加载问题

### Q: 文件名是怎么生成的？

A: 
- 微博：`weibo_{帖子ID}_{序号}.jpg`
- X：`x_{帖子ID}_{序号}.jpg`

## 技术细节

### 图片URL转换

**微博图片URL**通常包含尺寸标识：
- `thumb180` / `orj360` - 缩略图
- `bmiddle` - 中图
- `mw690` - 大图
- `large` - 原图

**X平台图片URL**使用查询参数：
- `name=small` - 缩略图
- `name=large` - 大图
- `name=orig` - 原图

脚本会自动将任意尺寸的URL转换为原图URL。

### 下载策略

- 每批下载 5 张图片
- 批次间延迟 300ms
- 避免触发平台的反爬机制
- 兼容 Chrome 浏览器的下载限制

## 更新日志

### v1.1.9
- 优化微博端按钮部分场景展示位置。
- 修复微博下载异常问题

### v1.1.1 - v1.1.8
- 修复按钮展示、图片获取、下载相关问题

### v1.1.0
- 新增X（原Twitter）平台支持

### v1.0.0
- 初始版本
- 支持批量下载微博原图
- 支持动态内容监听
