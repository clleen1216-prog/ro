// Minecraft-style pixel toolkit.
//
// Everything in the world is painted on one shared texel grid: a tile is 16
// texels and each texel is PX screen pixels (16 * 3 = 48 = TILE). Sprites are
// painted 1 canvas pixel per texel and blitted with smoothing off, so the
// whole picture reads as chunky blocks.

export const PX = 3;

type Rgb = [number, number, number];
const rgbCache = new Map<string, Rgb>();

export function rgb(hex: string): Rgb {
  const hit = rgbCache.get(hex);
  if (hit) return hit;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
  const n = Number.parseInt(h.slice(0, 6), 16);
  const out: Rgb = Number.isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  rgbCache.set(hex, out);
  return out;
}

const shadeCache = new Map<string, string>();

/** f > 0 lightens toward white, f < 0 darkens toward black. */
export function shade(hex: string, f: number): string {
  const key = `${hex}|${f.toFixed(2)}`;
  const hit = shadeCache.get(key);
  if (hit) return hit;
  const [r, g, b] = rgb(hex);
  const t = f >= 0 ? 255 : 0;
  const a = Math.abs(f);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + (t - v) * a)));
  const out = `rgb(${ch(r)},${ch(g)},${ch(b)})`;
  shadeCache.set(key, out);
  return out;
}

export function hash(x: number, y: number, i = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(i | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

type Ctx = CanvasRenderingContext2D;

/** A bevelled block at texel coordinates (1 canvas px = 1 texel). */
export function B(c: Ctx, x: number, y: number, w: number, h: number, col: string, noise = 0, bevel = true) {
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
  if (w <= 0 || h <= 0) return;
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
  if (noise > 0 && w * h <= 1400) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const n = (hash(x + i, y + j, 7) - 0.5) * 2 * noise;
        if (Math.abs(n) > noise * 0.35) {
          c.fillStyle = shade(col, n);
          c.fillRect(x + i, y + j, 1, 1);
        }
      }
    }
  }
  if (bevel && w >= 3 && h >= 3) {
    c.fillStyle = shade(col, 0.17);
    c.fillRect(x, y, w, 1);
    c.fillStyle = shade(col, 0.07);
    c.fillRect(x, y + 1, 1, h - 2);
    c.fillStyle = shade(col, -0.2);
    c.fillRect(x, y + h - 1, w, 1);
    c.fillStyle = shade(col, -0.13);
    c.fillRect(x + w - 1, y + 1, 1, h - 2);
  }
}

export function mk(w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  return cv;
}

// ── Ground tiles ────────────────────────────────────────────────────────

const pick = (p: string[], x: number, y: number, s: number) => p[Math.floor(hash(x, y, s) * p.length) % p.length]!;

