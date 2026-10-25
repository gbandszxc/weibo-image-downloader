# 示例帖子

长按选择弹窗、媒体解析与缩略图回显的回归实测样本。链接均为 2026-10-25 实测可访问；媒体项数量与缩略图来源按当日接口/DOM 记录，站点改版后需重新核对。

## 微博

| 场景 | 链接 | 实测媒体项 | 缩略图来源 |
| --- | --- | --- | --- |
| 超过 9 张多图（12 图） | <https://weibo.com/5264098066/RnRkOFe9Z> | 12 张图片（p1–p12） | 列表/详情九宫格 `sinaimg.cn/orj360/<pid>.jpg`；接口 `pic_infos[*].thumbnail.url` 为 `wap180` |
| Live Photo | <https://weibo.com/7748326636/Q7QZqhJlO> | 1 个 Live Photo + 3 张图片（共 4 项） | `orj360/<pid>.jpg`；Live Photo 视频在 `pic_infos[*].video` |
| 视频 | <https://weibo.com/1983489812/RobnSyqB3?refer_flag=1001030103_> | 1 个视频（`page_info.type = 11`） | `page_info.page_pic`（`orj480/<pid>.jpg`） |
| GIF | <https://weibo.com/7840956949/RnTXoeikG?refer_flag=1001030103_> | 1 个 GIF（`pic_infos[*].type = gif`） | 列表九宫格 `orj360/<pid>.gif` |

接口：`GET https://weibo.com/ajax/statuses/show?id=<mblogid>&locale=zh-CN&isGetLongText=true`（同源，需登录 Cookie）。

关键字段：

- 图片：`pic_ids` + `pic_infos[id].{thumbnail,bmiddle,large,url}`
- 视频：`page_info.{page_pic, media_info.playback_list}`
- 转发帖：媒体在 `retweeted_status` 内

## X

| 场景 | 链接 | 实测媒体项 | 缩略图来源 |
| --- | --- | --- | --- |
| 视频 | <https://x.com/risenishino/status/2114327272803242143> | 1 个视频 | `video.poster` = `pbs.twimg.com/media/HVeZbISb0AA465P.jpg`；接口 `media_url_https` 同源 |
| GIF（`animated_gif`） | <https://x.com/despairdvrer/status/2113589865807778210> | 1 个 GIF | `video.poster` = `pbs.twimg.com/tweet_video_thumb/HVT6xe7XIAArWIP.jpg` |
| 图片 | <https://x.com/TKWcos/status/2114300648644808715> | 2 张图片 | 列表 DOM `img[src*="pbs.twimg.com/media/"]?format=jpg&name=900x900` |

X 图片 CDN 用 `name` 参数取尺寸（`thumb` / `small` / `900x900` / `orig`）；视频与 GIF 的封面同样位于 `pbs.twimg.com`，可直接作为弹窗缩略图。
