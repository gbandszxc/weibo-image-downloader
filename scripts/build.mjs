import path from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build, context } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const packageJsonPath = path.join(projectRoot, "package.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const version = packageJson.version;
const distRelativePath = "dist/weibo-image-downloader.user.js";
const rawDistUrl = `https://raw.githubusercontent.com/gbandszxc/weibo-image-downloader/main/${distRelativePath}`;

const entryFile = path.join(projectRoot, "src", "main.js");
const outputFile = path.join(projectRoot, distRelativePath);
const isWatchMode = process.argv.includes("--watch");

const metadataLines = [
  "// ==UserScript==",
  "// @name         微博/X图片批量下载器",
  "// @namespace    http://tampermonkey.net/",
  `// @version      ${version}`,
  "// @description  一键下载微博和X帖子中的所有图片为原图，可选开启视频下载",
  "// @author       gbandszxc",
  "// @match        https://weibo.com/*",
  "// @match        https://www.weibo.com/*",
  "// @match        https://weibo.com.cn/*",
  "// @match        https://m.weibo.cn/*",
  "// @match        https://www.m.weibo.cn/*",
  "// @match        https://s.weibo.com/*",
  "// @match        https://x.com/*",
  "// @match        https://www.x.com/*",
  "// @match        https://twitter.com/*",
  "// @match        https://www.twitter.com/*",
  "// @connect      sinaimg.cn",
  "// @connect      sina.cn",
  "// @connect      twimg.com",
  "// @connect      *",
  "// @grant        GM_download",
  "// @grant        GM_xmlhttpRequest",
  "// @grant        GM_addStyle",
  "// @grant        GM_registerMenuCommand",
  "// @grant        GM_getValue",
  "// @grant        GM_setValue",
  "// @grant        GM_log",
  "// @grant        GM_addElement",
  `// @updateURL    ${rawDistUrl}`,
  `// @downloadURL  ${rawDistUrl}`,
  "// @supportURL   https://github.com/gbandszxc/weibo-image-downloader/issues",
  "// @license      MIT",
  "// ==/UserScript=="
];

const metadata = metadataLines.join("\n");

const buildOptions = {
  entryPoints: [entryFile],
  outfile: outputFile,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  charset: "utf8",
  legalComments: "none",
  loader: {
    ".css": "text"
  },
  banner: { js: `${metadata}\n` }
};

await mkdir(path.dirname(outputFile), { recursive: true });

if (isWatchMode) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  console.log("Watching userscript build...");
} else {
  await build(buildOptions);
  console.log(`Build completed: ${outputFile}`);
}
