1. 你可以通过 @README.md 快速了解项目。修改脚本同时需要保证 @README.md 始终与最新代码保持一致。
2. 请专注当前功能开发与问题修改，禁止调整无关代码的逻辑，导致已有功能受损。
3. 后续更新版本时，务必同步创建对应 tag（如 v1.4.0），并确保 `package.json`、`dist/weibo-image-downloader.user.js` 中的 `@version` 与 tag 保持一致。
4. 源码位于 `src/`，发布产物位于 `dist/weibo-image-downloader.user.js`。涉及发布逻辑时，禁止直接手改 `dist/` 产物，应通过构建命令生成。
5. 涉及 userscript metadata、构建脚本或发布流程的修改时，务必同步检查 README、构建脚本和最终产物头部是否一致。
6. 发布前务必运行 `bun run verify:dist`，确认 `dist/weibo-image-downloader.user.js` 与当前源码构建结果一致，避免提交过时产物。
