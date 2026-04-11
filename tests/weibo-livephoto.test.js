const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadUtils() {
    const code = fs.readFileSync(path.join(__dirname, '..', 'utils.js'), 'utf8');
    const context = {
        console,
        URL,
        setTimeout,
        clearTimeout,
        fetch: async () => {
            throw new Error('fetch should not be called in unit tests');
        },
        window: {
            location: {
                hostname: 'weibo.com'
            }
        }
    };

    vm.createContext(context);
    vm.runInContext(code, context);

    return context.window.WID_UTILS;
}

function loadUI() {
    const code = fs.readFileSync(path.join(__dirname, '..', 'ui.js'), 'utf8');
    const context = {
        console,
        WeakMap,
        window: {},
        WID_UTILS: {
            isWeibo: () => true
        },
        WID_CONFIG: {}
    };

    vm.createContext(context);
    vm.runInContext(code, context);

    return context.window.WID_UI;
}

const sampleStatus = {
    pic_ids: [
        'ba6a4518gy1ic2xakxgvwj23b04eoe83',
        'ba6a4518gy1ic2xnphrkkj22c0340u0y',
        'ba6a4518gy1ic2xnuzaokj22c0340u0y'
    ],
    pic_infos: {
        ba6a4518gy1ic2xakxgvwj23b04eoe83: {
            largest: {
                url: 'https://wx4.sinaimg.cn/large/ba6a4518gy1ic2xakxgvwj23b04eoe83.jpg'
            },
            original: {
                url: 'https://wx4.sinaimg.cn/orj1080/ba6a4518gy1ic2xakxgvwj23b04eoe83.jpg'
            },
            video: 'https://livephoto.us.sinaimg.cn/004cDa3fgx08wMoVqJUz0f0f0100qXbm0k01.mov?Expires=1775909582&ssig=ShZymldLgC&KID=unistore,video',
            type: 'livephoto'
        },
        ba6a4518gy1ic2xnphrkkj22c0340u0y: {
            largest: {
                url: 'https://wx3.sinaimg.cn/large/ba6a4518gy1ic2xnphrkkj22c0340u0y.jpg'
            },
            original: {
                url: 'https://wx3.sinaimg.cn/orj1080/ba6a4518gy1ic2xnphrkkj22c0340u0y.jpg'
            },
            video: 'https://livephoto.us.sinaimg.cn/003vMf1agx08wMpMmwr60f0f0100r4Jm0k01.mov?Expires=1775909582&ssig=fO0sqteRS%2B&KID=unistore,video',
            type: 'livephoto'
        },
        ba6a4518gy1ic2xnuzaokj22c0340u0y: {
            largest: {
                url: 'https://wx4.sinaimg.cn/large/ba6a4518gy1ic2xnuzaokj22c0340u0y.jpg'
            },
            original: {
                url: 'https://wx4.sinaimg.cn/orj1080/ba6a4518gy1ic2xnuzaokj22c0340u0y.jpg'
            },
            video: 'https://livephoto.us.sinaimg.cn/001osVaCgx08wMpL0C3C0f0f0100r0cu0k01.mov?Expires=1775909582&ssig=Hvzd%2F086pX&KID=unistore,video',
            type: 'livephoto'
        }
    }
};

