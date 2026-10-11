import { createWeiboPlatform } from "./weibo.ts";
import { createXPlatform } from "./x.ts";
import type { WeiboPlatform, WeiboPlatformDeps } from "./weibo.ts";
import type { XPlatform, XPlatformDeps } from "./x.ts";

/** 平台适配器联合类型；两平台共享 id/displayName/getOriginalImageUrl 等公共成员。 */
export type PlatformAdapter = WeiboPlatform | XPlatform;

/** 两个平台工厂依赖的交集：按主机名分发后整体透传给对应工厂。 */
export type PlatformAdapterDeps = WeiboPlatformDeps & XPlatformDeps;

export function createPlatformAdapter(deps: PlatformAdapterDeps): PlatformAdapter {
    const hostname = deps.windowRef.location.hostname || "";
    if (hostname.includes("x.com") || hostname.includes("twitter")) {
        return createXPlatform(deps);
    }

    return createWeiboPlatform(deps);
}
