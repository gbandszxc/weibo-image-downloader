# Userscript Build Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前依赖 `@require` / `@resource` 的 userscript 工程改造成“`src/` 模块化开发 + `dist/weibo-image-downloader.user.js` 单文件发布”的构建模式，并保持现有功能行为不变。

**Architecture:** 使用 `src/main.js` 作为唯一入口，`config.js`、`utils.js`、`ui.js` 改为 ES Module，`style.css` 收敛为单一来源。通过 `scripts/build.mjs` 调用 `esbuild` 生成单文件 IIFE，并在构建阶段从 `package.json` 注入 userscript metadata，最终产物输出到 `dist/weibo-image-downloader.user.js`。

**Tech Stack:** JavaScript ES Modules, Bun, esbuild, Node 内置 `node:test`/`assert`, Tampermonkey/GreasyFork userscript metadata

---

## File Map

### Create

- `package.json`: 依赖、脚本入口、版本唯一事实源
- `bunfig.toml`: Bun 执行配置
- `.gitignore`: 忽略依赖、构建产物和临时文件
- `scripts/build.mjs`: 调用 `esbuild`，拼接 userscript metadata，写入 `dist/`
- `src/main.js`: 应用唯一入口，负责样式注入、初始化、观察器、菜单注册
- `src/config.js`: 导出配置对象
- `src/utils.js`: 导出平台判断、媒体解析、下载逻辑
- `src/ui.js`: 导出 UI 渲染、按钮注入、菜单注入、弹窗逻辑
- `src/style.css`: 唯一样式来源

### Modify

- `README.md`: 更新安装路径、开发构建说明、版本同步说明
- `tests/weibo-livephoto.test.js`: 从旧的 IIFE + `vm` 方式切换到 ES Module 导入方式

### Delete

- `config.js`
- `utils.js`
- `ui.js`
- `style.css`
- `weibo-image-downloader.user.js`

## Task 1: 建立构建骨架

**Files:**
- Create: `package.json`
- Create: `bunfig.toml`
- Create: `.gitignore`
- Create: `scripts/build.mjs`

- [ ] **Step 1: 新建 `package.json`，定义版本源与构建命令**

```json
{
  "name": "weibo-image-downloader",
  "version": "1.4.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "bun run scripts/build.mjs",
    "dev": "bun run scripts/build.mjs --watch",
    "test": "node --test tests/weibo-livephoto.test.js"
  },
  "devDependencies": {
    "esbuild": "^0.25.0"
  }
}
```

- [ ] **Step 2: 新建 `bunfig.toml`，固定 Bun 包管理与运行行为**

```toml
[install]
saveTextLockfile = true
exact = false
```

- [ ] **Step 3: 新建 `.gitignore`，忽略依赖目录、构建产物和常见日志**

```gitignore
node_modules/
.bun/
dist/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
Thumbs.db
.DS_Store
```

- [ ] **Step 4: 新建 `scripts/build.mjs`，实现 metadata 注入和单文件打包**

```js
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const pkg = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));

const isWatch = process.argv.includes("--watch");
const outdir = path.join(projectRoot, "dist");
const outfile = path.join(outdir, "weibo-image-downloader.user.js");

const metadata = `// ==UserScript==
// @name         微博/X图片批量下载器
// @namespace    http://tampermonkey.net/
// @version      ${pkg.version}
// @description  一键下载微博和X帖子中的所有图片为原图
// @author       gbandszxc
// @match        https://weibo.com/*
// @match        https://www.weibo.com/*
// @match        https://weibo.com.cn/*
// @match        https://s.weibo.com/*
// @match        https://x.com/*
// @match        https://www.x.com/*
// @match        https://twitter.com/*
// @match        https://www.twitter.com/*
// @connect      *.sinaimg.cn
// @connect      *.sina.cn
// @connect      *.twimg.com
// @grant        GM_download
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_log
// @grant        GM_addElement
// @supportURL   https://github.com/gbandszxc/weibo-image-downloader/issues
// @license      MIT
// ==/UserScript==
`;

const buildOptions = {
  absWorkingDir: projectRoot,
  entryPoints: ["src/main.js"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["chrome109"],
  outfile,
  banner: {
    js: metadata
  },
  loader: {
    ".css": "text"
  }
};

await mkdir(outdir, { recursive: true });

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log(`watching: ${path.relative(projectRoot, outfile)}`);
} else {
  await esbuild.build(buildOptions);
  console.log(`built: ${path.relative(projectRoot, outfile)}`);
}
```

