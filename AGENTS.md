# 文档地图

修改代码时，按下表"何时更新"列同步更新对应文档。只为下表所列长期文档做维护；临时开发计划、一次性方案不创建到 `docs/`，也不加入本表。

| 文档 | 内容 | 何时更新 |
| --- | --- | --- |
| [README.md](README.md) | 项目介绍、功能特性、安装与使用方法、支持的页面、文档索引 | 功能特性、按钮交互、设置项、支持页面或安装方式变化时，更新对应章节 |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | 版本更新日志 | 发布新版本时，在顶部追加条目，版本号与 Git tag 一致 |
| [docs/TECHNICAL.md](docs/TECHNICAL.md) | 图片 URL 转换、批量下载策略、X 动图 GIF 转换实现与性能验证 | 对应机制或实现策略变化时，更新对应章节 |
| [docs/FAQ.md](docs/FAQ.md) | 用户常见问题解答（含文件命名规则） | 新增高频问题，或行为变化导致既有答案失效时更新 |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | 构建、测试、目录与发布流程说明 | 构建/测试/发布流程、测试结构或关键依赖变化时更新 |

# 开发规约

1. 开始任何修改前：执行 `git pull --rebase` 同步远端。出现冲突时，以双方共同基线为准做语义合并，保留双方有效改动。
2. 修改脚本后：按文档地图更新受影响文档，使文档与代码一致。
3. 只修改当前任务涉及的代码：不改无关逻辑，不做顺手重构。
4. 发布新版本时：创建 Git tag（如 `v1.4.0`），并保持 `package.json` 的 `version`、产物头部 `@version` 与 tag 三者一致。
5. 版本号迭代需先征得用户同意：未经同意，不修改 `package.json` 的 `version` 与产物头部 `@version`。
6. 源码在 `src/`，发布产物在 `dist/weibo-image-downloader.user.js`：产物一律由构建命令生成，禁止手改。
7. 修改 userscript metadata、构建脚本或发布流程后：核对 README、文档地图相关文档、构建脚本、产物头部 metadata 四处一致。
8. 适配新站点、新域名或新入口页面时：在 userscript metadata 中补全对应 `@match` 规则，否则脚本不在该页面生效。
9. 发布前：运行 `bun run verify:dist`。报告不一致时，先重新构建再提交。
