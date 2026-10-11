// ==UserScript==
// @name         微博/X图片批量下载器
// @namespace    http://tampermonkey.net/
// @version      1.5.0
// @description  一键下载微博和X帖子中的所有图片为原图，可选开启视频下载
// @author       gbandszxc
// @match        https://weibo.com/*
// @match        https://www.weibo.com/*
// @match        https://weibo.com.cn/*
// @match        https://m.weibo.cn/*
// @match        https://www.m.weibo.cn/*
// @match        https://s.weibo.com/*
// @match        https://x.com/*
// @match        https://www.x.com/*
// @match        https://twitter.com/*
// @match        https://www.twitter.com/*
// @connect      sinaimg.cn
// @connect      sina.cn
// @connect      twimg.com
// @connect      *
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://raw.githubusercontent.com/gbandszxc/weibo-image-downloader/main/dist/weibo-image-downloader.user.js
// @downloadURL  https://raw.githubusercontent.com/gbandszxc/weibo-image-downloader/main/dist/weibo-image-downloader.user.js
// @supportURL   https://github.com/gbandszxc/weibo-image-downloader/issues
// @license      MIT
// ==/UserScript==

/* gifenc (MIT)
The MIT License (MIT)
Copyright (c) 2017 Matt DesLauriers

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
OR OTHER DEALINGS IN THE SOFTWARE.

*/

