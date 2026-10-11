# 开发指南

> 维护时机：构建、测试或发布流程变化，测试文件/fixture 结构调整，或关键依赖增减时，更新本文档。

## 常用命令

```bash
bun install
bun run build
bun run typecheck
bun run test
bun run test:placement
bun run verify:dist
```

- `bun run typecheck` 使用 `tsc --noEmit` 校验类型；`bun run test` 通过 `node --experimental-strip-types` 直接运行，无需预编译

## 目录与测试结构

- 源码位于 `src/`，全部为 TypeScript；测试（`tests/*.ts`）与源码同为 TypeScript
- 平台实现位于 `src/platforms/`，共享流程通过统一适配器调用
- `bun run test:placement` 可单独校验微博/X 各页面按钮位置是否回归
- `tests/fixtures/x-gif-dom.json` 保存了通过 chrome-devtools 提取的 X GIF 示例详情页及回复媒体结构；`tests/x-platform.test.ts` 基于该结构 mock 识别流程，`tests/x-gif.test.ts`、`tests/x-gif-workers.test.ts` 和 `tests/utils-download.test.ts` 无网络回归转换产物、真实 Worker 的帧序与失败回退、下载开关和资源清理。X 更新结构时可替换 fixture 并执行 `bun run test`
- GIF 编码使用打包进单文件产物的 [gifenc](https://github.com/mattdesl/gifenc)；Worker 代码也内嵌在产物中，运行时通过本地 Blob 创建，不需要额外下载。构建会保留其 MIT 许可声明，`bun run dev` 会跟踪 Worker 源码变化
- 发布产物位于 `dist/weibo-image-downloader.user.js`
- 版本号以 `package.json` 为准，发布时需同步更新 Git tag、更新日志（`docs/CHANGELOG.md`）和最终 userscript `@version`
- 发布前执行 `bun run verify:dist`，确认 `dist/` 产物已由当前源码重新生成且 metadata 一致
