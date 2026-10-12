# 微博 LivePhoto → 单文件 Motion Photo：格式逆向与实现概述

> 面向开源贡献者的格式知识与适配指南。本文汇总把微博 LivePhoto（一张 JPEG + 一段 MOV）合并为单文件 Motion Photo 的全部逆向结论、字节布局、实测证据与实现要点，供后来者查阅与适配其他平台参考。
>
> 实现位置：`src/livephoto.ts`（单文件合并）、`src/apple-pair.ts`（Apple 配对保存，见文末）。
> 项目集成说明见 [技术细节](TECHNICAL.md) 的 Live Photo 章节。

## 背景

微博 LivePhoto 在页面上是一张封面图（`sinaimg.cn/...jpg`）加一段视频（`...mov`），两者分开放下载体验割裂。业界的"动态照片"（Motion Photo / Live Photo 等）本质是**把视频以约定结构内嵌进 JPEG 文件**，让相册类应用能识别并播放。本脚本的目标：浏览器内纯字节级拼接（不转码、不重编码），产出尽可能多平台可识别的单文件动态照片。

## 各家动态照片机制速览

| 体系 | 机制 | 单文件 | 备注 |
| --- | --- | --- | --- |
| Google 新格式（GCamera MotionPhoto） | JPEG 头部写 XMP：`GCamera:MotionPhoto="1"` + `Container:Directory` 声明各条目长度；**视频定位 = 从文件末尾回退 `Item:Length` 字节** | ✓ | 当前主流，本项目基准 |
| Google 旧格式（MicroVideo） | XMP 写 `GCamera:MicroVideo="1"` + `MicroVideoOffset`（同样从 EOF 回退） | ✓ | 已废弃，新产物不再依赖 |
| OPPO/一加/realme（oplus） | Google 新格式 + `OpCamera:*` 私有字段 + EXIF `UserComment` 版本标记 + **MPF 双条目** + GainMap 数据 + 16B 填充 | ✓ | 本文逆向主角 |
| 三星（Samsung） | 文件**尾部**追加 SEFT（SemExtendedFormat）trailer，视频嵌在 SEF 结构内 | ✓ | 与"EOF 回退"定位互斥；真机文件无 SEFT 的厂商布局与三星互不识别 |
| Apple（iPhone Live Photo） | **成对文件**机制：同名 HEIC/JPG + MOV，两侧携带同一 16 字节 ContentIdentifier UUID（jpg 在 Apple MakerNote tag 0x0011，mov 在 QuickTime mdta 元数据） | ✗ 无单文件格式 | 由关闭合并路径的 `src/apple-pair.ts` 支持 |

**核心事实：视频定位的主流方式是"从文件末尾回退固定字节数"**——这意味着视频必须结束于 EOF，且长度字段必须精确到字节。三星是唯一例外（尾部结构定位），因此与主流布局互斥。

## 真机逆向：ColorOS 16 原生动态照片的完整结构

样本：一加 13（ColorOS 16.0.10.501）相机拍摄的动态照片，15,988,612 字节。逐段解析结果：

```
偏移 0        SOI
APP1  Exif       30,028 B  大端 TIFF；IFD0 → Exif IFD(38 条) → GPS IFD
                            Make="OnePlus" Model="OnePlus 13"
                            Exif IFD 内：UserComment="ASCII\0\0\0oplus_11534336"（版本标记）
                            MakerNote 为 JSON 文本（非标准 IFD，{"Pi":"0","tmc":"0",...}）
APP1  XMP         1,685 B  见下方字段表
APP2  MPF            88 B  NumberOfImages=2（Primary + GainMap，两个 MPEntry）
APP2  ICC_PROFILE      564 B
APP4  QTI Debug Metadata  ×2（高通调试段，非必需）
DQT / SOF0 / DHT / SOS ... 扫描数据 ... EOI @ 6,098,622
[GainMap 图像]  694,434 B（HDR 增益图，独立 JPEG）
[16 字节 0 填充]
[视频]  9,195,554 B   ftyp major brand = mp42（原生录制，非转码）
[文件尾] jxrs footer（JSON 数组 + "]" + 0x00 + "jxrs" + 4 字节长度，水印等元数据索引）
```

