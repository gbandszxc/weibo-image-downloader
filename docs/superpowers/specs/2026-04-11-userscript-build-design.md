# Userscript 构建链改造设计

日期：2026-04-11

## 背景

项目最初是单一 userscript 脚本，后续为了提高可维护性，拆分出了 `config.js`、`utils.js`、`ui.js` 和 `style.css` 等资源文件。当前入口脚本 [weibo-image-downloader.user.js](D:\ProjectSpace\github\weibo-image-downloader\weibo-image-downloader.user.js) 通过 `@require` 与 `@resource` 在运行时拼装依赖。

这套结构便于本地开发，但与 GreasyFork 的同步限制存在冲突。GreasyFork 不接受依赖 GitHub、jsDelivr 等外部脚本和样式资源的发布方式，因此项目需要恢复为“开发模块化、发布单文件”的模式。

## 目标

本次改造目标如下：

- 保持源码开发体验为模块化结构。
- 产出单一 userscript 文件，满足 GreasyFork 发布要求。
- 移除 `@require`、`@resource` 对外部脚本与样式的依赖。
- 将版本号收敛为单一事实源，减少多处手工同步。
- 保持现有功能行为不变，不顺带进行业务逻辑重构。

## 非目标

本次改造不包含以下内容：

- 不新增微博或 X 平台功能。
- 不重构下载流程、媒体解析流程或按钮注入逻辑。
- 不引入自动发布到 GreasyFork 的流程。
- 不将本次任务扩展为大规模工程化改造，例如 ESLint、Prettier、TypeScript 或测试框架替换。

## 现状问题

当前仓库存在以下工程问题：

- userscript 入口通过 `@require` 和 `@resource` 依赖外部 CDN 资源，不满足 GreasyFork 单文件同步要求。
- 样式存在重复维护问题。弹窗样式同时存在于根目录的 `style.css` 与 `ui.js` 中，后续演进容易失同步。
- 版本号同步点较多，容易出现入口脚本版本、资源版本、README 更新记录不一致的问题。
- 现有跨文件依赖主要通过全局对象 `WID_CONFIG`、`WID_UTILS`、`WID_UI` 暴露，维护成本随着功能增长而上升。

## 方案选择

候选方案比较如下：

### 方案 A：`esbuild + npm`

优点：

- 生态成熟，社区资料最多。
- userscript 单文件打包实现直接。
- 后续维护成本低。

缺点：

- 不满足本次偏好中的 `bunfig.toml` 结构预期。

### 方案 B：`esbuild + bunfig.toml + package.json`

优点：

- 兼容 Bun 作为脚本执行器。
- 保留 `package.json` 作为依赖与版本元数据中心。
- `esbuild` 负责稳定打包，适合 userscript banner、CSS 内联和 watch 开发。
- 平衡了工程稳定性与工具偏好。

缺点：

- 相比纯 Bun 方案，多一个显式构建脚本文件。

### 方案 C：`bun build` 直打包

优点：

- 工具更少，表面结构更简洁。

缺点：

- userscript metadata 拼接、CSS 内联、watch、版本注入等细节控制不如 `esbuild` 顺手。
- 后续补充发布校验时通常仍需要额外胶水脚本。

## 最终方案

采用方案 B：`esbuild + bunfig.toml + package.json`。

### 目录结构

