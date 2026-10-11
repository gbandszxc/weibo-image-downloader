import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function buildGifWorker() {
    return build({
        absWorkingDir: projectRoot,
        entryPoints: ["src/x-gif-worker.ts"],
        bundle: true,
        format: "iife",
        platform: "browser",
        target: "es2020",
        charset: "utf8",
        minify: true,
        legalComments: "none",
        write: false,
        metafile: true
    });
}

export function gifWorkerPlugin() {
    return {
        name: "inline-gif-worker",
        setup(builder) {
            builder.onLoad({ filter: /[\\/]x-gif\.ts$/ }, async ({ path: file }) => {
                const worker = await buildGifWorker();
                // declare 行仅供 tsc 类型检查，加载时先移除，避免占位符替换把字符串字面量落进声明位置。
                const rawSource = await readFile(file, "utf8");
                const source = rawSource.replace(/^\s*declare const __X_GIF_WORKER_SOURCE__[^;\n]*;\r?\n?/m, "");
                return {
                    contents: source.replaceAll("__X_GIF_WORKER_SOURCE__", JSON.stringify(worker.outputFiles[0].text)),
                    loader: "ts",
                    resolveDir: path.dirname(file),
                    watchFiles: [file, ...Object.keys(worker.metafile.inputs).map((input) => path.resolve(projectRoot, input))]
                };
            });
        }
    };
}