- [ ] **Step 5: 安装依赖并确认骨架可执行**

Run: `bun install`  
Expected: 生成 `bun.lock`，安装 `esbuild` 成功且无错误退出

- [ ] **Step 6: 提交骨架**

```powershell
git add package.json bunfig.toml .gitignore scripts/build.mjs bun.lock
git commit -m "build: scaffold userscript bundling"
```

## Task 2: 迁移配置与工具模块到 `src/`

**Files:**
- Create: `src/config.js`
- Create: `src/utils.js`
- Delete: `config.js`
- Delete: `utils.js`
- Test: `tests/weibo-livephoto.test.js`

- [ ] **Step 1: 先写一个最小失败测试，确认新模块路径尚未生效**

在 `tests/weibo-livephoto.test.js` 顶部加入一个独立子测试，验证新模块导入路径：

```js
import test from "node:test";
import assert from "node:assert/strict";

test("module entry exists", async () => {
  const utilsModule = await import("../src/utils.js");
  assert.equal(typeof utilsModule.createUtils, "function");
});
```

- [ ] **Step 2: 运行测试，确认失败原因是 `src/utils.js` 尚不存在**

Run: `node --test tests/weibo-livephoto.test.js`  
Expected: FAIL，错误包含 `Cannot find module '../src/utils.js'`

- [ ] **Step 3: 创建 `src/config.js`，将配置改为标准导出**

```js
export const CONFIG = {
  DELAY_MS: 300,
  LONG_PRESS_MS: 500,
  DEBUG: true,
  IMG_SELECTORS: [
    "img.woo-picture-img",
    ".picture img",
    ".m3 img",
    'div[class^="m"] img'
  ],
  POST_SELECTORS: [
    "article",
    ".vue-feed-item",
    'div[action-type="feed_list_item"]'
  ],
  HEADER_SELECTORS: [
    'div[class*="_iconsPlus_"]',
    'header > div > div[class*="_nick_"]',
    "header > div > div.woo-box-flex",
    ".woo-nickname",
    ".name"
  ],
  X_CONFIG: {
    POST_SELECTORS: ['article[data-testid="tweet"]'],
    IMG_SELECTORS: ['article img[src*="twimg.com"]'],
    ACTION_GROUP_SELECTORS: ['[role="group"]']
  }
};
```

- [ ] **Step 4: 创建 `src/utils.js`，将原全局工具改造成工厂函数**

`src/utils.js` 使用以下模块边界：

```js
export function createUtils({ config, windowRef, fetchRef, gmDownload, ui }) {
  const weiboStatusCache = new Map();

  function isWeibo() {
    return windowRef.location.hostname.includes("weibo");
  }

  function isSearchPage() {
    return windowRef.location.hostname === "s.weibo.com";
  }

  function isX() {
    return windowRef.location.hostname.includes("x.com") ||
      windowRef.location.hostname.includes("twitter");
  }

  function getCurrentPlatform() {
    return isX() ? "x" : "weibo";
  }

  function log(...args) {
    if (config.DEBUG) {
      console.log(`[${getCurrentPlatform()} Downloader]`, ...args);
    }
  }

  return {
    isWeibo,
    isSearchPage,
    isX,
    getCurrentPlatform,
    log,
    buildMediaDownloadJobs,
    createWeiboMediaItem,
    downloadAllImages,
    downloadImage,
    downloadImageFallback,
    downloadMediaItems,
    fetchWeiboStatus,
    getBestWeiboImageUrl,
    getFileBasenameFromUrl,
    getFileExtensionFromUrl,
    getOriginalImageUrl,
    getWeiboMediaItemsById,
    getWeiboMediaItemsFromStatus,
    getWeiboMediaSourceStatus,
    getWeiboMixMediaItems,
    getWeiboOriginalImageUrl,
    getXOriginalImageUrl,
    getFilename,
    isAvatarImage
  };
}
```

同一文件内继续搬运当前 `utils.js` 的业务实现，但需要做三类替换：

```js
// 旧写法
if (typeof GM_download === "function") {

// 新写法
if (typeof gmDownload === "function") {
```

```js
// 旧写法
const response = await fetch(url);

// 新写法
const response = await fetchRef(url);
```

```js
// 旧写法
WID_UI.showToast("未找到图片");

// 新写法
ui.showToast("未找到图片");
```

