import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");
const uiSource = readFileSync(new URL("../src/ui.ts", import.meta.url), "utf8");

/** 取某个选择器块的声明文本，找不到返回空串。选择器中的空白按任意空白匹配。 */
function getRuleBody(selector: string): string {
    const pattern = selector
        .split(/\s+/)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("\\s*");
    const match = css.match(new RegExp(`(?:^|\\n)\\s*${pattern}\\s*\\{([^}]*)\\}`));
    return match ? match[1] : "";
}

test("selection grid rows are content-sized so square thumbs are not squashed", () => {
    const grid = getRuleBody(".weibo-img-select-grid");

    // 网格是弹窗 flex 列中的可滚动区域：必须能被压缩，否则行高会撑破 max-height
    assert.match(grid, /flex:\s*1 1 auto/, "网格需作为可伸缩滚动区");
    assert.match(grid, /min-height:\s*0/, "缺少 min-height:0 时 flex 子项无法收缩");
    assert.match(grid, /grid-auto-rows:\s*max-content/, "行高必须由内容决定，不能被容器高度摊分");
    assert.match(grid, /align-content:\s*start/, "行内容需靠上排列，避免多余空间被分到行间");

    // 方形约束挂在网格项上：缩略图自身的 aspect-ratio 不参与网格固有尺寸计算
    const item = getRuleBody(".weibo-img-select-item");
    assert.match(item, /aspect-ratio:\s*1 \/ 1/, "方形约束应放在网格项上");

    const thumb = getRuleBody(".weibo-img-select-thumb");
    assert.match(thumb, /height:\s*100%/, "缩略图应填满网格项而非自行定义宽高比");
    assert.doesNotMatch(thumb, /aspect-ratio/, "缩略图不应再单独声明 aspect-ratio");
});

test("native scrollbar is hidden in favor of the self-drawn immersive thumb", () => {
    const grid = getRuleBody(".weibo-img-select-grid");

    // 原生滚动条在 Windows 上带上下箭头与轨道底色方框，且宿主页面的
    // ::-webkit-scrollbar 规则可能覆盖样式；这里必须彻底隐藏，保留滚动能力。
    assert.match(grid, /scrollbar-width:\s*none/, "标准属性需隐藏原生滚动条");
    assert.match(grid, /overflow-y:\s*auto/, "隐藏滚动条后仍需保留纵向滚动能力");

    const webkit = getRuleBody(".weibo-img-select-grid::-webkit-scrollbar");
    assert.match(webkit, /display:\s*none/, "旧版 Chromium 需用伪元素隐藏");
    assert.doesNotMatch(css, /::-webkit-scrollbar-thumb\s*\{[^}]*rgba\(/, "不应再依赖原生滑块配色");
});

test("self-drawn scrollbar is a 3px bare thumb without track, arrows or background box", () => {
    const bar = getRuleBody(".weibo-img-select-scrollbar");
    assert.match(bar, /position:\s*absolute/, "滑块轨道应覆盖在滚动区之上");
    assert.match(bar, /pointer-events:\s*none/, "未显形时轨道不得拦截指针");
    assert.doesNotMatch(bar, /background(?!-)/, "轨道不得绘制背景方框");
    assert.doesNotMatch(bar, /border/, "轨道不应有边框");
    // 轨道整体落在网格 12px 内边距内，避免遮挡最右列缩略图
    const barRight = Number(bar.match(/right:\s*(\d+)px/)?.[1] ?? NaN);
    const barWidth = Number(bar.match(/width:\s*(\d+)px/)?.[1] ?? NaN);
    assert.ok(barRight + barWidth <= 12, "轨道需落在网格内边距内，不遮挡缩略图点击");

    const thumb = getRuleBody(".weibo-img-select-scrollbar-thumb");
    assert.match(thumb, /width:\s*3px/, "滑块默认应为 3px 细条");
    assert.match(thumb, /border-radius:\s*999px/, "滑块需为圆角胶囊，没有方框感");
    assert.match(thumb, /opacity:\s*0/, "默认不显示，避免常驻遮挡内容");

    // 显形条件：悬停滚动区、滚动中、拖动中、键盘聚焦
    for (const state of [":hover", ".is-scrolling", ".is-dragging", ":focus-within"]) {
        const shown = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].some(([, selectorList, body]) =>
            selectorList.includes(state) &&
            selectorList.includes("weibo-img-select-scrollbar-thumb") &&
            /opacity:\s*1/.test(body)
        );
        assert.ok(shown, `${state} 状态下滑块需显现`);
    }
});

test("scrollbar thumb size and offset are derived from scroll metrics", () => {
    assert.match(uiSource, /thumbHeight\s*=\s*Math\.max\(28,/, "滑块高度需按可视比例计算并保底 28px");
    assert.match(uiSource, /list\.scrollTop\s*\/\s*maxScrollTop/, "滑块位移需按滚动进度映射");
    assert.match(uiSource, /classList\.add\("is-scrolling"\)/, "滚动时需临时显形滑块");
    assert.match(uiSource, /classList\.add\("is-dragging"\)/, "拖动时需保持滑块显形");
    // 挂载后才能量到真实尺寸，同步调用必须在 appendChild 之后
    const appendIndex = uiSource.indexOf("documentRef.body.appendChild(overlay);");
    const syncIndex = uiSource.indexOf("syncScrollbar();", appendIndex);
    assert.ok(appendIndex > 0 && syncIndex > appendIndex, "必须在弹窗挂载后再同步滑块尺寸");
});

test("selection grid supports touch scrolling on mobile", () => {
    const grid = getRuleBody(".weibo-img-select-grid");

    assert.match(grid, /overflow-y:\s*auto/, "网格需纵向可滚动");
    assert.match(grid, /overscroll-behavior:\s*contain/, "滚动到边界时不应带动背景页面");
    assert.match(grid, /touch-action:\s*pan-y/, "移动端应允许单指纵向滑动");
});