function paintTile(c: Ctx, kind: number, v: number) {
  const S = kind * 31 + v * 7;
  const noiseFill = (pal: string[]) => {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        c.fillStyle = pick(pal, x, y, S);
        c.fillRect(x, y, 1, 1);
      }
    }
  };
  if (kind === 0 || kind === 6) {
    const dark = kind === 6;
    noiseFill(dark ? ["#35662a", "#2f5c25", "#3d7330", "#2a5222"] : ["#5d9b35", "#66a83c", "#548d2f", "#70b241"]);
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(hash(i, v, S) * 16);
      const y = Math.floor(hash(i, v, S + 5) * 16);
      c.fillStyle = hash(i, v, S + 9) > 0.5 ? (dark ? "#244a1c" : "#447a26") : dark ? "#4a8a3a" : "#86c653";
      c.fillRect(x, y, 1, 1 + (hash(i, v, 3) > 0.7 ? 1 : 0));
    }
    if (dark) {
      for (let i = 0; i < 4; i++) {
        c.fillStyle = "#6a4a2a";
        c.fillRect(Math.floor(hash(i, v, 31) * 16), Math.floor(hash(i, v, 32) * 16), 1, 1);
      }
    }
  } else if (kind === 2) {
    noiseFill(["#866043", "#7a5638", "#94704f", "#6e4c32"]);
    for (let i = 0; i < 4; i++) {
      c.fillStyle = "#9b9b9b";
      c.fillRect(Math.floor(hash(i, v, 41) * 15), Math.floor(hash(i, v, 42) * 15), 1 + (i % 2), 1);
    }
  } else if (kind === 4) {
    noiseFill(["#dccf9c", "#e5d8a6", "#d1c48f", "#e0d3a1"]);
    for (let i = 0; i < 5; i++) {
      c.fillStyle = "#c2b27c";
      c.fillRect(Math.floor(hash(i, v, 51) * 15), Math.floor(hash(i, v, 52) * 16), 2, 1);
    }
  } else if (kind === 3) {
    noiseFill(["#2f58c8", "#3463cc", "#2b50bb", "#386ad6"]);
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(hash(i, v, 61) * 12);
      const y = Math.floor(hash(i, v, 62) * 16);
      c.fillStyle = "#6a96f2";
      c.fillRect(x, y, 3, 1);
      c.fillStyle = "#4a78e0";
      c.fillRect(x + 1, y + 1, 2, 1);
    }
  } else if (kind === 1) {
    // cobblestone
    c.fillStyle = "#4e4e52";
    c.fillRect(0, 0, 16, 16);
    const bands = [0, 5, 10, 16];
    for (let b = 0; b < 3; b++) {
      const y0 = bands[b]!;
      const y1 = bands[b + 1]!;
      let x = Math.floor(hash(b, v, 71) * 4) - 3;
      while (x < 16) {
        const w = 4 + Math.floor(hash(x + 9, b + v * 3, 72) * 4);
        const col = pick(["#8a8a8e", "#7a7a7e", "#9a9a9e", "#838387"], x, b, S);
        const sx = Math.max(0, x);
        const sw = Math.min(16, x + w - 1) - sx;
        if (sw > 0) {
          c.fillStyle = col;
          c.fillRect(sx, y0, sw, y1 - y0 - 1);
          c.fillStyle = shade(col, 0.14);
          c.fillRect(sx, y0, sw, 1);
          c.fillStyle = shade(col, -0.16);
          c.fillRect(sx, y1 - 2, sw, 1);
        }
        x += w;
      }
    }
  } else {
    // stone bricks (5)
    c.fillStyle = "#4a4a50";
    c.fillRect(0, 0, 16, 16);
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 4 : 0;
      for (let col = -1; col < 3; col++) {
        const x = col * 8 + off;
        const base = pick(["#7b7b82", "#74747b", "#82828a", "#78787f"], col + row * 5, v, S);
        const sx = Math.max(0, x);
        const ex = Math.min(16, x + 7);
        if (ex <= sx) continue;
        c.fillStyle = base;
        c.fillRect(sx, row * 4, ex - sx, 3);
        c.fillStyle = shade(base, 0.12);
        c.fillRect(sx, row * 4, ex - sx, 1);
        if (v === 1 && hash(col, row, 81) > 0.55) {
          c.fillStyle = "#4f6b3a";
          c.fillRect(sx + 1, row * 4 + 1, 2, 1);
        }
      }
    }
  }
}

const tileCache = new Map<string, HTMLCanvasElement>();

export function tileTexture(kind: number, variant: number): HTMLCanvasElement {
  const key = `${kind}:${variant}`;
  let cv = tileCache.get(key);
  if (!cv) {
    cv = mk(16, 16);
    paintTile(cv.getContext("2d")!, kind, variant);
    tileCache.set(key, cv);
  }
  return cv;
}

// ── Sprite cache & scratch buffer ───────────────────────────────────────

const spriteCache = new Map<string, HTMLCanvasElement>();

/** Paint once, reuse forever. Origin (0,0) is the bottom-centre of the sprite. */
export function sprite(key: string, w: number, h: number, paint: (c: Ctx) => void): HTMLCanvasElement {
  let cv = spriteCache.get(key);
  if (!cv) {
    cv = mk(w, h);
    const c = cv.getContext("2d")!;
    c.translate(Math.floor(w / 2), h);
    paint(c);
    spriteCache.set(key, cv);
  }
  return cv;
}

/** Blit a texel sprite so its bottom-centre lands on world (x, y). */
export function blit(ctx: Ctx, cv: HTMLCanvasElement, x: number, y: number) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, Math.round(x - Math.floor(cv.width / 2) * PX), Math.round(y - cv.height * PX), cv.width * PX, cv.height * PX);
}

export const SCR_W = 72;
export const SCR_H = 72;
let scratchCv: HTMLCanvasElement | null = null;
let scratchCtx: Ctx | null = null;

/** A reusable 72x72 texel buffer. Origin is feet-centre, 60 texels up room. */
export function scratch(): { cv: HTMLCanvasElement; c: Ctx } {
  if (!scratchCv) {
    scratchCv = mk(SCR_W, SCR_H);
    scratchCtx = scratchCv.getContext("2d")!;
  }
  const c = scratchCtx!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, SCR_W, SCR_H);
  c.globalCompositeOperation = "source-over";
  c.globalAlpha = 1;
  c.translate(SCR_W / 2, SCR_H - 4);
  return { cv: scratchCv, c };
}

/** Blit the scratch buffer so its feet-origin lands on the current transform's (0,0). */
export function blitScratch(ctx: Ctx, flash = 0) {
  if (!scratchCv) return;
  if (flash > 0) {
    const c = scratchCtx!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "source-atop";
    c.fillStyle = `rgba(255,255,255,${Math.min(0.7, 0.35 + flash * 1.2)})`;
    c.fillRect(0, 0, SCR_W, SCR_H);
    c.globalCompositeOperation = "source-over";
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scratchCv, -(SCR_W / 2) * PX, -(SCR_H - 4) * PX, SCR_W * PX, SCR_H * PX);
}