- [ ] **Step 5: 运行测试，确认新模块可导入，但原测试主体仍未适配**

Run: `node --test tests/weibo-livephoto.test.js`  
Expected: 部分测试失败，但 `module entry exists` 通过，错误转为旧的全局上下文装载方式不适配

- [ ] **Step 6: 删除根目录旧模块文件**

```powershell
Remove-Item -LiteralPath "config.js","utils.js"
```

- [ ] **Step 7: 提交模块迁移第一阶段**

```powershell
git add src/config.js src/utils.js tests/weibo-livephoto.test.js
git rm config.js utils.js
git commit -m "refactor: migrate config and utils modules"
```

## Task 3: 迁移 UI、样式和入口

**Files:**
- Create: `src/ui.js`
- Create: `src/main.js`
- Create: `src/style.css`
- Delete: `ui.js`
- Delete: `style.css`

- [ ] **Step 1: 创建 `src/style.css`，收敛现有样式并删除 `ui.js` 中重复内联弹窗 CSS**

`src/style.css` 直接合并当前根目录 `style.css` 内容，并新增一个更明确的样式注入约束：保留以下选择器定义，且不再在 JS 中声明同名 CSS 字符串：

```css
#weibo-img-toast { /* 保留现有 toast 样式 */ }
.weibo-img-select-overlay { /* 保留现有选择弹窗样式 */ }
.weibo-img-download-btn { /* 保留现有下载按钮样式 */ }
```

- [ ] **Step 2: 创建 `src/ui.js`，改为显式依赖注入**

`src/ui.js` 使用以下边界：

```js
export function createUi({ config, utils, windowRef, documentRef, addStyle }) {
  const postMediaItemsCache = new WeakMap();

  function ensureImageSelectModalStyles() {
    if (documentRef.getElementById("weibo-img-select-modal-style")) {
      return;
    }

    const marker = documentRef.createElement("style");
    marker.id = "weibo-img-select-modal-style";
    marker.textContent = "";
    documentRef.head.appendChild(marker);
  }

  return {
    createDownloadButton,
    ensureImageSelectModalStyles,
    getWeiboPostUrl,
    initGotoOriginalMenuObserver,
    injectDownloadButtons,
    injectGotoOriginalMenuItem,
    isWeiboVideoThumbnailImage,
    selectPreferredWeiboMediaItems,
    showImageSelectModal,
    showToast,
    syncDownloadButtonState
  };
}
```

迁移 `ui.js` 具体实现时遵循以下替换规则：

```js
// 旧写法
if (WID_UTILS.isX()) {

// 新写法
if (utils.isX()) {
```

```js
// 旧写法
const selectors = WID_CONFIG.IMG_SELECTORS;

// 新写法
const selectors = config.IMG_SELECTORS;
```

```js
// 旧写法
document.body.appendChild(overlay);

// 新写法
documentRef.body.appendChild(overlay);
```

- [ ] **Step 3: 创建 `src/main.js`，作为唯一运行入口，负责样式注入和对象装配**

```js
import cssText from "./style.css";
import { CONFIG } from "./config.js";
import { createUi } from "./ui.js";
import { createUtils } from "./utils.js";

const styleId = "weibo-image-downloader-style";

function injectStyles() {
  if (document.getElementById(styleId)) {
    return;
  }

  if (typeof GM_addStyle === "function") {
    GM_addStyle(cssText);
  } else {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = cssText;
    document.head.appendChild(style);
  }
}

let ui;
const utils = createUtils({
  config: CONFIG,
  windowRef: window,
  fetchRef: window.fetch.bind(window),
  gmDownload: typeof GM_download === "function" ? GM_download : null,
  ui: {
    showToast(message) {
      return ui.showToast(message);
    }
  }
});

ui = createUi({
  config: CONFIG,
  utils,
  windowRef: window,
  documentRef: document,
  addStyle: injectStyles
});

function init() {
  injectStyles();
  ui.ensureImageSelectModalStyles();

  const platform = utils.getCurrentPlatform();
  setTimeout(() => {
    ui.injectDownloadButtons();
  }, 2000);

  let injectTimer = null;
  const observer = new MutationObserver(() => {
    if (injectTimer) return;
    injectTimer = setTimeout(() => {
      injectTimer = null;
      ui.injectDownloadButtons();
    }, 300);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  setInterval(() => ui.injectDownloadButtons(), 5000);
  ui.initGotoOriginalMenuObserver();
  utils.log(`${platform === "x" ? "X" : "微博"}图片批量下载器初始化完成！`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

GM_registerMenuCommand("刷新按钮", () => {
  ui.injectDownloadButtons();
});
```