XMP 字段全表（无 xpacket 包裹、无 MicroVideo 旧字段）：

```
hdrgm:Version="1.0"                                   ← HDR 增益图版本
GCamera:MotionPhoto="1"
GCamera:MotionPhotoVersion="1"
GCamera:MotionPhotoPresentationTimestampUs="1366530"   ← 静态帧 PTS = 视频真实时长
OpCamera:MotionPhotoPrimaryPresentationTimestampUs="1366530"
OpCamera:MotionPhotoOwner="oplus"
OpCamera:OLivePhotoVersion="2"
OpCamera:VideoLength="8160556"                         ← 语义存疑（≠ 视频实际字节数）
Container:Directory 三条目：
  Primary   (image/jpeg, Length=0)
  GainMap   (image/jpeg, Length=694434)
  MotionPhoto (video/mp4, Length=9195554)              ← 精确等于「文件尾 − 视频起点」
```

关键验证：`MotionPhoto` 条目的 `Item:Length=9195554` 与「文件长度 − 视频起点」**分毫不差**——确认视频定位完全依赖"EOF 回退 XMP 长度"，MPF 段不参与视频定位。

## A/B 变体实测：识别触发点的二分

字段级对齐（UserComment、XMP、VideoLength 全部照抄真机）后 OPPO 相册仍显示静态图，说明识别开关不在字段值上。改用**A/B 变体矩阵**：同一微博素材生成多个候选文件，每个只改一个结构变量，一次性侧载真机二分。

| 变体 | 与基线的唯一差异 | OPPO ColorOS 16.0.10.501 | Windows 11 照片 |
| --- | --- | --- | --- |
| 基线（旧产物） | MPF 单条目，EOI 紧贴视频 | ✗ 静态图 | ✓ |
| V2 | XMP 三条目（hdrgm + GainMap 声明 + 数据） | ✗ 静态图 | ✓ |
| V3 | MPF 双条目 + GainMap 数据 + 16B 填充 | **✓ 播放** | ✓ |
| V1 | V2 + V3 的全部因素 | ✓ 播放 | ✓ |
| V4 | V1 + 真机原生视频段 | ✓ 播放 | ✓ |

结论：**MPF `NumberOfImages=2`（Primary + GainMap 双条目 + 实体 GainMap 数据 + 16B 填充）是 OPPO 识别的必要充分条件**。XMP 字段、GainMap 声明、视频内容、PTS 取值均非关键。

方法论教训（写给做适配的人）：厂商识别逻辑可能不看任何"文档化"字段，而是结构特征开关。字段对齐无效时，尽早切换到"控制变量 + 真机二分"，比继续翻规范快得多。

**第 2/3 轮（飞牛相册 fnOS）**：第 1 轮 8 个单变量变体（XMP 字段、Make 伪装、厂商段移植、SEFT 尾部、MPF 长度自洽、扩展名对照）全部失败；第 2 轮转向"解析器风格 + 组合探针"后命中——根因是**微博封面图转自 iPhone：EXIF `Make="Apple"` + Apple MakerNote（ContentIdentifier）让飞牛按厂商分支走 Apple 配对路线，只找同名 MOV 而无视内嵌视频**。伪装 Make（Google 或 OnePlus）+ 中和 Apple MakerNote + 清零残留字节后即可识别，且 XMP 风格（oplus/纯 Google）、xpacket 有无均不敏感。实现见 `neutralizeAppleExif`，产物与真机验证通过的 X3 变体逐字节一致。

## 最终实现布局（`buildMotionPhoto`）