// ── Cast shadows (light from the upper left, falling to the lower right) ──

const silCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

function silhouette(cv: HTMLCanvasElement): HTMLCanvasElement {
  let s = silCache.get(cv);
  if (!s) {
    s = mk(cv.width, cv.height);
    const c = s.getContext("2d")!;
    c.drawImage(cv, 0, 0);
    c.globalCompositeOperation = "source-in";
    c.fillStyle = "#06100a";
    c.fillRect(0, 0, cv.width, cv.height);
    silCache.set(cv, s);
  }
  return s;
}

/** Project a bottom-centre sprite onto the ground as a skewed, flattened shadow. */
export function castShadow(ctx: Ctx, cv: HTMLCanvasElement, x: number, y: number, alpha = 0.26, len = 0.32) {
  const cx = Math.floor(cv.width / 2);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.transform(1, 0, -0.55, -len, Math.round(x), Math.round(y));
  ctx.drawImage(silhouette(cv), -cx * PX, -cv.height * PX, cv.width * PX, cv.height * PX);
  ctx.restore();
}

let shCv: HTMLCanvasElement | null = null;

/** Same, for whatever is currently in the scratch buffer (origin at the current transform). */
export function castShadowScratch(ctx: Ctx, alpha = 0.26, len = 0.32) {
  if (!scratchCv) return;
  if (!shCv) shCv = mk(SCR_W, SCR_H);
  const c = shCv.getContext("2d")!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = "source-over";
  c.clearRect(0, 0, SCR_W, SCR_H);
  c.drawImage(scratchCv, 0, 0);
  c.globalCompositeOperation = "source-in";
  c.fillStyle = "#06100a";
  c.fillRect(0, 0, SCR_W, SCR_H);
  ctx.save();
  ctx.globalAlpha = alpha * ctx.globalAlpha;
  ctx.imageSmoothingEnabled = false;
  ctx.transform(1, 0, -0.55, -len, 0, 0);
  ctx.drawImage(shCv, -(SCR_W / 2) * PX, -(SCR_H - 4) * PX, SCR_W * PX, SCR_H * PX);
  ctx.restore();
}

// ── Shared pixel-art limb helpers ──
export const rad = (d: number) => (d * Math.PI) / 180;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));
export const ease = (t: number) => t * t * (3 - 2 * t);

/** A straight run of 1-texel squares along an angle (pixel-art rotation, no smear). */
export function line(c: Ctx, x: number, y: number, ang: number, len: number, w: number, col: string, xs = 1, from = 0) {
  const dx = Math.cos(rad(ang)) * xs;
  const dy = Math.sin(rad(ang));
  c.fillStyle = col;
  for (let i = from; i < len; i++) c.fillRect(Math.round(x + dx * i - w / 2), Math.round(y + dy * i - w / 2), w, w);
}

/** Straight arm/leg pivoting at (sx,sy); `split` is the fraction in colour A. */
export function limbPx(c: Ctx, sx: number, sy: number, ang: number, len: number, wid: number, a: string, b: string, split: number, xs = 1) {
  const dx = Math.cos(rad(ang)) * xs;
  const dy = Math.sin(rad(ang));
  for (let i = 0; i < len; i++) {
    const col = i < len * split ? a : b;
    const x = Math.round(sx + dx * i - wid / 2);
    const y = Math.round(sy + dy * i);
    c.fillStyle = col;
    c.fillRect(x, y, wid, Math.max(1, Math.ceil(Math.abs(dy)) + 1));
  }
  // darker outline on the trailing edge for the blocky bevel
  c.fillStyle = "rgba(0,0,0,0.16)";
  c.fillRect(Math.round(sx + dx * (len - 1) - wid / 2), Math.round(sy + dy * (len - 1)) + 1, wid, 1);
}

/** Attack progress 0..1 -> arm angle, weapon bend, body lunge. */
export function atkPose(a: number) {
  if (a < 0) return { ang: 90, bend: 1, lunge: 0 };
  if (a < 0.3) {
    const e = ease(a / 0.3);
    return { ang: lerp(90, -125, e), bend: 1 - e, lunge: -1 * e };
  }
  if (a < 0.55) {
    const e = ease((a - 0.3) / 0.25);
    return { ang: lerp(-125, 25, e), bend: 0, lunge: lerp(-1, 2, e) };
  }
  const e = ease((a - 0.55) / 0.45);
  return { ang: lerp(25, 90, e), bend: e, lunge: lerp(2, 0, e) };
}