- [ ] **Step 4: 删除旧 UI 与样式文件**

```powershell
Remove-Item -LiteralPath "ui.js","style.css","weibo-image-downloader.user.js"
```

- [ ] **Step 5: 运行构建，确认可以生成单文件 userscript**

Run: `bun run build`  
Expected: 成功输出 `dist/weibo-image-downloader.user.js`，且控制台打印 `built: dist\\weibo-image-downloader.user.js`

- [ ] **Step 6: 校验构建产物已内联样式且不再依赖外部资源**

Run: `Select-String -Path 'dist\\weibo-image-downloader.user.js' -Pattern '@require','@resource','#weibo-img-toast','.weibo-img-download-btn'`  
Expected: 能匹配到 `#weibo-img-toast` 与 `.weibo-img-download-btn`，且不能匹配到 `@require`、`@resource`

- [ ] **Step 7: 提交入口与 UI 迁移**

```powershell
git add src/ui.js src/main.js src/style.css scripts/build.mjs
git rm ui.js style.css weibo-image-downloader.user.js
git commit -m "build: bundle userscript from src entry"
```

## Task 4: 迁移测试到 ES Module 结构

**Files:**
- Modify: `tests/weibo-livephoto.test.js`

- [ ] **Step 1: 将测试文件改为 `node:test` 风格，直接导入模块工厂**

将 `tests/weibo-livephoto.test.js` 重写为以下结构：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../src/config.js";
import { createUtils } from "../src/utils.js";
import { createUi } from "../src/ui.js";

function createUtilsForWeibo() {
  return createUtils({
    config: CONFIG,
    windowRef: {
      location: {
        hostname: "weibo.com"
      }
    },
    fetchRef: async () => {
      throw new Error("fetch should not be called in unit tests");
    },
    gmDownload: null,
    ui: {
      showToast() {}
    }
  });
}

function createUiForWeibo() {
  return createUi({
    config: CONFIG,
    utils: {
      isWeibo: () => true
    },
    windowRef: {},
    documentRef: {
      getElementById() {
        return null;
      },
      createElement() {
        return {
          id: "",
          textContent: ""
        };
      },
      head: {
        appendChild() {}
      }
    },
    addStyle() {}
  });
}
```

- [ ] **Step 2: 将现有断言拆成多个 `test()`，保留现有覆盖面**

至少保留以下测试名称：

```js
test("live photo status resolves full media list", () => {
  const utils = createUtilsForWeibo();
  const mediaItems = utils.getWeiboMediaItemsFromStatus(sampleStatus);
  assert.equal(mediaItems.length, 3);
});

test("gif media only creates image download jobs", () => {
  const utils = createUtilsForWeibo();
  const gifMediaItems = utils.getWeiboMediaItemsFromStatus(sampleGifStatus);
  const gifJobs = utils.buildMediaDownloadJobs(gifMediaItems, "5280000000000001");
  assert.deepEqual(
    gifJobs.map((job) => job.filename),
    [
      "weibo_5280000000000001_1.gif",
      "weibo_5280000000000001_2.jpg"
    ]
  );
});

