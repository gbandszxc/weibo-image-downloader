---
name: local-test
description: 在本地启动 HTTP 服务，替换 CDN 地址为 localhost 进行脚本测试。适用场景：用户要求进行本地测试、修改脚本后需要验证
---

# local-test - 本地测试

在本地启动 Web 服务，临时替换 CDN 地址为本地地址进行测试。

## start - 启动本地测试

1. 启动本地 HTTP 服务（后台运行，端口 8080）
2. 将 weibo-image-downloader.user.js 中的 CDN 地址替换为 localhost:8080
3. **输出安装 URL**，可直接点击安装

执行步骤：
1. 启动服务：`Start-Process powershell -ArgumentList "-Command", "cd D:\ProjectSpace\github\weibo-image-downloader; python -m http.server 8080" -WindowStyle Hidden`
2. 修改 CDN 地址为 `http://localhost:8080/`
3. 输出安装 URL：`http://localhost:8080/weibo-image-downloader.user.js`

## stop - 停止本地测试

1. 停止本地 HTTP 服务
2. 恢复 weibo-image-downloader.user.js 中的 CDN 地址为 jsDelivr（使用当前 @version）

执行步骤：
1. 停止服务：`taskkill /f /im python.exe` 或直接关闭终端
2. 恢复 CDN 地址为 `https://cdn.jsdelivr.net/gh/gbandszxc/weibo-image-downloader@{当前版本}/`

## 注意事项

- 测试完成后**务必执行 `local-test stop`** 恢复 CDN 地址
- 提交代码前确保 CDN 地址已恢复为 jsDelivr 地址
- 本地服务端口默认为 8080
- 版本号从主脚本 weibo-image-downloader.user.js 的 @version 动态读取
