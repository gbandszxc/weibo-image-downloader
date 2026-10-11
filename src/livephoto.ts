/**
 * 微博 LivePhoto 单文件合并工具：JPEG 图片 + MOV 视频字节拼接为 Motion Photo。
 *
 * 输出文件布局（不重新编码，纯字节级拼装）：
 *   [JPEG 原始字节（含 EXIF），在最后一个 APP1 段后插入 XMP APP1]
 *   [视频原始字节（ISO-BMFF 容器，微博 LivePhoto 为 H.264 MOV）]
 *   [Samsung SEFT 校验尾]
 *
 * 兼容性依据（字段级参考实现）：
 *   - Google：GCamera:MotionPhoto（新格式）+ GCamera:MicroVideo（旧格式）+ Container:Directory 双写，
 *     参考官方规格 developer.android.com/media/platform/motion-photo-format 与 flashlab/motion-live-photo 模板；
 *   - Samsung：文件尾部 SEF trailer（"MotionPhoto_Data" + SEFH/SEFT），
 *     字节布局参考 doodspav/motionphoto 的 create_samsung_motion_trailer；
 *   - 小米/OPPO 相册：镜像真机 XMP 中的 OpCamera/MiCamera 厂商字段（flashlab 默认预设）。
 * Apple Live Photo 为"成对文件 + ContentIdentifier"机制，无单文件格式，故不在此范围。
 */

/** XMP APP1 段标识（Adobe 规范，ID 后必须跟一个 0x00） */
const XMP_SEGMENT_ID = "http://ns.adobe.com/xap/1.0/\0";

/** Samsung SEF 嵌入视频字段标记 */
const SAMSUNG_FIELD_MARKER = new Uint8Array([0x00, 0x00, 0x30, 0x0a]);
/** Samsung trailer 视频前字段头大小：标记 4 + 名称长度 4 + "MotionPhoto_Data" 16 */
const SAMSUNG_FIELD_HEAD_SIZE = 24;
/** Samsung trailer 视频后索引尾部大小：SEFH 12 + 字段索引 12 + SEFT 8 */
const SAMSUNG_SEF_TAIL_SIZE = 32;
/** SEF 版本号（参考实现固定写 106） */
const SAMSUNG_SEF_VERSION = 106;
/** iPhone Live Photo 静态帧在 3 秒视频中的标准位置（≈1.5s，参考 MotionPhotoMuxer） */
const STILL_IMAGE_TIMESTAMP_US = 1500000;