test("pure video result removes download button", () => {
  const ui = createUiForWeibo();
  const button = {
    innerHTML: "",
    removed: false,
    remove() {
      this.removed = true;
    }
  };
  ui.syncDownloadButtonState(button, []);
  assert.equal(button.removed, true);
});
```

- [ ] **Step 3: 运行测试，确认全部通过**

Run: `bun run test`  
Expected: PASS，输出包含 `ok`，无失败用例

- [ ] **Step 4: 提交测试迁移**

```powershell
git add tests/weibo-livephoto.test.js
git commit -m "test: migrate userscript unit tests to esm"
```

## Task 5: 更新 README 与发布说明

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 更新安装说明，指向 `dist/weibo-image-downloader.user.js`**

将 README 安装路径调整为：

```md
2. 点击仓库中的 `dist/weibo-image-downloader.user.js` 文件
3. 或者在 Tampermonkey 面板中选择“添加新脚本”
4. 将 `dist/weibo-image-downloader.user.js` 的内容粘贴进去并保存
```

- [ ] **Step 2: 新增开发说明，明确源码目录和构建命令**

在 README 增加一个“开发”小节：

````md
## 开发

- 源码位于 `src/`
- 发布产物位于 `dist/weibo-image-downloader.user.js`
- 版本号以 `package.json` 为准，发布时需同步更新 Git tag 与 README 更新日志

```bash
bun install
bun run build
bun run test
```
````

- [ ] **Step 3: 调整更新日志，新增构建迁移版本说明**

```md
### v1.4.0
- 重构：引入 `esbuild` 构建链，改为 `src/` 模块化开发、`dist/` 单文件发布
- 优化：移除 `@require` 与 `@resource` 外部依赖，兼容 GreasyFork 单文件同步
- 优化：统一样式来源，减少脚本与样式重复维护
```

- [ ] **Step 4: 运行构建与测试做文档回归**

Run: `bun run build`  
Expected: PASS，产物更新到 `dist/weibo-image-downloader.user.js`

Run: `bun run test`  
Expected: PASS，测试全部通过

- [ ] **Step 5: 提交文档更新**

```powershell
git add README.md dist/weibo-image-downloader.user.js
git commit -m "docs: update build and install instructions"
```

## Task 6: 最终回归与发布前检查

**Files:**
- Modify: `dist/weibo-image-downloader.user.js`
- Test: `README.md`
- Test: `package.json`

- [ ] **Step 1: 检查 userscript 头部是否只保留单文件发布需要的 metadata**

Run: `Get-Content -Path 'dist\\weibo-image-downloader.user.js' -TotalCount 25`  
Expected: 头部包含 `@version 1.4.0`、`@grant`、`@match`、`@connect`，且不包含 `@require`、`@resource`

- [ ] **Step 2: 检查版本号一致性**

Run: `Select-String -Path 'package.json','README.md','dist\\weibo-image-downloader.user.js' -Pattern '1.4.0'`  
Expected: 三处都能匹配到 `1.4.0`

- [ ] **Step 3: 检查工作区状态**

Run: `git status --short`  
Expected: 仅包含本次构建迁移相关文件，无意外脏文件

- [ ] **Step 4: 手工浏览器回归**

手工验证：

- 在 Tampermonkey 中安装 `dist/weibo-image-downloader.user.js`
- 打开微博首页，确认图片微博出现下载按钮
- 打开微博详情页，确认 live photo 仍可下载 `.jpg` 与 `.mov`
- 打开 X 时间线，确认推文图片按钮仍正常注入

- [ ] **Step 5: 核对并更新 `CLAUDE.md`**

Run: `Get-Content -Path 'CLAUDE.md'`  
Expected: 能定位到与旧的根目录脚本结构、安装入口、发布约束相关的描述，并补充重构后的重要注意点

将 `CLAUDE.md` 至少更新为包含以下约束：

```md
1. 你可以通过 @README.md 快速了解项目。修改脚本同时需要保证 @README.md 始终与最新代码保持一致。
2. 请专注当前功能开发与问题修改，禁止调整无关代码的逻辑，导致已有功能受损。
3. 后续更新版本时，务必同步创建对应 tag（如 v1.4.0），并确保 `package.json`、`dist/weibo-image-downloader.user.js` 中的 `@version` 与 tag 保持一致。
4. 源码位于 `src/`，发布产物位于 `dist/weibo-image-downloader.user.js`。涉及发布逻辑时，禁止直接手改 `dist/` 产物，应通过构建命令生成。
5. 涉及 userscript metadata、构建脚本或发布流程的修改时，务必同步检查 README、构建脚本和最终产物头部是否一致。
```

- [ ] **Step 6: 提交最终校验结果**

```powershell
git add .
git commit -m "release: v1.4.0"
git tag v1.4.0
```

## Self-Review

### Spec coverage

- 模块化源码目录：Task 2、Task 3
- 单文件 userscript 构建：Task 1、Task 3、Task 6
- 删除 `@require` / `@resource`：Task 1、Task 6
- 版本单一事实源：Task 1、Task 5、Task 6
- 保持功能不变并回归验证：Task 4、Task 6

无遗漏项。

### Placeholder scan

- 未使用 `TBD`、`TODO`、`implement later`、`similar to` 等占位描述。
- 所有代码变更步骤均给出明确文件路径、命令或代码片段。

### Type consistency

- `CONFIG`、`createUtils`、`createUi`、`src/main.js` 的命名在各任务中保持一致。
- 构建产物路径统一为 `dist/weibo-image-downloader.user.js`。
- 版本号统一规划为 `1.4.0`。
