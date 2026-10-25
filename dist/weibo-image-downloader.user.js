// ==UserScript==
// @name         微博/X图片批量下载器
// @namespace    http://tampermonkey.net/
// @version      1.5.7
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

"use strict";
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
  var style_default = '#weibo-img-toast {\n    position: fixed;\n    top: 20px;\n    left: 50%;\n    transform: translateX(-50%);\n    background: rgba(0, 0, 0, 0.75);\n    color: #fff;\n    padding: 10px 20px;\n    border-radius: 4px;\n    font-size: 14px;\n    z-index: 2147483647;\n    display: flex;\n    align-items: center;\n    gap: 10px;\n    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\n    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);\n}\n\n#weibo-img-toast .close-btn {\n    font-size: 18px;\n    cursor: pointer;\n    opacity: 0.7;\n    line-height: 1;\n}\n\n#weibo-img-toast .close-btn:hover {\n    opacity: 1;\n}\n\n.weibo-img-select-overlay {\n    position: fixed;\n    inset: 0;\n    background: rgba(15, 23, 42, 0.24);\n    backdrop-filter: blur(10px);\n    z-index: 2147483647;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    padding: 16px;\n    box-sizing: border-box;\n}\n\n.weibo-img-select-modal {\n    width: 100%;\n    max-width: 560px;\n    max-height: 80vh;\n    background: #ffffff;\n    border: 1px solid rgba(255, 130, 0, 0.18);\n    border-radius: 10px;\n    box-shadow: none;\n    display: flex;\n    flex-direction: column;\n    overflow: hidden;\n    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\n}\n\n.weibo-img-select-header {\n    padding: 14px 16px;\n    border-bottom: 1px solid rgba(255, 130, 0, 0.12);\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 12px;\n}\n\n.weibo-img-select-header-title {\n    display: flex;\n    align-items: baseline;\n    gap: 8px;\n    min-width: 0;\n    font-size: 14px;\n    font-weight: 600;\n    color: #1f2937;\n}\n\n.weibo-img-select-count {\n    font-size: 12px;\n    font-weight: 400;\n    color: #9ca3af;\n    white-space: nowrap;\n}\n\n.weibo-img-select-toggle-btn {\n    height: 26px;\n    padding: 0 10px;\n    border: 1px solid rgba(255, 130, 0, 0.35);\n    border-radius: 4px;\n    background: #ffffff;\n    color: #c2410c;\n    font-size: 12px;\n    font-weight: 600;\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    text-align: center;\n    line-height: 1;\n    cursor: pointer;\n    box-sizing: border-box;\n    white-space: nowrap;\n    transition: background-color 0.2s ease;\n}\n\n.weibo-img-select-toggle-btn:hover {\n    background: #fff4e8;\n}\n\n.weibo-img-select-grid {\n    padding: 12px;\n    overflow: auto;\n    overscroll-behavior: contain;\n    display: grid;\n    grid-template-columns: repeat(4, minmax(0, 1fr));\n    gap: 8px;\n}\n\n.weibo-img-select-item {\n    position: relative;\n    display: block;\n    border: 1px solid rgba(255, 130, 0, 0.16);\n    border-radius: 4px;\n    background: #f3f4f6;\n    overflow: hidden;\n    cursor: pointer;\n    box-sizing: border-box;\n    transition: border-color 0.15s ease, box-shadow 0.15s ease;\n}\n\n.weibo-img-select-item:hover {\n    border-color: rgba(255, 130, 0, 0.45);\n}\n\n.weibo-img-select-item:has(input:checked) {\n    border-color: #ff8200;\n    box-shadow: inset 0 0 0 1px #ff8200;\n}\n\n.weibo-img-select-item:focus-within {\n    outline: 2px solid rgba(255, 130, 0, 0.55);\n    outline-offset: 2px;\n}\n\n.weibo-img-select-item input {\n    position: absolute;\n    inset: 0;\n    z-index: 3;\n    width: 100%;\n    height: 100%;\n    margin: 0;\n    opacity: 0;\n    cursor: pointer;\n}\n\n.weibo-img-select-thumb {\n    position: relative;\n    display: block;\n    aspect-ratio: 1 / 1;\n    overflow: hidden;\n}\n\n.weibo-img-select-thumb img {\n    position: relative;\n    z-index: 1;\n    display: block;\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n}\n\n.weibo-img-select-placeholder {\n    position: absolute;\n    inset: 0;\n    z-index: 0;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    background: #f3f4f6;\n    color: #9ca3af;\n    font-size: 12px;\n    font-weight: 600;\n    user-select: none;\n}\n\n.weibo-img-select-label {\n    position: absolute;\n    left: 6px;\n    bottom: 6px;\n    z-index: 2;\n    padding: 0 5px;\n    border-radius: 3px;\n    background: rgba(0, 0, 0, 0.62);\n    color: #ffffff;\n    font-size: 10px;\n    font-weight: 600;\n    line-height: 16px;\n    letter-spacing: 0.01em;\n    pointer-events: none;\n}\n\n.weibo-img-select-kind {\n    position: absolute;\n    right: 6px;\n    bottom: 6px;\n    z-index: 2;\n    padding: 0 5px;\n    border-radius: 3px;\n    background: rgba(0, 0, 0, 0.62);\n    color: #ffffff;\n    font-size: 10px;\n    font-weight: 600;\n    line-height: 16px;\n    pointer-events: none;\n}\n\n.weibo-img-select-check {\n    position: absolute;\n    top: 5px;\n    right: 5px;\n    z-index: 2;\n    width: 16px;\n    height: 16px;\n    border: 1.5px solid rgba(255, 255, 255, 0.9);\n    border-radius: 50%;\n    background: rgba(0, 0, 0, 0.28);\n    color: transparent;\n    font-size: 11px;\n    font-weight: 700;\n    line-height: 16px;\n    text-align: center;\n    box-sizing: border-box;\n    pointer-events: none;\n    transition: background-color 0.15s ease, border-color 0.15s ease;\n}\n\n.weibo-img-select-item:has(input:checked) .weibo-img-select-check {\n    background: #ff8200;\n    border-color: #ff8200;\n    color: #ffffff;\n}\n\n.weibo-img-select-actions {\n    padding: 12px 16px;\n    border-top: 1px solid rgba(255, 130, 0, 0.12);\n    display: flex;\n    justify-content: flex-end;\n    gap: 8px;\n}\n\n.weibo-img-select-btn {\n    min-width: 84px;\n    height: 28px;\n    padding: 0 14px;\n    border-radius: 4px;\n    border: 1px solid transparent;\n    font-size: 12px;\n    font-weight: 600;\n    cursor: pointer;\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    text-align: center;\n    line-height: 1;\n    box-sizing: border-box;\n    transition: background-color 0.2s ease;\n}\n\n.weibo-img-select-modal button {\n    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\n    vertical-align: middle;\n}\n\n.weibo-img-select-btn:disabled {\n    cursor: not-allowed;\n    opacity: 0.5;\n}\n\n.weibo-img-select-btn-cancel {\n    background: #fff;\n    border-color: rgba(148, 163, 184, 0.45);\n    color: #475569;\n}\n\n.weibo-img-select-btn-cancel:hover:not(:disabled) {\n    background: #f8fafc;\n}\n\n.weibo-img-select-btn-confirm {\n    background: #ff8200;\n    color: #fff;\n    box-shadow: none;\n}\n\n.weibo-img-select-btn-confirm:hover:not(:disabled) {\n    background: #ff6a00;\n}\n\n.weibo-img-download-btn {\n    appearance: none;\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    width: auto !important;\n    height: 20px;\n    border: 1px solid transparent;\n    padding: 0 6px !important;\n    margin-left: 8px;\n    background: #ff8200;\n    color: white;\n    border-radius: 3px;\n    font-size: 11px;\n    font-family: inherit;\n    font-weight: bold;\n    line-height: 1;\n    flex-shrink: 0;\n    overflow: hidden;\n    cursor: pointer;\n    vertical-align: middle;\n    white-space: nowrap;\n    box-sizing: border-box;\n}\n\n.weibo-img-download-btn[data-download-state="idle"]:hover {\n    background: #ff6a00;\n}\n\n.weibo-img-download-btn:focus-visible {\n    outline: 2px solid #9a4300;\n    outline-offset: 2px;\n}\n\n.weibo-img-download-btn:disabled {\n    cursor: progress;\n    opacity: 1;\n}\n\n.weibo-img-download-btn[data-download-state="failed"] {\n    background: #fff0eb;\n    color: #a92d20;\n    border-color: #dc9b90;\n}\n';

  // src/config.ts
  var CONFIG = {
    DELAY_MS: 300,
    LONG_PRESS_MS: 500,
    MEDIA_RESOLVE_RETRY_COOLDOWN_MS: 6e4,
    VIDEO_DOWNLOAD_SETTING_KEY: "weiboImageDownloader.enableVideoDownload",
    ENABLE_VIDEO_DOWNLOAD: false,
    X_GIF_AUTO_CONVERT_SETTING_KEY: "weiboImageDownloader.xGifAutoConvert",
    X_GIF_AUTO_CONVERT: true,
    LIVEPHOTO_AUTO_MERGE_SETTING_KEY: "weiboImageDownloader.livephotoAutoMerge",
    LIVEPHOTO_AUTO_MERGE: true,
    DEBUG: true
  };

  // src/platforms/weibo.ts
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
    function normalizeWeiboMediaUrl(url) {
      if (!url || typeof url !== "string") {
        return null;
      }
      if (url.startsWith("//")) {
        return `https:${url}`;
      }
      return url.replace(/^http:\/\//, "https://");
    }
    function getWeiboVariantUrl(value) {
      if (typeof value === "string") {
        return value;
      }
      return value && typeof value === "object" && typeof value.url === "string" ? value.url : null;
    }
    function getWeiboThumbnailUrl(url) {
      const normalized = normalizeWeiboMediaUrl(url);
      if (!normalized) {
        return null;
      }
      if (!normalized.includes("sinaimg.cn") && !normalized.includes("sina.cn")) {
        return null;
      }
      if (isAvatarImage(normalized)) {
        return null;
      }
      for (const size of IMAGE_SIZE_PATTERNS) {
        if (normalized.includes(`/${size}/`)) {
          return normalized.replace(`/${size}/`, "/orj360/");
        }
      }
      const match = normalized.match(/(\.sinaimg\.cn\/)([a-z0-9]+\/)/);
      if (match) {
        return normalized.replace(match[2], "orj360/");
      }
      return normalized;
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
    function createWeiboVideoMediaItem({ id, videoUrl, thumbnailUrl, index }) {
      if (!videoUrl) {
        return null;
      }
      return {
        id,
        kind: "video",
        label: `视频 ${index + 1}`,
        imageUrl: null,
        videoUrl,
        thumbnailUrl: thumbnailUrl || null,
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
            thumbnailUrl: getWeiboThumbnailUrl(getWeiboVariantUrl(
              data.pic_info && (data.pic_info.pic_big || data.pic_info.pic_middle || data.pic_info.pic_small)
            )),
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
          thumbnailUrl: getWeiboThumbnailUrl(imageUrl),
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
        thumbnailUrl: getWeiboThumbnailUrl(imageUrl),
        imageExt: getFileExtensionFromUrl(imageUrl, ".jpg"),
        videoExt: getFileExtensionFromUrl(videoUrl, ".mov")
      };
    }
    function getWeiboMobileMediaItems(status) {
      const pics = Array.isArray(status?.pics) ? status.pics : [];
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
            thumbnailUrl: getWeiboThumbnailUrl(getWeiboVariantUrl(pic.pic_middle || pic.pic_small || pic.pic_big)),
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
          thumbnailUrl: normalizeWeiboMediaUrl(getWeiboVariantUrl(pageInfo.page_pic)),
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
    function isArticleCoverImage(img) {
      if (!img || typeof img.closest !== "function") {
        return false;
      }
      return !!img.closest('a[href*="ttarticle"]');
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
            if (isArticleCoverImage(img)) {
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
    const syntheticPostIds = /* @__PURE__ */ new WeakMap();
    let syntheticPostIdSeq = 0;
    function getSyntheticPostId(postContainer) {
      let id = syntheticPostIds.get(postContainer);
      if (!id) {
        syntheticPostIdSeq += 1;
        id = `weibo_${syntheticPostIdSeq}`;
        syntheticPostIds.set(postContainer, id);
      }
      return id;
    }
    function getPostId(postContainer) {
      if (isMobileWeiboPage()) {
        const status = getVueStatusItem(postContainer);
        if (status && status.mid) {
          return status.mid;
        }
      }
      return getStatusLookupId(postContainer) || getSyntheticPostId(postContainer);
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

  // src/platforms/x.ts
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
    function getXThumbnailUrl(url) {
      if (!url || typeof url !== "string") {
        return null;
      }
      try {
        const fullUrl = url.startsWith("http") ? url : `https://${url}`;
        const urlObj = new URL(fullUrl);
        urlObj.searchParams.set("name", "small");
        return urlObj.toString();
      } catch {
        return url;
      }
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
    function createMediaItem({ id, kind, label, url, thumbnailUrl, fallbackExt }) {
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
          thumbnailUrl: thumbnailUrl || null,
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
        thumbnailUrl: thumbnailUrl || null,
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
          // 列表页已渲染的 img.src（通常 name=900x900），直接复用命中缓存。
          thumbnailUrl: img.src,
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
          thumbnailUrl: getXThumbnailUrl(video.poster),
          fallbackExt: ".mp4"
        });
        if (item) {
          mediaItems.push(item);
        }
      });
      return mediaItems;
    }
    function getMediaUrlKey(url) {
      const base = (url || "").split("?")[0];
      const match = base.match(/^(https:\/\/pbs\.twimg\.com\/media\/[^/?]+?)(?:\.[a-zA-Z0-9]+)?$/);
      return match ? match[1] : base;
    }
    function isMediaViewerMainArticle(postContainer) {
      if (!postContainer || typeof postContainer.closest !== "function") {
        return false;
      }
      if (!postContainer.closest("#layers")) {
        return false;
      }
      const statusId = getPostId(postContainer);
      if (!/^\d+$/.test(statusId)) {
        return false;
      }
      const pathname = windowRef.location && windowRef.location.pathname;
      return new RegExp(`/status/${statusId}/(?:photo|video)/\\d+`).test(pathname || "");
    }
    function resolvePostMediaItems(postContainer, fallbackItems) {
      const isViewerMainArticle = isMediaViewerMainArticle(postContainer);
      if (!isVideoDownloadEnabled() && !isViewerMainArticle) {
        return fallbackItems;
      }
      const statusId = getPostId(postContainer);
      if (!statusId) {
        return fallbackItems;
      }
      if (!isViewerMainArticle && (fallbackItems.some((item) => item.kind === "gif") || !shouldResolveEmptyMediaItems(postContainer))) {
        return fallbackItems;
      }
      return getXMediaItemsById(statusId).then((mediaItems) => {
        if (mediaItems.length === 0) {
          return fallbackItems;
        }
        const apiByUrl = new Map(
          mediaItems.map((item) => [getMediaUrlKey(item.videoUrl || item.imageUrl), item])
        );
        if (fallbackItems.some((item) => item.kind === "video")) {
          return fallbackItems.map((item) => {
            if (item.kind !== "video") {
              return item;
            }
            const apiItem = apiByUrl.get(getMediaUrlKey(item.videoUrl || item.imageUrl));
            return apiItem && apiItem.kind === "gif" ? apiItem : item;
          });
        }
        const existingKeys = new Set(
          fallbackItems.map((item) => getMediaUrlKey(item.videoUrl || item.imageUrl))
        );
        const merged = fallbackItems.concat(
          mediaItems.filter((item) => !existingKeys.has(getMediaUrlKey(item.videoUrl || item.imageUrl)))
        );
        if (!isVideoDownloadEnabled() && isViewerMainArticle) {
          return merged.filter((item) => item.kind !== "video");
        }
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
      return currentMatch ? currentMatch[1] : getSyntheticPostId(postContainer);
    }
    const syntheticPostIds = /* @__PURE__ */ new WeakMap();
    let syntheticPostIdSeq = 0;
    function getSyntheticPostId(postContainer) {
      let id = syntheticPostIds.get(postContainer);
      if (!id) {
        syntheticPostIdSeq += 1;
        id = `x_${syntheticPostIdSeq}`;
        syntheticPostIds.set(postContainer, id);
      }
      return id;
    }
    function shouldResolveEmptyMediaItems(postContainer) {
      if (!/^\d+$/.test(getPostId(postContainer))) {
        return false;
      }
      if (!postContainer || typeof postContainer.querySelector !== "function") {
        return false;
      }
      if (isMediaViewerMainArticle(postContainer)) {
        return true;
      }
      if (!isVideoDownloadEnabled()) {
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
      const rawResult = status?.data?.tweetResult?.result;
      const result = rawResult?.tweet || rawResult;
      const media = result?.legacy?.extended_entities?.media || [];
      const quotedResult = result?.quoted_status_result?.result;
      const quotedMedia = (quotedResult?.tweet || quotedResult)?.legacy?.extended_entities?.media || [];
      const ownPhotos = media.filter((item) => item?.type === "photo").map((item, index) => {
        return createMediaItem({
          id: item.id_str || `graphql-photo-${index + 1}`,
          kind: "image",
          label: `图片 ${index + 1}`,
          url: getOriginalImageUrl(item.media_url_https),
          thumbnailUrl: getXThumbnailUrl(item.media_url_https),
          fallbackExt: ".jpg"
        });
      }).filter(Boolean);
      const quotedPhotos = quotedMedia.map((item, index) => {
        if (item?.type !== "photo") {
          return null;
        }
        return createMediaItem({
          id: item.id_str || `graphql-quoted-photo-${index + 1}`,
          kind: "image",
          label: `图片 ${index + 1}`,
          url: getOriginalImageUrl(item.media_url_https),
          thumbnailUrl: getXThumbnailUrl(item.media_url_https),
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
          thumbnailUrl: getXThumbnailUrl(item.media_url_https),
          fallbackExt: ".mp4"
        });
      }).filter(Boolean);
      return ownPhotos.concat(quotedPhotos, videos);
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

  // src/platforms/index.ts
  function createPlatformAdapter(deps) {
    const hostname = deps.windowRef.location.hostname || "";
    if (hostname.includes("x.com") || hostname.includes("twitter")) {
      return createXPlatform(deps);
    }
    return createWeiboPlatform(deps);
  }

  // src/x-gif-frame.ts
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

  // src/x-gif-worker.ts
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
    const scope = self;
    scope.onmessage = ({ data }) => {
      const { id } = data;
      try {
        const result = runGifJob(data);
        const transfer = data.command === "capture" ? [result.pixels.buffer] : data.command === "compare" ? [result.pixels.buffer, ...result.frame ? [result.frame.index.buffer] : []] : [(result.bytes || result.index).buffer];
        scope.postMessage({ id, ...result }, transfer);
      } catch (error) {
        scope.postMessage({ id, error: error.message });
      }
    };
  }

  // src/x-gif-workers.ts
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

  // src/x-gif.ts
  var workerSource = true ? '"use strict";(()=>{var ue=Object.create;var K=Object.defineProperty;var ge=Object.getOwnPropertyDescriptor;var he=Object.getOwnPropertyNames;var de=Object.getPrototypeOf,pe=Object.prototype.hasOwnProperty;var ye=(e,t)=>()=>(t||e((t={exports:{}}).exports,t),t.exports);var we=(e,t,r,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of he(t))!pe.call(e,o)&&o!==r&&K(e,o,{get:()=>t[o],enumerable:!(n=ge(t,o))||n.enumerable});return e};var X=(e,t,r)=>(r=e!=null?ue(de(e)):{},we(t||!e||!e.__esModule?K(r,"default",{value:e,enumerable:!0}):r,e));var N=ye(j=>{var ee=Object.defineProperty,be=e=>ee(e,"__esModule",{value:!0}),me=(e,t)=>{for(var r in t)ee(e,r,{get:t[r],enumerable:!0})};be(j);me(j,{GIFEncoder:()=>se,applyPalette:()=>Fe,default:()=>Re,nearestColor:()=>Ee,nearestColorIndex:()=>ie,nearestColorIndexWithDistance:()=>ce,prequantize:()=>Ge,quantize:()=>Ie,snapColorsToPalette:()=>_e});var xe={signature:"GIF",version:"89a",trailer:59,extensionIntroducer:33,applicationExtensionLabel:255,graphicControlExtensionLabel:249,imageSeparator:44,signatureSize:3,versionSize:3,globalColorTableFlagMask:128,colorResolutionMask:112,sortFlagMask:8,globalColorTableSizeMask:7,applicationIdentifierSize:8,applicationAuthCodeSize:3,disposalMethodMask:28,userInputFlagMask:2,transparentColorFlagMask:1,localColorTableFlagMask:128,interlaceFlagMask:64,idSortFlagMask:32,localColorTableSizeMask:7};function te(e=256){let t=0,r=new Uint8Array(e);return{get buffer(){return r.buffer},reset(){t=0},bytesView(){return r.subarray(0,t)},bytes(){return r.slice(0,t)},writeByte(o){n(t+1),r[t]=o,t++},writeBytes(o,c=0,i=o.length){n(t+i);for(let s=0;s<i;s++)r[t++]=o[s+c]},writeBytesView(o,c=0,i=o.byteLength){n(t+i),r.set(o.subarray(c,c+i),t),t+=i}};function n(o){var c=r.length;if(c>=o)return;var i=1024*1024;o=Math.max(o,c*(c<i?2:1.125)>>>0),c!=0&&(o=Math.max(o,256));let s=r;r=new Uint8Array(o),t>0&&r.set(s.subarray(0,t),0)}}var W=12,Y=5003,Ae=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535];function Be(e,t,r,n,o=te(512),c=new Uint8Array(256),i=new Int32Array(Y),s=new Int32Array(Y)){let g=i.length,u=Math.max(2,n);c.fill(0),s.fill(0),i.fill(-1);let l=0,a=0,h=u+1,w=h,p=!1,y=w,d=(1<<y)-1,f=1<<h-1,B=f+1,A=f+2,b=0,C=r[0],U=0;for(let x=g;x<65536;x*=2)++U;U=8-U,o.writeByte(u),I(f);let m=r.length;for(let x=1;x<m;x++)e:{let G=r[x],F=(G<<W)+C,M=G<<U^C;if(i[M]===F){C=s[M];break e}let V=M===0?1:g-M;for(;i[M]>=0;)if(M-=V,M<0&&(M+=g),i[M]===F){C=s[M];break e}I(C),C=G,A<1<<W?(s[M]=A++,i[M]=F):(i.fill(-1),A=f+2,p=!0,I(f))}return I(C),I(B),o.writeByte(0),o.bytesView();function I(x){for(l&=Ae[a],a>0?l|=x<<a:l=x,a+=y;a>=8;)c[b++]=l&255,b>=254&&(o.writeByte(b),o.writeBytesView(c,0,b),b=0),l>>=8,a-=8;if((A>d||p)&&(p?(y=w,d=(1<<y)-1,p=!1):(++y,d=y===W?1<<y:(1<<y)-1)),x==B){for(;a>0;)c[b++]=l&255,b>=254&&(o.writeByte(b),o.writeBytesView(c,0,b),b=0),l>>=8,a-=8;b>0&&(o.writeByte(b),o.writeBytesView(c,0,b),b=0)}}}var Ce=Be;function ne(e,t,r){return e<<8&63488|t<<2&992|r>>3}function re(e,t,r,n){return e>>4|t&240|(r&240)<<4|(n&240)<<8}function oe(e,t,r){return e>>4<<8|t&240|r>>4}function S(e,t,r){return e<t?t:e>r?r:e}function z(e){return e*e}function Q(e,t,r){var n=0,o=1e100;let c=e[t],i=c.cnt,s=c.ac,g=c.rc,u=c.gc,l=c.bc;for(var a=c.fw;a!=0;a=e[a].fw){let w=e[a],p=w.cnt,y=i*p/(i+p);if(!(y>=o)){var h=0;r&&(h+=y*z(w.ac-s),h>=o)||(h+=y*z(w.rc-g),!(h>=o)&&(h+=y*z(w.gc-u),!(h>=o)&&(h+=y*z(w.bc-l),!(h>=o)&&(o=h,n=a))))}}c.err=o,c.nn=n}function H(){return{ac:0,rc:0,gc:0,bc:0,cnt:0,nn:0,fw:0,bk:0,tm:0,mtm:0,err:0}}function Me(e,t){let r=t==="rgb444"?4096:65536,n=new Array(r),o=e.length;if(t==="rgba4444")for(let c=0;c<o;++c){let i=e[c],s=i>>24&255,g=i>>16&255,u=i>>8&255,l=i&255,a=re(l,u,g,s),h=a in n?n[a]:n[a]=H();h.rc+=l,h.gc+=u,h.bc+=g,h.ac+=s,h.cnt++}else if(t==="rgb444")for(let c=0;c<o;++c){let i=e[c],s=i>>16&255,g=i>>8&255,u=i&255,l=oe(u,g,s),a=l in n?n[l]:n[l]=H();a.rc+=u,a.gc+=g,a.bc+=s,a.cnt++}else for(let c=0;c<o;++c){let i=e[c],s=i>>16&255,g=i>>8&255,u=i&255,l=ne(u,g,s),a=l in n?n[l]:n[l]=H();a.rc+=u,a.gc+=g,a.bc+=s,a.cnt++}return n}function Ie(e,t,r={}){let{format:n="rgb565",clearAlpha:o=!0,clearAlphaColor:c=0,clearAlphaThreshold:i=0,oneBitAlpha:s=!1}=r;if(!e||!e.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(e instanceof Uint8Array)&&!(e instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");let g=new Uint32Array(e.buffer),u=r.useSqrt!==!1,l=n==="rgba4444",a=Me(g,n),h=a.length,w=h-1,p=new Uint32Array(h+1);for(var y=0,f=0;f<h;++f){let v=a[f];if(v!=null){var d=1/v.cnt;l&&(v.ac*=d),v.rc*=d,v.gc*=d,v.bc*=d,a[y++]=v}}z(t)/y<.022&&(u=!1);for(var f=0;f<y-1;++f)a[f].fw=f+1,a[f+1].bk=f,u&&(a[f].cnt=Math.sqrt(a[f].cnt));u&&(a[f].cnt=Math.sqrt(a[f].cnt));var B,A,b;for(f=0;f<y;++f){Q(a,f,!1);var C=a[f].err;for(A=++p[0];A>1&&(b=A>>1,!(a[B=p[b]].err<=C));A=b)p[A]=B;p[A]=f}var U=y-t;for(f=0;f<U;){for(var m;;){var I=p[1];if(m=a[I],m.tm>=m.mtm&&a[m.nn].mtm<=m.tm)break;m.mtm==w?I=p[1]=p[p[0]--]:(Q(a,I,!1),m.tm=f);var C=a[I].err;for(A=1;(b=A+A)<=p[0]&&(b<p[0]&&a[p[b]].err>a[p[b+1]].err&&b++,!(C<=a[B=p[b]].err));A=b)p[A]=B;p[A]=I}var x=a[m.nn],G=m.cnt,F=x.cnt,d=1/(G+F);l&&(m.ac=d*(G*m.ac+F*x.ac)),m.rc=d*(G*m.rc+F*x.rc),m.gc=d*(G*m.gc+F*x.gc),m.bc=d*(G*m.bc+F*x.bc),m.cnt+=x.cnt,m.mtm=++f,a[x.bk].fw=x.fw,a[x.fw].bk=x.bk,x.mtm=w}let M=[];var V=0;for(f=0;;++V){let O=S(Math.round(a[f].rc),0,255),v=S(Math.round(a[f].gc),0,255),J=S(Math.round(a[f].bc),0,255),E=255;l&&(E=S(Math.round(a[f].ac),0,255),s&&(E=E<=(typeof s=="number"?s:127)?0:255),o&&E<=i&&(O=v=J=c,E=0));let Z=l?[O,v,J,E]:[O,v,J];if(ve(M,Z)||M.push(Z),(f=a[f].fw)==0)break}return M}function ve(e,t){for(let r=0;r<e.length;r++){let n=e[r],o=n[0]===t[0]&&n[1]===t[1]&&n[2]===t[2],c=n.length>=4&&t.length>=4?n[3]===t[3]:!0;if(o&&c)return!0}return!1}function P(e,t){var r=0,n;for(n=0;n<e.length;n++){let o=e[n]-t[n];r+=o*o}return r}function R(e,t){return t>1?Math.round(e/t)*t:e}function Ge(e,{roundRGB:t=5,roundAlpha:r=10,oneBitAlpha:n=null}={}){let o=new Uint32Array(e.buffer);for(let c=0;c<o.length;c++){let i=o[c],s=i>>24&255,g=i>>16&255,u=i>>8&255,l=i&255;s=R(s,r),n&&(s=s<=(typeof n=="number"?n:127)?0:255),l=R(l,t),u=R(u,t),g=R(g,t),o[c]=s<<24|g<<16|u<<8|l<<0}}function Fe(e,t,r="rgb565"){if(!e||!e.buffer)throw new Error("quantize() expected RGBA Uint8Array data");if(!(e instanceof Uint8Array)&&!(e instanceof Uint8ClampedArray))throw new Error("quantize() expected RGBA Uint8Array data");if(t.length>256)throw new Error("applyPalette() only works with 256 colors or less");let n=new Uint32Array(e.buffer),o=n.length,c=r==="rgb444"?4096:65536,i=new Uint8Array(o),s=new Array(c),g=r==="rgba4444";if(r==="rgba4444")for(let u=0;u<o;u++){let l=n[u],a=l>>24&255,h=l>>16&255,w=l>>8&255,p=l&255,y=re(p,w,h,a),d=y in s?s[y]:s[y]=Ue(p,w,h,a,t);i[u]=d}else{let u=r==="rgb444"?oe:ne;for(let l=0;l<o;l++){let a=n[l],h=a>>16&255,w=a>>8&255,p=a&255,y=u(p,w,h),d=y in s?s[y]:s[y]=ke(p,w,h,t);i[l]=d}}return i}function Ue(e,t,r,n,o){let c=0,i=1e100;for(let s=0;s<o.length;s++){let g=o[s],u=g[3],l=_(u-n);if(l>i)continue;let a=g[0];if(l+=_(a-e),l>i)continue;let h=g[1];if(l+=_(h-t),l>i)continue;let w=g[2];l+=_(w-r),!(l>i)&&(i=l,c=s)}return c}function ke(e,t,r,n){let o=0,c=1e100;for(let i=0;i<n.length;i++){let s=n[i],g=s[0],u=_(g-e);if(u>c)continue;let l=s[1];if(u+=_(l-t),u>c)continue;let a=s[2];u+=_(a-r),!(u>c)&&(c=u,o=i)}return o}function _e(e,t,r=5){if(!e.length||!t.length)return;let n=e.map(i=>i.slice(0,3)),o=r*r,c=e[0].length;for(let i=0;i<t.length;i++){let s=t[i];s.length<c?s=[s[0],s[1],s[2],255]:s.length>c?s=s.slice(0,3):s=s.slice();let g=ce(n,s.slice(0,3),P),u=g[0],l=g[1];l>0&&l<=o&&(e[u]=s)}}function _(e){return e*e}function ie(e,t,r=P){let n=1/0,o=-1;for(let c=0;c<e.length;c++){let i=e[c],s=r(t,i);s<n&&(n=s,o=c)}return o}function ce(e,t,r=P){let n=1/0,o=-1;for(let c=0;c<e.length;c++){let i=e[c],s=r(t,i);s<n&&(n=s,o=c)}return[o,n]}function Ee(e,t,r=P){return e[ie(e,t,r)]}function se(e={}){let{initialCapacity:t=4096,auto:r=!0}=e,n=te(t),o=5003,c=new Uint8Array(256),i=new Int32Array(o),s=new Int32Array(o),g=!1;return{reset(){n.reset(),g=!1},finish(){n.writeByte(xe.trailer)},bytes(){return n.bytes()},bytesView(){return n.bytesView()},get buffer(){return n.buffer},get stream(){return n},writeHeader:u,writeFrame(l,a,h,w={}){let{transparent:p=!1,transparentIndex:y=0,delay:d=0,palette:f=null,repeat:B=0,colorDepth:A=8,dispose:b=-1}=w,C=!1;if(r?g||(C=!0,u(),g=!0):C=!!w.first,a=Math.max(0,Math.floor(a)),h=Math.max(0,Math.floor(h)),C){if(!f)throw new Error("First frame must include a { palette } option");De(n,a,h,f,A),$(n,f),B>=0&&Te(n,B)}let U=Math.round(d/10);ze(n,b,U,p,y);let m=!!f&&!C;qe(n,a,h,m?f:null),m&&$(n,f),Se(n,l,a,h,A,c,i,s)}};function u(){ae(n,"GIF89a")}}function ze(e,t,r,n,o){e.writeByte(33),e.writeByte(249),e.writeByte(4),o<0&&(o=0,n=!1);var c,i;n?(c=1,i=2):(c=0,i=0),t>=0&&(i=t&7),i<<=2,e.writeByte(0|i|0|c),k(e,r),e.writeByte(o||0),e.writeByte(0)}function De(e,t,r,n,o=8){let s=L(n.length)-1,g=128|o-1<<4|0|s,u=0,l=0;k(e,t),k(e,r),e.writeBytes([g,u,l])}function Te(e,t){e.writeByte(33),e.writeByte(255),e.writeByte(11),ae(e,"NETSCAPE2.0"),e.writeByte(3),e.writeByte(1),k(e,t),e.writeByte(0)}function $(e,t){let r=1<<L(t.length);for(let n=0;n<r;n++){let o=[0,0,0];n<t.length&&(o=t[n]),e.writeByte(o[0]),e.writeByte(o[1]),e.writeByte(o[2])}}function qe(e,t,r,n){if(e.writeByte(44),k(e,0),k(e,0),k(e,t),k(e,r),n){let i=L(n.length)-1;e.writeByte(128|i)}else e.writeByte(0)}function Se(e,t,r,n,o=8,c,i,s){Ce(r,n,t,o,e,c,i,s)}function k(e,t){e.writeByte(t&255),e.writeByte(t>>8&255)}function ae(e,t){for(var r=0;r<t.length;r++)e.writeByte(t.charCodeAt(r))}function L(e){return Math.max(Math.ceil(Math.log2(e)),1)}var Re=se});var q=X(N(),1);var D=X(N(),1),{GIFEncoder:Pe}=D.GIFEncoder?D:D.default;function le(e,t,r,n,o){let c=t.map(([d,f,B])=>d|f<<8|B<<16),i=new Uint32Array(e.length);for(let d=0;d<e.length;d++)i[d]=c[e[d]];let s=r,g=n,u=-1,l=-1,a=new Uint8Array(256);for(let d=0;d<i.length;d++)if(!o||i[d]!==o[d]){let f=d%r,B=Math.floor(d/r);s=Math.min(s,f),g=Math.min(g,B),u=Math.max(u,f),l=Math.max(l,B),a[e[d]]=1}if(u<0)return{pixels:i,frame:null};let h=o?a.indexOf(0):-1;h===t.length&&t.push([0,0,0]);let w=u-s+1,p=l-g+1,y=new Uint8Array(w*p);for(let d=0;d<p;d++)for(let f=0;f<w;f++){let B=(g+d)*r+s+f;y[d*w+f]=h>=0&&i[B]===o[B]?h:e[B]}return{pixels:i,frame:{index:y,palette:t,width:w,height:p,left:s,top:g,transparentIndex:h}}}function fe(e,t){let r=Pe({auto:!1});if(t&&r.writeHeader(),r.writeFrame(e.index,e.width,e.height,{first:t,palette:e.palette,delay:e.delay,repeat:0,colorDepth:Math.max(2,Math.ceil(Math.log2(e.palette.length))),dispose:1,transparent:e.transparentIndex>=0,transparentIndex:e.transparentIndex}),!t){if(r.bytesView()[8]!==44)throw new Error("GIF 编码器的帧结构不兼容");let n=new DataView(r.buffer);n.setUint16(9,e.left,!0),n.setUint16(11,e.top,!0)}return r.bytesView()}var{quantize:Ve,applyPalette:Oe}=q.quantize?q:q.default,T=null;function Je(e){let t=Ve(e,256);return{palette:t,index:Oe(e,t)}}function We(e){if(e.command==="capture")try{(!T||T.width!==e.width||T.height!==e.height)&&(T=new OffscreenCanvas(e.width,e.height));let t=T.getContext("2d",{willReadFrequently:!0});if(!t)throw new Error("Worker 不支持 Canvas 2D");return t.drawImage(e.bitmap,0,0,e.width,e.height),{pixels:t.getImageData(0,0,e.width,e.height).data}}finally{e.bitmap.close()}return e.command==="compare"?le(e.index,e.palette,e.width,e.height,e.previousPixels):e.command==="encode"?{bytes:fe(e.frame,e.first)}:Je(e.pixels)}if(typeof self<"u"&&!self.document){let e=self;e.onmessage=({data:t})=>{let{id:r}=t;try{let n=We(t),o=t.command==="capture"?[n.pixels.buffer]:t.command==="compare"?[n.pixels.buffer,...n.frame?[n.frame.index.buffer]:[]]:[(n.bytes||n.index).buffer];e.postMessage({id:r,...n},o)}catch(n){e.postMessage({id:r,error:n.message})}}}})();\n' : "";
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

  // src/livephoto.ts
  var XMP_SEGMENT_ID = "http://ns.adobe.com/xap/1.0/\0";
  var EXIF_SEGMENT_ID = "Exif\0\0";
  var MPF_SEGMENT_ID = "MPF\0";
  var OPPO_USER_COMMENT = "oplus_11534336";
  var STILL_IMAGE_TIMESTAMP_US = 15e5;
  var USER_COMMENT_ASCII_PREFIX = "ASCII\0\0\0";
  function concatBytes(...parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }
  function encodeUtf8(text) {
    return new TextEncoder().encode(text);
  }
  function bytesToLatin1(bytes) {
    let text = "";
    for (let i = 0; i < bytes.length; i++) {
      text += String.fromCharCode(bytes[i]);
    }
    return text;
  }
  function findJpegXmpInsertPoint(jpeg) {
    if (jpeg.length < 4 || jpeg[0] !== 255 || jpeg[1] !== 216) {
      throw new Error("不是有效的 JPEG 数据（缺少 SOI 标记）");
    }
    let offset = 2;
    let insertOffset = 2;
    let existingXmp = null;
    let existingExif = null;
    while (offset + 4 <= jpeg.length) {
      while (offset < jpeg.length - 1 && jpeg[offset] === 255 && jpeg[offset + 1] === 255) {
        offset++;
      }
      if (jpeg[offset] !== 255) {
        break;
      }
      const marker = jpeg[offset + 1];
      if (marker !== 224 && (marker < 225 || marker > 239)) {
        break;
      }
      const segmentLength = jpeg[offset + 2] << 8 | jpeg[offset + 3];
      const segmentEnd = offset + 2 + segmentLength;
      if (segmentLength < 2 || segmentEnd > jpeg.length) {
        throw new Error("JPEG 段结构损坏（段长度越界）");
      }
      if (marker === 225) {
        const segmentBytes = jpeg.subarray(offset + 4, segmentEnd);
        const segmentId = bytesToLatin1(segmentBytes.subarray(0, XMP_SEGMENT_ID.length));
        if (segmentId === XMP_SEGMENT_ID) {
          existingXmp = { start: offset, end: segmentEnd };
          const segmentText = bytesToLatin1(segmentBytes);
          if (segmentText.includes("MotionPhoto") || segmentText.includes("MicroVideo")) {
            throw new Error("图片已包含 Motion Photo 元数据，无需重复合并");
          }
        } else if (bytesToLatin1(segmentBytes.subarray(0, EXIF_SEGMENT_ID.length)) === EXIF_SEGMENT_ID) {
          existingExif = { start: offset, end: segmentEnd };
        }
        insertOffset = segmentEnd;
      }
      offset = segmentEnd;
    }
    return { insertOffset, existingXmp, existingExif };
  }
  function patchVideoContainerBrand(video) {
    if (video.length < 20 || bytesToLatin1(video.subarray(4, 8)) !== "ftyp" || bytesToLatin1(video.subarray(8, 12)) !== "qt  ") {
      return video;
    }
    const patched = video.slice();
    patched.set(encodeUtf8("isom"), 8);
    patched.set(encodeUtf8("mp41"), 16);
    return patched;
  }
  function keepVideoTrack(trak) {
    let handler = "";
    let codec = "";
    const walk = (start, end) => {
      const view = new DataView(trak.buffer, trak.byteOffset, trak.byteLength);
      let offset = start;
      while (offset + 8 <= end) {
        const size = view.getUint32(offset, false);
        if (size < 8 || offset + size > end) {
          return;
        }
        const type = bytesToLatin1(trak.subarray(offset + 4, offset + 8));
        if (type === "mdia" || type === "minf" || type === "stbl") {
          walk(offset + 8, offset + size);
        } else if (type === "hdlr" && !handler) {
          handler = bytesToLatin1(trak.subarray(offset + 16, offset + 20));
        } else if (type === "stsd") {
          codec = bytesToLatin1(trak.subarray(offset + 20, offset + 24));
        }
        offset += size;
      }
    };
    walk(8, trak.length);
    return handler === "vide" || handler === "soun" && codec === "mp4a";
  }
  function stripVideoAuxiliaryTracks(video) {
    try {
      if (video.length < 16 || bytesToLatin1(video.subarray(4, 8)) !== "ftyp") {
        return video;
      }
      const view = new DataView(video.buffer, video.byteOffset, video.byteLength);
      const typeAt = (offset2) => bytesToLatin1(video.subarray(offset2 + 4, offset2 + 8));
      let moovAt = -1;
      let moovSize = 0;
      let mdatAt = -1;
      let pos = 0;
      while (pos + 8 <= video.length) {
        const size = view.getUint32(pos, false);
        if (size < 8 || pos + size > video.length) {
          return video;
        }
        const type = typeAt(pos);
        if (type === "moov") {
          moovAt = pos;
          moovSize = size;
        } else if (type === "mdat") {
          mdatAt = pos;
        }
        pos += size;
      }
      if (moovAt < 0 || mdatAt >= 0 && moovAt < mdatAt) {
        return video;
      }
      const kept = [];
      let trakCount = 0;
      let keptTrakCount = 0;
      let child = moovAt + 8;
      const moovEnd = moovAt + moovSize;
      while (child + 8 <= moovEnd) {
        const size = view.getUint32(child, false);
        if (size < 8 || child + size > moovEnd) {
          return video;
        }
        const box = video.slice(child, child + size);
        if (typeAt(child) === "trak") {
          trakCount++;
          if (keepVideoTrack(box)) {
            kept.push(box);
            keptTrakCount++;
          }
        } else {
          kept.push(box);
        }
        child += size;
      }
      if (keptTrakCount === trakCount || keptTrakCount === 0) {
        return video;
      }
      const bodyLength = kept.reduce((sum, box) => sum + box.length, 0);
      const newMoov = new Uint8Array(8 + bodyLength);
      const newMoovView = new DataView(newMoov.buffer);
      newMoovView.setUint32(0, newMoov.length, false);
      newMoov.set(encodeUtf8("moov"), 4);
      let offset = 8;
      for (const box of kept) {
        newMoov.set(box, offset);
        offset += box.length;
      }
      return concatBytes(video.subarray(0, moovAt), newMoov, video.subarray(moovAt + moovSize));
    } catch {
      return video;
    }
  }
  var USER_COMMENT_TAG = 37510;
  var EXIF_IFD_POINTER_TAG = 34665;
  var USER_COMMENT_VALUE = `${USER_COMMENT_ASCII_PREFIX}${OPPO_USER_COMMENT}`;
  function buildUserCommentValue() {
    return encodeUtf8(USER_COMMENT_VALUE);
  }
  function buildMinimalExifApp1() {
    const value = buildUserCommentValue();
    const exifIfdOffset = 8 + 2 + 12 + 4;
    const valueOffset = exifIfdOffset + 2 + 12 + 4;
    const tiff = new Uint8Array(valueOffset + value.length);
    const view = new DataView(tiff.buffer);
    tiff.set(encodeUtf8("II"), 0);
    view.setUint16(2, 42, true);
    view.setUint32(4, 8, true);
    view.setUint16(8, 1, true);
    view.setUint16(10, EXIF_IFD_POINTER_TAG, true);
    view.setUint16(12, 4, true);
    view.setUint32(14, 1, true);
    view.setUint32(18, exifIfdOffset, true);
    view.setUint32(22, 0, true);
    view.setUint16(exifIfdOffset, 1, true);
    view.setUint16(exifIfdOffset + 2, USER_COMMENT_TAG, true);
    view.setUint16(exifIfdOffset + 4, 7, true);
    view.setUint32(exifIfdOffset + 6, value.length, true);
    view.setUint32(exifIfdOffset + 10, valueOffset, true);
    view.setUint32(exifIfdOffset + 14, 0, true);
    tiff.set(value, valueOffset);
    return concatBytes(
      new Uint8Array([255, 225]),
      u16be(2 + EXIF_SEGMENT_ID.length + tiff.length),
      encodeUtf8(EXIF_SEGMENT_ID),
      tiff
    );
  }
  function u16be(value) {
    return Uint8Array.from([value >> 8 & 255, value & 255]);
  }
  function readIfd(view, offset, littleEndian) {
    const count = view.getUint16(offset, littleEndian);
    const entries = [];
    for (let i = 0; i < count; i++) {
      const entryOffset = offset + 2 + i * 12;
      entries.push({
        tag: view.getUint16(entryOffset, littleEndian),
        type: view.getUint16(entryOffset + 2, littleEndian),
        count: view.getUint32(entryOffset + 4, littleEndian),
        offset: view.getUint32(entryOffset + 8, littleEndian)
      });
    }
    return {
      offset,
      count,
      entries,
      nextIfdOffset: view.getUint32(offset + 2 + count * 12, littleEndian),
      tableEnd: offset + 2 + count * 12 + 4
    };
  }
  function entryValueByteLength(entry) {
    const typeSizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };
    return (typeSizes[entry.type] || 1) * entry.count;
  }
  function injectExifUserComment(jpeg, exif) {
    try {
      const segment = jpeg.subarray(exif.start, exif.end);
      const tiffStart = 10;
      const tiff = segment.subarray(tiffStart);
      if (tiff.length < 8) {
        return jpeg;
      }
      const littleEndian = tiff[0] === 73 && tiff[1] === 73;
      const bigEndian = tiff[0] === 77 && tiff[1] === 77;
      const magic = littleEndian ? tiff[3] << 8 | tiff[2] : tiff[2] << 8 | tiff[3];
      if (!littleEndian && !bigEndian || magic !== 42) {
        return jpeg;
      }
      const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
      const ifd0 = readIfd(view, view.getUint32(4, littleEndian), littleEndian);
      const exifPointer = ifd0.entries.find((entry) => entry.tag === EXIF_IFD_POINTER_TAG);
      if (!exifPointer || entryValueByteLength(exifPointer) !== 4) {
        return jpeg;
      }
      const exifIfd = readIfd(view, exifPointer.offset, littleEndian);
      const userComment = buildUserCommentValue();
      const existing = exifIfd.entries.find((entry) => entry.tag === USER_COMMENT_TAG);
      if (existing) {
        const existingLength = entryValueByteLength(existing);
        if (existingLength >= userComment.length && existing.offset >= exifIfd.tableEnd && existing.offset + existing.count <= tiff.length) {
          const patched2 = jpeg.slice();
          const valueStart = exif.start + tiffStart + existing.offset;
          patched2.set(userComment, valueStart);
          patched2.fill(0, valueStart + userComment.length, valueStart + existing.count);
          return patched2;
        }
        return jpeg;
      }
      const insertIndex = exifIfd.entries.filter((entry) => entry.tag < USER_COMMENT_TAG).length;
      const newTableEntries = [...exifIfd.entries];
      newTableEntries.splice(insertIndex, 0, { tag: USER_COMMENT_TAG, type: 7, count: userComment.length, offset: 0 });
      const shift = 12;
      const valueOffset = tiff.length + shift;
      const newTiffLength = tiff.length + shift + userComment.length;
      const newTiff = new Uint8Array(newTiffLength);
      newTiff.set(tiff.subarray(0, exifIfd.tableEnd - shift), 0);
      newTiff.set(tiff.subarray(exifIfd.tableEnd - 4), exifIfd.tableEnd + 8);
      const newView = new DataView(newTiff.buffer);
      const writeU16 = (offset, value) => newView.setUint16(offset, value, littleEndian);
      const writeU32 = (offset, value) => newView.setUint32(offset, value, littleEndian);
      writeU16(exifIfd.offset, newTableEntries.length);
      newTableEntries.forEach((entry, index) => {
        const entryOffset = exifIfd.offset + 2 + index * 12;
        writeU16(entryOffset, entry.tag);
        writeU16(entryOffset + 2, entry.type);
        writeU32(entryOffset + 4, entry.count);
        const isUserComment = entry.tag === USER_COMMENT_TAG;
        const outOfLine = !isUserComment && entry.offset >= exifIfd.tableEnd && entry.offset < tiff.length;
        const baseOffset = outOfLine ? entry.offset + shift : entry.offset;
        writeU32(entryOffset + 8, isUserComment ? valueOffset : baseOffset);
      });
      const oldNext = exifIfd.nextIfdOffset;
      writeU32(exifIfd.offset + 2 + newTableEntries.length * 12, oldNext >= exifIfd.tableEnd && oldNext < tiff.length ? oldNext + shift : oldNext);
      if (ifd0.nextIfdOffset >= exifIfd.tableEnd && ifd0.nextIfdOffset < tiff.length) {
        writeU32(ifd0.offset + 2 + ifd0.count * 12, ifd0.nextIfdOffset + shift);
      }
      ifd0.entries.forEach((entry, index) => {
        if (entry.offset >= exifIfd.tableEnd && entry.offset < tiff.length) {
          writeU32(ifd0.offset + 2 + index * 12 + 8, entry.offset + shift);
        }
      });
      newTiff.set(userComment, valueOffset);
      const newSegmentLength = 2 + 6 + newTiffLength;
      const delta = newSegmentLength + 2 - segment.length;
      const patched = new Uint8Array(jpeg.length + delta);
      patched.set(jpeg.subarray(0, exif.start), 0);
      patched[exif.start] = 255;
      patched[exif.start + 1] = 225;
      patched[exif.start + 2] = newSegmentLength >> 8 & 255;
      patched[exif.start + 3] = newSegmentLength & 255;
      patched.set(encodeUtf8(EXIF_SEGMENT_ID), exif.start + 4);
      patched.set(newTiff, exif.start + tiffStart);
      patched.set(jpeg.subarray(exif.end), exif.start + tiffStart + newTiffLength);
      return patched;
    } catch {
      return jpeg;
    }
  }
  function ensureExifWithUserComment(jpeg, existingExif) {
    if (existingExif) {
      return injectExifUserComment(jpeg, existingExif);
    }
    const minimal = buildMinimalExifApp1();
    const patched = new Uint8Array(jpeg.length + minimal.length);
    patched.set(jpeg.subarray(0, 2), 0);
    patched.set(minimal, 2);
    patched.set(jpeg.subarray(2), 2 + minimal.length);
    return patched;
  }
  var MPF_SEGMENT_LENGTH = 2 + 2 + 4 + 8 + (2 + 3 * 12 + 4) + 2 * 16;
  var GAIN_MAP_PADDING_LENGTH = 16;
  function buildMpfSegment(jpegPartLength, gainMap) {
    const bodyLength = MPF_SEGMENT_LENGTH - 4;
    const mpEntryOffset = 8 + 2 + 3 * 12 + 4;
    const segment = new Uint8Array(bodyLength);
    const view = new DataView(segment.buffer);
    let offset = 0;
    segment.set(encodeUtf8(MPF_SEGMENT_ID), offset);
    offset += 4;
    segment.set(encodeUtf8("MM"), offset);
    view.setUint16(offset + 2, 42, false);
    view.setUint32(offset + 4, 8, false);
    offset += 8;
    view.setUint16(offset, 3, false);
    offset += 2;
    view.setUint16(offset, 45056, false);
    view.setUint16(offset + 2, 7, false);
    view.setUint32(offset + 4, 4, false);
    segment.set(encodeUtf8("0100"), offset + 8);
    offset += 12;
    view.setUint16(offset, 45057, false);
    view.setUint16(offset + 2, 4, false);
    view.setUint32(offset + 4, 1, false);
    view.setUint32(offset + 8, 2, false);
    offset += 12;
    view.setUint16(offset, 45058, false);
    view.setUint16(offset + 2, 7, false);
    view.setUint32(offset + 4, 32, false);
    view.setUint32(offset + 8, mpEntryOffset, false);
    offset += 12;
    view.setUint32(offset, 0, false);
    offset += 4;
    view.setUint32(offset, 196608, false);
    view.setUint32(offset + 4, jpegPartLength, false);
    offset += 16;
    view.setUint32(offset, 0, false);
    view.setUint32(offset + 4, gainMap.size, false);
    view.setUint32(offset + 8, gainMap.dataOffset, false);
    const finalSegment = new Uint8Array(MPF_SEGMENT_LENGTH);
    finalSegment[0] = 255;
    finalSegment[1] = 226;
    finalSegment[2] = MPF_SEGMENT_LENGTH - 2 >> 8 & 255;
    finalSegment[3] = MPF_SEGMENT_LENGTH - 2 & 255;
    finalSegment.set(segment, 4);
    return finalSegment;
  }
  function buildMotionPhotoXmp(videoLength, ptsUs) {
    return [
      '<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core Test.SNAPSHOT">',
      '  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
      '    <rdf:Description rdf:about=""',
      '        xmlns:GCamera="http://ns.google.com/photos/1.0/camera/"',
      '        xmlns:OpCamera="http://ns.oplus.com/photos/1.0/camera/"',
      '        xmlns:Container="http://ns.google.com/photos/1.0/container/"',
      '        xmlns:Item="http://ns.google.com/photos/1.0/container/item/"',
      '      GCamera:MotionPhoto="1"',
      '      GCamera:MotionPhotoVersion="1"',
      `      GCamera:MotionPhotoPresentationTimestampUs="${ptsUs}"`,
      `      OpCamera:MotionPhotoPrimaryPresentationTimestampUs="${ptsUs}"`,
      '      OpCamera:MotionPhotoOwner="oplus"',
      '      OpCamera:OLivePhotoVersion="2"',
      `      OpCamera:VideoLength="${videoLength}">`,
      "      <Container:Directory>",
      "        <rdf:Seq>",
      '          <rdf:li rdf:parseType="Resource">',
      "            <Container:Item",
      '              Item:Mime="image/jpeg"',
      '              Item:Semantic="Primary"',
      '              Item:Length="0"',
      '              Item:Padding="0"/>',
      "          </rdf:li>",
      '          <rdf:li rdf:parseType="Resource">',
      "            <Container:Item",
      '              Item:Mime="video/mp4"',
      '              Item:Semantic="MotionPhoto"',
      `              Item:Length="${videoLength}"/>`,
      "          </rdf:li>",
      "        </rdf:Seq>",
      "      </Container:Directory>",
      "    </rdf:Description>",
      "  </rdf:RDF>",
      "</x:xmpmeta>"
    ].join("\n");
  }
  function parseMvhdDurationUs(video) {
    try {
      const view = new DataView(video.buffer, video.byteOffset, video.byteLength);
      const u32 = (offset) => view.getUint32(offset, false);
      let pos = 0;
      while (pos + 8 <= video.length) {
        const size = u32(pos);
        if (size < 8 || pos + size > video.length) {
          break;
        }
        if (bytesToLatin1(video.subarray(pos + 4, pos + 8)) === "moov") {
          let inner = pos + 8;
          while (inner + 8 <= pos + size) {
            const innerSize = u32(inner);
            if (innerSize < 8 || inner + innerSize > pos + size) {
              break;
            }
            if (bytesToLatin1(video.subarray(inner + 4, inner + 8)) === "mvhd") {
              if (video[inner + 8] === 1) {
                const timescale = u32(inner + 28);
                const hi = u32(inner + 32);
                const lo = u32(inner + 36);
                if (timescale > 0) {
                  return Math.round((hi * 4294967296 + lo) * 1e6 / timescale);
                }
              } else {
                const timescale = u32(inner + 20);
                const duration = u32(inner + 24);
                if (timescale > 0) {
                  return Math.round(duration * 1e6 / timescale);
                }
              }
              break;
            }
            inner += innerSize;
          }
          break;
        }
        pos += size;
      }
    } catch {
    }
    return STILL_IMAGE_TIMESTAMP_US;
  }
  function buildXmpApp1Segment(xmpText) {
    const idBytes = encodeUtf8(XMP_SEGMENT_ID);
    const payload = encodeUtf8(xmpText);
    const segmentLength = 2 + idBytes.length + payload.length;
    if (segmentLength > 65535) {
      throw new Error("XMP 段超出 APP1 长度上限");
    }
    const segment = new Uint8Array(2 + segmentLength);
    segment[0] = 255;
    segment[1] = 225;
    segment[2] = segmentLength >> 8 & 255;
    segment[3] = segmentLength & 255;
    segment.set(idBytes, 4);
    segment.set(payload, 4 + idBytes.length);
    return segment;
  }
  var MAKE_TAG = 271;
  var MODEL_TAG = 272;
  var MAKER_NOTE_TAG = 37500;
  var LENS_MAKE_TAG = 42035;
  var APPLE_MAKE = "Apple";
  var APPLE_MAKER_NOTE_HEADER = "Apple iOS\0\0";
  var FALLBACK_MAKE = "OnePlus";
  var FALLBACK_MODEL = "OnePlus 13";
  function neutralizeAppleExif(jpeg) {
    try {
      const { existingExif } = findJpegXmpInsertPoint(jpeg);
      if (!existingExif) {
        return jpeg;
      }
      const segment = jpeg.subarray(existingExif.start, existingExif.end);
      const tiffStart = 10;
      const tiff = segment.subarray(tiffStart);
      if (tiff.length < 8) {
        return jpeg;
      }
      const littleEndian = tiff[0] === 73 && tiff[1] === 73;
      const bigEndian = tiff[0] === 77 && tiff[1] === 77;
      if (!littleEndian && !bigEndian) {
        return jpeg;
      }
      const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
      const readEntries = (ifdOffset) => {
        const count = view.getUint16(ifdOffset, littleEndian);
        return Array.from({ length: count }, (_, i) => {
          const pos = ifdOffset + 2 + i * 12;
          return {
            tag: view.getUint16(pos, littleEndian),
            count: view.getUint32(pos + 4, littleEndian),
            offset: view.getUint32(pos + 8, littleEndian),
            pos
          };
        });
      };
      const latin1 = (offset, length) => bytesToLatin1(tiff.subarray(offset, offset + length));
      const ifd0 = readEntries(view.getUint32(4, littleEndian));
      const makeEntry = ifd0.find((entry) => entry.tag === MAKE_TAG);
      const modelEntry = ifd0.find((entry) => entry.tag === MODEL_TAG);
      const exifPointer = ifd0.find((entry) => entry.tag === EXIF_IFD_POINTER_TAG);
      const exifEntries = exifPointer ? readEntries(exifPointer.offset) : [];
      const makerEntry = exifEntries.find((entry) => entry.tag === MAKER_NOTE_TAG);
      const lensMakeEntry = exifEntries.find((entry) => entry.tag === LENS_MAKE_TAG);
      const makeValue = makeEntry && makeEntry.count > 4 ? latin1(makeEntry.offset, makeEntry.count) : "";
      const makerHead = makerEntry && makerEntry.count >= APPLE_MAKER_NOTE_HEADER.length ? latin1(makerEntry.offset, APPLE_MAKER_NOTE_HEADER.length) : "";
      const isApple = makeValue.replace(/\0.*$/, "") === APPLE_MAKE || makerHead === APPLE_MAKER_NOTE_HEADER;
      if (!isApple) {
        return jpeg;
      }
      const patched = tiff.slice();
      const patchedView = new DataView(patched.buffer);
      const writeU16 = (pos, value) => patchedView.setUint16(pos, value, littleEndian);
      const writeU32 = (pos, value) => patchedView.setUint32(pos, value, littleEndian);
      if (makerEntry && makerEntry.count > 4 && makerEntry.offset + makerEntry.count <= patched.length) {
        patched.fill(0, makerEntry.offset, makerEntry.offset + makerEntry.count);
        writeU16(makerEntry.pos + 2, 7);
        writeU32(makerEntry.pos + 4, 4);
        writeU32(makerEntry.pos + 8, 0);
      }
      if (lensMakeEntry && lensMakeEntry.count > 4 && lensMakeEntry.offset + lensMakeEntry.count <= patched.length && latin1(lensMakeEntry.offset, lensMakeEntry.count).replace(/\0.*$/, "") === APPLE_MAKE) {
        patched.fill(0, lensMakeEntry.offset, lensMakeEntry.offset + lensMakeEntry.count);
      }
      const appended = [];
      const rewriteAscii = (entry, value) => {
        if (!entry) {
          return;
        }
        const bytes = encodeUtf8(`${value}\0`);
        if (entry.count > 4 && entry.offset + entry.count <= patched.length) {
          if (bytes.length <= entry.count) {
            patched.set(bytes, entry.offset);
            patched.fill(0, entry.offset + bytes.length, entry.offset + entry.count);
            return;
          }
          patched.fill(0, entry.offset, entry.offset + entry.count);
        }
        appended.push({ entry, bytes });
      };
      rewriteAscii(modelEntry, FALLBACK_MODEL);
      rewriteAscii(makeEntry, FALLBACK_MAKE);
      let appendOffset = patched.length;
      for (const { entry, bytes } of appended) {
        writeU16(entry.pos + 2, 2);
        writeU32(entry.pos + 4, bytes.length);
        writeU32(entry.pos + 8, appendOffset);
        appendOffset += bytes.length;
      }
      const newTiff = appended.length > 0 ? concatBytes(patched, ...appended.map(({ bytes }) => bytes)) : patched;
      if (newTiff === tiff) {
        return jpeg;
      }
      const newSegmentLength = 2 + 6 + newTiff.length;
      const delta = newSegmentLength + 2 - segment.length;
      const result = new Uint8Array(jpeg.length + delta);
      result.set(jpeg.subarray(0, existingExif.start), 0);
      result[existingExif.start] = 255;
      result[existingExif.start + 1] = 225;
      result[existingExif.start + 2] = newSegmentLength >> 8 & 255;
      result[existingExif.start + 3] = newSegmentLength & 255;
      result.set(encodeUtf8(EXIF_SEGMENT_ID), existingExif.start + 4);
      result.set(newTiff, existingExif.start + tiffStart);
      result.set(jpeg.subarray(existingExif.end), existingExif.start + tiffStart + newTiff.length);
      return result;
    } catch {
      return jpeg;
    }
  }
  function buildMotionPhoto(jpeg, video) {
    const patchedVideo = patchVideoContainerBrand(stripVideoAuxiliaryTracks(video));
    if (patchedVideo.length < 12 || bytesToLatin1(patchedVideo.subarray(4, 8)) !== "ftyp") {
      throw new Error("视频不是 ISO-BMFF 容器（缺少 ftyp box），无法合并");
    }
    const deApple = neutralizeAppleExif(jpeg);
    const exifReady = ensureExifWithUserComment(deApple, findJpegXmpInsertPoint(deApple).existingExif);
    const { insertOffset, existingXmp } = findJpegXmpInsertPoint(exifReady);
    const ptsUs = parseMvhdDurationUs(patchedVideo);
    const xmpSegment = buildXmpApp1Segment(buildMotionPhotoXmp(patchedVideo.length, ptsUs));
    const headEnd = existingXmp ? existingXmp.start : insertOffset;
    const jpegHead = exifReady.subarray(0, headEnd);
    const jpegTail = exifReady.subarray(existingXmp ? existingXmp.end : insertOffset);
    const jpegPartLength = jpegHead.length + xmpSegment.length + MPF_SEGMENT_LENGTH + jpegTail.length;
    const gainMap = { size: jpeg.length, dataOffset: MPF_SEGMENT_LENGTH + jpegTail.length - 8 };
    const mpfSegment = buildMpfSegment(jpegPartLength, gainMap);
    return concatBytes(
      jpegHead,
      xmpSegment,
      mpfSegment,
      jpegTail,
      jpeg,
      new Uint8Array(GAIN_MAP_PADDING_LENGTH),
      patchedVideo
    );
  }

  // src/apple-pair.ts
  var APPLE_MAKER_HEADER = "Apple iOS\0";
  var APPLE_MAKER_IFD_OFFSET = 14;
  var APPLE_CONTENT_IDENTIFIER_TAG = 17;
  var EXIF_MAKER_NOTE_TAG = 37500;
  var EXIF_IFD_POINTER_TAG2 = 34665;
  var QT_CONTENT_IDENTIFIER_KEY = "com.apple.quicktime.content.identifier";
  var QT_STILL_IMAGE_TIME_KEY = "com.apple.quicktime.still-image-time";
  var QT_DATA_TYPE_SINT8 = 21;
  var QT_DATA_TYPE_UTF8 = 1;
  var QT_STILL_IMAGE_TIME_VALUE = new Uint8Array([255]);
  function concatBytes2(...parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }
  function asciiBytes(text) {
    const out = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      out[i] = text.charCodeAt(i) & 255;
    }
    return out;
  }
  function bytesToLatin12(bytes) {
    let text = "";
    for (let i = 0; i < bytes.length; i++) {
      text += String.fromCharCode(bytes[i]);
    }
    return text;
  }
  function u32be(value) {
    return Uint8Array.from([value >>> 24 & 255, value >>> 16 & 255, value >>> 8 & 255, value & 255]);
  }
  var UUID_PATTERN = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/;
  function generateContentIdentifier() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().toUpperCase();
    }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = bytes[6] & 15 | 64;
    bytes[8] = bytes[8] & 63 | 128;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`.toUpperCase();
  }
  var TIFF_TYPE_SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };
  function entryValueByteLength2(entry) {
    return (TIFF_TYPE_SIZES[entry.type] || 1) * entry.count;
  }
  function findExifApp1(jpeg) {
    if (jpeg.length < 4 || jpeg[0] !== 255 || jpeg[1] !== 216) {
      return null;
    }
    let offset = 2;
    while (offset + 4 <= jpeg.length) {
      while (offset < jpeg.length - 1 && jpeg[offset] === 255 && jpeg[offset + 1] === 255) {
        offset++;
      }
      if (jpeg[offset] !== 255) {
        break;
      }
      const marker = jpeg[offset + 1];
      if (marker !== 224 && (marker < 225 || marker > 239)) {
        break;
      }
      const segmentLength = jpeg[offset + 2] << 8 | jpeg[offset + 3];
      const segmentEnd = offset + 2 + segmentLength;
      if (segmentLength < 2 || segmentEnd > jpeg.length) {
        return null;
      }
      if (marker === 225 && bytesToLatin12(jpeg.subarray(offset + 4, offset + 10)) === "Exif\0\0") {
        return { start: offset, end: segmentEnd };
      }
      offset = segmentEnd;
    }
    return null;
  }
  function readIfd2(view, offset, littleEndian) {
    const count = view.getUint16(offset, littleEndian);
    const entries = [];
    for (let i = 0; i < count; i++) {
      const entryOffset = offset + 2 + i * 12;
      entries.push({
        tag: view.getUint16(entryOffset, littleEndian),
        type: view.getUint16(entryOffset + 2, littleEndian),
        count: view.getUint32(entryOffset + 4, littleEndian),
        offset: view.getUint32(entryOffset + 8, littleEndian)
      });
    }
    return {
      offset,
      entries,
      nextIfdOffset: view.getUint32(offset + 2 + count * 12, littleEndian),
      tableEnd: offset + 2 + count * 12 + 4
    };
  }
  function parseExifContext(jpeg) {
    const segment = findExifApp1(jpeg);
    if (!segment) {
      return null;
    }
    const tiff = jpeg.subarray(segment.start + 10, segment.end);
    if (tiff.length < 8) {
      return null;
    }
    const littleEndian = tiff[0] === 73 && tiff[1] === 73;
    const bigEndian = tiff[0] === 77 && tiff[1] === 77;
    const magic = littleEndian ? tiff[3] << 8 | tiff[2] : tiff[2] << 8 | tiff[3];
    if (!littleEndian && !bigEndian || magic !== 42) {
      return null;
    }
    const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
    const ifd0 = readIfd2(view, view.getUint32(4, littleEndian), littleEndian);
    const exifPointer = ifd0.entries.find((entry) => entry.tag === EXIF_IFD_POINTER_TAG2);
    if (!exifPointer || entryValueByteLength2(exifPointer) !== 4) {
      return null;
    }
    const exifIfd = readIfd2(view, exifPointer.offset, littleEndian);
    const makerEntry = exifIfd.entries.find((entry) => entry.tag === EXIF_MAKER_NOTE_TAG) || null;
    let makerBytes = null;
    if (makerEntry) {
      const length = entryValueByteLength2(makerEntry);
      if (length <= 4) {
        makerBytes = null;
      } else if (makerEntry.offset >= exifIfd.tableEnd && makerEntry.offset + length <= tiff.length) {
        makerBytes = tiff.subarray(makerEntry.offset, makerEntry.offset + length);
      } else {
        return null;
      }
    }
    return { segment, tiff, littleEndian, view, ifd0, exifIfd, makerEntry, makerBytes };
  }
  function readContentIdentifierFromContext(context) {
    const maker = context.makerBytes;
    if (!maker || maker.length < APPLE_MAKER_IFD_OFFSET + 2 || bytesToLatin12(maker.subarray(0, 10)) !== APPLE_MAKER_HEADER) {
      return null;
    }
    const orderText = bytesToLatin12(maker.subarray(12, 14));
    const littleEndian = orderText === "II";
    if (!littleEndian && orderText !== "MM") {
      return null;
    }
    const view = new DataView(maker.buffer, maker.byteOffset, maker.byteLength);
    const ifd = readIfd2(view, APPLE_MAKER_IFD_OFFSET, littleEndian);
    const entry = ifd.entries.find((item) => item.tag === APPLE_CONTENT_IDENTIFIER_TAG);
    if (!entry || entry.type !== 2) {
      return null;
    }
    let value;
    try {
      if (entryValueByteLength2(entry) <= 4) {
        return null;
      }
      if (entry.offset + entry.count > maker.length) {
        return null;
      }
      value = maker.subarray(entry.offset, entry.offset + entry.count);
    } catch {
      return null;
    }
    const text = bytesToLatin12(value).replace(/\0+$/, "").trim();
    return UUID_PATTERN.test(text) ? text.toUpperCase() : null;
  }
  function readAppleContentIdentifier(jpeg) {
    try {
      const context = parseExifContext(jpeg);
      return context ? readContentIdentifierFromContext(context) : null;
    } catch {
      return null;
    }
  }
  function parseAppleMakerNote(maker) {
    if (bytesToLatin12(maker.subarray(0, 10)) !== APPLE_MAKER_HEADER || maker.length < APPLE_MAKER_IFD_OFFSET + 2) {
      return null;
    }
    const orderText = bytesToLatin12(maker.subarray(12, 14));
    const littleEndian = orderText === "II";
    if (!littleEndian && orderText !== "MM") {
      return null;
    }
    const view = new DataView(maker.buffer, maker.byteOffset, maker.byteLength);
    const ifd = readIfd2(view, APPLE_MAKER_IFD_OFFSET, littleEndian);
    const entries = [];
    for (const entry of ifd.entries) {
      const length = entryValueByteLength2(entry);
      const entryField = APPLE_MAKER_IFD_OFFSET + 2 + ifd.entries.indexOf(entry) * 12 + 8;
      if (length <= 4) {
        entries.push({ tag: entry.tag, type: entry.type, count: entry.count, value: maker.subarray(entryField, entryField + length) });
      } else {
        if (entry.offset + length > maker.length) {
          return null;
        }
        entries.push({ tag: entry.tag, type: entry.type, count: entry.count, value: maker.subarray(entry.offset, entry.offset + length) });
      }
    }
    return { version: maker.subarray(10, 12), littleEndian, entries };
  }
  function buildAppleMakerNote(existing, uuid, parentLittleEndian) {
    const parsed = existing ? parseAppleMakerNote(existing) : null;
    const littleEndian = parsed ? parsed.littleEndian : parentLittleEndian;
    const version = parsed ? parsed.version : new Uint8Array([0, 1]);
    const entries = parsed ? parsed.entries.filter((entry) => entry.tag !== APPLE_CONTENT_IDENTIFIER_TAG) : [];
    const identifierValue = concatBytes2(asciiBytes(uuid.toUpperCase()), new Uint8Array([0]));
    const insertIndex = entries.filter((entry) => entry.tag < APPLE_CONTENT_IDENTIFIER_TAG).length;
    entries.splice(insertIndex, 0, {
      tag: APPLE_CONTENT_IDENTIFIER_TAG,
      type: 2,
      count: identifierValue.length,
      value: identifierValue
    });
    const tableEnd = APPLE_MAKER_IFD_OFFSET + 2 + entries.length * 12 + 4;
    const dataOffsets = [];
    let dataEnd = tableEnd;
    for (const entry of entries) {
      if (entry.value.length > 4) {
        dataOffsets.push(dataEnd);
        dataEnd += entry.value.length;
      } else {
        dataOffsets.push(-1);
      }
    }
    const out = new Uint8Array(dataEnd);
    out.set(asciiBytes(APPLE_MAKER_HEADER), 0);
    out.set(version, 10);
    out.set(asciiBytes(littleEndian ? "II" : "MM"), 12);
    const view = new DataView(out.buffer);
    const writeU16 = (offset, value) => view.setUint16(offset, value, littleEndian);
    const writeU32 = (offset, value) => view.setUint32(offset, value, littleEndian);
    writeU16(APPLE_MAKER_IFD_OFFSET, entries.length);
    entries.forEach((entry, index) => {
      const entryOffset = APPLE_MAKER_IFD_OFFSET + 2 + index * 12;
      writeU16(entryOffset, entry.tag);
      writeU16(entryOffset + 2, entry.type);
      writeU32(entryOffset + 4, entry.count);
      if (entry.value.length > 4) {
        writeU32(entryOffset + 8, dataOffsets[index]);
      } else {
        out.fill(0, entryOffset + 8, entryOffset + 12);
        out.set(entry.value, entryOffset + 8);
      }
    });
    writeU32(APPLE_MAKER_IFD_OFFSET + 2 + entries.length * 12, 0);
    entries.forEach((entry, index) => {
      if (dataOffsets[index] >= 0) {
        out.set(entry.value, dataOffsets[index]);
      }
    });
    return out;
  }
  function upsertExifIfdEntry(jpeg, context, tag, valueBytes) {
    const { segment, tiff, littleEndian, ifd0, exifIfd } = context;
    const tiffStart = 10;
    const existing = exifIfd.entries.find((entry) => entry.tag === tag);
    let valueOffset;
    let shift;
    let newEntries;
    if (existing) {
      const existingLength = entryValueByteLength2(existing);
      if (existingLength >= valueBytes.length && existingLength > 4 && existing.offset >= exifIfd.tableEnd && existing.offset + existingLength <= tiff.length) {
        const patched2 = jpeg.slice();
        const valueStart = segment.start + tiffStart + existing.offset;
        patched2.set(valueBytes, valueStart);
        patched2.fill(0, valueStart + valueBytes.length, valueStart + existingLength);
        const entryField = segment.start + tiffStart + exifIfd.offset + 2 + exifIfd.entries.indexOf(existing) * 12;
        const entryView = new DataView(patched2.buffer, patched2.byteOffset, patched2.byteLength);
        entryView.setUint16(entryField + 2, 7, littleEndian);
        entryView.setUint32(entryField + 4, valueBytes.length, littleEndian);
        return patched2;
      }
      valueOffset = tiff.length;
      shift = 0;
      newEntries = exifIfd.entries.map((entry) => entry);
    } else {
      const insertIndex = exifIfd.entries.filter((entry) => entry.tag < tag).length;
      newEntries = [...exifIfd.entries];
      newEntries.splice(insertIndex, 0, { tag, type: 7, count: valueBytes.length, offset: 0 });
      valueOffset = tiff.length + 12;
      shift = 12;
    }
    const newTiffLength = tiff.length + shift + valueBytes.length;
    const newTiff = new Uint8Array(newTiffLength);
    const moveFrom = exifIfd.tableEnd - 4;
    newTiff.set(tiff.subarray(0, moveFrom), 0);
    newTiff.set(tiff.subarray(moveFrom), moveFrom + shift);
    const newView = new DataView(newTiff.buffer);
    const writeU16 = (offset, value) => newView.setUint16(offset, value, littleEndian);
    const writeU32 = (offset, value) => newView.setUint32(offset, value, littleEndian);
    const pointsPastTable = (value) => value >= exifIfd.tableEnd && value < tiff.length;
    writeU16(exifIfd.offset, newEntries.length);
    newEntries.forEach((entry, index) => {
      const entryOffset = exifIfd.offset + 2 + index * 12;
      const isTarget = entry.tag === tag;
      writeU16(entryOffset, entry.tag);
      writeU16(entryOffset + 2, isTarget ? 7 : entry.type);
      writeU32(entryOffset + 4, isTarget ? valueBytes.length : entry.count);
      if (isTarget) {
        writeU32(entryOffset + 8, valueOffset);
      } else {
        const baseOffset = !isTarget && entry.offset >= exifIfd.tableEnd && entry.offset < tiff.length ? entry.offset + shift : entry.offset;
        writeU32(entryOffset + 8, baseOffset);
      }
    });
    const exifNext = exifIfd.nextIfdOffset;
    writeU32(exifIfd.offset + 2 + newEntries.length * 12, pointsPastTable(exifNext) ? exifNext + shift : exifNext);
    if (pointsPastTable(ifd0.nextIfdOffset)) {
      writeU32(ifd0.offset + 2 + ifd0.entries.length * 12, ifd0.nextIfdOffset + shift);
    }
    ifd0.entries.forEach((entry, index) => {
      if (pointsPastTable(entry.offset)) {
        writeU32(ifd0.offset + 2 + index * 12 + 8, entry.offset + shift);
      }
    });
    newTiff.set(valueBytes, valueOffset);
    const newSegmentLength = 2 + 6 + newTiffLength;
    const delta = newSegmentLength + 2 - (segment.end - segment.start);
    const patched = new Uint8Array(jpeg.length + delta);
    patched.set(jpeg.subarray(0, segment.start), 0);
    patched[segment.start] = 255;
    patched[segment.start + 1] = 225;
    patched[segment.start + 2] = newSegmentLength >> 8 & 255;
    patched[segment.start + 3] = newSegmentLength & 255;
    patched.set(asciiBytes("Exif\0\0"), segment.start + 4);
    patched.set(newTiff, segment.start + tiffStart);
    patched.set(jpeg.subarray(segment.end), segment.start + tiffStart + newTiffLength);
    return patched;
  }
  function injectAppleContentIdentifier(jpeg, uuid) {
    try {
      const context = parseExifContext(jpeg);
      if (!context) {
        return jpeg;
      }
      const makerNote = buildAppleMakerNote(context.makerBytes, uuid, context.littleEndian);
      return upsertExifIfdEntry(jpeg, context, EXIF_MAKER_NOTE_TAG, makerNote);
    } catch {
      return jpeg;
    }
  }
  var CONTAINER_BOX_TYPES = /* @__PURE__ */ new Set(["moov", "udta", "trak", "mdia", "minf", "stbl", "edts", "dinf"]);
  var CHUNK_OFFSET_CONTAINER_TYPES = ["moov", "trak", "mdia", "minf", "stbl"];
  function parseBoxes(bytes, start, end) {
    const boxes = [];
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let pos = start;
    while (pos + 8 <= end) {
      let size = view.getUint32(pos);
      let headerSize = 8;
      if (size === 1) {
        if (pos + 16 > end) {
          break;
        }
        size = Number(view.getBigUint64(pos + 8));
        headerSize = 16;
      } else if (size === 0) {
        size = end - pos;
      }
      if (size < headerSize || pos + size > end) {
        break;
      }
      const type = bytesToLatin12(bytes.subarray(pos + 4, pos + 8));
      const node = { type, start: pos, size, headerSize, children: [] };
      if (CONTAINER_BOX_TYPES.has(type)) {
        node.children = parseBoxes(bytes, pos + headerSize, pos + size);
      }
      boxes.push(node);
      pos += size;
    }
    return boxes;
  }
  function findBox(boxes, type, depth = 1) {
    for (const box of boxes) {
      if (box.type === type) {
        return box;
      }
      if (depth > 1) {
        const found = findBox(box.children, type, depth - 1);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }
  function readBoxBody(bytes, box) {
    return bytes.subarray(box.start + box.headerSize, box.start + box.size);
  }
  function parseKeysBox(payload) {
    if (payload.length < 8) {
      return null;
    }
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    const count = view.getUint32(4);
    const keys = /* @__PURE__ */ new Map();
    let pos = 8;
    for (let index = 1; index <= count; index++) {
      if (pos + 8 > payload.length) {
        return null;
      }
      const entrySize = view.getUint32(pos);
      if (entrySize < 8 || pos + entrySize > payload.length) {
        return null;
      }
      const namespace = bytesToLatin12(payload.subarray(pos + 4, pos + 8));
      if (namespace !== "mdta") {
        return null;
      }
      keys.set(bytesToLatin12(payload.subarray(pos + 8, pos + entrySize)), index);
      pos += entrySize;
    }
    return keys;
  }
  function parseIlstBox(payload) {
    const items = [];
    let pos = 0;
    while (pos + 8 <= payload.length) {
      const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      const size = view.getUint32(pos);
      if (size < 8 || pos + size > payload.length) {
        break;
      }
      items.push({ index: view.getUint32(pos + 4), raw: payload.slice(pos, pos + size) });
      pos += size;
    }
    return items;
  }
  function buildHdlrBox() {
    const out = new Uint8Array(33);
    out.set(u32be(33), 0);
    out.set(asciiBytes("hdlr"), 4);
    out.set(asciiBytes("mdta"), 16);
    return out;
  }
  function buildKeysBox(names) {
    const entries = names.map((name) => concatBytes2(u32be(8 + name.length), asciiBytes("mdta"), asciiBytes(name)));
    const body = concatBytes2(u32be(0), u32be(names.length), ...entries);
    return concatBytes2(u32be(8 + body.length), asciiBytes("keys"), body);
  }
  function buildIlstItem(keyIndex, dataTypeFlags, value) {
    const dataBody = concatBytes2(u32be(dataTypeFlags), u32be(0), value);
    const dataBox = concatBytes2(u32be(8 + dataBody.length), asciiBytes("data"), dataBody);
    return concatBytes2(u32be(8 + dataBox.length), u32be(keyIndex), dataBox);
  }
  function buildBox(type, body, isoFullBox) {
    const prefix = isoFullBox ? u32be(0) : new Uint8Array(0);
    const full = concatBytes2(prefix, body);
    return concatBytes2(u32be(8 + full.length), asciiBytes(type), full);
  }
  function patchChunkOffsets(moov, delta) {
    const walk = (start, end, depth) => {
      if (depth > 10) {
        return;
      }
      const view = new DataView(moov.buffer, moov.byteOffset, moov.byteLength);
      let pos = start;
      while (pos + 8 <= end) {
        const size = view.getUint32(pos);
        if (size < 8 || pos + size > end) {
          return;
        }
        const type = bytesToLatin12(moov.subarray(pos + 4, pos + 8));
        if (type === "stco" && size >= 16) {
          const count = view.getUint32(pos + 12);
          for (let i = 0; i < count && pos + 16 + i * 4 + 4 <= pos + size; i++) {
            const field = pos + 16 + i * 4;
            view.setUint32(field, view.getUint32(field) + delta >>> 0);
          }
        } else if (type === "co64" && size >= 16) {
          const count = view.getUint32(pos + 12);
          for (let i = 0; i < count && pos + 16 + i * 8 + 8 <= pos + size; i++) {
            const field = pos + 16 + i * 8;
            view.setBigUint64(field, view.getBigUint64(field) + BigInt(delta));
          }
        } else if (CHUNK_OFFSET_CONTAINER_TYPES.includes(type)) {
          walk(pos + 8, pos + size, depth + 1);
        }
        pos += size;
      }
    };
    walk(8, moov.length, 0);
  }
  function isPlausibleBoxType(type) {
    return [...type].every((ch) => ch >= " " && ch <= "~");
  }
  function injectLivePhotoVideoMetadata(video, uuid) {
    try {
      if (video.length < 16) {
        return video;
      }
      const topLevel = parseBoxes(video, 0, video.length);
      if (topLevel.length === 0) {
        return video;
      }
      const view = new DataView(video.buffer, video.byteOffset, video.byteLength);
      let mdatOffset = -1;
      let moov = null;
      let moovOffset = -1;
      for (const box of topLevel) {
        if (view.getUint32(box.start) === 1) {
          return video;
        }
        if (box.type === "moov" && !moov) {
          moov = box;
          moovOffset = box.start;
        }
        if (box.type === "mdat" && mdatOffset < 0) {
          mdatOffset = box.start;
        }
        if (box.type === "moof" || box.type === "sidx") {
          return video;
        }
      }
      if (!moov || moovOffset < 0) {
        return video;
      }
      if (findBox(moov.children, "cmov", 2)) {
        return video;
      }
      const udta = moov.children.find((box) => box.type === "udta") || null;
      let meta = moov.children.find((box) => box.type === "meta") || (udta ? udta.children.find((box) => box.type === "meta") : void 0) || null;
      let metaIsFullBox = false;
      let metaChildren = [];
      if (meta) {
        for (const candidateFullBox of [false, true]) {
          const bodyStart = meta.start + meta.headerSize + (candidateFullBox ? 4 : 0);
          const children = parseBoxes(video, bodyStart, meta.start + meta.size);
          const parsedEnd = children.reduce((sum, box) => sum + box.size, bodyStart);
          if (children.length > 0 && parsedEnd === meta.start + meta.size && children.every((box) => box.headerSize === 8 && isPlausibleBoxType(box.type))) {
            metaIsFullBox = candidateFullBox;
            metaChildren = children;
            break;
          }
        }
        if (metaChildren.length === 0) {
          return video;
        }
        const hdlr = metaChildren.find((box) => box.type === "hdlr");
        if (hdlr) {
          if (hdlr.headerSize !== 8) {
            return video;
          }
          const handlerType = bytesToLatin12(video.subarray(hdlr.start + 16, hdlr.start + 20));
          if (handlerType !== "mdta") {
            return video;
          }
        }
      } else {
        const ftyp = topLevel.find((box) => box.type === "ftyp");
        const majorBrand = ftyp ? bytesToLatin12(video.subarray(ftyp.start + 8, ftyp.start + 12)) : "";
        metaIsFullBox = majorBrand !== "qt  ";
      }
      const keysBox = metaChildren.find((box) => box.type === "keys");
      const ilstBox = metaChildren.find((box) => box.type === "ilst");
      if (ilstBox && !keysBox) {
        return video;
      }
      const existingKeys = keysBox ? parseKeysBox(readBoxBody(video, keysBox)) : null;
      if (keysBox && !existingKeys) {
        return video;
      }
      const existingItems = ilstBox ? parseIlstBox(readBoxBody(video, ilstBox)) : null;
      const keyNames = existingKeys ? [...existingKeys.keys()] : [];
      const keyIndex = new Map(existingKeys || []);
      const plan = [
        { key: QT_CONTENT_IDENTIFIER_KEY, flags: QT_DATA_TYPE_UTF8, value: asciiBytes(uuid.toUpperCase()) },
        { key: QT_STILL_IMAGE_TIME_KEY, flags: QT_DATA_TYPE_SINT8, value: QT_STILL_IMAGE_TIME_VALUE }
      ];
      const targetIndexes = [];
      for (const entry of plan) {
        let index = keyIndex.get(entry.key);
        if (!index) {
          keyNames.push(entry.key);
          index = keyNames.length;
          keyIndex.set(entry.key, index);
        }
        targetIndexes.push(index);
      }
      const newKeysBox = buildKeysBox(keyNames);
      const replacedSet = new Set(targetIndexes);
      const preservedItems = (existingItems || []).filter((item) => !replacedSet.has(item.index)).map((item) => item.raw);
      const newIlstBody = concatBytes2(
        ...preservedItems,
        ...plan.map((entry, position) => buildIlstItem(targetIndexes[position], entry.flags, entry.value))
      );
      const newIlstBox = concatBytes2(u32be(8 + newIlstBody.length), asciiBytes("ilst"), newIlstBody);
      const metaChildBoxes = [];
      if (!metaChildren.some((box) => box.type === "hdlr")) {
        metaChildBoxes.push(buildHdlrBox());
      }
      for (const child of metaChildren) {
        if (child.type === "keys" || child.type === "ilst") {
          continue;
        }
        metaChildBoxes.push(video.slice(child.start, child.start + child.size));
      }
      metaChildBoxes.push(newKeysBox, newIlstBox);
      const newMetaBox = buildBox("meta", concatBytes2(...metaChildBoxes), metaIsFullBox);
      const rawCopy = (box) => video.slice(box.start, box.start + box.size);
      let moovChildrenParts;
      if (meta && udta && udta.children.includes(meta)) {
        const udtaParts = udta.children.map((child) => child === meta ? newMetaBox : rawCopy(child));
        const newUdta = concatBytes2(u32be(8 + udtaParts.reduce((sum, part) => sum + part.length, 0)), asciiBytes("udta"), ...udtaParts);
        moovChildrenParts = moov.children.map((child) => child === udta ? newUdta : rawCopy(child));
      } else if (meta) {
        moovChildrenParts = moov.children.map((child) => child === meta ? newMetaBox : rawCopy(child));
      } else if (udta) {
        const udtaParts = [...udta.children.map(rawCopy), newMetaBox];
        const newUdta = concatBytes2(u32be(8 + udtaParts.reduce((sum, part) => sum + part.length, 0)), asciiBytes("udta"), ...udtaParts);
        moovChildrenParts = moov.children.map((child) => child === udta ? newUdta : rawCopy(child));
      } else {
        moovChildrenParts = [...moov.children.map(rawCopy), buildBox("udta", newMetaBox, false)];
      }
      const newMoovBody = concatBytes2(...moovChildrenParts);
      const newMoov = concatBytes2(u32be(8 + newMoovBody.length), asciiBytes("moov"), newMoovBody);
      const delta = newMoov.length - moov.size;
      if (delta !== 0 && mdatOffset >= 0 && moovOffset < mdatOffset) {
        patchChunkOffsets(newMoov, delta);
      }
      return concatBytes2(video.subarray(0, moovOffset), newMoov, video.subarray(moovOffset + moov.size));
    } catch {
      return video;
    }
  }
  function pairAppleLivePhoto(jpeg, video, uuid) {
    const pairUuid = (uuid || readAppleContentIdentifier(jpeg) || generateContentIdentifier()).toUpperCase();
    const pairedJpeg = injectAppleContentIdentifier(jpeg, pairUuid);
    const pairedVideo = injectLivePhotoVideoMetadata(video, pairUuid);
    return {
      jpeg: pairedJpeg,
      video: pairedVideo,
      uuid: pairUuid,
      jpegPaired: pairedJpeg !== jpeg,
      videoPaired: pairedVideo !== video
    };
  }

  // src/utils.ts
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
        const normalizedPostId = postId.startsWith(`${platform2}_`) ? postId.slice(platform2.length + 1) : postId;
        const baseName = `${platform2}_${normalizedPostId}_${index + 1}`;
        const isWeiboLivePhoto = platform2 === "weibo" && item.kind === "livephoto" && !!item.videoUrl;
        const mergeLivePhoto = isWeiboLivePhoto && !!config.LIVEPHOTO_AUTO_MERGE && getFileExtensionFromUrl(item.imageUrl, ".jpg") === ".jpg";
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
          if (mergeLivePhoto) {
            job.livePhotoVideoUrl = item.videoUrl;
            job.filename = `${baseName}.MP.jpg`;
          } else if (isWeiboLivePhoto) {
            job.livePhotoVideoUrl = item.videoUrl;
            job.livePhotoPair = true;
          }
          jobs.push(job);
        }
        if (item.videoUrl && !mergeLivePhoto && !isWeiboLivePhoto) {
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
        return { ok: false, error: "unavailable" };
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
                resolve({ ok: true });
              },
              onerror(error) {
                const reason = error.error || error.message || "未知错误";
                log(`GM_download失败: ${reason}`);
                resolve({ ok: false, error: reason });
              },
              onprogress: () => {
              }
            });
            if (downloadId === false) {
              log("GM_download返回false，尝试备用方案:", filename);
              resolve({ ok: false, error: "rejected" });
            }
          } catch (error) {
            log("GM_download异常:", error.message);
            resolve({ ok: false, error: error.message });
          }
        });
      } catch (error) {
        log("GM_download异常，尝试备用方案:", error.message);
        return { ok: false, error: error.message };
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
    async function fetchMediaBlob(url) {
      try {
        if (typeof gmXmlhttpRequest !== "function") {
          return await fetchBlobWithWindowFetch(url);
        }
        return await fetchBlobWithXmlHttpRequest(url);
      } catch (error) {
        if (typeof gmXmlhttpRequest !== "function") {
          throw error;
        }
        return await fetchBlobWithWindowFetch(url);
      }
    }
    async function downloadBlob(blob, filename) {
      try {
        return downloadBlobWithAnchor(blob, filename);
      } catch (error) {
        log("浏览器原生保存失败，回退 GM_download:", filename, error.message);
        const gmResult = await tryGmDownload(blob, filename);
        return gmResult.ok || downloadBlobWithAnchor(blob, filename);
      }
    }
    let directDownloadFallbackCount = 0;
    async function downloadImage(url, filename) {
      const direct = await tryGmDownload(url, filename);
      if (direct.ok) {
        return true;
      }
      if (direct.error !== "unavailable") {
        directDownloadFallbackCount++;
      }
      try {
        const blob = await fetchMediaBlob(url);
        return downloadBlobWithAnchor(blob, filename);
      } catch (error) {
        log("浏览器原生保存失败，回退二进制兜底:", filename, error.message);
      }
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
    async function downloadMergedLivePhoto(imageUrl, videoUrl, filename) {
      try {
        const [imageBlob, videoBlob] = await Promise.all([
          fetchMediaBlob(imageUrl),
          fetchMediaBlob(videoUrl)
        ]);
        const mergedBytes = buildMotionPhoto(
          new Uint8Array(await imageBlob.arrayBuffer()),
          new Uint8Array(await videoBlob.arrayBuffer())
        );
        return await downloadBlob(new Blob([mergedBytes], { type: "image/jpeg" }), filename);
      } catch (error) {
        log("LivePhoto合并失败:", filename, error.message);
        return false;
      }
    }
    async function downloadPairedLivePhoto(imageUrl, videoUrl, filename) {
      const [imageSettled, videoSettled] = await Promise.allSettled([
        fetchMediaBlob(imageUrl),
        fetchMediaBlob(videoUrl)
      ]);
      if (imageSettled.status === "rejected" && videoSettled.status === "rejected") {
        log("LivePhoto配对拉流失败:", filename, imageSettled.reason?.message);
        return null;
      }
      let imageResult = false;
      let videoResult = false;
      if (imageSettled.status === "fulfilled" && videoSettled.status === "fulfilled") {
        const pair = pairAppleLivePhoto(
          new Uint8Array(await imageSettled.value.arrayBuffer()),
          new Uint8Array(await videoSettled.value.arrayBuffer())
        );
        const videoFilename2 = `${filename.replace(/\.[^.]+$/, "")}.mov`;
        imageResult = await downloadBlob(new Blob([pair.jpeg], { type: "image/jpeg" }), filename);
        videoResult = await downloadBlob(new Blob([pair.video], { type: "video/quicktime" }), videoFilename2);
        return { image: imageResult, video: videoResult };
      }
      const videoFilename = `${filename.replace(/\.[^.]+$/, "")}.mov`;
      if (imageSettled.status === "fulfilled") {
        imageResult = await downloadBlob(imageSettled.value, filename);
      } else {
        log("LivePhoto图片拉流失败:", filename, imageSettled.reason?.message);
      }
      if (videoSettled.status === "fulfilled") {
        videoResult = await downloadBlob(videoSettled.value, videoFilename);
      } else {
        log("LivePhoto视频拉流失败:", videoFilename, videoSettled.reason?.message);
      }
      return { image: imageResult, video: videoResult };
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
      let failedLivePhotoMergeCount = 0;
      let livePhotoFallbackSavedCount = 0;
      let handedOffCount = 0;
      directDownloadFallbackCount = 0;
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        const isLastJob = i === jobs.length - 1;
        const delayBetweenJobs = async () => {
          if (!isLastJob) {
            await new Promise((resolve) => setTimeout(resolve, config.DELAY_MS));
          }
        };
        if (job.livePhotoVideoUrl && job.livePhotoPair) {
          const pairResult = await downloadPairedLivePhoto(job.url, job.livePhotoVideoUrl, job.filename);
          for (const outcome of pairResult ? [pairResult.image, pairResult.video] : [false, false]) {
            if (outcome) {
              successCount++;
              if (outcome === "started") {
                handedOffCount++;
              }
            } else {
              failedCount++;
            }
          }
          await delayBetweenJobs();
          continue;
        }
        if (job.livePhotoVideoUrl) {
          const merged = await downloadMergedLivePhoto(job.url, job.livePhotoVideoUrl, job.filename);
          if (merged) {
            successCount++;
            if (merged === "started") {
              handedOffCount++;
            }
          } else {
            failedLivePhotoMergeCount++;
            log("LivePhoto合并失败，回退为分别下载:", job.filename);
            const baseName = job.filename.replace(/(\.MP)?\.[a-z0-9]+$/i, "") || job.filename;
            const pairResult = await downloadPairedLivePhoto(job.url, job.livePhotoVideoUrl, `${baseName}.jpg`);
            for (const outcome of pairResult ? [pairResult.image, pairResult.video] : [false, false]) {
              if (outcome) {
                successCount++;
                livePhotoFallbackSavedCount++;
                if (outcome === "started") {
                  handedOffCount++;
                }
              } else {
                failedCount++;
              }
            }
          }
          await delayBetweenJobs();
          continue;
        }
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
        await delayBetweenJobs();
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
      if (livePhotoFallbackSavedCount > 0) {
        message += "；部分LivePhoto未能合并，已分别保存图片与视频";
      }
      if (directDownloadFallbackCount > 0) {
        message += "；部分文件已改用浏览器保存，若弹出保存位置询问，请在 Tampermonkey 中允许下载权限";
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

  // src/ui.ts
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
          // 列表页实际渲染的缩略图，直接复用可命中浏览器缓存。
          thumbnailUrl: img.src,
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
        const headerTitle = documentRef.createElement("div");
        headerTitle.className = "weibo-img-select-header-title";
        const titleText = documentRef.createElement("span");
        titleText.textContent = "选择要下载的内容";
        const countText = documentRef.createElement("span");
        countText.className = "weibo-img-select-count";
        countText.textContent = `共 ${mediaItems.length} 项`;
        headerTitle.appendChild(titleText);
        headerTitle.appendChild(countText);
        const toggleAllBtn = documentRef.createElement("button");
        toggleAllBtn.type = "button";
        toggleAllBtn.className = "weibo-img-select-toggle-btn";
        header.appendChild(headerTitle);
        header.appendChild(toggleAllBtn);
        const list = documentRef.createElement("div");
        list.className = "weibo-img-select-grid";
        const typeCounters = {};
        mediaItems.forEach((item, index) => {
          const itemLabel = getSelectionItemLabel(item, typeCounters);
          const entry = documentRef.createElement("label");
          entry.className = itemLabel.typeKey === "image" ? "weibo-img-select-item" : `weibo-img-select-item weibo-img-select-item-${itemLabel.typeKey}`;
          entry.title = item && item.label ? item.label : itemLabel.text;
          const input = documentRef.createElement("input");
          input.type = "checkbox";
          input.checked = true;
          input.value = String(index);
          input.setAttribute("aria-label", entry.title);
          const thumb = documentRef.createElement("span");
          thumb.className = "weibo-img-select-thumb";
          const placeholder = documentRef.createElement("span");
          placeholder.className = "weibo-img-select-placeholder";
          placeholder.textContent = itemLabel.typeKey === "video" ? "▶" : itemLabel.typeKey === "gif" ? "GIF" : itemLabel.typeKey === "livephoto" ? "LIVE" : "无预览";
          thumb.appendChild(placeholder);
          const thumbnailUrl = item.thumbnailUrl || item.imageUrl;
          if (thumbnailUrl) {
            const img = documentRef.createElement("img");
            img.src = thumbnailUrl;
            img.alt = "";
            img.loading = "lazy";
            img.decoding = "async";
            img.referrerPolicy = "no-referrer";
            img.draggable = false;
            img.addEventListener("error", () => img.remove());
            thumb.appendChild(img);
          }
          if (itemLabel.typeKey !== "image") {
            const kind = documentRef.createElement("span");
            kind.className = "weibo-img-select-kind";
            kind.textContent = itemLabel.typeKey === "video" ? "视频" : itemLabel.typeKey === "gif" ? "GIF" : "LIVE";
            thumb.appendChild(kind);
          }
          const text = documentRef.createElement("span");
          text.className = "weibo-img-select-label";
          text.textContent = itemLabel.text;
          thumb.appendChild(text);
          const check = documentRef.createElement("span");
          check.className = "weibo-img-select-check";
          check.setAttribute("aria-hidden", "true");
          check.textContent = "✓";
          thumb.appendChild(check);
          entry.appendChild(input);
          entry.appendChild(thumb);
          list.appendChild(entry);
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
        const updateSelectionState = () => {
          const inputs = getInputs();
          const selectedCount = inputs.filter((input) => input.checked).length;
          toggleAllBtn.textContent = inputs.length > 0 && selectedCount === inputs.length ? "全不选" : "全选";
          confirmBtn.textContent = selectedCount > 0 ? `下载所选 (${selectedCount})` : "下载所选";
          confirmBtn.disabled = selectedCount === 0;
        };
        getInputs().forEach((input) => {
          input.addEventListener("change", updateSelectionState);
        });
        toggleAllBtn.addEventListener("click", () => {
          const shouldCheckAll = !areAllChecked();
          getInputs().forEach((input) => {
            input.checked = shouldCheckAll;
          });
          updateSelectionState();
        });
        updateSelectionState();
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
          const target = event.target;
          if (target instanceof Element && target.closest(".weibo-img-select-grid")) {
            return;
          }
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
    function insertDownloadButtonIntoPost(post, btn) {
      if (!btn) {
        return;
      }
      const inserted = platform.insertDownloadButton({ post, btn, documentRef, windowRef });
      if (!inserted) {
        post.appendChild(btn);
      }
    }
    function buildDownloadButton(postContainer, initialMediaItems, resolvedPromise = null) {
      const btn = documentRef.createElement("button");
      btn.type = "button";
      btn.className = "weibo-img-download-btn";
      const postId = getPostId(postContainer);
      buttonDetails.set(btn, { postId, count: initialMediaItems.length });
      renderDownloadButton(btn);
      const syncPromise = resolvedPromise || resolvePostMediaItems(postContainer, initialMediaItems);
      syncPromise.then((mediaItems) => {
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
    function createDownloadButton(postContainer) {
      if (postContainer.querySelector(".weibo-img-download-btn")) {
        return null;
      }
      const initialMediaItems = getFallbackMediaItems(postContainer);
      if (initialMediaItems.length > 0) {
        return buildDownloadButton(postContainer, initialMediaItems);
      }
      const shouldResolveEmptyMediaItems = typeof platform.shouldResolveEmptyMediaItems === "function" && platform.shouldResolveEmptyMediaItems(postContainer);
      if (!shouldResolveEmptyMediaItems) {
        return null;
      }
      resolvePostMediaItems(postContainer, initialMediaItems).then((mediaItems) => {
        if (!Array.isArray(mediaItems) || mediaItems.length === 0 || postContainer.querySelector(".weibo-img-download-btn")) {
          return;
        }
        insertDownloadButtonIntoPost(postContainer, buildDownloadButton(postContainer, mediaItems, Promise.resolve(mediaItems)));
      }).catch((error) => {
        utils2.log("媒体解析失败:", error.message);
      });
      return null;
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
          insertDownloadButtonIntoPost(post, btn);
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

  // src/main.ts
  var styleId = "weibo-image-downloader-style";
  var runtimeConfig = {
    ...CONFIG,
    ENABLE_VIDEO_DOWNLOAD: typeof GM_getValue === "function" ? Boolean(GM_getValue(CONFIG.VIDEO_DOWNLOAD_SETTING_KEY, CONFIG.ENABLE_VIDEO_DOWNLOAD)) : CONFIG.ENABLE_VIDEO_DOWNLOAD,
    X_GIF_AUTO_CONVERT: typeof GM_getValue === "function" ? Boolean(GM_getValue(CONFIG.X_GIF_AUTO_CONVERT_SETTING_KEY, CONFIG.X_GIF_AUTO_CONVERT)) : CONFIG.X_GIF_AUTO_CONVERT,
    LIVEPHOTO_AUTO_MERGE: typeof GM_getValue === "function" ? Boolean(GM_getValue(CONFIG.LIVEPHOTO_AUTO_MERGE_SETTING_KEY, CONFIG.LIVEPHOTO_AUTO_MERGE)) : CONFIG.LIVEPHOTO_AUTO_MERGE
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
    }, registerLivePhotoMergeMenu = function() {
      if (livePhotoMergeMenuRegistered) {
        if (livePhotoMergeMenuId === null || typeof GM_unregisterMenuCommand !== "function") {
          return;
        }
        GM_unregisterMenuCommand(livePhotoMergeMenuId);
      }
      livePhotoMergeMenuId = GM_registerMenuCommand(
        `微博LivePhoto自动合并：[${runtimeConfig.LIVEPHOTO_AUTO_MERGE ? "开启" : "关闭"}]`,
        () => {
          runtimeConfig.LIVEPHOTO_AUTO_MERGE = !runtimeConfig.LIVEPHOTO_AUTO_MERGE;
          if (typeof GM_setValue === "function") {
            GM_setValue(CONFIG.LIVEPHOTO_AUTO_MERGE_SETTING_KEY, runtimeConfig.LIVEPHOTO_AUTO_MERGE);
          }
          registerLivePhotoMergeMenu();
          ui.showToast(`微博LivePhoto自动合并已${runtimeConfig.LIVEPHOTO_AUTO_MERGE ? "开启" : "关闭"}`);
        }
      );
      livePhotoMergeMenuRegistered = true;
    };
    getVideoDownloadMenuText2 = getVideoDownloadMenuText, registerVideoDownloadMenu2 = registerVideoDownloadMenu, registerXGifMenu2 = registerXGifMenu, registerLivePhotoMergeMenu2 = registerLivePhotoMergeMenu;
    let videoDownloadMenuId = null;
    let videoDownloadMenuRegistered = false;
    GM_registerMenuCommand("刷新按钮", () => {
      ui.refreshDownloadButtons();
    });
    registerVideoDownloadMenu();
    let xGifMenuId = null;
    let xGifMenuRegistered = false;
    registerXGifMenu();
    let livePhotoMergeMenuId = null;
    let livePhotoMergeMenuRegistered = false;
    registerLivePhotoMergeMenu();
  }
  var getVideoDownloadMenuText2;
  var registerVideoDownloadMenu2;
  var registerXGifMenu2;
  var registerLivePhotoMergeMenu2;
})();