```
┌──────────────────────────────────────────────┐
│ JPEG 原始字节（不重编码）                      │
│  EXIF：TIFF 结构化注入 UserComment="oplus_11534336" │
│  XMP APP1（插在最后一个 APP1 之后；已有则整段替换）  │
│  MPF APP2（NumberOfImages=2，紧跟 XMP）        │
├──────────────────────────────────────────────┤
│ GainMap 数据 = 主图原始字节副本（占位，校验器    │
│  只验结构不比对内容）                          │
├──────────────────────────────────────────────┤
│ 16 字节 0 填充                                │
├──────────────────────────────────────────────┤
│ 视频原始字节（QuickTime brand 原位等长补丁为    │
│  isom/mp41，box 尺寸不变、stco 无需修补）      │
└──────────────────────────────────────────────┘ 视频结束于 EOF
```

产物与真机验证通过的 V3 变体逐字节一致（自动化比对验证）。体积代价：GainMap 占位使产物约为图片原大小的两倍——以实测通过的字节布局优先，如需瘦身可另行二分"GainMap 数据是否可缩小"。

各环节实现要点：

1. **JPEG 段扫描**（`findJpegXmpInsertPoint`）：按 marker 逐段解析定位插入点，XMP 按 Adobe 建议插在最后一个 APP1 之后。**绝不全文件搜索 `FF D9` 找 EOI**——EXIF 内嵌缩略图里全是假 EOI。已含 `MotionPhoto`/`MicroVideo` 标记的图片拒绝重复合并。
2. **EXIF 注入**（`injectExifUserComment`）：TIFF IFD 结构化改写。在 Exif IFD 中按 tag 序插入 UserComment（tag 0x9286，type 7）条目：条目表增长 12 字节 → 表后所有数据偏移 +12（IFD0 条目偏移、next IFD 指针同步平移）；MakerNote 数据块随整体后移但其内部偏移以自身为基，无需修改。已有 UserComment 且容量足够时原位覆写。图片无 EXIF 时构造仅含 UserComment 的最小段（`buildMinimalExifApp1`）。结构异常一律静默跳过注入，不阻断下载。
3. **XMP 报文**（`buildMotionPhotoXmp`）：两条目 Directory（Primary + MotionPhoto）；PTS 解析视频 `moov/mvhd` 取真实时长（`parseMvhdDurationUs`，v0/v1 两种 mvhd 都要处理），无 moov 回退 1,500,000µs；不写 xpacket 包裹与 MicroVideo 旧字段（真机已废弃，避免干扰解析）。
4. **MPF 段**（`buildMpfSegment`）：大端 TIFF，3 个 IFD 条目（MPFVersion/NumberOfImages/MPEntry）。**MPEntry 的 size/dataOffset 按 CIPA 规范相对 MPF TIFF 起点填写**（本段数据区偏移 = 50）；Entry0 Primary 属性 `0x00030000`、size = 含 MPF 段在内的 JPEG 部分总长；Entry1 GainMap 属性 0、size = 主图字节数、dataOffset 指向 JPEG 尾部之后。
5. **视频 brand 补丁**（`patchVideoContainerBrand`）：微博 LivePhoto 视频有 QuickTime（`ftyp qt  `）与 MP4 两种。QuickTime 的 major brand 与兼容品牌均 4 字节，可**原位等长改写**为 `isom`/`mp41`——不移动任何 box，stco 偏移天然有效。注意：一旦要在 MOV 里插入/删除字节（如 Apple 配对注入元数据），必须遍历 moov 内全部 `stco`/`co64` 修正 chunk 绝对偏移（见 `src/apple-pair.ts`，qt-faststart 同思路）。

## 陷阱清单（适配必读）

