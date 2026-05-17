import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("userscript metadata includes mobile weibo match rules", () => {
    const buildScript = readFileSync(new URL("../scripts/build.mjs", import.meta.url), "utf8");

    assert.match(buildScript, /@match\s+https:\/\/m\.weibo\.cn\/\*/);
    assert.match(buildScript, /@match\s+https:\/\/www\.m\.weibo\.cn\/\*/);
});