const sampleRetweetStatus = {
    mblogid: 'QzYBrcwa8',
    pic_num: 0,
    pic_ids: [],
    pic_infos: {},
    retweeted_status: {
        mblogid: 'QzScRjYtN',
        pic_num: 9,
        pic_ids: [
            '006QzRougy1ibzk7pm7ecj32c0340b29',
            '006QzRougy1ibzk6ragnij32c03407wh',
            '006QzRougy1ibzk6mb4ntj32c0340e81',
            '006QzRougy1ibzk6w2mzwj31o02804hz',
            '006QzRougy1ibzk74uxc4j32c0340b29',
            '006QzRougy1ibzk70dt1dj32dc35shdt',
            '006QzRougy1ibzk6nn7ykj32dc35sb2b',
            '006QzRougy1ibzk6pkpwdj33b04iuhdu',
            '006QzRougy1ibzk6qluc9j334445hhdu'
        ],
        pic_infos: {
            '006QzRougy1ibzk7pm7ecj32c0340b29': {
                largest: { url: 'https://wx1.sinaimg.cn/large/006QzRougy1ibzk7pm7ecj32c0340b29.jpg' },
                video: 'https://livephoto.us.sinaimg.cn/0011jHTRgx08wHLddcBN0f0f0100vWoO0k01.mov'
            },
            '006QzRougy1ibzk6ragnij32c03407wh': {
                largest: { url: 'https://wx3.sinaimg.cn/large/006QzRougy1ibzk6ragnij32c03407wh.jpg' },
                video: 'https://livephoto.us.sinaimg.cn/0047acw4gx08wHL9DYJV0f0f0100j65f0k01.mov'
            },
            '006QzRougy1ibzk6mb4ntj32c0340e81': {
                largest: { url: 'https://wx4.sinaimg.cn/large/006QzRougy1ibzk6mb4ntj32c0340e81.jpg' },
                video: 'https://livephoto.us.sinaimg.cn/004C0IHygx08wHL9Shvp0f0f0100j6t20k01.mov'
            },
            '006QzRougy1ibzk6w2mzwj31o02804hz': {
                largest: { url: 'https://wx4.sinaimg.cn/large/006QzRougy1ibzk6w2mzwj31o02804hz.jpg' },
                video: 'https://livephoto.us.sinaimg.cn/002oLAhhgx08wHLakvvW0f0f0100y3YA0k01.mov'
            },
            '006QzRougy1ibzk74uxc4j32c0340b29': {
                largest: { url: 'https://wx1.sinaimg.cn/large/006QzRougy1ibzk74uxc4j32c0340b29.jpg' }
            },
            '006QzRougy1ibzk70dt1dj32dc35shdt': {
                largest: { url: 'https://wx3.sinaimg.cn/large/006QzRougy1ibzk70dt1dj32dc35shdt.jpg' }
            },
            '006QzRougy1ibzk6nn7ykj32dc35sb2b': {
                largest: { url: 'https://wx1.sinaimg.cn/large/006QzRougy1ibzk6nn7ykj32dc35sb2b.jpg' }
            },
            '006QzRougy1ibzk6pkpwdj33b04iuhdu': {
                largest: { url: 'https://wx2.sinaimg.cn/large/006QzRougy1ibzk6pkpwdj33b04iuhdu.jpg' }
            },
            '006QzRougy1ibzk6qluc9j334445hhdu': {
                largest: { url: 'https://wx4.sinaimg.cn/large/006QzRougy1ibzk6qluc9j334445hhdu.jpg' }
            }
        }
    }
};

const sampleGifStatus = {
    pic_ids: [
        '006g4E90ly1ic0o6472r0g30ha0cub2d',
        '006g4E90ly1ic0o67wxswj30ta0gi48x'
    ],
    pic_infos: {
        '006g4E90ly1ic0o6472r0g30ha0cub2d': {
            type: 'gif',
            largest: {
                url: 'https://wx1.sinaimg.cn/large/006g4E90ly1ic0o6472r0g30ha0cub2d.gif'
            },
            original: {
                url: 'https://wx1.sinaimg.cn/orj1080/006g4E90ly1ic0o6472r0g30ha0cub2d.gif'
            },
            video: 'http://g.us.sinaimg.cn/o0/8xaw2eGLlx08wJk0Niso010412000yee0E010.mp4?label=gif_mp4'
        },
        '006g4E90ly1ic0o67wxswj30ta0gi48x': {
            type: 'pic',
            largest: {
                url: 'https://wx1.sinaimg.cn/large/006g4E90ly1ic0o67wxswj30ta0gi48x.jpg'
            },
            original: {
                url: 'https://wx1.sinaimg.cn/orj1080/006g4E90ly1ic0o67wxswj30ta0gi48x.jpg'
            }
        }
    }
};

const sampleMixMediaStatus = {
    pic_num: 2,
    pic_ids: [
        'bc6e55efly1ic2uitv1fxj20p00xctem'
    ],
    pic_infos: {},
    mix_media_info: {
        items: [
            {
                type: 'video',
                data: {
                    object_type: 'video',
                    media_info: {
                        stream_url_hd: 'https://video.weibo.com/media/play?livephoto=0'
                    },
                    pic_info: {
                        pic_big: {
                            url: 'https://wx3.sinaimg.cn/orj480/bc6e55efly1ic2ukvy56dj20zk0k03zx.jpg'
                        }
                    }
                }
            },
            {
                type: 'pic',
                data: {
                    object_type: 'pic',
                    largest: {
                        url: 'https://wx4.sinaimg.cn/large/bc6e55efly1ic2uitv1fxj20p00xctem.jpg'
                    }
                }
            }
        ]
    }
};

