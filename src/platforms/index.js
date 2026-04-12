import { createWeiboPlatform } from "./weibo.js";
import { createXPlatform } from "./x.js";

export function createPlatformAdapter(deps) {
    const hostname = deps.windowRef.location.hostname || "";
    if (hostname.includes("x.com") || hostname.includes("twitter")) {
        return createXPlatform(deps);
    }

    return createWeiboPlatform(deps);
}
