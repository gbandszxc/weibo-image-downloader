/**
 * esbuild text loader 引入的样式文件在 tsc 侧的最小模块声明。
 */
declare module "*.css" {
    const cssText: string;
    export default cssText;
}
