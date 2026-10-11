# 常见问题（FAQ）

> 维护时机：出现新的高频问题，或脚本行为变化导致既有答案失效时，更新本文档。

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
- 微博 GIF：`weibo_{帖子ID}_{序号}.gif`
- 微博 live photo（默认合并）：`weibo_{帖子ID}_{序号}.MP.jpg`（单文件 Motion Photo）
- 微博 live photo（关闭合并）：`weibo_{帖子ID}_{序号}.jpg` + `weibo_{帖子ID}_{序号}_live.mov`
- 微博视频：`weibo_{帖子ID}_{序号}.mp4`
- X 图片：`x_{帖子ID}_{序号}.jpg`
- X GIF：`x_{帖子ID}_{序号}.gif`（关闭自动转换时为 `.mp4`）
- X 视频：`x_{帖子ID}_{序号}.mp4`

### Q: 下载的文件名变成一串 UUID（如 `73502e18-....exif`）怎么办？

A: 这是本机下载链路的问题，不是文件损坏：脚本传入了正确文件名，但个别浏览器、脚本管理器或下载管理器（如 IDM）在处理 Blob 下载时忽略了它，用内部 UUID 加内容嗅探的扩展名落盘。脚本已把 Blob 保存统一改为浏览器原生下载通道以规避此问题，请更新到最新版脚本。如果仍然出现，请：在 IDM 的“选项 → 下载”中关闭对该浏览器的接管（或排除 `blob:` 链接）；检查脚本管理器设置中的“下载模式”（Tampermonkey 建议选 Browser API）。

### Q: 下载的微博 Live Photo 是什么文件？为什么打开不动态？

A: 默认开启“微博LivePhoto自动合并”时，Live Photo 会被合并为单文件 Motion Photo（`.MP.jpg`，内嵌原视频）。Google 相册、三星相册、Windows 11 照片（2023+ 版本）、ImageGlass 9.3+ 等支持的查看器会显示动态效果；macOS 预览、iOS 相册、IrfanView 等不支持的查看器只显示静态封面图，这是正常现象。如果想让所有软件都拿到原始文件，可在油猴菜单关闭“微博LivePhoto自动合并”，改为分别下载 `.jpg` 与 `.mov`。合并失败时脚本会自动回退为分别保存两个文件。
