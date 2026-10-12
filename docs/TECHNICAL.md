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

> 本文保留项目集成视角的功能说明；格式知识、真机逆向全程、A/B 实测证据与平台适配方法详见 [LivePhoto 格式逆向与实现](LIVEPHOTO.md)。

「微博LivePhoto自动合并」开启时，脚本在浏览器本地把 Live Photo 的封面图与 `.mov` 视频合并为单文件 Motion Photo，命名为 `weibo_帖子ID_序号.MP.jpg`（遵循 Google Motion Photo 规范建议的 `*.MP.jpg` 模式），全程纯字节拼接，不重新编码、不转码。关闭该设置时改为保存 **Apple Live Photo 配对文件**（同名 `.jpg` + `.mov`，见下节）；合并过程中任何一步失败（拉流失败、视频不是 ISO-BMFF 容器等）也会自动回退为配对保存，并在 toast 中提示。

**输出文件布局**（实现位于 `src/livephoto.ts` 的 `buildMotionPhoto`，与用户 ColorOS 16 真机文件逐字节对照对齐，并经 A/B 变体真机实测确认）：

```
┌──────────────────────────────────────────────┐
│ JPEG 原始字节（不重编码）                      │
│  EXIF：注入 UserComment="oplus_11534336" 标记 │
│  XMP APP1（依 Adobe 建议排在 Exif APP1 之后）  │
│  MPF APP2（NumberOfImages=2，紧跟 XMP）        │
├──────────────────────────────────────────────┤
│ GainMap 数据（复用主图字节占位，真机布局）      │
├──────────────────────────────────────────────┤
│ 16 字节 0 填充                                │
├──────────────────────────────────────────────┤
│ 视频原始字节（ISO-BMFF；QuickTime brand 原位   │  ← 视频起点
│  等长补丁为 isom/mp41，不转码、不移动 moov）    │
└──────────────────────────────────────────────┘ 视频结束于文件末尾（EOF）
```

XMP 字段与 ColorOS 16 真机文件对齐（无 xpacket 包裹、无 MicroVideo 旧字段），所有长度/偏移字段统一为**视频精确字节数**（视频结束于 EOF，"从文件末尾回退"与"目录顺序读取"两类实现都能正确定位）：

- **Google 新格式**：`GCamera:MotionPhoto="1"`、`GCamera:MotionPhotoVersion="1"`、`GCamera:MotionPhotoPresentationTimestampUs`（解析视频 `moov/mvhd` 取真实时长，无 moov 时回退 iPhone Live Photo 惯例 1.5s，真机样本 ≈1.37s 同量级）+ `Container:Directory`（`Primary` 项 + `MotionPhoto` 项）；
- **OPPO/一加（ColorOS 16）**：`OpCamera:MotionPhotoOwner="oplus"`、`OpCamera:OLivePhotoVersion="2"`、`OpCamera:VideoLength="视频字节数"`，配套 EXIF `UserComment="oplus_11534336"`（ColorOS 16 真机原值；14 时代为 "Oplus_8388608"，标记值随系统版本变化）与 **MPF APP2 段（NumberOfImages=2）**；
- 注意 ColorOS 16 真机已不写 `GCamera:MicroVideo` 旧字段与 xpacket 包裹，产物保持一致以免干扰解析。

**OPPO 识别触发点（A/B 变体真机实测，ColorOS 16.0.10.501）**：同一微博素材生成四个候选变体侧载真机——V1 全复刻（XMP 三条目 + GainMap 数据 + MPF 双条目 + 真实 PTS）、V2 仅 XMP 三条目（MPF 单条目）、V3 仅 MPF 双条目（XMP 两条目）、V4 真机视频段。结果 **V1/V3/V4 可识别播放、V2 显示静态图**：MPF `NumberOfImages=2`（Primary + GainMap 条目 + GainMap 数据 + 16B 填充）是识别的必要充分条件，XMP 三条目、GainMap 声明、视频内容、PTS 取值均非关键。产物据此按 V3 最小已验证布局实现（与真机验证通过的 V3 文件逐字节一致），代价是文件体积约增加一倍（GainMap 数据复用主图字节，仅占位满足结构校验）。

