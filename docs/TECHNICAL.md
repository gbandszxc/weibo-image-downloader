# 技术细节

> 维护时机：图片 URL 转换规则、批量下载策略、X 动图 GIF 转换实现或微博 Live Photo 合并机制发生变化时，同步更新本文档。

## 图片URL转换

**微博图片URL**通常包含尺寸标识：
- `thumb180` / `orj360` - 缩略图
- `bmiddle` - 中图
- `mw690` - 大图
- `large` - 原图

**X平台图片URL**使用查询参数：
- `name=small` - 缩略图
- `name=large` - 大图
- `name=orig` - 原图

脚本会自动将任意尺寸的URL转换为原图URL。

## 下载策略

- 每批下载 5 张图片
- 批次间延迟 300ms
- 避免触发平台的反爬机制
- 兼容 Chrome 浏览器的下载限制
- Blob 保存（Live Photo 合并产物、X GIF 转换产物）统一优先走浏览器原生 `a[download]`：个别浏览器/下载管理器会忽略 `GM_download` 对 Blob 的命名，以内部 UUID + 内容嗅探扩展名落盘（例如把动态照片存成 `*.exif`）；`a[download]` 在各浏览器行为一致，可稳定保留文件名。`GM_download` 仅作回退；直链下载仍优先 `GM_download`

## X 动图转换（MP4 → GIF）实现

「X平台GIF自动转换」开启时，转换在浏览器本地完成：解码 MP4，再编码为循环播放的 `.gif`，不上传媒体、不加载外部运行时脚本。转换保留源视频尺寸和完整时长，以 20 FPS 采样、每帧最多 256 色编码；自动合并重复帧、裁剪变化区域并复用未变化像素，无损减少编码后的冗余数据，不额外降低颜色数、尺寸或采样帧率。压缩效果取决于画面变化程度，GIF 文件通常仍比 MP4 大，较长或较高分辨率的动图转换会更慢、占用更多内存。转换失败会提示失败，可关闭自动转换后重试下载 MP4 源文件。

转换会在颜色量化前跳过像素完全相同的重复帧，并优化像素扫描。支持 Web Worker 时，全页最多使用两个线程处理量化、颜色映射、差分压缩和 GIF 编码；支持 OffscreenCanvas 时，帧绘制及像素读取也在 Worker 中完成。主线程按原帧序组装独立编码的 GIF 帧片段，每次转换最多保留三个待量化帧和三个待编码帧，不缓存整段视频的原始像素，也不反复扩容整段 GIF 的编码缓冲区。低核心数设备使用一个 Worker；Worker 或离屏绘制不可用、报错或超时时自动回退，并在主线程计算步骤间让出执行权，优先响应页面输入。X 公开媒体的 fetch 下载回退不携带凭据，以兼容 CDN 的跨域策略。

### 性能验证记录

2026-10-11 在 Windows 11、Chrome 154、20 逻辑核心设备的当前 X 页面，以 [1280×720、5.6 秒的示例帖第二段动图](https://x.com/catboyhannibaI/status/2107894103069405534) 验证滚动响应：原量化并行版本的三次纯转换测到 82–89 个主线程长任务，帧间隔峰值约 152–170ms；移出帧绘制、差分和编码后，纯转换测试为 0 个主线程长任务、帧间隔峰值 55ms。长按选择、实际保存和转换期间翻页也通过验证，保存用时约 10.7 秒，产物为 34,135,778 字节、80 帧、5.6 秒的循环 GIF，与优化前 SHA-256 一致。滚动加载时仍能观察到 X 自身及其他扩展的长任务；此结果仅代表该样本与设备，未测功耗或风扇噪声。

## 微博 Live Photo 合并（JPEG + MOV → 单文件 Motion Photo）

「微博LivePhoto自动合并」开启时，脚本在浏览器本地把 Live Photo 的封面图与 `.mov` 视频合并为单文件 Motion Photo，命名为 `weibo_帖子ID_序号.MP.jpg`（遵循 Google Motion Photo 规范建议的 `*.MP.jpg` 模式），全程纯字节拼接，不重新编码、不转码。关闭该设置时回退为分别保存 `.jpg` 与 `_live.mov`；合并过程中任何一步失败（拉流失败、视频不是 ISO-BMFF 容器等）也会自动回退为分别保存，并在 toast 中提示。

**输出文件布局**（实现位于 `src/livephoto.ts` 的 `buildMotionPhoto`）：

```
┌─────────────────────────────────────────────┐
│ 原始 JPEG 字节（含 EXIF，不改动）              │
│  在最后一个 APP1 段后插入 XMP APP1 段          │
├─────────────────────────────────────────────┤
│ Samsung SEF 字段头 24 字节                    │
│   [00 00 30 0A][长度 16]["MotionPhoto_Data"] │
│ 视频原始字节（微博 LivePhoto 为 H.264 MOV）    │  ← 视频起点
│ Samsung SEF 索引尾 32 字节                    │
│   ["SEFH"][版本 106][字段数 1][字段索引][SEFT] │
└─────────────────────────────────────────────┘（SEFT 必须位于文件末尾）
```

XMP 同时写入三套识别标记，一份文件多端识别：

- **Google 新格式**：`GCamera:MotionPhoto="1"`、`GCamera:MotionPhotoVersion="1"`、`GCamera:MotionPhotoPresentationTimestampUs="1500000"`（iPhone Live Photo 静态帧标准位置 ≈1.5s）+ `Container:Directory`（`Primary` 项 + `MotionPhoto` 项，`Item:Length` 覆盖视频与 SEF 尾部，读至文件末尾）；
- **Google 旧格式（MVIMG 时代）**：`GCamera:MicroVideo="1"`、`GCamera:MicroVideoVersion="1"`、`GCamera:MicroVideoOffset="视频长度+32"`——偏移语义为"从文件末尾回退到视频起始字节的字节数"；
- **厂商相册字段**：镜像真机文件的 `OpCamera`（OPPO）与 `MiCamera`（小米）XMP 字段，提升国产 ROM 自带相册的识别率。

实现要点：

- JPEG 段按 marker 结构逐段解析定位插入点（XMP APP1 依 Adobe 建议排在 Exif APP1 之后）；绝不全文件搜索 `FF D9` 找 EOI，避免命中 EXIF 内嵌缩略图的假 EOI。已有普通 XMP 段时整段原位替换；已含 `MotionPhoto`/`MicroVideo` 标记的图片拒绝重复合并。
- 视频必须是 ISO-BMFF 容器（字节 4-7 为 `ftyp`）。微博 LivePhoto 视频为 `ftyp qt`（QuickTime MOV）的 H.264 流，moov 在文件尾部，直接拼接即可播放，无需转码；Google 新规范明确允许内嵌 `video/quicktime`。
- Samsung SEF trailer 字节布局参考 doodspav/motionphoto 与 ExifTool 对三星真机文件的逆向结论（视频长度与 `MicroVideoOffset` 相差 56 字节的 SEF 开销）。
- 产物兼容性（实测/资料结论）：Google 相册（新旧格式双写）、三星相册（SEFT）、Windows 11 照片（2023+ 版本）、ImageGlass 9.3+、Immich 等自托管相册可识别动态效果；macOS Quick Look、iOS 相册采用 Apple 成对文件机制（EXIF ContentIdentifier + MOV `mdta`），不识别任何单文件动态照片格式，仅显示静态封面；IrfanView、ACDSee、Honeyview 按静态图处理。