(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/gifenc/dist/gifenc.js
  var require_gifenc = __commonJS({
    "node_modules/gifenc/dist/gifenc.js"(exports) {
      var __defProp2 = Object.defineProperty;
      var __markAsModule = (target) => __defProp2(target, "__esModule", { value: true });
      var __export = (target, all) => {
        for (var name in all)
          __defProp2(target, name, { get: all[name], enumerable: true });
      };
      __markAsModule(exports);
      __export(exports, {
        GIFEncoder: () => GIFEncoder3,
        applyPalette: () => applyPalette2,
        default: () => src_default,
        nearestColor: () => nearestColor,
        nearestColorIndex: () => nearestColorIndex,
        nearestColorIndexWithDistance: () => nearestColorIndexWithDistance,
        prequantize: () => prequantize,
        quantize: () => quantize3,
        snapColorsToPalette: () => snapColorsToPalette
      });
      var constants_default = {
        signature: "GIF",
        version: "89a",
        trailer: 59,
        extensionIntroducer: 33,
        applicationExtensionLabel: 255,
        graphicControlExtensionLabel: 249,
        imageSeparator: 44,
        signatureSize: 3,
        versionSize: 3,
        globalColorTableFlagMask: 128,
        colorResolutionMask: 112,
        sortFlagMask: 8,
        globalColorTableSizeMask: 7,
        applicationIdentifierSize: 8,
        applicationAuthCodeSize: 3,
        disposalMethodMask: 28,
        userInputFlagMask: 2,
        transparentColorFlagMask: 1,
        localColorTableFlagMask: 128,
        interlaceFlagMask: 64,
        idSortFlagMask: 32,
        localColorTableSizeMask: 7
      };
      function createStream(initialCapacity = 256) {
        let cursor = 0;
        let contents = new Uint8Array(initialCapacity);
        return {
          get buffer() {
            return contents.buffer;
          },
          reset() {
            cursor = 0;
          },
          bytesView() {
            return contents.subarray(0, cursor);
          },
          bytes() {
            return contents.slice(0, cursor);
          },
          writeByte(byte) {
            expand(cursor + 1);
            contents[cursor] = byte;
            cursor++;
          },
          writeBytes(data, offset = 0, byteLength = data.length) {
            expand(cursor + byteLength);
            for (let i = 0; i < byteLength; i++) {
              contents[cursor++] = data[i + offset];
            }
          },
          writeBytesView(data, offset = 0, byteLength = data.byteLength) {
            expand(cursor + byteLength);
            contents.set(data.subarray(offset, offset + byteLength), cursor);
            cursor += byteLength;
          }
        };
        function expand(newCapacity) {
          var prevCapacity = contents.length;
          if (prevCapacity >= newCapacity)
            return;
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
          if (prevCapacity != 0)
            newCapacity = Math.max(newCapacity, 256);
          const oldContents = contents;
          contents = new Uint8Array(newCapacity);
          if (cursor > 0)
            contents.set(oldContents.subarray(0, cursor), 0);
        }
      }
      var BITS = 12;
      var DEFAULT_HSIZE = 5003;
      var MASKS = [
        0,
        1,
        3,
        7,
        15,
        31,
        63,
        127,
        255,
        511,
        1023,
        2047,
        4095,
        8191,
        16383,
        32767,
        65535
      ];
      function lzwEncode(width, height, pixels, colorDepth, outStream = createStream(512), accum = new Uint8Array(256), htab = new Int32Array(DEFAULT_HSIZE), codetab = new Int32Array(DEFAULT_HSIZE)) {
        const hsize = htab.length;
        const initCodeSize = Math.max(2, colorDepth);
        accum.fill(0);
        codetab.fill(0);
        htab.fill(-1);
        let cur_accum = 0;
        let cur_bits = 0;
        const init_bits = initCodeSize + 1;
        const g_init_bits = init_bits;
        let clear_flg = false;
        let n_bits = g_init_bits;
        let maxcode = (1 << n_bits) - 1;
        const ClearCode = 1 << init_bits - 1;
        const EOFCode = ClearCode + 1;
        let free_ent = ClearCode + 2;
        let a_count = 0;
        let ent = pixels[0];
        let hshift = 0;
        for (let fcode = hsize; fcode < 65536; fcode *= 2) {
          ++hshift;
        }
        hshift = 8 - hshift;
        outStream.writeByte(initCodeSize);
        output(ClearCode);
        const length = pixels.length;
        for (let idx = 1; idx < length; idx++) {
          next_block: {
            const c = pixels[idx];
            const fcode = (c << BITS) + ent;
            let i = c << hshift ^ ent;
            if (htab[i] === fcode) {
              ent = codetab[i];
              break next_block;
            }
            const disp = i === 0 ? 1 : hsize - i;
            while (htab[i] >= 0) {
              i -= disp;
              if (i < 0)
                i += hsize;
              if (htab[i] === fcode) {
                ent = codetab[i];
                break next_block;
              }
            }
            output(ent);
            ent = c;
            if (free_ent < 1 << BITS) {
              codetab[i] = free_ent++;
              htab[i] = fcode;
            } else {
              htab.fill(-1);
              free_ent = ClearCode + 2;
              clear_flg = true;
              output(ClearCode);
            }
          }
        }
        output(ent);
        output(EOFCode);
        outStream.writeByte(0);
        return outStream.bytesView();
        function output(code) {
          cur_accum &= MASKS[cur_bits];
          if (cur_bits > 0)
            cur_accum |= code << cur_bits;
          else
            cur_accum = code;
          cur_bits += n_bits;
          while (cur_bits >= 8) {
            accum[a_count++] = cur_accum & 255;
            if (a_count >= 254) {
              outStream.writeByte(a_count);
              outStream.writeBytesView(accum, 0, a_count);
              a_count = 0;
            }
            cur_accum >>= 8;
            cur_bits -= 8;
          }
          if (free_ent > maxcode || clear_flg) {
            if (clear_flg) {
              n_bits = g_init_bits;
              maxcode = (1 << n_bits) - 1;
              clear_flg = false;
            } else {
              ++n_bits;
              maxcode = n_bits === BITS ? 1 << n_bits : (1 << n_bits) - 1;
            }
          }
          if (code == EOFCode) {
            while (cur_bits > 0) {
              accum[a_count++] = cur_accum & 255;
              if (a_count >= 254) {
                outStream.writeByte(a_count);
                outStream.writeBytesView(accum, 0, a_count);
                a_count = 0;
              }
              cur_accum >>= 8;
              cur_bits -= 8;
            }
            if (a_count > 0) {
              outStream.writeByte(a_count);
              outStream.writeBytesView(accum, 0, a_count);
              a_count = 0;
            }
          }
        }
      }
      var lzwEncode_default = lzwEncode;
      function rgb888_to_rgb565(r, g, b) {
        return r << 8 & 63488 | g << 2 & 992 | b >> 3;
      }
      function rgba8888_to_rgba4444(r, g, b, a) {
        return r >> 4 | g & 240 | (b & 240) << 4 | (a & 240) << 8;
      }
      function rgb888_to_rgb444(r, g, b) {
        return r >> 4 << 8 | g & 240 | b >> 4;
      }
      function clamp(value, min, max) {
        return value < min ? min : value > max ? max : value;
      }
      function sqr(value) {
        return value * value;
      }
      function find_nn(bins, idx, hasAlpha) {
        var nn = 0;
        var err = 1e100;
        const bin1 = bins[idx];
        const n1 = bin1.cnt;
        const wa = bin1.ac;
        const wr = bin1.rc;
        const wg = bin1.gc;
        const wb = bin1.bc;
        for (var i = bin1.fw; i != 0; i = bins[i].fw) {
          const bin = bins[i];
          const n2 = bin.cnt;
          const nerr2 = n1 * n2 / (n1 + n2);
          if (nerr2 >= err)
            continue;
          var nerr = 0;
          if (hasAlpha) {
            nerr += nerr2 * sqr(bin.ac - wa);
            if (nerr >= err)
              continue;
          }
          nerr += nerr2 * sqr(bin.rc - wr);
          if (nerr >= err)
            continue;
          nerr += nerr2 * sqr(bin.gc - wg);
          if (nerr >= err)
            continue;
          nerr += nerr2 * sqr(bin.bc - wb);
          if (nerr >= err)
            continue;
          err = nerr;
          nn = i;
        }
        bin1.err = err;
        bin1.nn = nn;
      }
      function create_bin() {
        return {
          ac: 0,
          rc: 0,
          gc: 0,
          bc: 0,
          cnt: 0,
          nn: 0,
          fw: 0,
          bk: 0,
          tm: 0,
          mtm: 0,
          err: 0
        };
      }
      function create_bin_list(data, format) {
        const bincount = format === "rgb444" ? 4096 : 65536;
        const bins = new Array(bincount);
        const size = data.length;
        if (format === "rgba4444") {
          for (let i = 0; i < size; ++i) {
            const color = data[i];
            const a = color >> 24 & 255;
            const b = color >> 16 & 255;
            const g = color >> 8 & 255;
            const r = color & 255;
            const index = rgba8888_to_rgba4444(r, g, b, a);
            let bin = index in bins ? bins[index] : bins[index] = create_bin();
            bin.rc += r;
            bin.gc += g;
            bin.bc += b;
            bin.ac += a;
            bin.cnt++;
          }
        } else if (format === "rgb444") {
          for (let i = 0; i < size; ++i) {
            const color = data[i];
            const b = color >> 16 & 255;
            const g = color >> 8 & 255;
            const r = color & 255;
            const index = rgb888_to_rgb444(r, g, b);
            let bin = index in bins ? bins[index] : bins[index] = create_bin();
            bin.rc += r;
            bin.gc += g;
            bin.bc += b;
            bin.cnt++;
          }
        } else {
          for (let i = 0; i < size; ++i) {
            const color = data[i];
            const b = color >> 16 & 255;
            const g = color >> 8 & 255;
            const r = color & 255;
            const index = rgb888_to_rgb565(r, g, b);
            let bin = index in bins ? bins[index] : bins[index] = create_bin();
            bin.rc += r;
            bin.gc += g;
            bin.bc += b;
            bin.cnt++;
          }
        }
        return bins;
      }
      function quantize3(rgba, maxColors, opts = {}) {
        const {
          format = "rgb565",
          clearAlpha = true,
          clearAlphaColor = 0,
          clearAlphaThreshold = 0,
          oneBitAlpha = false
        } = opts;
        if (!rgba || !rgba.buffer) {
          throw new Error("quantize() expected RGBA Uint8Array data");
        }
        if (!(rgba instanceof Uint8Array) && !(rgba instanceof Uint8ClampedArray)) {
          throw new Error("quantize() expected RGBA Uint8Array data");
        }
        const data = new Uint32Array(rgba.buffer);
        let useSqrt = opts.useSqrt !== false;
        const hasAlpha = format === "rgba4444";
        const bins = create_bin_list(data, format);
        const bincount = bins.length;
        const bincountMinusOne = bincount - 1;
        const heap = new Uint32Array(bincount + 1);
        var maxbins = 0;
        for (var i = 0; i < bincount; ++i) {
          const bin = bins[i];
          if (bin != null) {
            var d = 1 / bin.cnt;
            if (hasAlpha)
              bin.ac *= d;
            bin.rc *= d;
            bin.gc *= d;
            bin.bc *= d;
            bins[maxbins++] = bin;
          }
        }
        if (sqr(maxColors) / maxbins < 0.022) {
          useSqrt = false;
        }
        var i = 0;
        for (; i < maxbins - 1; ++i) {
          bins[i].fw = i + 1;
          bins[i + 1].bk = i;
          if (useSqrt)
            bins[i].cnt = Math.sqrt(bins[i].cnt);
        }
        if (useSqrt)
          bins[i].cnt = Math.sqrt(bins[i].cnt);
        var h, l, l2;
        for (i = 0; i < maxbins; ++i) {
          find_nn(bins, i, false);
          var err = bins[i].err;
          for (l = ++heap[0]; l > 1; l = l2) {
            l2 = l >> 1;
            if (bins[h = heap[l2]].err <= err)
              break;
            heap[l] = h;
          }
          heap[l] = i;
        }
        var extbins = maxbins - maxColors;
        for (i = 0; i < extbins; ) {
          var tb;
          for (; ; ) {
            var b1 = heap[1];
            tb = bins[b1];
            if (tb.tm >= tb.mtm && bins[tb.nn].mtm <= tb.tm)
              break;
            if (tb.mtm == bincountMinusOne)
              b1 = heap[1] = heap[heap[0]--];
            else {
              find_nn(bins, b1, false);
              tb.tm = i;
            }
            var err = bins[b1].err;
            for (l = 1; (l2 = l + l) <= heap[0]; l = l2) {
              if (l2 < heap[0] && bins[heap[l2]].err > bins[heap[l2 + 1]].err)
                l2++;
              if (err <= bins[h = heap[l2]].err)
                break;
              heap[l] = h;
            }
            heap[l] = b1;
          }
          var nb = bins[tb.nn];
          var n1 = tb.cnt;
          var n2 = nb.cnt;
          var d = 1 / (n1 + n2);
          if (hasAlpha)
            tb.ac = d * (n1 * tb.ac + n2 * nb.ac);
          tb.rc = d * (n1 * tb.rc + n2 * nb.rc);
          tb.gc = d * (n1 * tb.gc + n2 * nb.gc);
          tb.bc = d * (n1 * tb.bc + n2 * nb.bc);
          tb.cnt += nb.cnt;
          tb.mtm = ++i;
          bins[nb.bk].fw = nb.fw;
          bins[nb.fw].bk = nb.bk;
          nb.mtm = bincountMinusOne;
        }
        let palette = [];
        var k = 0;
        for (i = 0; ; ++k) {
          let r = clamp(Math.round(bins[i].rc), 0, 255);
          let g = clamp(Math.round(bins[i].gc), 0, 255);
          let b = clamp(Math.round(bins[i].bc), 0, 255);
          let a = 255;
          if (hasAlpha) {
            a = clamp(Math.round(bins[i].ac), 0, 255);
            if (oneBitAlpha) {
              const threshold = typeof oneBitAlpha === "number" ? oneBitAlpha : 127;
              a = a <= threshold ? 0 : 255;
            }
            if (clearAlpha && a <= clearAlphaThreshold) {
              r = g = b = clearAlphaColor;
              a = 0;
            }
          }
          const color = hasAlpha ? [r, g, b, a] : [r, g, b];
          const exists = existsInPalette(palette, color);
          if (!exists)
            palette.push(color);
          if ((i = bins[i].fw) == 0)
            break;
        }
        return palette;
      }
      function existsInPalette(palette, color) {
        for (let i = 0; i < palette.length; i++) {
          const p = palette[i];
          let matchesRGB = p[0] === color[0] && p[1] === color[1] && p[2] === color[2];
          let matchesAlpha = p.length >= 4 && color.length >= 4 ? p[3] === color[3] : true;
          if (matchesRGB && matchesAlpha)
            return true;
        }
        return false;
      }
      function euclideanDistanceSquared(a, b) {
        var sum = 0;
        var n;
        for (n = 0; n < a.length; n++) {
          const dx = a[n] - b[n];
          sum += dx * dx;
        }
        return sum;
      }
      function roundStep(byte, step) {
        return step > 1 ? Math.round(byte / step) * step : byte;
      }
      function prequantize(rgba, { roundRGB = 5, roundAlpha = 10, oneBitAlpha = null } = {}) {
        const data = new Uint32Array(rgba.buffer);
        for (let i = 0; i < data.length; i++) {
          const color = data[i];
          let a = color >> 24 & 255;
          let b = color >> 16 & 255;
          let g = color >> 8 & 255;
          let r = color & 255;
          a = roundStep(a, roundAlpha);
          if (oneBitAlpha) {
            const threshold = typeof oneBitAlpha === "number" ? oneBitAlpha : 127;
            a = a <= threshold ? 0 : 255;
          }
          r = roundStep(r, roundRGB);
          g = roundStep(g, roundRGB);
          b = roundStep(b, roundRGB);
          data[i] = a << 24 | b << 16 | g << 8 | r << 0;
        }
      }
      function applyPalette2(rgba, palette, format = "rgb565") {
        if (!rgba || !rgba.buffer) {
          throw new Error("quantize() expected RGBA Uint8Array data");
        }
        if (!(rgba instanceof Uint8Array) && !(rgba instanceof Uint8ClampedArray)) {
          throw new Error("quantize() expected RGBA Uint8Array data");
        }
        if (palette.length > 256) {
          throw new Error("applyPalette() only works with 256 colors or less");
        }
        const data = new Uint32Array(rgba.buffer);
        const length = data.length;
        const bincount = format === "rgb444" ? 4096 : 65536;
        const index = new Uint8Array(length);
        const cache = new Array(bincount);
        const hasAlpha = format === "rgba4444";
        if (format === "rgba4444") {
          for (let i = 0; i < length; i++) {
            const color = data[i];
            const a = color >> 24 & 255;
            const b = color >> 16 & 255;
            const g = color >> 8 & 255;
            const r = color & 255;
            const key = rgba8888_to_rgba4444(r, g, b, a);
            const idx = key in cache ? cache[key] : cache[key] = nearestColorIndexRGBA(r, g, b, a, palette);
            index[i] = idx;
          }
        } else {
          const rgb888_to_key = format === "rgb444" ? rgb888_to_rgb444 : rgb888_to_rgb565;
          for (let i = 0; i < length; i++) {
            const color = data[i];
            const b = color >> 16 & 255;
            const g = color >> 8 & 255;
            const r = color & 255;
            const key = rgb888_to_key(r, g, b);
            const idx = key in cache ? cache[key] : cache[key] = nearestColorIndexRGB(r, g, b, palette);
            index[i] = idx;
          }
        }
        return index;
      }
      function nearestColorIndexRGBA(r, g, b, a, palette) {
        let k = 0;
        let mindist = 1e100;
        for (let i = 0; i < palette.length; i++) {
          const px2 = palette[i];
          const a2 = px2[3];
          let curdist = sqr2(a2 - a);
          if (curdist > mindist)
            continue;
          const r2 = px2[0];
          curdist += sqr2(r2 - r);
          if (curdist > mindist)
            continue;
          const g2 = px2[1];
          curdist += sqr2(g2 - g);
          if (curdist > mindist)
            continue;
          const b2 = px2[2];
          curdist += sqr2(b2 - b);
          if (curdist > mindist)
            continue;
          mindist = curdist;
          k = i;
        }
        return k;
      }
      function nearestColorIndexRGB(r, g, b, palette) {
        let k = 0;
        let mindist = 1e100;
        for (let i = 0; i < palette.length; i++) {
          const px2 = palette[i];
          const r2 = px2[0];
          let curdist = sqr2(r2 - r);
          if (curdist > mindist)
            continue;
          const g2 = px2[1];
          curdist += sqr2(g2 - g);
          if (curdist > mindist)
            continue;
          const b2 = px2[2];
          curdist += sqr2(b2 - b);
          if (curdist > mindist)
            continue;
          mindist = curdist;
          k = i;
        }
        return k;
      }
      function snapColorsToPalette(palette, knownColors, threshold = 5) {
        if (!palette.length || !knownColors.length)
          return;
        const paletteRGB = palette.map((p) => p.slice(0, 3));
        const thresholdSq = threshold * threshold;
        const dim = palette[0].length;
        for (let i = 0; i < knownColors.length; i++) {
          let color = knownColors[i];
          if (color.length < dim) {
            color = [color[0], color[1], color[2], 255];
          } else if (color.length > dim) {
            color = color.slice(0, 3);
          } else {
            color = color.slice();
          }
          const r = nearestColorIndexWithDistance(paletteRGB, color.slice(0, 3), euclideanDistanceSquared);
          const idx = r[0];
          const distanceSq = r[1];
          if (distanceSq > 0 && distanceSq <= thresholdSq) {
            palette[idx] = color;
          }
        }
      }
      function sqr2(a) {
        return a * a;
      }
      function nearestColorIndex(colors, pixel, distanceFn = euclideanDistanceSquared) {
        let minDist = Infinity;
        let minDistIndex = -1;
        for (let j = 0; j < colors.length; j++) {
          const paletteColor = colors[j];
          const dist = distanceFn(pixel, paletteColor);
          if (dist < minDist) {
            minDist = dist;
            minDistIndex = j;
          }
        }
        return minDistIndex;
      }
      function nearestColorIndexWithDistance(colors, pixel, distanceFn = euclideanDistanceSquared) {
        let minDist = Infinity;
        let minDistIndex = -1;
        for (let j = 0; j < colors.length; j++) {
          const paletteColor = colors[j];
          const dist = distanceFn(pixel, paletteColor);
          if (dist < minDist) {
            minDist = dist;
            minDistIndex = j;
          }
        }
        return [minDistIndex, minDist];
      }
      function nearestColor(colors, pixel, distanceFn = euclideanDistanceSquared) {
        return colors[nearestColorIndex(colors, pixel, distanceFn)];
      }
      function GIFEncoder3(opt = {}) {
        const { initialCapacity = 4096, auto = true } = opt;
        const stream = createStream(initialCapacity);
        const HSIZE = 5003;
        const accum = new Uint8Array(256);
        const htab = new Int32Array(HSIZE);
        const codetab = new Int32Array(HSIZE);
        let hasInit = false;
        return {
          reset() {
            stream.reset();
            hasInit = false;
          },
          finish() {
            stream.writeByte(constants_default.trailer);
          },
          bytes() {
            return stream.bytes();
          },
          bytesView() {
            return stream.bytesView();
          },
          get buffer() {
            return stream.buffer;
          },
          get stream() {
            return stream;
          },
          writeHeader,
          writeFrame(index, width, height, opts = {}) {
            const {
              transparent = false,
              transparentIndex = 0,
              delay = 0,
              palette = null,
              repeat = 0,
              colorDepth = 8,
              dispose = -1
            } = opts;
            let first = false;
            if (auto) {
              if (!hasInit) {
                first = true;
                writeHeader();
                hasInit = true;
              }
            } else {
              first = Boolean(opts.first);
            }
            width = Math.max(0, Math.floor(width));
            height = Math.max(0, Math.floor(height));
            if (first) {
              if (!palette) {
                throw new Error("First frame must include a { palette } option");
              }
              encodeLogicalScreenDescriptor(stream, width, height, palette, colorDepth);
              encodeColorTable(stream, palette);
              if (repeat >= 0) {
                encodeNetscapeExt(stream, repeat);
              }
            }
            const delayTime = Math.round(delay / 10);
            encodeGraphicControlExt(stream, dispose, delayTime, transparent, transparentIndex);
            const useLocalColorTable = Boolean(palette) && !first;
            encodeImageDescriptor(stream, width, height, useLocalColorTable ? palette : null);
            if (useLocalColorTable)
              encodeColorTable(stream, palette);
            encodePixels(stream, index, width, height, colorDepth, accum, htab, codetab);
          }
        };
        function writeHeader() {
          writeUTFBytes(stream, "GIF89a");
        }
      }
      function encodeGraphicControlExt(stream, dispose, delay, transparent, transparentIndex) {
        stream.writeByte(33);
        stream.writeByte(249);
        stream.writeByte(4);
        if (transparentIndex < 0) {
          transparentIndex = 0;
          transparent = false;
        }
        var transp, disp;
        if (!transparent) {
          transp = 0;
          disp = 0;
        } else {
          transp = 1;
          disp = 2;
        }
        if (dispose >= 0) {
          disp = dispose & 7;
        }
        disp <<= 2;
        const userInput = 0;
        stream.writeByte(0 | disp | userInput | transp);
        writeUInt16(stream, delay);
        stream.writeByte(transparentIndex || 0);
        stream.writeByte(0);
      }
      function encodeLogicalScreenDescriptor(stream, width, height, palette, colorDepth = 8) {
        const globalColorTableFlag = 1;
        const sortFlag = 0;
        const globalColorTableSize = colorTableSize(palette.length) - 1;
        const fields = globalColorTableFlag << 7 | colorDepth - 1 << 4 | sortFlag << 3 | globalColorTableSize;
        const backgroundColorIndex = 0;
        const pixelAspectRatio = 0;
        writeUInt16(stream, width);
        writeUInt16(stream, height);
        stream.writeBytes([fields, backgroundColorIndex, pixelAspectRatio]);
      }
      function encodeNetscapeExt(stream, repeat) {
        stream.writeByte(33);
        stream.writeByte(255);
        stream.writeByte(11);
        writeUTFBytes(stream, "NETSCAPE2.0");
        stream.writeByte(3);
        stream.writeByte(1);
        writeUInt16(stream, repeat);
        stream.writeByte(0);
      }
      function encodeColorTable(stream, palette) {
        const colorTableLength = 1 << colorTableSize(palette.length);
        for (let i = 0; i < colorTableLength; i++) {
          let color = [0, 0, 0];
          if (i < palette.length) {
            color = palette[i];
          }
          stream.writeByte(color[0]);
          stream.writeByte(color[1]);
          stream.writeByte(color[2]);
        }
      }
      function encodeImageDescriptor(stream, width, height, localPalette) {
        stream.writeByte(44);
        writeUInt16(stream, 0);
        writeUInt16(stream, 0);
        writeUInt16(stream, width);
        writeUInt16(stream, height);
        if (localPalette) {
          const interlace = 0;
          const sorted = 0;
          const palSize = colorTableSize(localPalette.length) - 1;
          stream.writeByte(128 | interlace | sorted | 0 | palSize);
        } else {
          stream.writeByte(0);
        }
      }
      function encodePixels(stream, index, width, height, colorDepth = 8, accum, htab, codetab) {
        lzwEncode_default(width, height, index, colorDepth, stream, accum, htab, codetab);
      }
      function writeUInt16(stream, short) {
        stream.writeByte(short & 255);
        stream.writeByte(short >> 8 & 255);
      }
      function writeUTFBytes(stream, text) {
        for (var i = 0; i < text.length; i++) {
          stream.writeByte(text.charCodeAt(i));
        }
      }
      function colorTableSize(length) {
        return Math.max(Math.ceil(Math.log2(length)), 1);
      }
      var src_default = GIFEncoder3;
    }
  });

  // src/style.css
  var style_default = '#weibo-img-toast {\r\n    position: fixed;\r\n    top: 20px;\r\n    left: 50%;\r\n    transform: translateX(-50%);\r\n    background: rgba(0, 0, 0, 0.75);\r\n    color: #fff;\r\n    padding: 10px 20px;\r\n    border-radius: 4px;\r\n    font-size: 14px;\r\n    z-index: 2147483647;\r\n    display: flex;\r\n    align-items: center;\r\n    gap: 10px;\r\n    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\r\n    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);\r\n}\r\n\r\n#weibo-img-toast .close-btn {\r\n    font-size: 18px;\r\n    cursor: pointer;\r\n    opacity: 0.7;\r\n    line-height: 1;\r\n}\r\n\r\n#weibo-img-toast .close-btn:hover {\r\n    opacity: 1;\r\n}\r\n\r\n.weibo-img-select-overlay {\r\n    position: fixed;\r\n    inset: 0;\r\n    background: rgba(15, 23, 42, 0.24);\r\n    backdrop-filter: blur(10px);\r\n    z-index: 2147483647;\r\n    display: flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    padding: 16px;\r\n    box-sizing: border-box;\r\n}\r\n\r\n.weibo-img-select-modal {\r\n    width: 100%;\r\n    max-width: 448px;\r\n    max-height: 80vh;\r\n    background: #ffffff;\r\n    border: 1px solid rgba(255, 130, 0, 0.12);\r\n    border-radius: 16px;\r\n    box-shadow: none;\r\n    display: flex;\r\n    flex-direction: column;\r\n    overflow: hidden;\r\n    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\r\n}\r\n\r\n.weibo-img-select-header {\r\n    padding: 16px 18px 14px;\r\n    border-bottom: 1px solid rgba(255, 130, 0, 0.12);\r\n    display: flex;\r\n    align-items: center;\r\n    justify-content: space-between;\r\n    gap: 12px;\r\n}\r\n\r\n.weibo-img-select-header-title {\r\n    font-size: 15px;\r\n    font-weight: 600;\r\n    color: #1f2937;\r\n}\r\n\r\n.weibo-img-select-toggle-btn {\r\n    height: 30px;\r\n    padding: 0 12px;\r\n    border: 1px solid rgba(148, 163, 184, 0.35);\r\n    border-radius: 999px;\r\n    background: #ffffff;\r\n    color: #c2410c;\r\n    font-size: 12px;\r\n    font-weight: 600;\r\n    display: inline-flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    text-align: center;\r\n    line-height: 1;\r\n    cursor: pointer;\r\n    box-sizing: border-box;\r\n    white-space: nowrap;\r\n    transition: background-color 0.2s ease;\r\n}\r\n\r\n.weibo-img-select-toggle-btn:hover {\r\n    background: #f8fafc;\r\n}\r\n\r\n.weibo-img-select-list {\r\n    padding: 14px 18px 18px;\r\n    overflow: auto;\r\n    display: grid;\r\n    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));\r\n    gap: 12px;\r\n}\r\n\r\n.weibo-img-select-item {\r\n    display: flex;\r\n    align-items: center;\r\n    gap: 8px;\r\n    min-width: 0;\r\n    height: 48px;\r\n    padding: 10px 12px;\r\n    border: 1px solid rgba(255, 130, 0, 0.14);\r\n    border-radius: 12px;\r\n    background: #ffffff;\r\n    box-shadow: none;\r\n    user-select: none;\r\n    font-size: 14px;\r\n    color: #374151;\r\n    transition: border-color 0.2s ease, transform 0.2s ease;\r\n    box-sizing: border-box;\r\n}\r\n\r\n.weibo-img-select-item:hover {\r\n    border-color: rgba(255, 130, 0, 0.32);\r\n    box-shadow: none;\r\n    transform: translateY(-1px);\r\n}\r\n\r\n.weibo-img-select-item-video {\r\n    border-color: rgba(59, 130, 246, 0.28);\r\n    background: #ffffff;\r\n}\r\n\r\n.weibo-img-select-item-video:hover {\r\n    border-color: rgba(59, 130, 246, 0.42);\r\n    box-shadow: none;\r\n}\r\n\r\n.weibo-img-select-item input {\r\n    flex: 0 0 auto;\r\n    width: 16px;\r\n    height: 16px;\r\n    margin: 0;\r\n    display: block;\r\n    accent-color: #ff8200;\r\n}\r\n\r\n.weibo-img-select-item-video input {\r\n    accent-color: #2563eb;\r\n}\r\n\r\n.weibo-img-select-item-text {\r\n    display: inline-flex;\r\n    align-items: center;\r\n    min-width: 0;\r\n    min-height: 16px;\r\n    line-height: 16px;\r\n    white-space: nowrap;\r\n    overflow: hidden;\r\n    text-overflow: ellipsis;\r\n    font-weight: 600;\r\n    letter-spacing: 0.01em;\r\n}\r\n\r\n.weibo-img-select-item-text-video {\r\n    color: #1d4ed8;\r\n}\r\n\r\n.weibo-img-select-actions {\r\n    padding: 14px 18px 18px;\r\n    border-top: 1px solid rgba(255, 130, 0, 0.12);\r\n    display: flex;\r\n    justify-content: flex-end;\r\n    gap: 8px;\r\n}\r\n\r\n.weibo-img-select-btn {\r\n    min-width: 90px;\r\n    height: 34px;\r\n    padding: 0 14px;\r\n    border-radius: 999px;\r\n    border: 1px solid transparent;\r\n    font-size: 13px;\r\n    font-weight: 600;\r\n    cursor: pointer;\r\n    display: inline-flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    text-align: center;\r\n    line-height: 1;\r\n    box-sizing: border-box;\r\n    transition: background-color 0.2s ease;\r\n}\r\n\r\n.weibo-img-select-modal button {\r\n    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\r\n    vertical-align: middle;\r\n}\r\n\r\n.weibo-img-select-btn-cancel {\r\n    background: #fff;\r\n    border-color: rgba(148, 163, 184, 0.35);\r\n    color: #475569;\r\n}\r\n\r\n.weibo-img-select-btn-cancel:hover {\r\n    background: #f8fafc;\r\n}\r\n\r\n.weibo-img-select-btn-confirm {\r\n    background: #ff8200;\r\n    color: #fff;\r\n    box-shadow: none;\r\n}\r\n\r\n.weibo-img-select-btn-confirm:hover {\r\n    background: #ff7600;\r\n}\r\n\r\n.weibo-img-download-btn {\r\n    appearance: none;\r\n    display: inline-flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    width: auto !important;\r\n    height: 20px;\r\n    border: 1px solid transparent;\r\n    padding: 0 6px !important;\r\n    margin-left: 8px;\r\n    background: #ff8200;\r\n    color: white;\r\n    border-radius: 3px;\r\n    font-size: 11px;\r\n    font-family: inherit;\r\n    font-weight: bold;\r\n    line-height: 1;\r\n    flex-shrink: 0;\r\n    overflow: hidden;\r\n    cursor: pointer;\r\n    vertical-align: middle;\r\n    white-space: nowrap;\r\n    box-sizing: border-box;\r\n}\r\n\r\n.weibo-img-download-btn[data-download-state="idle"]:hover {\r\n    background: #ff6a00;\r\n}\r\n\r\n.weibo-img-download-btn:focus-visible {\r\n    outline: 2px solid #9a4300;\r\n    outline-offset: 2px;\r\n}\r\n\r\n.weibo-img-download-btn:disabled {\r\n    cursor: progress;\r\n    opacity: 1;\r\n}\r\n\r\n.weibo-img-download-btn[data-download-state="failed"] {\r\n    background: #fff0eb;\r\n    color: #a92d20;\r\n    border-color: #dc9b90;\r\n}\n';

  // src/config.js
  var CONFIG = {
    DELAY_MS: 300,
    LONG_PRESS_MS: 500,
    MEDIA_RESOLVE_RETRY_COOLDOWN_MS: 6e4,
    VIDEO_DOWNLOAD_SETTING_KEY: "weiboImageDownloader.enableVideoDownload",
    ENABLE_VIDEO_DOWNLOAD: false,
    X_GIF_AUTO_CONVERT_SETTING_KEY: "weiboImageDownloader.xGifAutoConvert",
    X_GIF_AUTO_CONVERT: true,
    DEBUG: true
  };

  // src/platforms/weibo.js
  var IMAGE_SIZE_PATTERNS = ["thumb180", "thumb300", "square", "bmiddle", "mw690", "mw1024", "orj360", "orj480", "webp720"];
  var VIDEO_FALLBACK_KEYS = [
    "mp4_2160p_mp4",
    "mp4_1080p_mp4",
    "mp4_720p_mp4",
    "hevc_mp4_720p",
    "h265_mp4_hd",
    "inch_5_5_mp4_hd",
    "inch_5_mp4_hd",
    "inch_4_mp4_hd",
    "mp4_hd_url",
    "stream_url_hd",
    "mp4_sd_url",
    "stream_url"
  ];
  function createWeiboPlatform({
    config = {},
    windowRef,
    fetchRef,
    gmXmlhttpRequest,
    log,
    getFileBasenameFromUrl,
    getFileExtensionFromUrl
  }) {
    const imageSelectors = [
      "img.woo-picture-img",
      ".picture img",
      ".m3 img",
      'div[class^="m"] img'
    ];
    const mobilePostSelectors = [
      ".card.m-panel.card9"
    ];
    const postSelectors = [
      ...mobilePostSelectors,
      "article",
      ".vue-feed-item",
      'div[action-type="feed_list_item"]'
    ];
    const headerSelectors = [
      'div[class*="_iconsPlus_"]',
      'header > div > div[class*="_nick_"]',
      "header > div > div.woo-box-flex",
      ".woo-nickname",
      ".name"
    ];
    const weiboStatusCache = /* @__PURE__ */ new Map();
    function isVideoDownloadEnabled() {
      return !!config.ENABLE_VIDEO_DOWNLOAD;
    }
    function isSearchPage() {
      return windowRef.location.hostname === "s.weibo.com";
    }
    function isMobileWeiboPage() {
      return windowRef.location.hostname === "m.weibo.cn" || windowRef.location.hostname === "www.m.weibo.cn";
    }
    function isAvatarImage(url) {
      if (!url) {
        return false;
      }
      return url.includes("/crop.") || url.includes("/avatar") || url.includes("_cute") || url.includes("_online");
    }
    function getOriginalImageUrl(url) {
      if (!url || typeof url !== "string") {
        return null;
      }
      if (!url.includes("sinaimg.cn") && !url.includes("sina.cn")) {
        return null;
      }
      if (isAvatarImage(url)) {
        return null;
      }
      if (url.includes("/large/")) {
        return url;
      }
      for (const size of IMAGE_SIZE_PATTERNS) {
        if (url.includes(`/${size}/`)) {
          return url.replace(`/${size}/`, "/large/");
        }
      }
      const match = url.match(/(\.sinaimg\.cn\/)([a-z0-9]+\/)/);
      if (match) {
        return url.replace(match[2], "large/");
      }
      return url;
    }
    function getBestWeiboImageUrl(picInfo) {
      if (!picInfo || typeof picInfo !== "object") {
        return null;
      }
      const candidates = [
        picInfo.largest && picInfo.largest.url,
        picInfo.original && picInfo.original.url,
        picInfo.large && picInfo.large.url,
        picInfo.bmiddle && picInfo.bmiddle.url,
        picInfo.thumbnail && picInfo.thumbnail.url,
        picInfo.url
      ];
      const imageUrl = candidates.find((url) => typeof url === "string" && url.length > 0);
      return getOriginalImageUrl(imageUrl) || imageUrl || null;
    }
    function getBestWeiboVideoUrl(mediaInfo) {
      if (!mediaInfo || typeof mediaInfo !== "object") {
        return null;
      }
      const playbackList = Array.isArray(mediaInfo.playback_list) ? mediaInfo.playback_list : [];
      const playbackCandidates = playbackList.map((item) => {
        const playInfo = item && item.play_info;
        const url = playInfo && playInfo.url;
        if (typeof url !== "string" || !url) {
          return null;
        }
        const qualityIndex = Number(item.meta && item.meta.quality_index) || 0;
        const bitrate = Number(playInfo.bitrate) || 0;
        const pixels = (Number(playInfo.width) || 0) * (Number(playInfo.height) || 0);
        return {
          url,
          score: qualityIndex * 1e9 + pixels * 1e3 + bitrate
        };
      }).filter(Boolean).sort((a, b) => b.score - a.score);
      if (playbackCandidates.length > 0) {
        return playbackCandidates[0].url;
      }
      for (const key of VIDEO_FALLBACK_KEYS) {
        if (typeof mediaInfo[key] === "string" && mediaInfo[key]) {
          return mediaInfo[key];
        }
      }
      return null;
    }
    function createWeiboVideoMediaItem({ id, videoUrl, index }) {
      if (!videoUrl) {
        return null;
      }
      return {
        id,
        kind: "video",
        label: `视频 ${index + 1}`,
        imageUrl: null,
        videoUrl,
        imageExt: ".jpg",
        videoExt: getFileExtensionFromUrl(videoUrl, ".mp4")
      };
    }
    function getWeiboMixMediaItems(status) {
      const mixMediaItems = status && status.mix_media_info && Array.isArray(status.mix_media_info.items) ? status.mix_media_info.items : [];
      return mixMediaItems.map((item, index) => {
        const data = item && item.data;
        if (!data || typeof data !== "object") {
          return null;
        }
        const mediaType = typeof item.type === "string" ? item.type.toLowerCase() : "";
        const objectType = typeof data.object_type === "string" ? data.object_type.toLowerCase() : "";
        if (mediaType === "video" || objectType === "video") {
          if (!isVideoDownloadEnabled()) {
            return null;
          }
          return createWeiboVideoMediaItem({
            id: data.id || data.media_id || `mix-video-${index + 1}`,
            videoUrl: getBestWeiboVideoUrl(data.media_info) || data.videoSrc || data.stream_url_hd || data.stream_url,
            index
          });
        }
        const picInfo = data.pic_info || data;
        const imageUrl = getBestWeiboImageUrl(picInfo) || getBestWeiboImageUrl({
          largest: data.pic_info && data.pic_info.pic_big,
          bmiddle: data.pic_info && data.pic_info.pic_middle,
          thumbnail: data.pic_info && data.pic_info.pic_small
        });
        if (!imageUrl) {
          return null;
        }
        return {
          id: getFileBasenameFromUrl(imageUrl, `mix-${index + 1}`),
          kind: "image",
          label: `图片 ${index + 1}`,
          imageUrl,
          videoUrl: null,
          imageExt: getFileExtensionFromUrl(imageUrl, ".jpg"),
          videoExt: ".mov"
        };
      }).filter(Boolean);
    }
    function createWeiboMediaItem(picId, picInfo, index) {
      if (!picInfo || typeof picInfo !== "object") {
        return null;
      }
      const imageUrl = getBestWeiboImageUrl(picInfo);
      if (!imageUrl) {
        return null;
      }
      const mediaType = typeof picInfo.type === "string" ? picInfo.type.toLowerCase() : "pic";
      const isLivePhoto = mediaType === "livephoto";
      const isGif = mediaType === "gif" || getFileExtensionFromUrl(imageUrl, ".jpg") === ".gif";
      const candidateVideoUrl = typeof picInfo.video === "string" ? picInfo.video : typeof picInfo.videoSrc === "string" ? picInfo.videoSrc : null;
      const videoUrl = isLivePhoto ? candidateVideoUrl : null;
      const kind = isLivePhoto ? "livephoto" : isGif ? "gif" : "image";
      const label = isLivePhoto ? `Live Photo ${index + 1}` : isGif ? `GIF ${index + 1}` : `图片 ${index + 1}`;
      return {
        id: picId,
        kind,
        label,
        imageUrl,
        videoUrl,
        imageExt: getFileExtensionFromUrl(imageUrl, ".jpg"),
        videoExt: getFileExtensionFromUrl(videoUrl, ".mov")
      };
    }
    function getWeiboMobileMediaItems(status) {
      const pics = Array.isArray(status && status.pics) ? status.pics : [];
      if (pics.length === 0) {
        return [];
      }
      return pics.map((pic, index) => {
        if (!pic || typeof pic !== "object") {
          return null;
        }
        const mediaType = typeof pic.type === "string" ? pic.type.toLowerCase() : "pic";
        if (mediaType === "video") {
          if (!isVideoDownloadEnabled()) {
            return null;
          }
          return createWeiboVideoMediaItem({
            id: pic.pid || `pic-video-${index + 1}`,
            videoUrl: getBestWeiboVideoUrl(pic.media_info) || pic.videoSrc || pic.video,
            index
          });
        }
        return createWeiboMediaItem(
          pic.pid || getFileBasenameFromUrl(getBestWeiboImageUrl(pic) || pic.url, `pic-${index + 1}`),
          pic,
          index
        );
      }).filter(Boolean);
    }
    function getWeiboMediaSourceStatus(status) {
      if (!status || typeof status !== "object") {
        return null;
      }
      const hasPics = Array.isArray(status.pic_ids) && status.pic_ids.length > 0 || Array.isArray(status.pics) && status.pics.length > 0;
      const hasMixMedia = status.mix_media_info && Array.isArray(status.mix_media_info.items) && status.mix_media_info.items.length > 0;
      if (hasPics || hasMixMedia) {
        return status;
      }
      if (status.retweeted_status) {
        return getWeiboMediaSourceStatus(status.retweeted_status);
      }
      return status;
    }
    function getWeiboMediaItemsFromStatus(status) {
      const mediaSourceStatus = getWeiboMediaSourceStatus(status);
      if (!mediaSourceStatus || typeof mediaSourceStatus !== "object") {
        return [];
      }
      const picIds = Array.isArray(mediaSourceStatus.pic_ids) ? mediaSourceStatus.pic_ids : [];
      const picInfos = mediaSourceStatus.pic_infos || {};
      const directMediaItems = picIds.map((picId, index) => createWeiboMediaItem(picId, picInfos[picId], index)).filter(Boolean);
      if (directMediaItems.length > 0) {
        return directMediaItems;
      }
      const mobileMediaItems = getWeiboMobileMediaItems(mediaSourceStatus);
      if (mobileMediaItems.length > 0) {
        return mobileMediaItems;
      }
      const mixMediaItems = getWeiboMixMediaItems(mediaSourceStatus);
      if (mixMediaItems.length > 0) {
        return mixMediaItems;
      }
      if (!isVideoDownloadEnabled()) {
        return [];
      }
      const pageInfo = mediaSourceStatus.page_info || {};
      const pageInfoType = typeof pageInfo.type === "string" ? pageInfo.type.toLowerCase() : "";
      const objectType = typeof pageInfo.object_type === "string" ? pageInfo.object_type.toLowerCase() : "";
      if (pageInfoType === "video" || pageInfoType === "11" || objectType === "video") {
        const videoItem = createWeiboVideoMediaItem({
          id: mediaSourceStatus.mblogid || mediaSourceStatus.idstr || "video-1",
          videoUrl: getBestWeiboVideoUrl(pageInfo.media_info),
          index: 0
        });
        return videoItem ? [videoItem] : [];
      }
      return [];
    }
    async function fetchWeiboStatus(statusId) {
      if (!statusId) {
        return null;
      }
      if (weiboStatusCache.has(statusId)) {
        return weiboStatusCache.get(statusId);
      }
      const statusUrl = `${isSearchPage() ? "https://weibo.com" : ""}/ajax/statuses/show?id=${encodeURIComponent(statusId)}&locale=zh-CN&isGetLongText=true`;
      const request = (async () => {
        if (isSearchPage() && typeof gmXmlhttpRequest === "function") {
          return new Promise((resolve, reject) => {
            try {
              gmXmlhttpRequest({
                method: "GET",
                url: statusUrl,
                anonymous: false,
                withCredentials: true,
                headers: {
                  Accept: "application/json, text/plain, */*",
                  "X-Requested-With": "XMLHttpRequest",
                  Referer: "https://weibo.com/"
                },
                onload(response2) {
                  if (response2.status < 200 || response2.status >= 300) {
                    reject(new Error(`微博接口请求失败: ${response2.status}`));
                    return;
                  }
                  try {
                    const data = JSON.parse(response2.responseText);
                    if (data && data.error) {
                      reject(new Error(`微博接口请求失败: ${data.error}`));
                      return;
                    }
                    resolve(data);
                  } catch (error) {
                    reject(error);
                  }
                },
                onerror(error) {
                  reject(new Error(error?.error || error?.message || "微博接口请求失败"));
                },
                ontimeout() {
                  reject(new Error("微博接口请求超时"));
                }
              });
            } catch (error) {
              reject(error);
            }
          });
        }
        const response = await fetchRef(statusUrl, {
          credentials: "same-origin",
          headers: {
            Accept: "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest"
          }
        });
        if (!response.ok) {
          throw new Error(`微博接口请求失败: ${response.status}`);
        }
        return response.json();
      })();
      weiboStatusCache.set(statusId, request);
      try {
        return await request;
      } catch (error) {
        weiboStatusCache.delete(statusId);
        throw error;
      }
    }
    async function getWeiboMediaItemsById(statusId) {
      const status = await fetchWeiboStatus(statusId);
      return getWeiboMediaItemsFromStatus(status);
    }
    function isVideoThumbnailImage(img) {
      if (!img || typeof img.closest !== "function") {
        return false;
      }
      const pictureMain = img.closest(".woo-picture-main");
      if (!pictureMain || typeof pictureMain.querySelector !== "function") {
        return false;
      }
      return !!pictureMain.querySelector('[class*="_videotime_"], [class*="_videobox_"], .woo-font--play');
    }
    function findImagesInPost(container) {
      const images = [];
      for (const selector of imageSelectors) {
        try {
          const elements = container.querySelectorAll(selector);
          elements.forEach((img) => {
            if (!img.src) {
              return;
            }
            if (isAvatarImage(img.src)) {
              return;
            }
            if (img.src.includes("default_avatar")) {
              return;
            }
            if (img.src.includes("h5.sinaimg.cn")) {
              return;
            }
            if (!img.src.includes("sinaimg") && !img.src.includes("sina.cn")) {
              return;
            }
            if (isVideoThumbnailImage(img)) {
              return;
            }
            images.push(img);
          });
        } catch (error) {
          log("微博图片选择器执行失败:", error.message);
        }
      }
      return images;
    }
    function getVueStatusItem(postContainer) {
      const candidateNodes = [
        postContainer,
        typeof postContainer.querySelector === "function" ? postContainer.querySelector(".card-wrap") : null,
        typeof postContainer.querySelector === "function" ? postContainer.querySelector(".card-main") : null
      ].filter(Boolean);
      for (const node of candidateNodes) {
        const vueInstance = node && node.__vue__;
        const item = vueInstance && (vueInstance._props && vueInstance._props.item || vueInstance.item || vueInstance.$options && vueInstance.$options.propsData && vueInstance.$options.propsData.item);
        if (item && typeof item === "object") {
          return item;
        }
      }
      return null;
    }
    function getDomMediaItems(postContainer) {
      if (!isMobileWeiboPage()) {
        return null;
      }
      const status = getVueStatusItem(postContainer);
      if (!status) {
        return null;
      }
      return getWeiboMediaItemsFromStatus(status);
    }
    function selectPreferredMediaItems(fallbackItems, resolvedMediaItems, apiResolved) {
      return apiResolved ? resolvedMediaItems : fallbackItems;
    }
    function getStatusLookupId(postContainer) {
      const mid = postContainer.getAttribute("mid") || postContainer.getAttribute("data-mid");
      if (mid) {
        return mid;
      }
      const links = postContainer.querySelectorAll("a[href]");
      for (const link of links) {
        const href = link.href || "";
        const match = href.match(/weibo\.com\/(?:u\/)?\d+\/([A-Za-z0-9]+)/);
        if (match && !href.includes("/u/")) {
          return match[1];
        }
      }
      return null;
    }
    async function resolvePostMediaItems(postContainer, fallbackItems) {
      if (isMobileWeiboPage()) {
        const status = getVueStatusItem(postContainer);
        if (!status) {
          return fallbackItems;
        }
        const mediaItems = getWeiboMediaItemsFromStatus(status);
        return selectPreferredMediaItems(fallbackItems, mediaItems, true);
      }
      const statusId = getStatusLookupId(postContainer);
      if (!statusId) {
        return fallbackItems;
      }
      try {
        const mediaItems = await getWeiboMediaItemsById(statusId);
        return selectPreferredMediaItems(fallbackItems, mediaItems, true);
      } catch (error) {
        log("微博接口解析失败，回退DOM:", error.message);
      }
      return selectPreferredMediaItems(fallbackItems, [], false);
    }
    function getPostSelectors() {
      if (isMobileWeiboPage()) {
        return mobilePostSelectors;
      }
      return postSelectors;
    }
    function shouldSkipPost(post) {
      if (isMobileWeiboPage()) {
        return !post || typeof post.matches !== "function" || !post.matches(".card.m-panel.card9");
      }
      return false;
    }
    function shouldResolveEmptyMediaItems(postContainer) {
      return isVideoDownloadEnabled() && !!getStatusLookupId(postContainer);
    }
    function getPostId(postContainer) {
      if (isMobileWeiboPage()) {
        const status = getVueStatusItem(postContainer);
        if (status && status.mid) {
          return status.mid;
        }
      }
      return postContainer.getAttribute("mid") || postContainer.getAttribute("data-mid") || `weibo_${Date.now()}`;
    }
    function insertMobileDownloadButton(post, btn) {
      const nameRow = post.querySelector("header.weibo-top .m-text-box h3.m-text-cut");
      if (nameRow) {
        nameRow.style.display = "inline-flex";
        nameRow.style.alignItems = "center";
        nameRow.style.flexWrap = "nowrap";
        nameRow.style.columnGap = "4px";
        nameRow.appendChild(btn);
        return true;
      }
      const headerEl = post.querySelector("header.weibo-top");
      if (headerEl) {
        headerEl.appendChild(btn);
        return true;
      }
      return false;
    }
    function insertDownloadButton({ post, btn }) {
      if (isMobileWeiboPage()) {
        return insertMobileDownloadButton(post, btn);
      }
      if (isSearchPage()) {
        const infoEl = post.querySelector(".content .info");
        if (infoEl) {
          const nameDiv = Array.from(infoEl.children).find((el) => !el.classList.contains("menu"));
          if (nameDiv) {
            nameDiv.style.display = "flex";
            nameDiv.style.alignItems = "center";
            nameDiv.style.gap = "4px";
            nameDiv.appendChild(btn);
            return true;
          }
        }
      }
      const retweetSpan = Array.from(post.querySelectorAll("span")).find(
        (el) => el.textContent.trim() === "转发微博"
      );
      if (retweetSpan && retweetSpan.parentNode) {
        retweetSpan.parentNode.insertBefore(btn, retweetSpan.nextSibling);
        return true;
      }
      const suffixBox = post.querySelector('div[class*="_suffixbox"]');
      if (suffixBox) {
        suffixBox.appendChild(btn);
        return true;
      }
      const iconsPlusEl = post.querySelector('div[class*="_iconsPlus_"]');
      if (iconsPlusEl && iconsPlusEl.parentNode) {
        iconsPlusEl.parentNode.insertBefore(btn, iconsPlusEl);
        return true;
      }
      for (const headerSelector of headerSelectors) {
        const headerEl = post.querySelector(headerSelector);
        if (headerEl) {
          headerEl.appendChild(btn);
          return true;
        }
      }
      return false;
    }
    function getPostUrl(article) {
      if (!article) {
        return null;
      }
      const links = article.querySelectorAll("a[href]");
      for (const link of links) {
        const href = link.href;
        if (/weibo\.com\/\d+\/\w+/.test(href) && !href.includes("/u/")) {
          return href;
        }
      }
      return null;
    }
    function injectGotoOriginalMenuItem(popMain, article, documentRef) {
      if (!popMain || popMain.dataset.gotoInjected) {
        return;
      }
      const postUrl = getPostUrl(article);
      if (!postUrl) {
        return;
      }
      const wrapMain = popMain.querySelector(".woo-pop-wrap-main");
      if (!wrapMain) {
        return;
      }
      const shareItem = wrapMain.firstElementChild;
      if (!shareItem) {
        return;
      }
      const item = documentRef.createElement("div");
      item.setAttribute("role", "button");
      item.className = "woo-box-flex woo-box-alignCenter woo-pop-item-main woo-pop-item-main";
      item.innerHTML = '<div class="woo-box-flex woo-box-column" style="width:100%"><div class="woo-box-flex woo-box-justifyBetween"><div>跳转原文</div></div><div class="_desc_1v5ao_2"></div></div>';
      item.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        windowRef.open(postUrl, "_blank");
      });
      wrapMain.insertBefore(item, shareItem.nextSibling);
      popMain.dataset.gotoInjected = "1";
    }
    function injectSearchPageGotoOriginal({ documentRef }) {
      documentRef.querySelectorAll('div[action-type="feed_list_item"]').forEach((post) => {
        const menuUl = post.querySelector('ul[node-type="fl_menu_right"]');
        if (!menuUl || menuUl.dataset.gotoInjected) {
          return;
        }
        const postUrl = getPostUrl(post);
        if (!postUrl) {
          return;
        }
        const li = documentRef.createElement("li");
        const a = documentRef.createElement("a");
        a.href = "javascript:void(0);";
        a.textContent = "跳转原文";
        a.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          windowRef.open(postUrl, "_blank");
        });
        li.appendChild(a);
        menuUl.insertBefore(li, menuUl.firstChild);
        menuUl.dataset.gotoInjected = "1";
      });
    }
    function afterInjectDownloadButtons({ documentRef }) {
      if (isSearchPage()) {
        injectSearchPageGotoOriginal({ documentRef });
      }
    }
    function initObservers({ documentRef }) {
      const MutationObserverRef = windowRef.MutationObserver || MutationObserver;
      const menuObserver = new MutationObserverRef((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (!(node instanceof Element)) {
              continue;
            }
            if (node.classList.contains("woo-pop-main")) {
              const article = node.closest("article");
              if (article && node.textContent.includes("分享")) {
                injectGotoOriginalMenuItem(node, article, documentRef);
              }
            }
          }
        }
      });
      menuObserver.observe(documentRef.body, { childList: true, subtree: true });
    }
    return {
      id: "weibo",
      displayName: "微博",
      isSearchPage,
      isAvatarImage,
      getOriginalImageUrl,
      getBestWeiboImageUrl,
      getWeiboMixMediaItems,
      createWeiboMediaItem,
      getWeiboMediaSourceStatus,
      getWeiboMediaItemsFromStatus,
      getDomMediaItems,
      fetchWeiboStatus,
      getWeiboMediaItemsById,
      isVideoThumbnailImage,
      findImagesInPost,
      selectPreferredMediaItems,
      resolvePostMediaItems,
      getPostSelectors,
      shouldSkipPost,
      shouldResolveEmptyMediaItems,
      getPostId,
      insertDownloadButton,
      getPostUrl,
      injectGotoOriginalMenuItem,
      afterInjectDownloadButtons,
      initObservers
    };
  }

  // src/platforms/x.js
  function createXPlatform({ config = {}, windowRef, fetchRef, log, getFileExtensionFromUrl }) {
    const imageSelectors = ['article img[src*="twimg.com"]'];
    const postSelectors = ['article[data-testid="tweet"]'];
    const tweetResultOperationId = "SgZWKwvBiOKrSC0QeOGvXw";
    const tweetResultFeatures = {
      creator_subscriptions_tweet_preview_api_enabled: true,
      premium_content_api_read_enabled: false,
      communities_web_enable_tweet_community_results_fetch: true,
      c9s_tweet_anatomy_moderator_badge_enabled: true,
      responsive_web_grok_analyze_button_fetch_trends_enabled: false,
      responsive_web_grok_analyze_post_followups_enabled: true,
      rweb_cashtags_composer_attachment_enabled: true,
      responsive_web_jetfuel_frame: true,
      responsive_web_grok_share_attachment_enabled: true,
      responsive_web_grok_annotations_enabled: true,
      articles_preview_enabled: true,
      responsive_web_edit_tweet_api_enabled: true,
      rweb_conversational_replies_downvote_enabled: false,
      graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
      view_counts_everywhere_api_enabled: true,
      longform_notetweets_consumption_enabled: true,
      responsive_web_twitter_article_tweet_consumption_enabled: true,
      content_disclosure_indicator_enabled: true,
      content_disclosure_ai_generated_indicator_enabled: true,
      responsive_web_grok_show_grok_translated_post: true,
      responsive_web_grok_analysis_button_from_backend: true,
      post_ctas_fetch_enabled: false,
      rweb_cashtags_enabled: true,
      freedom_of_speech_not_reach_fetch_enabled: true,
      standardized_nudges_misinfo: true,
      tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
      longform_notetweets_rich_text_read_enabled: true,
      longform_notetweets_inline_media_enabled: false,
      profile_label_improvements_pcf_label_in_post_enabled: true,
      responsive_web_profile_redirect_enabled: false,
      rweb_tipjar_consumption_enabled: false,
      verified_phone_label_enabled: false,
      responsive_web_grok_image_annotation_enabled: true,
      responsive_web_grok_imagine_annotation_enabled: true,
      responsive_web_grok_community_note_auto_translation_is_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true
    };
    const tweetResultFieldToggles = {
      withArticleRichContentState: true,
      withArticlePlainText: false,
      withArticleSummaryText: true,
      withArticleVoiceOver: true
    };
    function getOriginalImageUrl(url) {
      if (!url || typeof url !== "string") {
        return null;
      }
      if (!url.includes("pbs.twimg.com")) {
        return null;
      }
      try {
        let fullUrl = url;
        if (!url.startsWith("http")) {
          fullUrl = `https://${url}`;
        }
        const urlObj = new URL(fullUrl);
        const name = urlObj.searchParams.get("name");
        if (name === "orig") {
          return fullUrl;
        }
        urlObj.searchParams.delete("name");
        urlObj.searchParams.set("name", "orig");
        return urlObj.toString();
      } catch {
        if (url.includes("name=orig")) {
          return url;
        }
        return url.replace(/name=[^&]*/, "name=orig");
      }
    }
    function isPhotoImageUrl(url) {
      return typeof url === "string" && url.includes("pbs.twimg.com/media/");
    }
    function getVideoSourceUrl(video) {
      if (!video) {
        return null;
      }
      const directSrc = video.currentSrc || video.src || null;
      if (typeof directSrc === "string" && directSrc.startsWith("http")) {
        return directSrc;
      }
      if (typeof video.querySelectorAll === "function") {
        const sources = video.querySelectorAll("source");
        for (const source of sources) {
          const src = source?.src;
          if (typeof src === "string" && src.startsWith("http")) {
            return src;
          }
        }
      }
      return null;
    }
    function getVideoMediaContainer(node) {
      if (!node || typeof node.closest !== "function") {
        return null;
      }
      return node.closest('[data-testid="videoComponent"]') || node.closest('[data-testid="videoPlayer"]') || node.closest("[data-testid]");
    }
    function isGifVideo(video) {
      const container = getVideoMediaContainer(video);
      const text = container?.textContent || "";
      return /\bGIF\b/i.test(text);
    }
    function isVideoDownloadEnabled() {
      return !!config.ENABLE_VIDEO_DOWNLOAD;
    }
    function getCookieValue(name) {
      const cookie = windowRef.document && windowRef.document.cookie;
      if (!cookie || typeof cookie !== "string") {
        return "";
      }
      const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
      return match ? decodeURIComponent(match[1]) : "";
    }
    function getBestXVideoVariant(variants) {
      const candidates = (Array.isArray(variants) ? variants : []).filter((variant) => variant && variant.content_type === "video/mp4" && typeof variant.url === "string" && variant.url).sort((a, b) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0));
      return candidates.length > 0 ? candidates[0].url : null;
    }
    function isVideoCoverImage(img) {
      if (!img || typeof img.closest !== "function") {
        return false;
      }
      if (img.closest('[data-testid="previewInterstitial"], [data-testid="videoComponent"], [data-testid="videoPlayer"]')) {
        return true;
      }
      const alt = typeof img.alt === "string" ? img.alt.toLowerCase() : "";
      return alt.includes("视频") || alt.includes("video");
    }
    function findImagesInPost(container) {
      const images = [];
      const seen = /* @__PURE__ */ new Set();
      for (const selector of imageSelectors) {
        try {
          const elements = container.querySelectorAll(selector);
          elements.forEach((img) => {
            const src = img.src;
            if (!src || typeof src !== "string") {
              return;
            }
            if (!src.includes("pbs.twimg.com")) {
              return;
            }
            if (!isPhotoImageUrl(src)) {
              return;
            }
            const srcKey = src.split("?")[0];
            if (seen.has(srcKey)) {
              return;
            }
            seen.add(srcKey);
            if (src.includes("/profile_images/")) {
              return;
            }
            if (src.includes("/emoji/")) {
              return;
            }
            const alt = img.alt || "";
            if (alt.toLowerCase().includes("avatar") || alt.toLowerCase().includes("profile")) {
              return;
            }
            if (isVideoCoverImage(img)) {
              return;
            }
            images.push(img);
          });
        } catch (error) {
          log("X 图片选择器执行失败:", error.message);
        }
      }
      return images;
    }
    function createMediaItem({ id, kind, label, url, fallbackExt }) {
      if (!url) {
        return null;
      }
      if (kind === "video") {
        return {
          id,
          kind,
          label,
          imageUrl: null,
          videoUrl: url,
          imageExt: ".jpg",
          videoExt: getFileExtensionFromUrl(url, fallbackExt)
        };
      }
      return {
        id,
        kind,
        label,
        imageUrl: url,
        videoUrl: null,
        imageExt: getFileExtensionFromUrl(url, fallbackExt),
        videoExt: ".mov"
      };
    }
    function getDomMediaItems(container) {
      const mediaItems = [];
      const seen = /* @__PURE__ */ new Set();
      const photoImages = findImagesInPost(container);
      photoImages.forEach((img) => {
        const url = getOriginalImageUrl(img.src);
        if (!url) {
          return;
        }
        const key = `photo:${url.split("?")[0]}`;
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        const item = createMediaItem({
          id: `dom-photo-${mediaItems.length + 1}`,
          kind: "image",
          label: `图片 ${mediaItems.length + 1}`,
          url,
          fallbackExt: ".jpg"
        });
        if (item) {
          mediaItems.push(item);
        }
      });
      if (typeof container.querySelectorAll !== "function") {
        return mediaItems;
      }
      const videos = container.querySelectorAll("video");
      videos.forEach((video) => {
        const isGif = isGifVideo(video);
        if (!isGif && !isVideoDownloadEnabled()) {
          return;
        }
        const url = getVideoSourceUrl(video);
        if (!url) {
          return;
        }
        const kind = isGif ? "gif" : "video";
        const key = `${kind}:${url.split("?")[0]}`;
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        const mediaCount = mediaItems.filter((item2) => item2.kind === kind).length + 1;
        const item = createMediaItem({
          id: `dom-${kind}-${mediaCount}`,
          kind,
          label: isGif ? `GIF ${mediaCount}` : `视频 ${mediaCount}`,
          url,
          fallbackExt: ".mp4"
        });
        if (item) {
          mediaItems.push(item);
        }
      });
      return mediaItems;
    }
    function resolvePostMediaItems(postContainer, fallbackItems) {
      if (!isVideoDownloadEnabled()) {
        return fallbackItems;
      }
      const statusId = getPostId(postContainer);
      if (!statusId) {
        return fallbackItems;
      }
      if (fallbackItems.some((item) => item.kind === "gif") || !shouldResolveEmptyMediaItems(postContainer)) {
        return fallbackItems;
      }
      return getXMediaItemsById(statusId).then((mediaItems) => {
        if (mediaItems.length === 0) {
          return fallbackItems;
        }
        const apiByUrl = new Map(
          mediaItems.map((item) => [(item.videoUrl || item.imageUrl || "").split("?")[0], item])
        );
        if (fallbackItems.some((item) => item.kind === "video")) {
          return fallbackItems.map((item) => {
            if (item.kind !== "video") {
              return item;
            }
            const apiItem = apiByUrl.get((item.videoUrl || item.imageUrl || "").split("?")[0]);
            return apiItem && apiItem.kind === "gif" ? apiItem : item;
          });
        }
        const existingKeys = new Set(
          fallbackItems.map((item) => (item.videoUrl || item.imageUrl || "").split("?")[0])
        );
        const merged = fallbackItems.concat(
          mediaItems.filter((item) => !existingKeys.has((item.videoUrl || item.imageUrl || "").split("?")[0]))
        );
        return merged;
      });
    }
    function getPostSelectors() {
      return postSelectors;
    }
    function isMainTweet(container) {
      const article = container.closest('article[data-testid="tweet"]');
      if (!article) {
        return false;
      }
      const timeEl = article.querySelector("time");
      return timeEl !== null;
    }
    function shouldSkipPost(post) {
      return !isMainTweet(post);
    }
    function getPostId(postContainer) {
      const timeElements = typeof postContainer.querySelectorAll === "function" ? postContainer.querySelectorAll("time") : [postContainer.querySelector("time")].filter(Boolean);
      for (const timeEl of timeElements) {
        const timeLink = typeof timeEl.closest === "function" ? timeEl.closest('a[href*="/status/"]') : null;
        const match = timeLink?.href?.match(/\/status\/(\d+)/);
        if (match) {
          return match[1];
        }
      }
      for (const timeEl of timeElements) {
        if (!timeEl.parentElement) {
          continue;
        }
        const linkEl = timeEl.parentElement.querySelector('a[href*="/status/"]');
        const match = linkEl?.href?.match(/\/status\/(\d+)/);
        if (match) {
          return match[1];
        }
      }
      const links = typeof postContainer.querySelectorAll === "function" ? postContainer.querySelectorAll('a[href*="/status/"]') : [];
      for (const link of links) {
        const match = link.href && link.href.match(/\/status\/(\d+)/);
        if (match) {
          return match[1];
        }
      }
      const currentPath = windowRef.location && (windowRef.location.pathname || windowRef.location.href || "");
      const currentMatch = currentPath.match(/\/status\/(\d+)/);
      return currentMatch ? currentMatch[1] : `x_${Date.now()}`;
    }
    function shouldResolveEmptyMediaItems(postContainer) {
      if (!isVideoDownloadEnabled() || !/^\d+$/.test(getPostId(postContainer))) {
        return false;
      }
      if (!postContainer || typeof postContainer.querySelector !== "function") {
        return false;
      }
      return !!postContainer.querySelector(
        'img[src*="video_thumb"], img[src*="amplify_video_thumb"], img[src*="ext_tw_video_thumb"], a[href*="/video/"], video, [data-testid="previewInterstitial"]'
      );
    }
    function buildTweetResultUrl(tweetId) {
      const variables = {
        tweetId,
        includePromotedContent: true,
        withBirdwatchNotes: true,
        withVoice: true,
        withCommunity: true
      };
      return `/i/api/graphql/${tweetResultOperationId}/TweetResultByRestId?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(tweetResultFeatures))}&fieldToggles=${encodeURIComponent(JSON.stringify(tweetResultFieldToggles))}`;
    }
    async function fetchXStatus(tweetId) {
      if (typeof fetchRef !== "function") {
        return null;
      }
      const response = await fetchRef(buildTweetResultUrl(tweetId), {
        credentials: "include",
        headers: {
          Accept: "*/*",
          Authorization: "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
          "X-Twitter-Active-User": "yes",
          "X-Twitter-Client-Language": "zh-cn",
          "X-CSRF-Token": getCookieValue("ct0")
        }
      });
      if (!response || !response.ok) {
        return null;
      }
      return response.json();
    }
    function getXMediaItemsFromStatus(status) {
      const result = status?.data?.tweetResult?.result;
      const media = result?.legacy?.extended_entities?.media || [];
      const quotedMedia = result?.quoted_status_result?.result?.legacy?.extended_entities?.media || [];
      const quotedPhotos = quotedMedia.map((item, index) => {
        if (item?.type !== "photo") {
          return null;
        }
        return createMediaItem({
          id: item.id_str || `graphql-quoted-photo-${index + 1}`,
          kind: "image",
          label: `图片 ${index + 1}`,
          url: getOriginalImageUrl(item.media_url_https),
          fallbackExt: ".jpg"
        });
      }).filter(Boolean);
      const videos = media.map((item, index) => {
        const mediaType = typeof item.type === "string" ? item.type.toLowerCase() : "";
        if (mediaType !== "video" && mediaType !== "animated_gif") {
          return null;
        }
        const url = getBestXVideoVariant(item.video_info && item.video_info.variants);
        if (!url) {
          return null;
        }
        return createMediaItem({
          id: item.id_str || `graphql-video-${index + 1}`,
          kind: mediaType === "animated_gif" ? "gif" : "video",
          label: mediaType === "animated_gif" ? `GIF ${index + 1}` : `视频 ${index + 1}`,
          url,
          fallbackExt: ".mp4"
        });
      }).filter(Boolean);
      return quotedPhotos.concat(videos);
    }
    async function getXMediaItemsById(tweetId) {
      try {
        const status = await fetchXStatus(tweetId);
        return getXMediaItemsFromStatus(status);
      } catch (error) {
        log("X 接口解析失败:", error.message);
        return [];
      }
    }
    function insertDownloadButton({ post, btn }) {
      const usernameEl = post.querySelector('[data-testid="User-Name"]');
      if (usernameEl) {
        const parent = usernameEl.parentElement;
        if (parent && parent.parentNode) {
          parent.parentNode.insertBefore(btn, parent.nextSibling || null);
          return true;
        }
      }
      const timeEl = post.querySelector("time");
      if (timeEl) {
        const timeParent = timeEl.parentElement;
        if (timeParent && timeParent.parentNode) {
          const beforeNode = timeParent.nextElementSibling || timeParent.nextSibling || null;
          timeParent.parentNode.insertBefore(btn, beforeNode);
          return true;
        }
      }
      const actionGroup = post.querySelector('[role="group"]');
      if (actionGroup && actionGroup.parentElement) {
        actionGroup.parentElement.insertBefore(btn, actionGroup);
        return true;
      }
      return false;
    }
    return {
      id: "x",
      displayName: "X",
      isSearchPage: () => false,
      isAvatarImage: () => false,
      getOriginalImageUrl,
      getXOriginalImageUrl: getOriginalImageUrl,
      getDomMediaItems,
      findImagesInPost,
      getBestXVideoVariant,
      getXMediaItemsFromStatus,
      getXMediaItemsById,
      resolvePostMediaItems,
      getPostSelectors,
      shouldSkipPost,
      shouldResolveEmptyMediaItems,
      getPostId,
      insertDownloadButton,
      afterInjectDownloadButtons() {
      },
      initObservers() {
      }
    };
  }

  // src/platforms/index.js
  function createPlatformAdapter(deps) {
    const hostname = deps.windowRef.location.hostname || "";
    if (hostname.includes("x.com") || hostname.includes("twitter")) {
      return createXPlatform(deps);
    }
    return createWeiboPlatform(deps);
  }

  // src/x-gif-frame.js
  var gifenc = __toESM(require_gifenc(), 1);
  var { GIFEncoder: GIFEncoder2 } = gifenc.GIFEncoder ? gifenc : gifenc.default;
  function getChangedFrame(index, palette, width, height, previousPixels) {
    const colors = palette.map(([r, g, b]) => r | g << 8 | b << 16);
    const pixels = new Uint32Array(index.length);
    for (let i = 0; i < index.length; i++) {
      pixels[i] = colors[index[i]];
    }
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;
    const usedColors = new Uint8Array(256);
    for (let i = 0; i < pixels.length; i++) {
      if (!previousPixels || pixels[i] !== previousPixels[i]) {
        const x = i % width;
        const y = Math.floor(i / width);
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
        usedColors[index[i]] = 1;
      }
    }
    if (right < 0) {
      return { pixels, frame: null };
    }
    const transparentIndex = previousPixels ? usedColors.indexOf(0) : -1;
    if (transparentIndex === palette.length) {
      palette.push([0, 0, 0]);
    }
    const frameWidth = right - left + 1;
    const frameHeight = bottom - top + 1;
    const cropped = new Uint8Array(frameWidth * frameHeight);
    for (let y = 0; y < frameHeight; y++) {
      for (let x = 0; x < frameWidth; x++) {
        const source = (top + y) * width + left + x;
        cropped[y * frameWidth + x] = transparentIndex >= 0 && pixels[source] === previousPixels[source] ? transparentIndex : index[source];
      }
    }
    return {
      pixels,
      frame: { index: cropped, palette, width: frameWidth, height: frameHeight, left, top, transparentIndex }
    };
  }
  function encodeGifFrame(frame, first) {
    const gif = GIFEncoder2({ auto: false });
    if (first) gif.writeHeader();
    gif.writeFrame(frame.index, frame.width, frame.height, {
      first,
      palette: frame.palette,
      delay: frame.delay,
      repeat: 0,
      colorDepth: Math.max(2, Math.ceil(Math.log2(frame.palette.length))),
      dispose: 1,
      transparent: frame.transparentIndex >= 0,
      transparentIndex: frame.transparentIndex
    });
    if (!first) {
      if (gif.bytesView()[8] !== 44) {
        throw new Error("GIF 编码器的帧结构不兼容");
      }
      const view = new DataView(gif.buffer);
      view.setUint16(9, frame.left, true);
      view.setUint16(11, frame.top, true);
    }
    return gif.bytesView();
  }

  // src/x-gif-worker.js
  var gifenc2 = __toESM(require_gifenc(), 1);
  var { quantize: quantize2, applyPalette } = gifenc2.quantize ? gifenc2 : gifenc2.default;
  var captureCanvas = null;
  function prepareGifFrame(pixels) {
    const palette = quantize2(pixels, 256);
    return { palette, index: applyPalette(pixels, palette) };
  }
  function runGifJob(data) {
    if (data.command === "capture") {
      try {
        if (!captureCanvas || captureCanvas.width !== data.width || captureCanvas.height !== data.height) {
          captureCanvas = new OffscreenCanvas(data.width, data.height);
        }
        const context = captureCanvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Worker 不支持 Canvas 2D");
        context.drawImage(data.bitmap, 0, 0, data.width, data.height);
        return { pixels: context.getImageData(0, 0, data.width, data.height).data };
      } finally {
        data.bitmap.close();
      }
    }
    if (data.command === "compare") {
      return getChangedFrame(data.index, data.palette, data.width, data.height, data.previousPixels);
    }
    if (data.command === "encode") {
      return { bytes: encodeGifFrame(data.frame, data.first) };
    }
    return prepareGifFrame(data.pixels);
  }
  if (typeof self !== "undefined" && !self.document) {
    self.onmessage = ({ data }) => {
      const { id } = data;
      try {
        const result = runGifJob(data);
        const transfer = data.command === "capture" ? [result.pixels.buffer] : data.command === "compare" ? [result.pixels.buffer, ...result.frame ? [result.frame.index.buffer] : []] : [(result.bytes || result.index).buffer];
        self.postMessage({ id, ...result }, transfer);
      } catch (error) {
        self.postMessage({ id, error: error.message });
      }
    };
  }

  // src/x-gif-workers.js
  var pools = /* @__PURE__ */ new WeakMap();
  async function yieldForGifUi(windowRef) {
    if (windowRef.scheduler?.yield) await windowRef.scheduler.yield();
    else if (windowRef.setTimeout) await new Promise((resolve) => windowRef.setTimeout(resolve, 0));
  }
  function isByteArray(value) {
    return ArrayBuffer.isView(value) && value.BYTES_PER_ELEMENT === 1;
  }
  function isPalette(value) {
    return Array.isArray(value) && value.length > 0 && value.length <= 256 && value.every((color) => Array.isArray(color) && color.length === 3 && color.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255));
  }
  function isValidResult(job, data) {
    if (job.command === "capture") {
      return isByteArray(data.pixels) && data.pixels.length === job.width * job.height * 4;
    }
    if (job.command === "encode") {
      return isByteArray(data.bytes) && data.bytes.length > 8 && data.bytes[0] === (job.first ? 71 : 33);
    }
    if (job.command === "compare") {
      const frame = data.frame;
      return ArrayBuffer.isView(data.pixels) && data.pixels.BYTES_PER_ELEMENT === 4 && data.pixels.length === job.width * job.height && (frame === null || frame && [frame.left, frame.top, frame.width, frame.height].every(Number.isInteger) && frame.left >= 0 && frame.top >= 0 && frame.width > 0 && frame.height > 0 && frame.left + frame.width <= job.width && frame.top + frame.height <= job.height && isByteArray(frame.index) && frame.index.length === frame.width * frame.height && isPalette(frame.palette) && Number.isInteger(frame.transparentIndex) && frame.transparentIndex >= -1 && frame.transparentIndex < frame.palette.length);
    }
    return isPalette(data.palette) && isByteArray(data.index) && data.index.length === job.pixels.length / 4;
  }
  function createPool(windowRef, source) {
    const slots = [];
    const queue = [];
    let disabled = false;
    let nextId = 0;
    async function fallback(job) {
      clearTimeout(job.timer);
      try {
        await yieldForGifUi(windowRef);
        job.resolve(job.runFallback ? await job.runFallback() : runGifJob(job.backup));
      } catch (error) {
        job.reject(error);
      }
    }
    function stop() {
      if (disabled) return;
      disabled = true;
      const pending = queue.splice(0);
      for (const slot of slots) {
        slot.worker.terminate();
        if (slot.job) pending.push(slot.job);
        slot.job = null;
      }
      pending.forEach(fallback);
    }
    function dispatch() {
      for (const slot of slots) {
        if (disabled || slot.job || !queue.length) continue;
        const job = queue.shift();
        slot.job = job;
        job.timer = setTimeout(stop, 15e3);
        try {
          slot.worker.postMessage({ id: job.id, ...job.data }, job.transfer);
        } catch {
          stop();
        }
      }
    }
    let url;
    try {
      url = windowRef.URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
      const count = Math.min(2, Math.max(1, (windowRef.navigator?.hardwareConcurrency || 2) - 1));
      for (let i = 0; i < count; i++) {
        const worker = new windowRef.Worker(url);
        const slot = { worker, job: null };
        slots.push(slot);
        worker.onmessage = ({ data }) => {
          const job = slot.job;
          if (!job || disabled) return;
          if (data?.id !== job.id || data.error || !isValidResult(job.backup, data)) {
            stop();
            return;
          }
          clearTimeout(job.timer);
          slot.job = null;
          job.resolve(data);
          dispatch();
        };
        worker.onerror = (event) => {
          event.preventDefault?.();
          stop();
        };
        worker.onmessageerror = stop;
      }
    } catch {
      stop();
      return null;
    } finally {
      if (url) windowRef.URL.revokeObjectURL(url);
    }
    return {
      users: 0,
      get disabled() {
        return disabled;
      },
      request(data, transfer = [], backup = data, runFallback = null) {
        return new Promise((resolve, reject) => {
          const job = { id: nextId++, data, transfer, backup, runFallback, resolve, reject };
          if (disabled) fallback(job);
          else {
            queue.push(job);
            dispatch();
          }
        });
      },
      stop
    };
  }
  function acquireGifWorkers(windowRef, source) {
    if (!source || typeof windowRef.Worker !== "function") return null;
    let pool = pools.get(windowRef);
    if (!pool) {
      pool = createPool(windowRef, source);
      if (!pool) return null;
      pools.set(windowRef, pool);
    }
    pool.users++;
    return {
      async capture(video, width, height, readFrame) {
        let bitmap;
        const fallback = () => ({ pixels: readFrame() });
        if (pool.disabled) {
          await yieldForGifUi(windowRef);
          return fallback();
        }
        try {
          bitmap = await windowRef.createImageBitmap(video);
        } catch {
          await yieldForGifUi(windowRef);
          return fallback();
        }
        try {
          const data = { command: "capture", bitmap, width, height };
          return await pool.request(data, [bitmap], data, fallback);
        } finally {
          bitmap.close();
        }
      },
      process: (pixels, backup) => pool.request({ pixels }, [pixels.buffer], { pixels: backup }),
      compare: (index, palette, width, height, previousPixels) => pool.request({ command: "compare", index, palette, width, height, previousPixels }),
      encode: (frame, first) => pool.request({ command: "encode", frame: { ...frame }, first }),
      release() {
        if (--pool.users === 0) {
          pool.stop();
          pools.delete(windowRef);
        }
      }
    };
  }

  // src/x-gif.js
  var workerSource = true ? '(()=>{var ue=Object.create;var K=Object.defineProperty;var he=Object.getOwnPropertyDescriptor;var ge=Object.getOwnPropertyNames;var we=Object.getPrototypeOf,de=Object.prototype.hasOwnProperty;var ye=(e,t)=>()=>(t||e((t={exports:{}}).exports,t),t.exports);var pe=(e,t,n,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of ge(t))!de.call(e,o)&&o!==n&&K(e,o,{get:()=>t[o],enumerable:!(r=he(t,o))||r.enumerable});return e};var X=(e,t,n)=>(n=e!=null?ue(we(e)):{},pe(t||!e||!e.__esModule?K(n,"default",{value:e,enumerable:!0}):n,e));var Z=ye(N=>{var ee=Object.defineProperty,be=e=>ee(e,"__esModule",{value:!0}),xe=(e,t)=>{for(var n in t)ee(e,n,{get:t[n],enumerable:!0})};be(N);xe(N,{GIFEncoder:()=>se,applyPalette:()=>ke,default:()=>Ve,nearestColor:()=>Ee,nearestColorIndex:()=>ie,nearestColorIndexWithDistance:()=>ce,prequantize:()=>_e,quantize:()=>Ce,snapColorsToPalette:()=>ze});var Ae={signature:"GIF",version:"89a",trailer:59,extensionIntroducer:33,applicationExtensionLabel:255,graphicControlExtensionLabel:249,imageSeparator:44,signatureSize:3,versionSize:3,globalColorTableFlagMask:128,colorResolutionMask:112,sortFlagMask:8,globalColorTableSizeMask:7,applicationIdentifierSize:8,applicationAuthCodeSize:3,disposalMethodMask:28,userInputFlagMask:2,transparentColorFlagMask:1,localColorTableFlagMask:128,interlaceFlagMask:64,idSortFlagMask:32,localColorTableSizeMask:7};function te(e=256){let t=0,n=new Uint8Array(e);return{get buffer(){return n.buffer},reset(){t=0},bytesView(){return n.subarray(0,t)},bytes(){return n.slice(0,t)},writeByte(o){r(t+1),n[t]=o,t++},writeBytes(o,c=0,i=o.length){r(t+i);for(let s=0;s<i;s++)n[t++]=o[s+c]},writeBytesView(o,c=0,i=o.byteLength){r(t+i),n.set(o.subarray(c,c+i),t),t+=i}};function r(o){var c=n.length;if(c>=o)return;var i=1024*1024;o=Math.max(o,c*(c<i?2:1.125)>>>0),c!=0&&(o=Math.max(o,256));let s=n;n=new Uint8Array(o),t>0&&n.set(s.subarray(0,t),0)}}var L=12,Y=5003,Me=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535];function me(e,t,n,r,o=te(512),c=new Uint8Array(256),i=new Int32Array(Y),s=new Int32Array(Y)){let h=i.length,u=Math.max(2,r);c.fill(0),s.fill(0),i.fill(-1);let f=0,l=0,g=u+1,p=g,d=!1,y=p,w=(1<<y)-1,a=1<<g-1,m=a+1,M=a+2,b=0,B=n[0],F=0;for(let A=h;A<65536;A*=2)++F;F=8-F,o.writeByte(u),C(a);let x=n.length;for(let A=1;A<x;A++)e:{let _=n[A],k=(_<<L)+B,I=_<<F^B;if(i[I]===k){B=s[I];break e}let R=I===0?1:h-I;for(;i[I]>=0;)if(I-=R,I<0&&(I+=h),i[I]===k){B=s[I];break e}C(B),B=_,M<1<<L?(s[I]=M++,i[I]=k):(i.fill(-1),M=a+2,d=!0,C(a))}return C(B),C(m),o.writeByte(0),o.bytesView();function C(A){for(f&=Me[l],l>0?f|=A<<l:f=A,l+=y;l>=8;)c[b++]=f&255,b>=254&&(o.writeByte(b),o.writeBytesView(c,0,b),b=0),f>>=8,l-=8;if((M>w||d)&&(d?(y=p,w=(1<<y)-1,d=!1):(++y,w=y===L?1<<y:(1<<y)-1)),A==m){for(;l>0;)c[b++]=f&255,b>=254&&(o.writeByte(b),o.writeBytesView(c,0,b),b=0),f>>=8,l-=8;b>0&&(o.writeByte(b),o.writeBytesView(c,0,b),b=0)}}}var Be=me;function ne(e,t,n){return e<<8&63488|t<<2&992|n>>3}function re(e,t,n,r){return e>>4|t&240|(n&240)<<4|(r&240)<<8}function oe(e,t,n){return e>>4<<8|t&240|n>>4}function D(e,t,n){return e<t?t:e>n?n:e}function q(e){return e*e}function Q(e,t,n){var r=0,o=1e100;let c=e[t],i=c.cnt,s=c.ac,h=c.rc,u=c.gc,f=c.bc;for(var l=c.fw;l!=0;l=e[l].fw){let p=e[l],d=p.cnt,y=i*d/(i+d);if(!(y>=o)){var g=0;n&&(g+=y*q(p.ac-s),g>=o)||(g+=y*q(p.rc-h),!(g>=o)&&(g+=y*q(p.gc-u),!(g>=o)&&(g+=y*q(p.bc-f),!(g>=o)&&(o=g,r=l))))}}c.err=o,c.nn=r}function W(){return{ac:0,rc:0,gc:0,bc:0,cnt:0,nn:0,fw:0,bk:0,tm:0,mtm:0,err:0}}function Ie(e,t){let n=t==="rgb444"?4096:65536,r=new Array(n),o=e.length;if(t==="rgba4444")for(let c=0;c<o;++c){let i=e[c],s=i>>24&255,h=i>>16&255,u=i>>8&255,f=i&255,l=re(f,u,h,s),g=l in r?r[l]:r[l]=W();g.rc+=f,g.gc+=u,g.bc+=h,g.ac+=s,g.cnt++}else if(t==="rgb444")for(let c=0;c<o;++c){let i=e[c],s=i>>16&255,h=i>>8&255,u=i&255,f=oe(u,h,s),l=f in r?r[f]:r[f]=W();l.rc+=u,l.gc+=h,l.bc+=s,l.cnt++}else for(let c=0;c<o;++c){let i=e[c],s=i>>16&255,h=i>>8&255,u=i&255,f=ne(u,h,s),l=f in r?r[f]:r[f]=W();l.rc+=u,l.gc+=h,l.bc+=s,l.cnt++}return r}function Ce(e,t,n={}){let{format:r="rgb565",clearAlpha:o=!0,clearAlphaColor:c=0,clearAlphaThreshold:i=0,oneBitAlpha:s=!1}=n;if(!e||!e.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(e instanceof Uint8Array)&&!(e instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");let h=new Uint32Array(e.buffer),u=n.useSqrt!==!1,f=r==="rgba4444",l=Ie(h,r),g=l.length,p=g-1,d=new Uint32Array(g+1);for(var y=0,a=0;a<g;++a){let v=l[a];if(v!=null){var w=1/v.cnt;f&&(v.ac*=w),v.rc*=w,v.gc*=w,v.bc*=w,l[y++]=v}}q(t)/y<.022&&(u=!1);for(var a=0;a<y-1;++a)l[a].fw=a+1,l[a+1].bk=a,u&&(l[a].cnt=Math.sqrt(l[a].cnt));u&&(l[a].cnt=Math.sqrt(l[a].cnt));var m,M,b;for(a=0;a<y;++a){Q(l,a,!1);var B=l[a].err;for(M=++d[0];M>1&&(b=M>>1,!(l[m=d[b]].err<=B));M=b)d[M]=m;d[M]=a}var F=y-t;for(a=0;a<F;){for(var x;;){var C=d[1];if(x=l[C],x.tm>=x.mtm&&l[x.nn].mtm<=x.tm)break;x.mtm==p?C=d[1]=d[d[0]--]:(Q(l,C,!1),x.tm=a);var B=l[C].err;for(M=1;(b=M+M)<=d[0]&&(b<d[0]&&l[d[b]].err>l[d[b+1]].err&&b++,!(B<=l[m=d[b]].err));M=b)d[M]=m;d[M]=C}var A=l[x.nn],_=x.cnt,k=A.cnt,w=1/(_+k);f&&(x.ac=w*(_*x.ac+k*A.ac)),x.rc=w*(_*x.rc+k*A.rc),x.gc=w*(_*x.gc+k*A.gc),x.bc=w*(_*x.bc+k*A.bc),x.cnt+=A.cnt,x.mtm=++a,l[A.bk].fw=A.fw,l[A.fw].bk=A.bk,A.mtm=p}let I=[];var R=0;for(a=0;;++R){let O=D(Math.round(l[a].rc),0,255),v=D(Math.round(l[a].gc),0,255),H=D(Math.round(l[a].bc),0,255),E=255;f&&(E=D(Math.round(l[a].ac),0,255),s&&(E=E<=(typeof s=="number"?s:127)?0:255),o&&E<=i&&(O=v=H=c,E=0));let J=f?[O,v,H,E]:[O,v,H];if(ve(I,J)||I.push(J),(a=l[a].fw)==0)break}return I}function ve(e,t){for(let n=0;n<e.length;n++){let r=e[n],o=r[0]===t[0]&&r[1]===t[1]&&r[2]===t[2],c=r.length>=4&&t.length>=4?r[3]===t[3]:!0;if(o&&c)return!0}return!1}function P(e,t){var n=0,r;for(r=0;r<e.length;r++){let o=e[r]-t[r];n+=o*o}return n}function V(e,t){return t>1?Math.round(e/t)*t:e}function _e(e,{roundRGB:t=5,roundAlpha:n=10,oneBitAlpha:r=null}={}){let o=new Uint32Array(e.buffer);for(let c=0;c<o.length;c++){let i=o[c],s=i>>24&255,h=i>>16&255,u=i>>8&255,f=i&255;s=V(s,n),r&&(s=s<=(typeof r=="number"?r:127)?0:255),f=V(f,t),u=V(u,t),h=V(h,t),o[c]=s<<24|h<<16|u<<8|f<<0}}function ke(e,t,n="rgb565"){if(!e||!e.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(e instanceof Uint8Array)&&!(e instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");if(t.length>256)throw new Error("applyPalette() only works with 256 colors or less");let r=new Uint32Array(e.buffer),o=r.length,c=n==="rgb444"?4096:65536,i=new Uint8Array(o),s=new Array(c),h=n==="rgba4444";if(n==="rgba4444")for(let u=0;u<o;u++){let f=r[u],l=f>>24&255,g=f>>16&255,p=f>>8&255,d=f&255,y=re(d,p,g,l),w=y in s?s[y]:s[y]=Fe(d,p,g,l,t);i[u]=w}else{let u=n==="rgb444"?oe:ne;for(let f=0;f<o;f++){let l=r[f],g=l>>16&255,p=l>>8&255,d=l&255,y=u(d,p,g),w=y in s?s[y]:s[y]=Ue(d,p,g,t);i[f]=w}}return i}function Fe(e,t,n,r,o){let c=0,i=1e100;for(let s=0;s<o.length;s++){let h=o[s],u=h[3],f=z(u-r);if(f>i)continue;let l=h[0];if(f+=z(l-e),f>i)continue;let g=h[1];if(f+=z(g-t),f>i)continue;let p=h[2];f+=z(p-n),!(f>i)&&(i=f,c=s)}return c}function Ue(e,t,n,r){let o=0,c=1e100;for(let i=0;i<r.length;i++){let s=r[i],h=s[0],u=z(h-e);if(u>c)continue;let f=s[1];if(u+=z(f-t),u>c)continue;let l=s[2];u+=z(l-n),!(u>c)&&(c=u,o=i)}return o}function ze(e,t,n=5){if(!e.length||!t.length)return;let r=e.map(i=>i.slice(0,3)),o=n*n,c=e[0].length;for(let i=0;i<t.length;i++){let s=t[i];s.length<c?s=[s[0],s[1],s[2],255]:s.length>c?s=s.slice(0,3):s=s.slice();let h=ce(r,s.slice(0,3),P),u=h[0],f=h[1];f>0&&f<=o&&(e[u]=s)}}function z(e){return e*e}function ie(e,t,n=P){let r=1/0,o=-1;for(let c=0;c<e.length;c++){let i=e[c],s=n(t,i);s<r&&(r=s,o=c)}return o}function ce(e,t,n=P){let r=1/0,o=-1;for(let c=0;c<e.length;c++){let i=e[c],s=n(t,i);s<r&&(r=s,o=c)}return[o,r]}function Ee(e,t,n=P){return e[ie(e,t,n)]}function se(e={}){let{initialCapacity:t=4096,auto:n=!0}=e,r=te(t),o=5003,c=new Uint8Array(256),i=new Int32Array(o),s=new Int32Array(o),h=!1;return{reset(){r.reset(),h=!1},finish(){r.writeByte(Ae.trailer)},bytes(){return r.bytes()},bytesView(){return r.bytesView()},get buffer(){return r.buffer},get stream(){return r},writeHeader:u,writeFrame(f,l,g,p={}){let{transparent:d=!1,transparentIndex:y=0,delay:w=0,palette:a=null,repeat:m=0,colorDepth:M=8,dispose:b=-1}=p,B=!1;if(n?h||(B=!0,u(),h=!0):B=!!p.first,l=Math.max(0,Math.floor(l)),g=Math.max(0,Math.floor(g)),B){if(!a)throw new Error("First frame must include a { palette } option");Te(r,l,g,a,M),$(r,a),m>=0&&Ge(r,m)}let F=Math.round(w/10);qe(r,b,F,d,y);let x=!!a&&!B;Se(r,l,g,x?a:null),x&&$(r,a),De(r,f,l,g,M,c,i,s)}};function u(){le(r,"GIF89a")}}function qe(e,t,n,r,o){e.writeByte(33),e.writeByte(249),e.writeByte(4),o<0&&(o=0,r=!1);var c,i;r?(c=1,i=2):(c=0,i=0),t>=0&&(i=t&7),i<<=2,e.writeByte(0|i|0|c),U(e,n),e.writeByte(o||0),e.writeByte(0)}function Te(e,t,n,r,o=8){let s=j(r.length)-1,h=128|o-1<<4|0|s,u=0,f=0;U(e,t),U(e,n),e.writeBytes([h,u,f])}function Ge(e,t){e.writeByte(33),e.writeByte(255),e.writeByte(11),le(e,"NETSCAPE2.0"),e.writeByte(3),e.writeByte(1),U(e,t),e.writeByte(0)}function $(e,t){let n=1<<j(t.length);for(let r=0;r<n;r++){let o=[0,0,0];r<t.length&&(o=t[r]),e.writeByte(o[0]),e.writeByte(o[1]),e.writeByte(o[2])}}function Se(e,t,n,r){if(e.writeByte(44),U(e,0),U(e,0),U(e,t),U(e,n),r){let i=j(r.length)-1;e.writeByte(128|i)}else e.writeByte(0)}function De(e,t,n,r,o=8,c,i,s){Be(n,r,t,o,e,c,i,s)}function U(e,t){e.writeByte(t&255),e.writeByte(t>>8&255)}function le(e,t){for(var n=0;n<t.length;n++)e.writeByte(t.charCodeAt(n))}function j(e){return Math.max(Math.ceil(Math.log2(e)),1)}var Ve=se});var S=X(Z(),1);var T=X(Z(),1),{GIFEncoder:Pe}=T.GIFEncoder?T:T.default;function fe(e,t,n,r,o){let c=t.map(([w,a,m])=>w|a<<8|m<<16),i=new Uint32Array(e.length);for(let w=0;w<e.length;w++)i[w]=c[e[w]];let s=n,h=r,u=-1,f=-1,l=new Uint8Array(256);for(let w=0;w<i.length;w++)if(!o||i[w]!==o[w]){let a=w%n,m=Math.floor(w/n);s=Math.min(s,a),h=Math.min(h,m),u=Math.max(u,a),f=Math.max(f,m),l[e[w]]=1}if(u<0)return{pixels:i,frame:null};let g=o?l.indexOf(0):-1;g===t.length&&t.push([0,0,0]);let p=u-s+1,d=f-h+1,y=new Uint8Array(p*d);for(let w=0;w<d;w++)for(let a=0;a<p;a++){let m=(h+w)*n+s+a;y[w*p+a]=g>=0&&i[m]===o[m]?g:e[m]}return{pixels:i,frame:{index:y,palette:t,width:p,height:d,left:s,top:h,transparentIndex:g}}}function ae(e,t){let n=Pe({auto:!1});if(t&&n.writeHeader(),n.writeFrame(e.index,e.width,e.height,{first:t,palette:e.palette,delay:e.delay,repeat:0,colorDepth:Math.max(2,Math.ceil(Math.log2(e.palette.length))),dispose:1,transparent:e.transparentIndex>=0,transparentIndex:e.transparentIndex}),!t){if(n.bytesView()[8]!==44)throw new Error("GIF 编码器的帧结构不兼容");let r=new DataView(n.buffer);r.setUint16(9,e.left,!0),r.setUint16(11,e.top,!0)}return n.bytesView()}var{quantize:Re,applyPalette:Oe}=S.quantize?S:S.default,G=null;function He(e){let t=Re(e,256);return{palette:t,index:Oe(e,t)}}function Le(e){if(e.command==="capture")try{(!G||G.width!==e.width||G.height!==e.height)&&(G=new OffscreenCanvas(e.width,e.height));let t=G.getContext("2d",{willReadFrequently:!0});if(!t)throw new Error("Worker 不支持 Canvas 2D");return t.drawImage(e.bitmap,0,0,e.width,e.height),{pixels:t.getImageData(0,0,e.width,e.height).data}}finally{e.bitmap.close()}return e.command==="compare"?fe(e.index,e.palette,e.width,e.height,e.previousPixels):e.command==="encode"?{bytes:ae(e.frame,e.first)}:He(e.pixels)}typeof self<"u"&&!self.document&&(self.onmessage=({data:e})=>{let{id:t}=e;try{let n=Le(e),r=e.command==="capture"?[n.pixels.buffer]:e.command==="compare"?[n.pixels.buffer,...n.frame?[n.frame.index.buffer]:[]]:[(n.bytes||n.index).buffer];self.postMessage({id:t,...n},r)}catch(n){self.postMessage({id:t,error:n.message})}});})();\n' : "";
  function waitForVideo(video, eventName, action) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error("视频解码超时")), 3e4);
      function finish(error) {
        clearTimeout(timer);
        video.removeEventListener(eventName, onReady);
        video.removeEventListener("error", onError);
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }
      function onReady() {
        finish();
      }
      function onError() {
        finish(new Error("浏览器无法解码此 GIF 视频源"));
      }
      video.addEventListener(eventName, onReady);
      video.addEventListener("error", onError);
      try {
        action();
      } catch (error) {
        finish(error);
      }
    });
  }
  async function convertXVideoToGif(blob, windowRef) {
    const video = windowRef.document.createElement("video");
    const sourceUrl = windowRef.URL.createObjectURL(blob);
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    let workers = null;
    try {
      await waitForVideo(video, "loadeddata", () => {
        video.src = sourceUrl;
        video.load();
      });
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!Number.isFinite(video.duration) || video.duration <= 0 || !width || !height || width > 65535 || height > 65535) {
        throw new Error("GIF 视频源的时长或尺寸无效");
      }
      const canvas = windowRef.document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        throw new Error("浏览器不支持 Canvas 2D");
      }
      const encodedParts = [];
      const encoding = [];
      let firstFrame = true;
      const frameDelay = 50;
      const durationMs = Math.max(10, Math.round(video.duration * 100) * 10);
      const frameCount = Math.ceil(durationMs / frameDelay);
      workers = acquireGifWorkers(windowRef, workerSource);
      const captureInWorker = workers && typeof windowRef.createImageBitmap === "function" && typeof windowRef.OffscreenCanvas === "function";
      const queuedFrames = [];
      let previousRaw = null;
      let previousPixels = null;
      let pendingFrame = null;
      async function writeFrame(frame) {
        if (!workers) await yieldForGifUi(windowRef);
        const result = workers ? workers.encode(frame, firstFrame) : Promise.resolve({ bytes: encodeGifFrame(frame, firstFrame) });
        firstFrame = false;
        result.catch(() => {
        });
        encoding.push(result);
        if (encoding.length > 2) encodedParts.push((await encoding.shift()).bytes);
      }
      async function consumeFrame() {
        const { result, delay } = queuedFrames.shift();
        const { index, palette } = await result;
        if (!workers) await yieldForGifUi(windowRef);
        const changed = workers ? await workers.compare(index, palette, width, height, previousPixels) : getChangedFrame(index, palette, width, height, previousPixels);
        previousPixels = changed.pixels;
        if (changed.frame) {
          if (pendingFrame) await writeFrame(pendingFrame);
          pendingFrame = { ...changed.frame, delay: 0 };
        }
        let remaining = delay;
        while (pendingFrame.delay + remaining > 655350) {
          remaining -= 655350 - pendingFrame.delay;
          pendingFrame.delay = 655350;
          await writeFrame(pendingFrame);
          pendingFrame.delay = 0;
        }
        pendingFrame.delay += remaining;
      }
      for (let frame = 0; frame < frameCount; frame++) {
        const time = frame * frameDelay / 1e3;
        if (video.currentTime !== time) {
          await waitForVideo(video, "seeked", () => {
            video.currentTime = time;
          });
        }
        const readFrame = () => {
          context.drawImage(video, 0, 0, width, height);
          return context.getImageData(0, 0, width, height).data;
        };
        let data;
        if (captureInWorker) {
          ({ pixels: data } = await workers.capture(video, width, height, readFrame));
        } else {
          await yieldForGifUi(windowRef);
          context.drawImage(video, 0, 0, width, height);
          await yieldForGifUi(windowRef);
          data = context.getImageData(0, 0, width, height).data;
        }
        const delay = Math.min(frameDelay, durationMs - frame * frameDelay);
        const raw = new Uint32Array(data.buffer, data.byteOffset, data.byteLength / 4);
        let identical = !!previousRaw;
        if (identical) {
          for (let i = 0; i < raw.length; i++) {
            if (raw[i] !== previousRaw[i]) {
              identical = false;
              break;
            }
          }
        }
        if (identical) {
          queuedFrames[queuedFrames.length - 1].delay += delay;
          continue;
        }
        const backup = workers ? data.slice() : data;
        previousRaw = new Uint32Array(backup.buffer, backup.byteOffset, backup.byteLength / 4);
        if (!workers) await yieldForGifUi(windowRef);
        const result = workers ? workers.process(data, backup) : Promise.resolve(prepareGifFrame(data));
        result.catch(() => {
        });
        queuedFrames.push({ result, delay });
        if (queuedFrames.length > (workers ? 2 : 1)) {
          await consumeFrame();
        }
      }
      while (queuedFrames.length) await consumeFrame();
      await writeFrame(pendingFrame);
      while (encoding.length) encodedParts.push((await encoding.shift()).bytes);
      return new Blob([...encodedParts, new Uint8Array([59])], { type: "image/gif" });
    } finally {
      workers?.release();
      video.pause();
      video.removeAttribute("src");
      video.load();
      windowRef.URL.revokeObjectURL(sourceUrl);
    }
  }

  // src/utils.js
  function createUtils({ config, windowRef, fetchRef, gmDownload, gmXmlhttpRequest, ui: ui2 }) {
    let platformLabel = "weibo";
    function log(...args) {
      if (config.DEBUG) {
        console.log(`[${platformLabel} Downloader]`, ...args);
      }
    }
    function getFileExtensionFromUrl(url, fallback = ".jpg") {
      if (!url || typeof url !== "string") {
        return fallback;
      }
      try {
        const fullUrl = url.startsWith("http") ? url : `https://${url}`;
        const pathname = new URL(fullUrl).pathname;
        const match = pathname.match(/(\.[a-z0-9]+)$/i);
        return match ? match[1].toLowerCase() : fallback;
      } catch {
        const cleanUrl = url.split("?")[0];
        const match = cleanUrl.match(/(\.[a-z0-9]+)$/i);
        return match ? match[1].toLowerCase() : fallback;
      }
    }
    function getFileBasenameFromUrl(url, fallback) {
      if (!url || typeof url !== "string") {
        return fallback;
      }
      try {
        const pathname = new URL(url.startsWith("http") ? url : `https://${url}`).pathname;
        const parts = pathname.split("/");
        const lastSegment = parts[parts.length - 1] || "";
        return lastSegment.replace(/\.[^.]+$/, "") || fallback;
      } catch {
        const cleanUrl = url.split("?")[0];
        const parts = cleanUrl.split("/");
        const lastSegment = parts[parts.length - 1] || "";
        return lastSegment.replace(/\.[^.]+$/, "") || fallback;
      }
    }
    const platform = createPlatformAdapter({
      config,
      windowRef,
      fetchRef,
      gmXmlhttpRequest,
      log,
      getFileBasenameFromUrl,
      getFileExtensionFromUrl
    });
    platformLabel = platform.id;
    function getCurrentPlatform() {
      return platform.id;
    }
    function getCurrentPlatformDisplayName() {
      return platform.displayName || platform.id;
    }
    function getOriginalImageUrl(url) {
      return platform.getOriginalImageUrl(url);
    }
    function getFilename(postId, index) {
      const platform2 = getCurrentPlatform();
      return `${platform2}_${postId}_${index}.jpg`;
    }
    function buildMediaDownloadJobs(mediaItems, postId) {
      const platform2 = getCurrentPlatform();
      const jobs = [];
      mediaItems.forEach((item, index) => {
        if (!item || typeof item !== "object") {
          return;
        }
        const baseName = `${platform2}_${postId}_${index + 1}`;
        if (item.imageUrl) {
          const job = {
            type: "image",
            url: item.imageUrl,
            filename: `${baseName}${item.imageExt || getFileExtensionFromUrl(item.imageUrl, ".jpg")}`
          };
          if (platform2 === "x" && item.kind === "gif" && config.X_GIF_AUTO_CONVERT && getFileExtensionFromUrl(item.imageUrl, item.imageExt) !== ".gif") {
            job.convertToGif = true;
            job.filename = `${baseName}.gif`;
          }
          jobs.push(job);
        }
        if (item.videoUrl) {
          const isStandaloneVideo = item.kind === "video";
          jobs.push({
            type: "video",
            url: item.videoUrl,
            filename: `${baseName}${isStandaloneVideo ? "" : "_live"}${item.videoExt || getFileExtensionFromUrl(item.videoUrl, ".mov")}`
          });
        }
      });
      return jobs;
    }
    function normalizeLegacyMediaItems(urls) {
      return (urls || []).map((url, index) => ({
        id: `legacy-${index + 1}`,
        kind: "image",
        label: `图片 ${index + 1}`,
        imageUrl: url,
        videoUrl: null,
        imageExt: getFileExtensionFromUrl(url, ".jpg"),
        videoExt: ".mov"
      }));
    }
    function getDownloadRequestHeaders(url) {
      if (!url || typeof url !== "string") {
        return {};
      }
      try {
        const { hostname } = new URL(url);
        if (hostname.endsWith("sinaimg.cn") || hostname.endsWith("sina.cn")) {
          return {
            Referer: "https://www.weibo.com/",
            Origin: "https://www.weibo.com"
          };
        }
      } catch {
        return {};
      }
      return {};
    }
    async function tryGmDownload(resource, filename) {
      if (typeof gmDownload !== "function") {
        return false;
      }
      try {
        return await new Promise((resolve) => {
          try {
            const downloadId = gmDownload({
              url: resource,
              name: filename,
              headers: getDownloadRequestHeaders(resource),
              saveAs: false,
              onload() {
                resolve(true);
              },
              onerror(error) {
                log(`GM_download失败: ${error.error || error.message || "未知错误"}`);
                resolve(false);
              },
              onprogress: () => {
              }
            });
            if (downloadId === false) {
              log("GM_download返回false，尝试备用方案:", filename);
              resolve(false);
            }
          } catch (error) {
            log("GM_download异常:", error.message);
            resolve(false);
          }
        });
      } catch (error) {
        log("GM_download异常，尝试备用方案:", error.message);
        return false;
      }
    }
    function downloadBlobWithAnchor(blob, filename) {
      const blobUrl = windowRef.URL.createObjectURL(blob);
      const anchor = windowRef.document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = filename;
      const mountPoint = windowRef.document.body || windowRef.document.documentElement;
      if (mountPoint && typeof mountPoint.appendChild === "function") {
        mountPoint.appendChild(anchor);
      }
      anchor.click();
      if (anchor.parentNode && typeof anchor.parentNode.removeChild === "function") {
        anchor.parentNode.removeChild(anchor);
      }
      setTimeout(() => windowRef.URL.revokeObjectURL(blobUrl), 1e3);
      return "started";
    }
    async function fetchBlobWithXmlHttpRequest(url) {
      if (typeof gmXmlhttpRequest !== "function") {
        return null;
      }
      const headers = getDownloadRequestHeaders(url);
      return new Promise((resolve, reject) => {
        try {
          gmXmlhttpRequest({
            method: "GET",
            url,
            headers,
            responseType: "blob",
            onload(response) {
              if (response.status >= 200 && response.status < 300 && response.response) {
                resolve(response.response);
                return;
              }
              reject(new Error(`GM_xmlhttpRequest状态异常: ${response.status}`));
            },
            onerror(error) {
              reject(new Error(error?.error || error?.message || "GM_xmlhttpRequest失败"));
            },
            ontimeout() {
              reject(new Error("GM_xmlhttpRequest超时"));
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    }
    async function fetchBlobWithWindowFetch(url) {
      const response = await fetchRef(url, {
        credentials: platform.id === "x" ? "omit" : "include"
      });
      if (!response || !response.ok) {
        throw new Error(`fetch状态异常: ${response?.status ?? "unknown"}`);
      }
      return response.blob();
    }
    async function downloadBlob(blob, filename) {
      const gmSuccess = await tryGmDownload(blob, filename);
      if (gmSuccess) {
        return true;
      }
      return downloadBlobWithAnchor(blob, filename);
    }
    async function downloadImage(url, filename) {
      const directDownloadSuccess = await tryGmDownload(url, filename);
      if (directDownloadSuccess) {
        return true;
      }
      log("GM_download失败，尝试二进制兜底下载");
      return downloadImageFallback(url, filename);
    }
    async function downloadImageFallback(url, filename) {
      try {
        let blob = null;
        if (typeof gmXmlhttpRequest === "function") {
          blob = await fetchBlobWithXmlHttpRequest(url);
        } else {
          blob = await fetchBlobWithWindowFetch(url);
        }
        return downloadBlob(blob, filename);
      } catch (primaryError) {
        if (typeof gmXmlhttpRequest === "function") {
          try {
            const blob = await fetchBlobWithWindowFetch(url);
            return downloadBlob(blob, filename);
          } catch (secondaryError) {
            log(
              "二进制兜底下载失败:",
              filename,
              primaryError?.message || "未知错误",
              secondaryError?.message || "未知错误"
            );
            return false;
          }
        }
        log("二进制兜底下载失败:", filename, primaryError?.message || "未知错误");
        return false;
      }
    }
    async function downloadAllImages(urls, postId) {
      return downloadMediaItems(normalizeLegacyMediaItems(urls), postId);
    }
    async function downloadXGif(url, filename) {
      try {
        let blob;
        try {
          blob = typeof gmXmlhttpRequest === "function" ? await fetchBlobWithXmlHttpRequest(url) : await fetchBlobWithWindowFetch(url);
        } catch (error) {
          if (typeof gmXmlhttpRequest !== "function") {
            throw error;
          }
          blob = await fetchBlobWithWindowFetch(url);
        }
        return await downloadBlob(await convertXVideoToGif(blob, windowRef), filename);
      } catch (error) {
        log("X GIF转换失败:", filename, error.message);
        return false;
      }
    }
    async function downloadMediaItems(mediaItems, postId) {
      if (!mediaItems || mediaItems.length === 0) {
        if (ui2 && typeof ui2.showToast === "function") {
          ui2.showToast("未找到图片");
        }
        return { successCount: 0, failedCount: 0, handedOffCount: 0 };
      }
      const jobs = buildMediaDownloadJobs(mediaItems, postId);
      if (jobs.length === 0) {
        if (ui2 && typeof ui2.showToast === "function") {
          ui2.showToast("未找到图片");
        }
        return { successCount: 0, failedCount: 0, handedOffCount: 0 };
      }
      log(`开始下载 ${mediaItems.length} 个媒体项，共 ${jobs.length} 个文件...`);
      let successCount = 0;
      let failedCount = 0;
      let failedGifCount = 0;
      let handedOffCount = 0;
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        const success = job.convertToGif ? await downloadXGif(job.url, job.filename) : await downloadImage(job.url, job.filename);
        if (success) {
          successCount++;
          if (success === "started") {
            handedOffCount++;
          }
        } else {
          failedCount++;
          if (job.convertToGif) {
            failedGifCount++;
          }
        }
        if (i < jobs.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, config.DELAY_MS));
        }
      }
      let message = "";
      if (failedCount === 0) {
        const allVideos = mediaItems.length > 0 && mediaItems.every((item) => item.kind === "video");
        const imageCount = jobs.filter((job) => job.type === "image").length;
        const videoCount = jobs.filter((job) => job.type === "video").length;
        if (jobs.length === mediaItems.length && imageCount > 0 && videoCount > 0) {
          message = `已下载 ${imageCount} 张图片和 ${videoCount} 个视频`;
        } else {
          message = jobs.length === mediaItems.length ? allVideos ? `已下载 ${jobs.length} 个视频` : `已下载 ${jobs.length} 张图片` : `已下载 ${mediaItems.length} 个媒体项，共 ${jobs.length} 个文件`;
        }
      } else if (successCount === 0) {
        message = `下载失败，共 ${failedCount} 个文件未完成`;
      } else {
        message = `已下载 ${successCount} 个文件，${failedCount} 个失败`;
      }
      if (handedOffCount > 0) {
        message = `已发起 ${successCount} 个文件的下载${failedCount > 0 ? `，${failedCount} 个失败` : ""}；请查看浏览器下载列表`;
      }
      if (failedGifCount > 0) {
        message += "；X GIF转换或保存失败，可关闭自动转换下载 MP4 源";
      }
      log(message);
      if (ui2 && typeof ui2.showToast === "function") {
        ui2.showToast(message);
      }
      return { successCount, failedCount, handedOffCount };
    }
    return {
      getCurrentPlatform,
      getCurrentPlatformDisplayName,
      getPlatformAdapter: () => platform,
      log,
      getOriginalImageUrl,
      getFileExtensionFromUrl,
      getFileBasenameFromUrl,
      getFilename,
      buildMediaDownloadJobs,
      downloadImage,
      downloadImageFallback,
      downloadAllImages,
      downloadMediaItems
    };
  }

  // src/ui.js
  var SELECTION_LABEL_PREFIXES = {
    image: "p",
    livephoto: "lp",
    gif: "a",
    video: "v"
  };
  function createUi({ config, utils: utils2, windowRef, documentRef, addStyle }) {
    const platform = utils2.getPlatformAdapter();
    let resolvedMediaItemsCache = /* @__PURE__ */ new WeakMap();
    const resolveFailureCooldowns = /* @__PURE__ */ new WeakMap();
    const buttonDetails = /* @__PURE__ */ new WeakMap();
    const postDownloads = /* @__PURE__ */ new Map();
    const downloadButtonTitle = "点击下载全部，长按选择下载；Live Photo 会同时下载 JPG 和 MOV";
    function showToast(message, duration = 3e3) {
      const existing = documentRef.getElementById("weibo-img-toast");
      if (existing) {
        existing.remove();
      }
      const toast = documentRef.createElement("div");
      toast.id = "weibo-img-toast";
      toast.role = "status";
      toast.ariaLive = "polite";
      const closeBtn = documentRef.createElement("span");
      closeBtn.textContent = "×";
      closeBtn.className = "close-btn";
      closeBtn.onclick = () => toast.remove();
      const text = documentRef.createElement("span");
      text.textContent = message;
      toast.appendChild(text);
      toast.appendChild(closeBtn);
      documentRef.body.appendChild(toast);
      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.opacity = "0";
          toast.style.transition = "opacity 0.3s";
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }
    function findImagesInPost(container) {
      return platform.findImagesInPost(container);
    }
    function isVideoThumbnailImage(img) {
      if (typeof platform.isVideoThumbnailImage === "function") {
        return platform.isVideoThumbnailImage(img);
      }
      return false;
    }
    function getFallbackMediaItems(container) {
      if (typeof platform.getDomMediaItems === "function") {
        const platformMediaItems = platform.getDomMediaItems(container);
        if (Array.isArray(platformMediaItems)) {
          return platformMediaItems;
        }
      }
      const images = findImagesInPost(container);
      const seen = /* @__PURE__ */ new Set();
      const mediaItems = [];
      images.forEach((img) => {
        const url = utils2.getOriginalImageUrl(img.src);
        if (!url) {
          return;
        }
        const key = url.split("?")[0];
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        mediaItems.push({
          id: `dom-${mediaItems.length + 1}`,
          kind: "image",
          label: `图片 ${mediaItems.length + 1}`,
          imageUrl: url,
          videoUrl: null,
          imageExt: utils2.getFileExtensionFromUrl(url, ".jpg"),
          videoExt: ".mov"
        });
      });
      return mediaItems;
    }
    function getImageUrls(container) {
      return getFallbackMediaItems(container).map((item) => item.imageUrl);
    }
    function selectPreferredMediaItems(fallbackItems, resolvedMediaItems, apiResolved) {
      if (typeof platform.selectPreferredMediaItems === "function") {
        return platform.selectPreferredMediaItems(fallbackItems, resolvedMediaItems, apiResolved);
      }
      return fallbackItems;
    }
    function syncDownloadButtonState(btn, mediaItems) {
      if (!btn) {
        return;
      }
      if (!Array.isArray(mediaItems) || mediaItems.length === 0) {
        btn.remove();
        return;
      }
      const details = buttonDetails.get(btn);
      if (details) {
        details.count = mediaItems.length;
        renderDownloadButton(btn);
      } else {
        btn.innerHTML = `↓${mediaItems.length}`;
      }
    }
    function renderDownloadButton(btn) {
      const details = buttonDetails.get(btn);
      const { postId, count } = details;
      const status = postDownloads.get(postId)?.status || "idle";
      const labels = {
        selecting: "选择中",
        downloading: "下载中",
        completed: "完成",
        failed: "失败",
        started: "已发起"
      };
      const busy = status === "downloading" || status === "selecting";
      const label = labels[status] || (count > 0 ? `↓${count}` : "↓...");
      const labelChanged = btn.innerHTML !== label;
      const previousWidth = labelChanged && btn.isConnected ? btn.getBoundingClientRect().width : 0;
      if (labelChanged) {
        details.animation?.cancel();
        btn.innerHTML = label;
      }
      btn.disabled = busy;
      btn.setAttribute("data-download-state", status);
      btn.setAttribute("aria-busy", String(busy));
      btn.title = status === "started" ? "已发起下载，请查看浏览器下载列表" : status === "failed" ? "下载失败，请重试" : labels[status] ? `${labels[status]}${busy ? "，请稍候" : ""}` : downloadButtonTitle;
      btn.setAttribute("aria-label", labels[status] ? btn.title : `下载 ${count} 个媒体项；${downloadButtonTitle}`);
      if (previousWidth > 0 && typeof btn.animate === "function" && !windowRef.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        const nextWidth = btn.getBoundingClientRect().width;
        if (previousWidth !== nextWidth) {
          details.animation = btn.animate([
            { minWidth: `${previousWidth}px`, maxWidth: `${previousWidth}px` },
            { minWidth: `${nextWidth}px`, maxWidth: `${nextWidth}px` }
          ], { duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
        }
      }
    }
    function refreshPostDownloadState(postId) {
      documentRef.querySelectorAll(".weibo-img-download-btn").forEach((btn) => {
        if (buttonDetails.get(btn)?.postId === postId) {
          renderDownloadButton(btn);
        }
      });
    }
    function getMediaItemsFingerprint(fallbackItems, postContainer) {
      const needsApiResolve = typeof platform.shouldResolveEmptyMediaItems === "function" && platform.shouldResolveEmptyMediaItems(postContainer);
      const items = Array.isArray(fallbackItems) ? fallbackItems : [];
      return `${needsApiResolve ? "api" : "dom"}:${items.map(
        (item) => `${item && item.kind ? item.kind : "image"}:${(item && (item.imageUrl || item.videoUrl) || "").split("?")[0]}`
      ).join("|")}`;
    }
    function resolvePostMediaItems(postContainer, initialFallbackItems = null) {
      const fallbackItems = initialFallbackItems || getFallbackMediaItems(postContainer);
      const fingerprint = getMediaItemsFingerprint(fallbackItems, postContainer);
      const cached = resolvedMediaItemsCache.get(postContainer);
      if (cached && cached.fingerprint === fingerprint) {
        return cached.promise;
      }
      const cooldowns = resolveFailureCooldowns.get(postContainer);
      if (cooldowns && Date.now() - (cooldowns.get(fingerprint) || 0) < config.MEDIA_RESOLVE_RETRY_COOLDOWN_MS) {
        return Promise.resolve(fallbackItems);
      }
      const mediaPromise = Promise.resolve(platform.resolvePostMediaItems(postContainer, fallbackItems)).catch((error) => {
        const current = resolvedMediaItemsCache.get(postContainer);
        if (current?.promise === mediaPromise) {
          resolvedMediaItemsCache.delete(postContainer);
          const cooldownMap = resolveFailureCooldowns.get(postContainer) || /* @__PURE__ */ new Map();
          cooldownMap.set(fingerprint, Date.now());
          resolveFailureCooldowns.set(postContainer, cooldownMap);
        }
        throw error;
      });
      resolvedMediaItemsCache.set(postContainer, { fingerprint, promise: mediaPromise });
      return mediaPromise;
    }
    function getPostId(postContainer) {
      return platform.getPostId(postContainer);
    }
    function ensureImageSelectModalStyles() {
      if (documentRef.getElementById("weibo-img-select-modal-style")) {
        return;
      }
      if (typeof addStyle === "function") {
        addStyle();
      }
      const marker = documentRef.createElement("style");
      marker.id = "weibo-img-select-modal-style";
      marker.textContent = "";
      documentRef.head.appendChild(marker);
    }
    function getSelectionItemLabel(item, typeCounters) {
      const normalizedKind = item && item.kind ? item.kind : item && item.videoUrl ? "livephoto" : "image";
      const typeKey = normalizedKind === "livephoto" ? "livephoto" : normalizedKind === "gif" ? "gif" : normalizedKind === "video" ? "video" : "image";
      typeCounters[typeKey] = (typeCounters[typeKey] || 0) + 1;
      return {
        text: `${SELECTION_LABEL_PREFIXES[typeKey]}${typeCounters[typeKey]}`,
        typeKey
      };
    }
    function showImageSelectModal(mediaItems) {
      return new Promise((resolve) => {
        ensureImageSelectModalStyles();
        const overlay = documentRef.createElement("div");
        overlay.className = "weibo-img-select-overlay";
        const modal = documentRef.createElement("div");
        modal.className = "weibo-img-select-modal";
        const header = documentRef.createElement("div");
        header.className = "weibo-img-select-header";
        const toggleAllBtn = documentRef.createElement("button");
        toggleAllBtn.type = "button";
        toggleAllBtn.className = "weibo-img-select-toggle-btn";
        const headerTitle = documentRef.createElement("div");
        headerTitle.className = "weibo-img-select-header-title";
        headerTitle.textContent = `选择要下载的内容（共 ${mediaItems.length} 项）`;
        header.appendChild(toggleAllBtn);
        header.appendChild(headerTitle);
        const list = documentRef.createElement("div");
        list.className = "weibo-img-select-list";
        const typeCounters = {};
        mediaItems.forEach((item, index) => {
          const label = documentRef.createElement("label");
          label.className = "weibo-img-select-item";
          const input = documentRef.createElement("input");
          input.type = "checkbox";
          input.checked = true;
          input.value = String(index);
          const text = documentRef.createElement("span");
          const itemLabel = getSelectionItemLabel(item, typeCounters);
          if (itemLabel.typeKey === "video") {
            label.className = "weibo-img-select-item weibo-img-select-item-video";
          }
          text.className = itemLabel.typeKey === "video" ? "weibo-img-select-item-text weibo-img-select-item-text-video" : "weibo-img-select-item-text";
          text.textContent = itemLabel.text;
          label.title = item && item.label ? item.label : text.textContent;
          label.appendChild(input);
          label.appendChild(text);
          list.appendChild(label);
        });
        const actions = documentRef.createElement("div");
        actions.className = "weibo-img-select-actions";
        const cancelBtn = documentRef.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "weibo-img-select-btn weibo-img-select-btn-cancel";
        cancelBtn.textContent = "取消";
        const confirmBtn = documentRef.createElement("button");
        confirmBtn.type = "button";
        confirmBtn.className = "weibo-img-select-btn weibo-img-select-btn-confirm";
        confirmBtn.textContent = "下载所选";
        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        const getInputs = () => Array.from(list.querySelectorAll('input[type="checkbox"]'));
        const areAllChecked = () => {
          const inputs = getInputs();
          return inputs.length > 0 && inputs.every((input) => input.checked);
        };
        const updateToggleText = () => {
          toggleAllBtn.textContent = areAllChecked() ? "全不选" : "全选";
        };
        getInputs().forEach((input) => {
          input.addEventListener("change", updateToggleText);
        });
        toggleAllBtn.addEventListener("click", () => {
          const shouldCheckAll = !areAllChecked();
          getInputs().forEach((input) => {
            input.checked = shouldCheckAll;
          });
          updateToggleText();
        });
        updateToggleText();
        modal.appendChild(header);
        modal.appendChild(list);
        modal.appendChild(actions);
        overlay.appendChild(modal);
        const cleanup = () => {
          documentRef.removeEventListener("keydown", onKeyDown);
          overlay.removeEventListener("wheel", preventScroll, { passive: false });
          overlay.removeEventListener("touchmove", preventScroll, { passive: false });
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        };
        const closeWithResult = (result) => {
          cleanup();
          resolve(result);
        };
        const onKeyDown = (event) => {
          if (event.key === "Escape") {
            closeWithResult(null);
          }
        };
        cancelBtn.addEventListener("click", () => closeWithResult(null));
        confirmBtn.addEventListener("click", () => {
          const selected = Array.from(
            list.querySelectorAll('input[type="checkbox"]:checked')
          ).map((el) => Number(el.value));
          if (selected.length === 0) {
            showToast("请至少选择一项内容");
            return;
          }
          const selectedItems = selected.map((index) => mediaItems[index]).filter(Boolean);
          closeWithResult(selectedItems);
        });
        overlay.addEventListener("click", (event) => {
          if (event.target === overlay) {
            closeWithResult(null);
          }
        });
        const preventScroll = (event) => {
          event.preventDefault();
        };
        modal.addEventListener("click", (event) => {
          event.stopPropagation();
        });
        overlay.addEventListener("wheel", preventScroll, { passive: false });
        overlay.addEventListener("touchmove", preventScroll, { passive: false });
        documentRef.addEventListener("keydown", onKeyDown);
        documentRef.body.appendChild(overlay);
      });
    }
    function createDownloadButton(postContainer) {
      if (postContainer.querySelector(".weibo-img-download-btn")) {
        return null;
      }
      const initialMediaItems = getFallbackMediaItems(postContainer);
      const shouldResolveEmptyMediaItems = typeof platform.shouldResolveEmptyMediaItems === "function" && platform.shouldResolveEmptyMediaItems(postContainer);
      if (initialMediaItems.length === 0 && !shouldResolveEmptyMediaItems) {
        return null;
      }
      const btn = documentRef.createElement("button");
      btn.type = "button";
      btn.className = "weibo-img-download-btn";
      const postId = getPostId(postContainer);
      buttonDetails.set(btn, { postId, count: initialMediaItems.length });
      renderDownloadButton(btn);
      resolvePostMediaItems(postContainer, initialMediaItems).then((mediaItems) => {
        syncDownloadButtonState(btn, mediaItems);
      }).catch((error) => {
        utils2.log("媒体解析失败:", error.message);
      });
      let longPressTimer = null;
      let longPressTriggered = false;
      const clearLongPressTimer = () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };
      const startDownload = async (selectMedia = false) => {
        const current = postDownloads.get(postId);
        if (current?.status === "downloading" || current?.status === "selecting") {
          return;
        }
        const task = { status: selectMedia ? "selecting" : "downloading" };
        postDownloads.set(postId, task);
        renderDownloadButton(btn);
        refreshPostDownloadState(postId);
        try {
          let mediaItems = await resolvePostMediaItems(postContainer, getFallbackMediaItems(postContainer));
          if (selectMedia) {
            mediaItems = await showImageSelectModal(mediaItems);
            if (!mediaItems || mediaItems.length === 0) {
              postDownloads.delete(postId);
              renderDownloadButton(btn);
              refreshPostDownloadState(postId);
              return;
            }
            task.status = "downloading";
            renderDownloadButton(btn);
            refreshPostDownloadState(postId);
          }
          const result = await utils2.downloadMediaItems(mediaItems, postId);
          task.status = !result || result.failedCount > 0 || result.successCount === 0 ? "failed" : result.handedOffCount > 0 ? "started" : "completed";
        } catch (error) {
          utils2.log("下载失败:", error.message);
          task.status = "failed";
          showToast("下载失败，请重试");
        } finally {
          if (postDownloads.get(postId) === task) {
            renderDownloadButton(btn);
            refreshPostDownloadState(postId);
            setTimeout(() => {
              if (postDownloads.get(postId) === task) {
                postDownloads.delete(postId);
                renderDownloadButton(btn);
                refreshPostDownloadState(postId);
              }
            }, 1200);
          }
        }
      };
      btn.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.detail === 0) {
          startDownload();
        }
      });
      btn.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (btn.disabled) {
          return;
        }
        longPressTriggered = false;
        clearLongPressTimer();
        longPressTimer = setTimeout(() => {
          longPressTriggered = true;
          clearLongPressTimer();
          startDownload(true);
        }, config.LONG_PRESS_MS);
      });
      btn.addEventListener("pointerup", async (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const wasLongPress = longPressTriggered;
        clearLongPressTimer();
        longPressTriggered = false;
        if (!wasLongPress) {
          await startDownload();
        }
      });
      btn.addEventListener("pointerleave", clearLongPressTimer);
      btn.addEventListener("pointercancel", clearLongPressTimer);
      return btn;
    }
    function syncExistingButtonMedia(post, btn) {
      resolvePostMediaItems(post, getFallbackMediaItems(post)).then((mediaItems) => {
        if (btn.parentNode) {
          syncDownloadButtonState(btn, mediaItems);
        }
      }).catch((error) => {
        utils2.log("媒体刷新失败:", error.message);
      });
    }
    function injectDownloadButtons() {
      const selectors = platform.getPostSelectors();
      for (const selector of selectors) {
        const posts = documentRef.querySelectorAll(selector);
        posts.forEach((post) => {
          const existingBtn = post.querySelector(".weibo-img-download-btn");
          if (existingBtn) {
            syncExistingButtonMedia(post, existingBtn);
            return;
          }
          if (platform.shouldSkipPost(post)) {
            return;
          }
          const btn = createDownloadButton(post);
          if (!btn) {
            return;
          }
          const inserted = platform.insertDownloadButton({ post, btn, documentRef, windowRef });
          if (!inserted) {
            post.appendChild(btn);
          }
        });
      }
      if (typeof platform.afterInjectDownloadButtons === "function") {
        platform.afterInjectDownloadButtons({ documentRef, windowRef });
      }
    }
    function refreshDownloadButtons() {
      resolvedMediaItemsCache = /* @__PURE__ */ new WeakMap();
      documentRef.querySelectorAll(".weibo-img-download-btn").forEach((btn) => {
        btn.remove();
      });
      injectDownloadButtons();
    }
    function getPostUrl(article) {
      if (typeof platform.getPostUrl === "function") {
        return platform.getPostUrl(article);
      }
      return null;
    }
    function injectGotoOriginalMenuItem(popMain, article) {
      if (typeof platform.injectGotoOriginalMenuItem === "function") {
        platform.injectGotoOriginalMenuItem(popMain, article, documentRef);
      }
    }
    function initPlatformObservers() {
      if (typeof platform.initObservers === "function") {
        platform.initObservers({ documentRef, windowRef });
      }
    }
    return {
      createDownloadButton,
      ensureImageSelectModalStyles,
      getPostUrl,
      initPlatformObservers,
      injectDownloadButtons,
      injectGotoOriginalMenuItem,
      isVideoThumbnailImage,
      selectPreferredMediaItems,
      showImageSelectModal,
      showToast,
      syncDownloadButtonState,
      refreshDownloadButtons,
      getImageUrls,
      getWeiboPostUrl: getPostUrl,
      initGotoOriginalMenuObserver: initPlatformObservers,
      isWeiboVideoThumbnailImage: isVideoThumbnailImage,
      selectPreferredWeiboMediaItems: selectPreferredMediaItems
    };
  }

  // src/main.js
  var styleId = "weibo-image-downloader-style";
  var runtimeConfig = {
    ...CONFIG,
    ENABLE_VIDEO_DOWNLOAD: typeof GM_getValue === "function" ? Boolean(GM_getValue(CONFIG.VIDEO_DOWNLOAD_SETTING_KEY, CONFIG.ENABLE_VIDEO_DOWNLOAD)) : CONFIG.ENABLE_VIDEO_DOWNLOAD,
    X_GIF_AUTO_CONVERT: typeof GM_getValue === "function" ? Boolean(GM_getValue(CONFIG.X_GIF_AUTO_CONVERT_SETTING_KEY, CONFIG.X_GIF_AUTO_CONVERT)) : CONFIG.X_GIF_AUTO_CONVERT
  };
  function injectStyles() {
    if (document.getElementById(styleId)) {
      return;
    }
    if (typeof GM_addStyle === "function") {
      GM_addStyle(style_default);
      const marker = document.createElement("style");
      marker.id = styleId;
      marker.textContent = "";
      document.head.appendChild(marker);
      return;
    }
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = style_default;
    document.head.appendChild(style);
  }
  var ui;
  var utils = createUtils({
    config: runtimeConfig,
    windowRef: window,
    fetchRef: window.fetch.bind(window),
    gmDownload: typeof GM_download === "function" ? GM_download : null,
    gmXmlhttpRequest: typeof GM_xmlhttpRequest === "function" ? GM_xmlhttpRequest : null,
    ui: {
      showToast(message) {
        if (ui) {
          ui.showToast(message);
        }
      }
    }
  });
  ui = createUi({
    config: runtimeConfig,
    utils,
    windowRef: window,
    documentRef: document,
    addStyle: injectStyles
  });
  function init() {
    injectStyles();
    ui.ensureImageSelectModalStyles();
    setTimeout(() => {
      ui.injectDownloadButtons();
    }, 2e3);
    let injectTimer = null;
    const observer = new MutationObserver(() => {
      if (injectTimer) {
        return;
      }
      injectTimer = setTimeout(() => {
        injectTimer = null;
        ui.injectDownloadButtons();
      }, 300);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    setInterval(() => {
      ui.injectDownloadButtons();
    }, 5e3);
    ui.initPlatformObservers();
    utils.log(`${utils.getCurrentPlatformDisplayName()}图片批量下载器初始化完成！`);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  if (typeof GM_registerMenuCommand === "function") {
    let getVideoDownloadMenuText = function() {
      return `视频下载：[${runtimeConfig.ENABLE_VIDEO_DOWNLOAD ? "开启" : "关闭"}]`;
    }, registerVideoDownloadMenu = function() {
      if (videoDownloadMenuRegistered) {
        if (videoDownloadMenuId === null || typeof GM_unregisterMenuCommand !== "function") {
          return;
        }
        GM_unregisterMenuCommand(videoDownloadMenuId);
      }
      videoDownloadMenuId = GM_registerMenuCommand(getVideoDownloadMenuText(), () => {
        const nextValue = !runtimeConfig.ENABLE_VIDEO_DOWNLOAD;
        if (typeof GM_setValue === "function") {
          GM_setValue(CONFIG.VIDEO_DOWNLOAD_SETTING_KEY, nextValue);
        }
        runtimeConfig.ENABLE_VIDEO_DOWNLOAD = nextValue;
        registerVideoDownloadMenu();
        if (ui) {
          ui.refreshDownloadButtons();
          ui.showToast(`视频下载已${nextValue ? "开启" : "关闭"}，当前页面已更新`);
        }
      });
      videoDownloadMenuRegistered = true;
    }, registerXGifMenu = function() {
      if (xGifMenuRegistered) {
        if (xGifMenuId === null || typeof GM_unregisterMenuCommand !== "function") {
          return;
        }
        GM_unregisterMenuCommand(xGifMenuId);
      }
      xGifMenuId = GM_registerMenuCommand(
        `X平台GIF自动转换：[${runtimeConfig.X_GIF_AUTO_CONVERT ? "开启" : "关闭"}]`,
        () => {
          runtimeConfig.X_GIF_AUTO_CONVERT = !runtimeConfig.X_GIF_AUTO_CONVERT;
          if (typeof GM_setValue === "function") {
            GM_setValue(CONFIG.X_GIF_AUTO_CONVERT_SETTING_KEY, runtimeConfig.X_GIF_AUTO_CONVERT);
          }
          registerXGifMenu();
          ui.showToast(`X平台GIF自动转换已${runtimeConfig.X_GIF_AUTO_CONVERT ? "开启" : "关闭"}`);
        }
      );
      xGifMenuRegistered = true;
    };
    let videoDownloadMenuId = null;
    let videoDownloadMenuRegistered = false;
    GM_registerMenuCommand("刷新按钮", () => {
      ui.refreshDownloadButtons();
    });
    registerVideoDownloadMenu();
    let xGifMenuId = null;
    let xGifMenuRegistered = false;
    registerXGifMenu();
  }
})();
