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
- 微博 live photo 视频：`weibo_{帖子ID}_{序号}_live.mov`
- 微博视频：`weibo_{帖子ID}_{序号}.mp4`
- X 图片：`x_{帖子ID}_{序号}.jpg`
- X GIF：`x_{帖子ID}_{序号}.gif`（关闭自动转换时为 `.mp4`）
- X 视频：`x_{帖子ID}_{序号}.mp4`