**飞牛相册识别触发点（A/B 第 2/3 轮真机实测，fnOS）**：第 1 轮 8 个单变量变体（MicroVideo 双写、Make 伪装、jxrs 尾标、ICC/QTI 段移植、SEFT 封装、MPF 长度自洽、扩展名对照）全部失败；第 2 轮锁定根因——**微博封面图转自 iPhone，EXIF `Make="Apple"` + Apple MakerNote（ContentIdentifier 配对标记）使飞牛按厂商分支走 Apple 配对路线，对内嵌视频视而不见**。X2（伪装 Pixel + 清 Apple 痕迹）与 X3（伪装 OnePlus + 清 Apple 痕迹，保留 oplus XMP）均可识别，而仅加 xpacket 包裹的 X1 仍失败。合并流程现已内置去 Apple 化（`neutralizeAppleExif`：Make/Model 改写为 OnePlus/OnePlus 13、MakerNote 条目中和、孤儿数据清零），产物与真机验证通过的 X3 逐字节一致。

实现要点：

- JPEG 段按 marker 结构逐段解析定位插入点，绝不全文件搜索 `FF D9` 找 EOI（EXIF 内嵌缩略图含假 EOI）。已有普通 XMP 段时整段原位替换；已含 `MotionPhoto`/`MicroVideo` 标记的图片拒绝重复合并。
- EXIF 注入通过 TIFF IFD 结构化改写完成：在 Exif IFD 中按 tag 序插入 UserComment 条目，条目表增长 12 字节，所有指向表后数据的偏移同步平移（缩略图 IFD 指针、MakerNote 数据块整体后移，MakerNote 内部偏移以其自身为基不受影响）；结构不符合预期时跳过注入，不影响合并。
- MPF 段按 CIPA 规范大端 TIFF 编码，`MPEntry` 的 size/dataOffset 均**相对 MPF TIFF 起点**填写（真机同值 50）；Primary 条目 size = 含 MPF 段在内的 JPEG 部分总长，GainMap 条目 size = 主图字节数、dataOffset 指向 JPEG 尾部之后。
- 视频必须是 ISO-BMFF 容器（字节 4-7 为 `ftyp`）。微博 LivePhoto 视频存在 QuickTime MOV（`ftyp qt`）与 MP4 两种，前者会被原位等长补丁为 `isom`/`mp41` brand——box 尺寸不变、`stco` 偏移无需修补，主流播放器直接兼容；已是 MP4 brand 的视频保持原样。
- **iPhone 原始多轨视频裁剪**（A/B 第 5 轮真机实测）：未转码的 iPhone 实况视频含 4 条 `auxv` 深度辅助轨、LPCM 裸音轨与 4 条 `mebx` 元数据轨，OPPO 相册动图播放器识别正常但**播放失败**（Windows/飞牛正常）。合并前按轨道裁剪（`stripVideoAuxiliaryTracks`）：仅保留视频轨（hdlr=vide）与 AAC 音轨（soun+mp4a），删除 trak box 重组 moov——仅处理 moov 后置布局（此布局下 mdat 不移动、`stco` 绝对偏移天然有效），faststart 视频为微博转码产物、结构干净，保持原样。
- 不写 Samsung SEFT 尾部：厂商真机文件均无尾部，且 SEF 尾部会使"文件末尾-长度"定位到错误位置。取舍是**三星相册不识别本产物**（三星相册依赖 SEFT trailer）；Google 相册、Windows 11 照片按 XMP 识别不受影响。

**实测/资料兼容性矩阵**：