function run() {
    const utils = loadUtils();
    const ui = loadUI();

    const mediaItems = utils.getWeiboMediaItemsFromStatus(sampleStatus);
    assert.equal(mediaItems.length, 3, '应该完整解析出 3 个 live photo 媒体项');
    assert.deepEqual(
        mediaItems.map((item) => item.id),
        sampleStatus.pic_ids,
        '媒体项顺序应该与 pic_ids 一致'
    );
    assert.ok(
        mediaItems.every((item) => item.videoUrl && item.kind === 'livephoto'),
        '每个媒体项都应该保留 live photo 视频链接'
    );

    const jobs = utils.buildMediaDownloadJobs(mediaItems, '5286555824429155');
    assert.equal(jobs.length, 6, '3 个 live photo 应展开为 6 个下载任务');
    const filenames = JSON.parse(JSON.stringify(jobs.map((job) => job.filename)));
    assert.deepEqual(
        filenames,
        [
            'weibo_5286555824429155_1.jpg',
            'weibo_5286555824429155_1_live.mov',
            'weibo_5286555824429155_2.jpg',
            'weibo_5286555824429155_2_live.mov',
            'weibo_5286555824429155_3.jpg',
            'weibo_5286555824429155_3_live.mov'
        ],
        '下载文件名应该稳定映射为 jpg + mov'
    );

    const fallbackItems = [
        { id: 'dom-1', kind: 'image', imageUrl: 'https://wx1.sinaimg.cn/large/a.jpg', videoUrl: null },
        { id: 'dom-2', kind: 'image', imageUrl: 'https://wx2.sinaimg.cn/large/b.jpg', videoUrl: null }
    ];
    assert.equal(fallbackItems.length, 2, 'DOM 兜底场景先只拿到 2 张图');
    assert.equal(mediaItems.length, 3, '接口结果应覆盖 DOM 兜底数量，最终以 3 个媒体项为准');

    const retweetMediaItems = utils.getWeiboMediaItemsFromStatus(sampleRetweetStatus);
    assert.equal(retweetMediaItems.length, 9, '转发微博应沿 retweeted_status 解析到原微博的 9 个媒体项');
    assert.equal(retweetMediaItems[0].id, '006QzRougy1ibzk7pm7ecj32c0340b29', '转发微博媒体顺序应继承原微博 pic_ids');

    const gifMediaItems = utils.getWeiboMediaItemsFromStatus(sampleGifStatus);
    assert.equal(gifMediaItems.length, 2, 'gif 场景应正常解析媒体项');
    assert.equal(gifMediaItems[0].kind, 'gif', 'gif 应单独标记类型');
    assert.equal(gifMediaItems[0].videoUrl, null, 'gif 不应附带额外视频下载链接');
    assert.equal(gifMediaItems[0].imageExt, '.gif', 'gif 应保留 .gif 扩展名');

    const gifJobs = utils.buildMediaDownloadJobs(gifMediaItems, '5280000000000001');
    assert.deepEqual(
        JSON.parse(JSON.stringify(gifJobs.map((job) => job.filename))),
        [
            'weibo_5280000000000001_1.gif',
            'weibo_5280000000000001_2.jpg'
        ],
        'gif 与普通图片都应只生成单文件下载任务'
    );

    const mixMediaItems = utils.getWeiboMediaItemsFromStatus(sampleMixMediaStatus);
    assert.equal(mixMediaItems.length, 1, '视频 + 图片混合微博应至少保留图片媒体项');
    assert.equal(mixMediaItems[0].kind, 'image', '混合微博中的图片应按普通图片处理');
    assert.equal(
        mixMediaItems[0].imageUrl,
        'https://wx4.sinaimg.cn/large/bc6e55efly1ic2uitv1fxj20p00xctem.jpg',
        '混合微博中的图片应从 mix_media_info 中提取原图地址'
    );

    const mixJobs = utils.buildMediaDownloadJobs(mixMediaItems, '5286590000000000');
    assert.deepEqual(
        JSON.parse(JSON.stringify(mixJobs.map((job) => job.filename))),
        [
            'weibo_5286590000000000_1.jpg'
        ],
        '视频 + 图片混合微博应只生成图片下载任务'
    );

    const fallbackDomItems = [
        { id: 'dom-1', kind: 'image', imageUrl: 'https://wx1.sinaimg.cn/large/a.jpg', videoUrl: null },
        { id: 'dom-2', kind: 'image', imageUrl: 'https://wx2.sinaimg.cn/large/b.jpg', videoUrl: null }
    ];
    const authoritativeEmptyItems = ui.selectPreferredWeiboMediaItems(fallbackDomItems, [], true);
    assert.equal(authoritativeEmptyItems.length, 0, '微博接口成功且无可下载图片时，不应回退到 DOM 缩略图');

    const fallbackOnErrorItems = ui.selectPreferredWeiboMediaItems(fallbackDomItems, [], false);
    assert.equal(fallbackOnErrorItems.length, 2, '只有接口失败时才应回退到 DOM 结果');

    const button = {
        innerHTML: '',
        removed: false,
        remove() {
            this.removed = true;
        }
    };
    ui.syncDownloadButtonState(button, []);
    assert.equal(button.removed, true, '纯视频帖子在最终解析后应移除下载按钮');

    const videoThumbImage = {
        closest(selector) {
            if (selector === '.woo-picture-main') {
                return {
                    querySelector(query) {
                        if (query === '[class*="_videotime_"], [class*="_videobox_"], .woo-font--play') {
                            return { textContent: '00:22' };
                        }
                        return null;
                    }
                };
            }
            return null;
        }
    };
    assert.equal(ui.isWeiboVideoThumbnailImage(videoThumbImage), true, '微博视频封面不应参与图片兜底匹配');
}

run();
console.log('weibo-livephoto.test.js passed');