function concatBytes(...parts: Uint8Array[]): Uint8Array {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

function encodeUtf8(text: string): Uint8Array {
    return new TextEncoder().encode(text);
}

function bytesToLatin1(bytes: Uint8Array): string {
    let text = "";
    for (let i = 0; i < bytes.length; i++) {
        text += String.fromCharCode(bytes[i]);
    }
    return text;
}

export interface JpegXmpInsertPoint {
    /** 新 APP1 段的插入位置（原图字节偏移） */
    insertOffset: number;
    /** 已存在的 XMP APP1 段范围 [start, end)，无则 null；合并时整段替换 */
    existingXmp: { start: number; end: number } | null;
}

/**
 * 扫描 JPEG 段结构，定位 XMP APP1 的插入点：
 * 优先插在最后一个 APP1 段之后（保持 JFIF/EXIF 在前的惯例），无 APP1 时插在 SOI 之后。
 * 只向前扫描到 SOS/EOI 或第一个非 APPn 段为止，不触碰压缩数据。
 */
export function findJpegXmpInsertPoint(jpeg: Uint8Array): JpegXmpInsertPoint {
    if (jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
        throw new Error("不是有效的 JPEG 数据（缺少 SOI 标记）");
    }

    let offset = 2;
    let insertOffset = 2;
    let existingXmp: { start: number; end: number } | null = null;

    while (offset + 4 <= jpeg.length) {
        // 跳过段间的 0xFF 填充字节
        while (offset < jpeg.length - 1 && jpeg[offset] === 0xff && jpeg[offset + 1] === 0xff) {
            offset++;
        }
        if (jpeg[offset] !== 0xff) {
            break;
        }
        const marker = jpeg[offset + 1];
        // SOS/EOI 或非 APPn 段：停止扫描
        if (marker !== 0xe0 && (marker < 0xe1 || marker > 0xef)) {
            break;
        }

        const segmentLength = (jpeg[offset + 2] << 8) | jpeg[offset + 3];
        const segmentEnd = offset + 2 + segmentLength;
        if (segmentLength < 2 || segmentEnd > jpeg.length) {
            throw new Error("JPEG 段结构损坏（段长度越界）");
        }

        if (marker === 0xe1) {
            const idEnd = Math.min(offset + 4 + XMP_SEGMENT_ID.length, segmentEnd);
            const segmentId = bytesToLatin1(jpeg.subarray(offset + 4, idEnd));
            if (segmentId === XMP_SEGMENT_ID) {
                existingXmp = { start: offset, end: segmentEnd };
                if (bytesToLatin1(jpeg.subarray(offset + 4, segmentEnd)).includes("MotionPhoto")
                    || bytesToLatin1(jpeg.subarray(offset + 4, segmentEnd)).includes("MicroVideo")) {
                    throw new Error("图片已包含 Motion Photo 元数据，无需重复合并");
                }
            }
            insertOffset = segmentEnd;
        }

        offset = segmentEnd;
    }

    return { insertOffset, existingXmp };
}

/**
 * 生成 Motion Photo 的 XMP 文本。
 * @param embeddedLength 内嵌视频数据总长（视频字节 + Samsung trailer 尾部）
 * @param microVideoOffset 从文件末尾回退到视频起始字节的总字节数
 */
function buildMotionPhotoXmp(embeddedLength: number, microVideoOffset: number): string {
    return [
        '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>',
        '<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.1.0-jc003">',
        '  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
        '    <rdf:Description rdf:about=""',
        '        xmlns:GCamera="http://ns.google.com/photos/1.0/camera/"',
        '        xmlns:OpCamera="http://ns.oplus.com/photos/1.0/camera/"',
        '        xmlns:MiCamera="http://ns.xiaomi.com/photos/1.0/camera/"',
        '        xmlns:Container="http://ns.google.com/photos/1.0/container/"',
        '        xmlns:Item="http://ns.google.com/photos/1.0/container/item/"',
        '      GCamera:MotionPhoto="1"',
        '      GCamera:MotionPhotoVersion="1"',
        `      GCamera:MotionPhotoPresentationTimestampUs="${STILL_IMAGE_TIMESTAMP_US}"`,
        `      OpCamera:MotionPhotoPrimaryPresentationTimestampUs="${STILL_IMAGE_TIMESTAMP_US}"`,
        '      OpCamera:MotionPhotoOwner="oplus"',
        '      OpCamera:OLivePhotoVersion="2"',
        `      OpCamera:VideoLength="${embeddedLength}"`,
        '      MiCamera:XMPMeta="&lt;?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\' ?&gt;"',
        '      GCamera:MicroVideoVersion="1"',
        '      GCamera:MicroVideo="1"',
        `      GCamera:MicroVideoOffset="${microVideoOffset}"`,
        `      GCamera:MicroVideoPresentationTimestampUs="${STILL_IMAGE_TIMESTAMP_US}">`,
        '      <Container:Directory>',
        '        <rdf:Seq>',
        '          <rdf:li rdf:parseType="Resource">',
        '            <Container:Item',
        '              Item:Mime="image/jpeg"',
        '              Item:Semantic="Primary"',
        '              Item:Length="0"',
        '              Item:Padding="0"/>',
        '          </rdf:li>',
        '          <rdf:li rdf:parseType="Resource">',
        '            <Container:Item',
        '              Item:Mime="video/mp4"',
        '              Item:Semantic="MotionPhoto"',
        `              Item:Length="${embeddedLength}"/>`,
        '          </rdf:li>',
        '        </rdf:Seq>',
        '      </Container:Directory>',
        '    </rdf:Description>',
        '  </rdf:RDF>',
        '</x:xmpmeta>',
        '<?xpacket end="w"?>'
    ].join("\n");
}

/** 构造 XMP APP1 段：FF E1 + 段长（含长度字段自身）+ 段标识 + XMP 报文 */
function buildXmpApp1Segment(xmpText: string): Uint8Array {
    const idBytes = encodeUtf8(XMP_SEGMENT_ID);
    const payload = encodeUtf8(xmpText);
    const segmentLength = 2 + idBytes.length + payload.length;
    if (segmentLength > 0xffff) {
        throw new Error("XMP 段超出 APP1 长度上限");
    }

    const segment = new Uint8Array(2 + segmentLength);
    segment[0] = 0xff;
    segment[1] = 0xe1;
    segment[2] = (segmentLength >> 8) & 0xff;
    segment[3] = segmentLength & 0xff;
    segment.set(idBytes, 4);
    segment.set(payload, 4 + idBytes.length);
    return segment;
}

/**
 * 构造 Samsung SEF 字段头（置于视频字节之前）：
 *   [标记 00 00 30 0A][名称长度 ule32]["MotionPhoto_Data"]
 */
function buildSamsungFieldHead(): Uint8Array {
    const nameBytes = encodeUtf8("MotionPhoto_Data");
    const head = new Uint8Array(SAMSUNG_FIELD_HEAD_SIZE);
    let offset = 0;

    head.set(SAMSUNG_FIELD_MARKER, offset);
    offset += SAMSUNG_FIELD_MARKER.length;
    const nameLength = nameBytes.length;
    head[offset] = nameLength & 0xff;
    head[offset + 1] = (nameLength >> 8) & 0xff;
    head[offset + 2] = (nameLength >> 16) & 0xff;
    head[offset + 3] = (nameLength >> 24) & 0xff;
    offset += 4;
    head.set(nameBytes, offset);

    return head;
}

/**
 * 构造 Samsung SEF 索引尾（置于视频字节之后，必须位于整个文件末尾）：
 *   ["SEFH"][版本 106][字段数 1][字段索引：标记 + 距 SEFH 偏移 + 字段总长][索引数据大小]["SEFT"]
 * 小端 32 位字段布局与 doodspav/motionphoto 参考实现一致。
 */
function buildSamsungSefTail(videoLength: number): Uint8Array {
    const sefHeadSize = 4 + 4 + 4; // "SEFH" + 版本 + 字段数
    const sefFieldInfoSize = SAMSUNG_FIELD_MARKER.length + 4 + 4; // 字段标记 + 距 SEFH 偏移 + 字段总长
    const sefOffset = SAMSUNG_FIELD_HEAD_SIZE + videoLength; // SEFH 相对字段头的偏移

    const tail = new Uint8Array(SAMSUNG_SEF_TAIL_SIZE);
    let offset = 0;

    // SEFH 头："SEFH" + 版本 + 字段数
    tail.set(encodeUtf8("SEFH"), offset);
    offset += 4;
    tail[offset] = SAMSUNG_SEF_VERSION & 0xff;
    tail[offset + 1] = (SAMSUNG_SEF_VERSION >> 8) & 0xff;
    tail[offset + 2] = (SAMSUNG_SEF_VERSION >> 16) & 0xff;
    tail[offset + 3] = (SAMSUNG_SEF_VERSION >> 24) & 0xff;
    offset += 4;
    const fieldCount = 1;
    tail[offset] = fieldCount;
    offset += 4;

    // 字段索引：标记 + 距 SEFH 的偏移 + 字段总长（字段起点到 SEFH 的距离）
    tail.set(SAMSUNG_FIELD_MARKER, offset);
    offset += SAMSUNG_FIELD_MARKER.length;
    const negativeOffsetFromSef = sefOffset;
    tail[offset] = negativeOffsetFromSef & 0xff;
    tail[offset + 1] = (negativeOffsetFromSef >> 8) & 0xff;
    tail[offset + 2] = (negativeOffsetFromSef >> 16) & 0xff;
    tail[offset + 3] = (negativeOffsetFromSef >> 24) & 0xff;
    offset += 4;
    const fieldDataLength = sefOffset;
    tail[offset] = fieldDataLength & 0xff;
    tail[offset + 1] = (fieldDataLength >> 8) & 0xff;
    tail[offset + 2] = (fieldDataLength >> 16) & 0xff;
    tail[offset + 3] = (fieldDataLength >> 24) & 0xff;
    offset += 4;

    // SEFT 尾：SEFH 到 SEFT 之间的数据长度 + "SEFT"
    const sefDataSize = sefHeadSize + sefFieldInfoSize;
    tail[offset] = sefDataSize & 0xff;
    tail[offset + 1] = (sefDataSize >> 8) & 0xff;
    tail[offset + 2] = (sefDataSize >> 16) & 0xff;
    tail[offset + 3] = (sefDataSize >> 24) & 0xff;
    offset += 4;
    tail.set(encodeUtf8("SEFT"), offset);

    return tail;
}

/**
 * 将 JPEG 图片与视频合并为单文件 Motion Photo。
 * 输入字节不做转码；视频必须是 ISO-BMFF 容器（MP4/MOV，ftyp 开头）。
 * 输出为 image/jpeg Blob 可直接保存的字节数组，文件名保持 .jpg 扩展名。
 */
export function buildMotionPhoto(jpeg: Uint8Array, video: Uint8Array): Uint8Array {
    if (video.length < 12 || bytesToLatin1(video.subarray(4, 8)) !== "ftyp") {
        throw new Error("视频不是 ISO-BMFF 容器（缺少 ftyp box），无法合并");
    }

    const { insertOffset, existingXmp } = findJpegXmpInsertPoint(jpeg);

    // Samsung trailer：视频前字段头 24 字节 + 视频后索引尾 32 字节，共 56 字节开销。
    // MicroVideoOffset 定义为"从文件末尾回退到视频起始字节" = V + 32（与 doodspav 参考实现一致），
    // Item:Length 覆盖视频 + SEFT 尾（与三星真机产物同构，读取至 EOF）。
    const microVideoOffset = video.length + SAMSUNG_SEF_TAIL_SIZE;
    const embeddedLength = microVideoOffset;

    const xmpSegment = buildXmpApp1Segment(buildMotionPhotoXmp(embeddedLength, microVideoOffset));
    const fieldHead = buildSamsungFieldHead();
    const sefTail = buildSamsungSefTail(video.length);

    // 已有 XMP 时整段替换：头部截到旧段起点，新段从旧段位置插入，旧段内容随尾部裁剪丢弃
    const headEnd = existingXmp ? existingXmp.start : insertOffset;
    const jpegHead = jpeg.subarray(0, headEnd);
    const jpegTail = jpeg.subarray(existingXmp ? existingXmp.end : insertOffset);
    return concatBytes(jpegHead, xmpSegment, jpegTail, fieldHead, video, sefTail);
}
