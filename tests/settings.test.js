import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { CONFIG } from "../src/config.ts";

test("X GIF menu uses the persisted setting and saves toggles immediately", async () => {
    const { outputFiles } = await build({
        entryPoints: [fileURLToPath(new URL("../src/main.ts", import.meta.url))],
        bundle: true,
        write: false,
        format: "iife",
        loader: { ".css": "text" }
    });
    for (const persistedValue of [undefined, false]) {
        const settings = new Map();
        if (persistedValue !== undefined) settings.set(CONFIG.X_GIF_AUTO_CONVERT_SETTING_KEY, persistedValue);
        const menus = new Map();
        let menuId = 0;
        const document = {
            readyState: "loading",
            addEventListener() {},
            getElementById() { return null; },
            createElement() { return { appendChild() {} }; },
            body: { appendChild() {} }
        };
        vm.runInNewContext(outputFiles[0].text, {
            document,
            window: { document, location: { hostname: "x.com" }, fetch() {} },
            GM_getValue(key, fallback) { return settings.has(key) ? settings.get(key) : fallback; },
            GM_setValue(key, value) { settings.set(key, value); },
            GM_registerMenuCommand(text, callback) { menus.set(++menuId, { text, callback }); return menuId; },
            GM_unregisterMenuCommand(id) { menus.delete(id); },
            setTimeout() {},
            console
        });
        const gifMenu = [...menus.values()].find((menu) => menu.text.startsWith("X平台GIF自动转换"));
        assert.equal(gifMenu.text, `X平台GIF自动转换：[${persistedValue === false ? "关闭" : "开启"}]`);
        gifMenu.callback();
        assert.equal(settings.get(CONFIG.X_GIF_AUTO_CONVERT_SETTING_KEY), persistedValue === false);
        assert.equal(menus.size, 3);
        assert.equal([...menus.values()].find((menu) => menu.text.startsWith("X平台GIF自动转换")).text,
            `X平台GIF自动转换：[${persistedValue === false ? "开启" : "关闭"}]`);
    }
});