| 平台 | 动态效果 | 说明 |
| --- | --- | --- |
| Windows 11 照片（2023+） | ✓ 实测 | 按 XMP 识别 |
| Google 相册（App/Web） | ✓ | 新旧格式双写 |
| OPPO/一加（ColorOS 16） | ✓ 实测 | ColorOS 16.0.10.501 真机 A/B 变体实测；触发点为 MPF 双条目 |
| 小米（HyperOS） | ✓ 理论兼容 | 官方文档：按 XMP 的 MotionPhoto 关键字索引；仅 HyperOS 支持第三方合成产物 |
| 飞牛相册（fnOS） | ✓ 实测 | 按厂商分支解析：需去 Apple 化（封面图转自 iPhone，Make=Apple 触发其配对文件分支），已内置处理 |
| 三星相册 | ✗ | 依赖 SEFT trailer，与 OPPO 布局互斥，本产物不写 |
| macOS 预览/Quick Look、iOS 相册 | ✗（合并产物）✓（配对文件） | 单文件动态照片为平台限制；关闭合并时的同名 jpg+mov 配对文件一起导入照片 App 可作为 Live Photo 播放 |
| IrfanView、ACDSee、Honeyview | ✗ | 按静态图处理；ImageGlass 9.3+ 可识别 |

**传输与使用注意**：合并产物依赖 JPEG 内的 XMP/EXIF/MPF 元数据，微信普通图片、QQ、部分云盘传输会重压缩并剥掉这些段导致动态效果丢失——请使用 USB、"原图"方式或可直接保存的传输通道；落盘后等待相册重新扫描索引。

## Apple Live Photo 配对保存（关闭合并 / 合并失败回退）

Apple 生态（iOS 相册、macOS 照片）不识别任何单文件动态照片，其 Live Photo 是**成对文件机制**：同名 `.jpg`/`.HEIC` 与 `.mov` 同时导入，且两侧携带**同一个 16 字节 ContentIdentifier UUID** 时，照片 App 才会把它们关联为一个 Live Photo。实现位于 `src/apple-pair.ts`（`pairAppleLivePhoto`）。

- **jpg 侧**：EXIF MakerNote（maker `"Apple iOS"`）中 tag `0x0011`（ContentIdentifier）写入 UUID 二进制值；已有 Apple MakerNote 时原位改写，没有则按 Apple 官方布局构造（header + MakerIFD），注入方式与合并路径的 UserComment 注入同为「条目表增长 + 表后偏移平移」；无 EXIF 或结构异常时静默放弃（该侧缺配对标记，不阻断下载）。配对 UUID 优先复用 jpg 已有 ContentIdentifier（微博转存图常保留 iPhone 原始值），缺失时用 `crypto.randomUUID()` 现场生成。
- **mov 侧**：向 `moov/udta/meta(QuickTime 风格, hdlr='mdta')/keys+ilst` 注入 `com.apple.quicktime.content.identifier`（16 字节 binary data）与 `com.apple.quicktime.still-image-time`（int8 = -1，配合指示帧）；缺 `udta`/`meta`/`keys`/`ilst` 时逐级构造，祖先 box 尺寸全部重建。
- **stco/co64 修复**：微博在线视频是 faststart 布局（moov 在 mdat 之前），moov 内插入元数据会使 mdat 及其后数据整体后移，必须给 moov 内全部 `stco`/`co64` 的 chunk 绝对偏移加上 delta，否则视频索引失效（与 qt-faststart 同思路）；box 出现 `size=1`（64 位 largesize）等无法安全重建的结构时放弃注入、保留原始视频。
- **文件命名**：配对要求两侧同名（仅扩展名不同），关闭合并时保存为 `weibo_帖子ID_序号.jpg` + `weibo_帖子ID_序号.mov`（不再有 `_live` 后缀）；两个文件需**一起**导入照片 App（AirDrop 整个文件夹 / USB 同步 / 导入工具）才能配对成功，单传 jpg 或重命名任一侧都会破坏配对。