```text
weibo-image-downloader/
|-- src/
|   |-- main.js
|   |-- config.js
|   |-- utils.js
|   |-- ui.js
|   `-- style.css
|-- scripts/
|   `-- build.mjs
|-- dist/
|   `-- weibo-image-downloader.user.js
|-- tests/
|   `-- weibo-livephoto.test.js
|-- bunfig.toml
|-- package.json
|-- .gitignore
`-- README.md
```

### 关键设计

- `src/main.js` 作为唯一入口，负责样式注入、初始化、观察器注册、菜单注册。
- `src/config.js`、`src/utils.js`、`src/ui.js` 使用标准 ES Module 导出，不再通过 `window` 挂载全局对象作为模块边界。
- `src/style.css` 作为唯一样式来源，构建时内联进最终 userscript，消除重复样式维护。
- `scripts/build.mjs` 负责调用 `esbuild` 打包源码，并在产物顶部拼接 userscript metadata。
- `dist/weibo-image-downloader.user.js` 作为唯一发布文件，提供给 GreasyFork、Tampermonkey 与手动安装。

## 构建流程

构建流程定义如下：

1. 从 `package.json.version` 读取版本号。
2. 使用 `esbuild` 将 `src/main.js` 打包为单文件 IIFE。
3. 将 `src/style.css` 以内联文本方式注入最终脚本。
4. 在产物顶部拼接 userscript metadata。
5. 输出到 `dist/weibo-image-downloader.user.js`。

userscript metadata 调整原则如下：

- 保留 `@name`、`@namespace`、`@version`、`@description`、`@author`、`@match`、`@connect`、`@grant`、`@supportURL`、`@license` 等必要字段。
- 删除 `@require`。
- 删除 `@resource`。
- `@version` 不再手写在源码入口头部，而是由构建脚本根据 `package.json.version` 自动生成。

## 版本与发布策略

版本号采用单一事实源策略：

- `package.json.version` 为唯一版本来源。
- `scripts/build.mjs` 在构建 userscript 产物时自动注入对应版本号。
- README 中的更新日志仍然手工维护，但发布前应校验是否与当前版本一致。
- Git tag 继续遵循仓库约定，例如 `v1.3.4`，并与 `package.json.version`、userscript `@version` 保持一致。

该策略可以减少当前多点维护版本带来的重复劳动与遗漏风险。

## 测试与验证

实施完成后，至少执行以下验证流程：

1. 运行 `bun run build`，确认 `dist/weibo-image-downloader.user.js` 生成成功。
2. 运行 `bun run test`，确认现有单元测试通过。
3. 检查 `dist/weibo-image-downloader.user.js` 顶部 metadata 是否完整，尤其是 `@version`、`@match`、`@grant`、`@connect`。
4. 在本地浏览器安装 `dist/weibo-image-downloader.user.js`，验证微博基础按钮注入和下载链路未回归。
5. 检查 README 安装说明是否已切换到 `dist/weibo-image-downloader.user.js`。

## 实施范围

本次实施限定为“构建体系迁移 + 源码搬迁 + 发布单文件化”，具体包括：

- 新增 `package.json`、`bunfig.toml`、`.gitignore`、`scripts/build.mjs`。
- 将现有根目录源码迁移到 `src/`。
- 将 IIFE + `window` 全局导出改为 ES Module 导入导出。
- 将样式统一收敛到 `src/style.css`。
- 调整测试代码以适配新的源码路径与模块组织方式。
- 更新 README 安装与发布说明。

## 风险与应对

### 风险 1：userscript metadata 拼接错误

影响：

- Tampermonkey 或 GreasyFork 无法正确识别脚本。

应对：

- 构建脚本中固定 metadata 模板。
- 构建后对产物头部做人工校验。

### 风险 2：CSS 注入时机变化

影响：

- 弹窗、按钮样式可能缺失或闪烁。

应对：

- 保持初始化阶段尽早注入样式。
- 清理样式重复定义，确保只有一份权威样式来源。

### 风险 3：模块化改造暴露初始化顺序问题

影响：

- 原先依赖全局对象顺序的逻辑在 ES Module 下失效。

应对：

- 由 `main.js` 显式组装依赖。
- 在模块边界上仅暴露必要接口，避免隐式耦合。

### 风险 4：测试脚本失配

影响：

- 现有基于 `vm` 执行脚本文件的测试方式无法直接用于 ES Module。

应对：

- 同步调整测试装载方式，确保测试继续覆盖核心媒体解析逻辑。

## 成本评估

### 低成本项

- 新增构建配置文件。
- 新增 `.gitignore`。
- 生成单文件 userscript 产物。
- README 安装路径更新。

### 中成本项

- 根目录源码迁移到 `src/`。
- 全局对象暴露方式改为 ES Module。
- 样式收敛与构建内联。
- 测试路径与加载方式调整。

### 结论

该改造属于中等规模工程调整，复杂度集中在模块化迁移与 userscript 产物生成，而非业务功能实现。若严格限制范围，不顺带重构下载或解析逻辑，则可以在一次实现周期内完成，并且回归风险可控。

## 实施建议

建议按以下顺序推进：

1. 建立 `package.json`、`bunfig.toml`、`scripts/build.mjs` 和 `.gitignore`。
2. 创建 `src/` 并迁移现有源码。
3. 将全局模块边界改为 ES Module。
4. 统一样式到 `src/style.css`，删除重复样式定义。
5. 调整测试与 README。
6. 执行构建与回归验证。

## 结论

引入 `esbuild` 并采用“源码模块化、发布单文件”的方案，是当前项目在 GreasyFork 发布约束下最稳妥的演进方向。它不会改变现有功能目标，但能显著改善资源同步、版本管理与发布流程的一致性，改造成本中等，收益明确，值得实施。
