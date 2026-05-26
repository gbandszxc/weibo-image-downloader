import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("userscript metadata includes mobile weibo match rules", () => {
    const buildScript = readFileSync(new URL("../scripts/build.mjs", import.meta.url), "utf8");

    assert.match(buildScript, /@match\s+https:\/\/m\.weibo\.cn\/\*/);
    assert.match(buildScript, /@match\s+https:\/\/www\.m\.weibo\.cn\/\*/);
});

test("userscript metadata uses root-domain @connect rules for subdomain downloads", () => {
    const buildScript = readFileSync(new URL("../scripts/build.mjs", import.meta.url), "utf8");

    assert.match(buildScript, /@connect\s+sinaimg\.cn/);
    assert.match(buildScript, /@connect\s+sina\.cn/);
    assert.match(buildScript, /@connect\s+twimg\.com/);
    assert.match(buildScript, /@connect\s+\*/);
    assert.doesNotMatch(buildScript, /@connect\s+\*\.(sinaimg|sina|twimg)\.com?/);
});

test("userscript metadata grants persistent settings APIs", () => {
    const buildScript = readFileSync(new URL("../scripts/build.mjs", import.meta.url), "utf8");

    assert.match(buildScript, /@grant\s+GM_registerMenuCommand/);
    assert.match(buildScript, /@grant\s+GM_unregisterMenuCommand/);
    assert.match(buildScript, /@grant\s+GM_getValue/);
    assert.match(buildScript, /@grant\s+GM_setValue/);
});
