import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function buildGifWorker() {
    return build({
        absWorkingDir: projectRoot,
        entryPoints: ["src/x-gif-worker.js"],
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
            builder.onLoad({ filter: /[\\/]x-gif\.js$/ }, async ({ path: file }) => {
                const worker = await buildGifWorker();
                const source = await readFile(file, "utf8");
                return {
                    contents: source.replaceAll("__X_GIF_WORKER_SOURCE__", JSON.stringify(worker.outputFiles[0].text)),
                    loader: "js",
                    resolveDir: path.dirname(file),
                    watchFiles: [file, ...Object.keys(worker.metafile.inputs).map((input) => path.resolve(projectRoot, input))]
                };
            });
        }
    };
}