1. **找 EOI 只能从 SOI 逐段走到 SOS 再顺序扫**，全文件搜 `FF D9` 必然踩中缩略图假 EOI。
2. **MPF 偏移基准是 MPF TIFF 起点**（"MPF\0" 之后），不是段头也不是文件头——基准错 4 字节，某些解析器直接读飞。
3. **视频长度字段必须精确**：定位靠"EOF − Length"，差 1 字节视频就废。补丁 brand 这类等长操作最安全。
4. **XMP 整段替换时**要把旧段从布局中裁掉（头部截到旧段起点），否则出现两个 XMP 段。
5. **TIFF 条目表增删后**，所有指向表后数据的偏移（IFD0 条目、next IFD、缩略图指针）都要平移；MakerNote 以自身为基是特例。
6. **已合并检测**：XMP 里出现 `MotionPhoto` 或 `MicroVideo` 即拒绝重复合并。
7. **厂商标记值随系统版本漂移**：`UserComment` 在 ColorOS 14 真机为 `Oplus_8388608`、ColorOS 16 为 `oplus_11534336`。适配时优先从目标系统真机样本取值。
8. **EXIF `Make` 决定相册的解析分支**：飞牛相册实测按 Make/MakerNote 分派格式——`Make="Apple"` 即走 Apple 配对文件路线、对内嵌视频视而不见。来源为 iPhone 的图做安卓动态照片前必须去 Apple 化（改写 Make/Model、中和 MakerNote、清零残留字节）。
9. **传输链路会毁掉一切**：微信/QQ 普通传输、部分云盘会重压缩图片并剥掉全部元数据段。测试必须用 USB 或"原图"通道。

## 兼容性实测矩阵（2026-10）

| 平台 | 动态效果 | 依据 |
| --- | --- | --- |
| Windows 11 照片（2023+） | ✓ | 按 XMP 识别，实测 |
| OPPO/一加（ColorOS 16） | ✓ | 真机 A/B 实测，触发点 = MPF 双条目 |
| Google 相册 | ✓ | Google 新格式规范实现 |
| 小米 HyperOS 相册 | ✓（理论） | 官方文档称按 XMP MotionPhoto 关键字索引 |
| 飞牛相册（fnOS） | ✓ | 实测：按厂商分支解析，Make=Apple（微博封面图转自 iPhone）会走 Apple 配对分支忽略内嵌视频；去 Apple 化后识别 |
| 三星相册 | ✗ | 依赖 SEFT 尾部，与 EOF 回退布局互斥 |
| macOS / iOS（合并产物） | ✗ | Apple 仅认成对文件；关闭合并时同名 jpg+mov 配对保存可导入为 Live Photo |

## 适配新平台的通用方法

以"一个基线 + 单变量变体"流程推进：

1. **拿到真机原生样本**：用目标平台的相机拍一张动态照片传到电脑（USB/原图，禁微信传输）。
2. **逐段解剖**：按本文"真机逆向"一节的方式 dump 全部 JPEG 段、XMP 字段、MPF 条目、文件尾结构，与现有产物做表级 diff。
3. **生成 A/B 变体**：以当前 `buildMotionPhoto` 为基线，每个候选只改一个因素（XMP 加字段 / MPF 条目数 / UserComment 值 / Make/Model 伪装 / 文件尾结构 / 段的增删）。注意任何头部增删都要联动重算全部长度与偏移字段。
4. **一次性侧载二分**：所有变体用 USB 拷进手机相册，记录哪些"能动"，一轮即可锁定触发因素；命中的最小变体即是新的实现布局。
5. **回归锚点**：新布局确定后，与验证通过的变体文件做逐字节比对作为回归测试锚（本项目用同一素材重跑 `buildMotionPhoto` 与已验证文件 diff，要求零差异）。

## Apple 配对保存（`src/apple-pair.ts`）

单文件 Motion Photo 在 Apple 生态无解（平台限制），脚本对"关闭合并 / 合并失败回退"路径改为**成对保存**：生成一个 ContentIdentifier UUID，jpg 侧写入 Apple MakerNote（maker `"Apple iOS"`）tag 0x0011，mov 侧向 `moov/udta/meta(hdlr=mdta)/keys+ilst` 注入 `com.apple.quicktime.content.identifier`（16 字节 binary）与 `com.apple.quicktime.still-image-time`（int8 −1）。要点：

- UUID 优先复用 jpg 已有值（微博转存图常保留 iPhone 原始 UUID），缺失时 `crypto.randomUUID()`；
- moov 内插入数据会使 mdat 后移，**必须修复全部 `stco`/`co64` chunk 偏移**；
- 配对要求两文件**同名**（`weibo_帖子ID_序号.jpg` + `.mov`），且必须一起导入照片 App；
- 任一侧结构异常静默降级（该侧缺配对标记），绝不阻断下载。
