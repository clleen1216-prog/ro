import type { HairStyle } from "@/game/types";
import { hairHex } from "@/game/content";

const CELL = 96;
let source: ImageData | null = null;
let hairMask: Uint8Array | null = null;
let skin = { r: 232, g: 186, b: 150 };
const cache = new Map<string, HTMLCanvasElement>();

function isHair(r: number, g: number, b: number, a: number) {
  return a > 180 && g > 80 && g > r + 12 && g > b + 8;
}

export function prepareLooks(img: CanvasImageSource) {
  const c = document.createElement("canvas");
  c.width = 384;
  c.height = 384;
  const ctx = c.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(img, 0, 0, 384, 384);
  source = ctx.getImageData(0, 0, 384, 384);
  hairMask = new Uint8Array(384 * 384);
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let sn = 0;
  const d = source.data;
  for (let i = 0; i < hairMask.length; i++) {
    const r = d[i * 4]!;
    const g = d[i * 4 + 1]!;
    const b = d[i * 4 + 2]!;
    const a = d[i * 4 + 3]!;
    if (isHair(r, g, b, a)) hairMask[i] = 1;
    else if (a > 200 && r > 170 && g > 120 && b > 90 && r > g && g > b - 10) {
      sr += r;
      sg += g;
      sb += b;
      sn++;
    }
  }
  if (sn > 0) skin = { r: (sr / sn) | 0, g: (sg / sn) | 0, b: (sb / sn) | 0 };
  cache.clear();
}

function hexRgb(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function cellHairBounds(mask: Uint8Array, cx: number, cy: number) {
  let minY = 999;
  let maxY = 0;
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      if (mask[(cy + y) * 384 + (cx + x)]) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minY > maxY) return { minY: 0, maxY: CELL };
  return { minY, maxY };
}

export function getLook(style: HairStyle, colorId: string) {
  if (!source || !hairMask) return null;
  const key = `${style}:${colorId}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const tint = hexRgb(hairHex(colorId));
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 384;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const out = ctx.createImageData(384, 384);
  out.data.set(source.data);
  const cutoffs: number[] = [];
  if (style === "short") {
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const b = cellHairBounds(hairMask, col * CELL, row * CELL);
        cutoffs.push(b.minY + (b.maxY - b.minY) * 0.62);
      }
    }
  }
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const cx = col * CELL;
      const cy = row * CELL;
      const cutoff = cutoffs[row * 4 + col] ?? 999;
      for (let y = 0; y < CELL; y++) {
        for (let x = 0; x < CELL; x++) {
          const sx = style === "swept" ? Math.max(0, x - 4) : x;
          const si = (cy + y) * 384 + (cx + sx);
          const di = (cy + y) * 384 + (cx + x);
          const hair = hairMask[si] === 1;
          if (!hair) continue;
          const o = di * 4;
          if (style === "short" && y > cutoff) {
            out.data[o] = skin.r;
            out.data[o + 1] = skin.g;
            out.data[o + 2] = skin.b;
            out.data[o + 3] = 255;
            continue;
          }
          const g = source.data[si * 4 + 1] ?? 180;
          const lum = g / 255;
          const shade = 0.38 + lum * 0.85;
          out.data[o] = Math.min(255, tint.r * shade);
          out.data[o + 1] = Math.min(255, tint.g * shade);
          out.data[o + 2] = Math.min(255, tint.b * shade);
          out.data[o + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(out, 0, 0);
  cache.set(key, canvas);
  return canvas;
}
