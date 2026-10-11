# 文档地图

项目长期维护的文档如下。修改代码时，按各文档的"维护时机"同步更新对应内容；临时开发计划、阶段性方案等一次性文档不纳入本地图，也不要求长期维护。

| 文档 | 内容 | 维护时机 |
| --- | --- | --- |
| [README.md](README.md) | 项目介绍、功能特性、安装与使用方法、支持的页面、文档索引 | 功能特性、按钮交互、设置项、支持页面或安装方式变化时更新 |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | 版本更新日志 | 发布新版本、创建 Git tag 时追加对应条目 |
| [docs/TECHNICAL.md](docs/TECHNICAL.md) | 图片 URL 转换规则、批量下载策略、X 动图 GIF 转换实现与性能验证记录 | 上述核心机制或实现策略变化时更新 |
| [docs/FAQ.md](docs/FAQ.md) | 用户常见问题解答（含文件命名规则） | 出现新的高频问题，或脚本行为变化导致既有答案失效时更新 |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | 构建、测试、目录与发布流程说明 | 构建/测试/发布流程、测试结构或关键依赖变化时更新 |

# 开发规约

1. 执行任何修改操作前，请先同步最新 Git 代码。如遇冲突，充分理解双方基于基线变动前提下，rebase 语义合并。
1. 你可以通过 @README.md 快速了解项目，深入细节见上方文档地图。修改脚本同时需要保证 README 与 `docs/` 下相关文档始终与最新代码保持一致（按文档地图中的维护时机执行）。
2. 请专注当前功能开发与问题修改，禁止调整无关代码的逻辑，导致已有功能受损。
3. 后续更新版本时，务必同步创建对应 tag（如 v1.4.0），并确保 `package.json`、`dist/weibo-image-downloader.user.js` 中的 `@version` 与 tag 保持一致。
4. 源码位于 `src/`，发布产物位于 `dist/weibo-image-downloader.user.js`。涉及发布逻辑时，禁止直接手改 `dist/` 产物，应通过构建命令生成。
5. 涉及 userscript metadata、构建脚本或发布流程的修改时，务必同步检查 README、文档地图中的相关文档、构建脚本和最终产物头部是否一致。
6. 适配新站点、新域名或新入口页面时，务必同步检查并补全 userscript metadata 中的 `@match` 规则，避免脚本未在目标页面生效。
7. 发布前务必运行 `bun run verify:dist`，确认 `dist/weibo-image-downloader.user.js` 与当前源码构建结果一致，避免提交过时产物。
