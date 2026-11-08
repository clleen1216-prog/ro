// Block (Minecraft-style) props, buildings and the humanoid actor.
// All painted in texel space — see blocky.ts.

import { B, PX, atkPose, blit, ease, blitScratch, castShadowScratch, hash, lerp, limbPx, line, mk, rad, scratch, shade, sprite } from "@/game/blocky";

type Ctx = CanvasRenderingContext2D;

export type ActorParts = {
  upper?: { hat?: string; tint: string };
  mid?: { hat?: string; tint: string };
  lower?: { hat?: string; tint: string };
  armor?: { tint: string };
  garment?: { tint: string };
  shoes?: { tint: string };
  weapon?: { weapon?: string; tint: string };
  shield?: { tint: string };
  acc?: string;
  job?: string;
};

const SKIN = "#e0ac82";
const SKIN_D = "#c98f66";
const PANTS0 = "#3a4a8c";
const OAK = "#a07a46";
const LOG = "#5a3d24";

// ── Props ───────────────────────────────────────────────────────────────

function paintTree(c: Ctx, v: number) {
  const th = 14 + (v % 3);
  B(c, -2, -th, 4, th, "#6b4a2b", 0.12);
  B(c, 0, -th, 1, th, "#4e3420", 0, false);
  const leaf = v % 2 ? "#2f7a2c" : "#3a8a32";
  B(c, -10, -th - 7, 20, 8, leaf, 0.14);
  B(c, -8, -th - 13, 16, 8, shade(leaf, 0.05), 0.14);
  B(c, -5, -th - 18, 10, 6, shade(leaf, 0.1), 0.14);
  B(c, -12, -th - 3, 6, 4, shade(leaf, -0.08), 0.14);
  B(c, 6, -th - 4, 6, 4, shade(leaf, -0.08), 0.14);
}

function paintRock(c: Ctx, v: number) {
  B(c, -7, -5, 14, 5, "#7d7d82", 0.2);
  B(c, -4, -9, 9, 5, "#8d8d92", 0.2);
  if (v % 2) B(c, 3, -7, 5, 3, "#6d6d72", 0.2);
  else B(c, -8, -8, 4, 3, "#6d6d72", 0.2);
}

function paintFlower(c: Ctx, hue: string) {
  B(c, 0, -6, 1, 6, "#2f7a2c", 0, false);
  B(c, -1, -3, 1, 1, "#3d9a38", 0, false);
  B(c, 1, -4, 1, 1, "#3d9a38", 0, false);
  B(c, -1, -9, 3, 3, hue, 0, false);
  B(c, 0, -8, 1, 1, "#f6e27a", 0, false);
  B(c, -2, -8, 1, 1, shade(hue, 0.15), 0, false);
  B(c, 2, -8, 1, 1, shade(hue, -0.1), 0, false);
}

function paintLamp(c: Ctx) {
  B(c, -1, -14, 3, 14, "#5a3d24", 0.1, false);
  B(c, -3, -20, 6, 6, "#f4c75a", 0.12);
  B(c, -2, -19, 4, 4, "#fff0a8", 0, false);
  B(c, -4, -21, 8, 1, "#3a2a1a", 0, false);
  B(c, -4, -14, 8, 1, "#3a2a1a", 0, false);
}

function paintSign(c: Ctx) {
  B(c, -1, -9, 2, 9, LOG, 0.1, false);
  B(c, -10, -17, 20, 9, OAK, 0.15);
}

function paintCactus(c: Ctx) {
  const g = "#3f8a3a";
  B(c, -3, -16, 6, 16, g, 0.14);
  B(c, -8, -11, 3, 7, shade(g, 0.05), 0.14);
  B(c, -8, -11, 6, 2, shade(g, 0.05), 0.14);
  B(c, 5, -14, 3, 8, shade(g, 0.05), 0.14);
  B(c, 3, -14, 5, 2, shade(g, 0.05), 0.14);
  for (const [x, y] of [[0, -13], [-1, -7], [1, -3], [-6, -9], [6, -12]] as const) B(c, x, y, 1, 1, "#e8dca8", 0, false);
}

function paintTomb(c: Ctx) {
  B(c, -6, -15, 12, 15, "#8a8a92", 0.16);
  B(c, -5, -17, 10, 2, "#9a9aa2", 0.14);
  B(c, -1, -13, 2, 8, "#5c5c66", 0, false);
  B(c, -3, -11, 6, 2, "#5c5c66", 0, false);
  B(c, -7, -2, 14, 2, "#4f6b3a", 0.2);
}

function paintPillar(c: Ctx) {
  const q = "#d8d4c4";
  B(c, -6, -4, 12, 4, shade(q, -0.08), 0.1);
  B(c, -4, -24, 8, 20, q, 0.08);
  B(c, 1, -24, 3, 20, shade(q, -0.12), 0, false);
  B(c, -6, -28, 12, 4, shade(q, 0.04), 0.1);
}

function paintBones(c: Ctx) {
  const w = "#efe9d6";
  B(c, -6, -2, 10, 2, w, 0, false);
  B(c, -7, -3, 2, 2, w, 0, false);
  B(c, 3, -3, 2, 2, w, 0, false);
  B(c, -3, -5, 8, 2, shade(w, -0.06), 0, false);
  B(c, 2, -9, 6, 6, w, 0.06);
  B(c, 3, -7, 2, 2, "#2a2118", 0, false);
  B(c, 6, -7, 1, 2, "#2a2118", 0, false);
}

function paintTorchPost(c: Ctx) {
  B(c, -1, -13, 3, 13, "#4a3a2a", 0.12, false);
  B(c, -2, -14, 5, 2, "#33291d", 0, false);
}

function paintFountain(c: Ctx, W: number) {
  const hw = Math.floor(W / 2);
  const st = "#8c8c94";
  B(c, -hw, -9, W, 9, st, 0.14);
  B(c, -hw + 3, -11, W - 6, 3, "#3b6ad0", 0.18, false);
  B(c, -hw + 2, -13, W - 4, 2, shade(st, 0.1), 0.12);
  B(c, -5, -22, 10, 11, shade(st, 0.04), 0.12);
  B(c, -9, -26, 18, 4, st, 0.14);
  B(c, -7, -27, 14, 1, "#5a8af0", 0, false);
  B(c, -1, -34, 2, 8, "#8ab4ff", 0, false);
}

export function propSprite(kind: string, x: number, hue: string | undefined, w: number): HTMLCanvasElement | null {
  const v = Math.floor(hash(Math.floor(x), 3, 9) * 6);
  switch (kind) {
    case "tree":
      return sprite(`tree${v % 3}`, 32, 48, (c) => paintTree(c, v));
    case "rock":
      return sprite(`rock${v % 2}`, 22, 14, (c) => paintRock(c, v));
    case "flower":
      return sprite(`flower${hue}`, 10, 12, (c) => paintFlower(c, hue ?? "#d4687a"));
    case "lamp":
      return sprite("lamp", 12, 24, paintLamp);
    case "sign":
      return sprite("sign", 24, 22, paintSign);
    case "cactus":
      return sprite("cactus", 22, 20, paintCactus);
    case "tomb":
      return sprite("tomb", 18, 20, paintTomb);
    case "pillar":
      return sprite("pillar", 16, 32, paintPillar);
    case "bones":
      return sprite("bones", 20, 12, paintBones);
    case "torch":
      return sprite("torchpost", 10, 16, paintTorchPost);
    case "fountain": {
      const W = Math.max(24, Math.round(w / 3 / 2) * 2 - 4);
      return sprite(`fountain${W}`, W + 4, 38, (c) => paintFountain(c, W));
    }
    default:
      return null;
  }
}

// ── Buildings ───────────────────────────────────────────────────────────

function roof(c: Ctx, W: number, bodyTop: number, rows: number, col: string) {
  for (let i = 0; i < rows; i++) {
    const w = Math.max(4, Math.round(((W + 6) * (1 - i / (rows + 0.6))) / 2) * 2);
    B(c, -w / 2, bodyTop - (i + 1) * 2, w, 2, shade(col, i % 2 ? -0.06 : 0.02), 0.14, false);
  }
  const w0 = Math.round((W + 6) / 2) * 2;
  c.fillStyle = shade(col, -0.25);
  c.fillRect(-w0 / 2, bodyTop - 1, w0, 1);
}

function paintHouse(c: Ctx, W: number, H: number, hue: string) {
  const bodyH = Math.max(12, Math.round(H * 0.62));
  const hw = Math.floor(W / 2);
  B(c, -hw, -bodyH, W, bodyH, "#d6c196", 0.14);
  B(c, -hw, -bodyH, 3, bodyH, LOG, 0.12);
  B(c, hw - 3, -bodyH, 3, bodyH, LOG, 0.12);
  B(c, -hw, -4, W, 4, "#7a7a80", 0.16);
  B(c, -hw, -bodyH, W, 2, LOG, 0.1, false);
  roof(c, W, -bodyH, Math.max(4, Math.round((H - bodyH) / 2)), "#a8342c");
  // banner in the shop's colour
  B(c, -hw + 6, -bodyH + 4, W - 12, 5, hue, 0.1);
  // window + door
  B(c, -hw + 6, -bodyH + 12, 7, 6, "#7fb6e0", 0.08);
  B(c, -hw + 9, -bodyH + 12, 1, 6, "#4a3a2a", 0, false);
  B(c, -hw + 6, -bodyH + 15, 7, 1, "#4a3a2a", 0, false);
  B(c, -3, -11, 7, 11, "#4a2e1e", 0.1);
  B(c, -3, -11, 7, 1, "#2a1a10", 0, false);
  B(c, 2, -6, 1, 1, "#e4b15a", 0, false);
  if (W > 34) {
    B(c, hw - 13, -bodyH + 12, 7, 6, "#7fb6e0", 0.08);
    B(c, hw - 10, -bodyH + 12, 1, 6, "#4a3a2a", 0, false);
  }
}

function paintStall(c: Ctx, W: number, H: number, hue: string) {
  const hw = Math.floor(W / 2);
  B(c, -hw + 2, -10, W - 4, 10, "#8a5a32", 0.14);
  B(c, -hw + 1, -12, W - 2, 2, "#a8733f", 0.12);
  B(c, -hw + 2, -Math.floor(H / 3) + 1, 2, Math.floor(H / 3) - 11, LOG, 0.1, false);
  B(c, hw - 4, -Math.floor(H / 3) + 1, 2, Math.floor(H / 3) - 11, LOG, 0.1, false);
  const top = -Math.floor(H / 3);
  for (let i = 0; i < W; i += 4) B(c, -hw + i, top, Math.min(4, W - i), 5, (i / 4) % 2 ? "#f2ead8" : hue, 0.1);
  B(c, -hw + 2, -10, W - 4, 2, "#e4b15a", 0.1, false);
}

function paintSanctum(c: Ctx, W: number, H: number) {
  const hw = Math.floor(W / 2);
  const bodyH = Math.round(H * 0.55);
  B(c, -hw, -bodyH, W, bodyH, "#e7e0cc", 0.1);
  B(c, -hw, -4, W, 4, "#9a9aa2", 0.14);
  B(c, -hw, -bodyH, 3, bodyH, "#cfc8b2", 0.1);
  B(c, hw - 3, -bodyH, 3, bodyH, "#cfc8b2", 0.1);
  roof(c, W, -bodyH, Math.max(5, Math.round((H - bodyH) / 2.2)), "#a8342c");
  const peak = bodyH + Math.max(5, Math.round((H - bodyH) / 2.2)) * 2;
  B(c, -1, -peak - 8, 2, 8, "#f4d26a", 0, false);
  B(c, -3, -peak - 6, 6, 2, "#f4d26a", 0, false);
  B(c, -5, -bodyH + 4, 10, 10, "#f4d26a", 0.1);
  B(c, -3, -bodyH + 6, 6, 6, "#c45c4a", 0.1);
  B(c, -4, -13, 8, 13, "#4a2e1e", 0.1);
  B(c, -4, -13, 8, 1, "#2a1a10", 0, false);
}

function paintArch(c: Ctx, W: number, H: number) {
  const hw = Math.floor(W / 2);
  const ph = Math.floor(H / 3);
  const pw = Math.max(5, Math.round(W * 0.2));
  B(c, -hw, -ph, pw, ph, "#d9d2bc", 0.1);
  B(c, hw - pw, -ph, pw, ph, "#d9d2bc", 0.1);
  B(c, -hw - 1, -ph - 3, pw + 2, 3, "#a8342c", 0.1);
  B(c, hw - pw - 1, -ph - 3, pw + 2, 3, "#a8342c", 0.1);
  B(c, -hw + pw, -ph - 2, W - pw * 2, 4, "#c9c2ac", 0.1);
  B(c, -hw + pw + 2, -ph + 3, W - pw * 2 - 4, 2, "#a8342c", 0.1, false);
}

export function buildingSprite(kind: string, w: number, h: number, hue?: string): HTMLCanvasElement {
  const W = Math.max(16, Math.round(w / PX / 2) * 2);
  const H = Math.max(14, Math.round(h / PX));
  const col = hue ?? (kind === "shopb" ? "#c24a42" : "#2f8f6a");
  return sprite(`b:${kind}:${W}:${H}:${col}`, W + 14, H + 16, (c) => {
    if (kind === "sanctum") paintSanctum(c, W, H);
    else if (kind === "arch") paintArch(c, W, H);
    else if (kind === "stall") paintStall(c, W, H, col);
    else paintHouse(c, W, H, col);
  });
}

// ── Chibi humanoid actor ────────────────────────────────────────────────
// Big-head proportions: legs 7, torso 8, head 12 wide x 11 tall (~28 texels).

const IRIS = "#3b3a8c";

function hair(c: Ctx, style: string, hx: string, dir: number, sway = 0) {
  const hd = shade(hx, -0.16);
  const hl = shade(hx, 0.22);
  const tie = "#d9506e";
  const bob = style === "bob";
  const swept = style === "swept";
  const view = dir === 3 ? "b" : dir === 0 ? "f" : "s";
  const wave = (x: number, y: number, h: number, w = 3) => {
    for (let i = 0; i < h; i += 2) B(c, x + (Math.floor(i / 2) % 2 ? 1 : 0), y + i, w, 2, hx, 0.14, false);
  };
  // ── back view ──
  if (view === "b") {
    const len: Record<string, number> = { bob: 14, swept: 11, short: 9, spiky: 9, undercut: 9, pompadour: 9, ponytail: 9, twintail: 9, long: 18, bun: 9, braid: 9, curly: 11, odango: 9, wavy: 17 };
    B(c, -7, -28, 14, len[style] ?? 9, hx, 0.14);
    B(c, -5, -27, 6, 1, hl, 0, false);
    B(c, -7, -28 + (len[style] ?? 9) - 1, 14, 1, hd, 0, false);
    if (style === "spiky") {
      B(c, -6, -31, 3, 3, hx, 0.14, false);
      B(c, -2, -32, 3, 4, hx, 0.14, false);
      B(c, 2, -31, 3, 3, hx, 0.14, false);
    } else if (style === "pompadour") B(c, -6, -32, 12, 4, hx, 0.14, false);
    else if (style === "ponytail") {
      B(c, -1, -27, 3, 2, tie, 0, false);
      B(c, -1 + sway, -25, 3, 13, hx, 0.14, false);
    } else if (style === "twintail") {
      B(c, -10, -25, 3, 2, tie, 0, false);
      B(c, 7, -25, 3, 2, tie, 0, false);
      B(c, -10 + sway, -23, 3, 12, hx, 0.14, false);
      B(c, 7 - sway, -23, 3, 12, hx, 0.14, false);
    } else if (style === "bun") {
      B(c, -3, -33, 6, 5, hx, 0.14);
      B(c, -3, -29, 6, 1, tie, 0, false);
    } else if (style === "braid") {
      B(c, -1, -20, 3, 2, tie, 0, false);
      for (let i = 0; i < 4; i++) B(c, -1 + (i % 2) + sway, -19 + i * 3, 3, 3, i % 2 ? hx : hd, 0.1, false);
    } else if (style === "curly") {
      B(c, -9, -30, 18, 9, hx, 0.2);
      B(c, -9, -22, 3, 9, hx, 0.2, false);
      B(c, 6, -22, 3, 9, hx, 0.2, false);
    } else if (style === "odango") {
      B(c, -9, -33, 5, 5, hx, 0.14);
      B(c, 4, -33, 5, 5, hx, 0.14);
    } else if (style === "long") B(c, -8, -24, 16, 2, hx, 0.14, false);
    else if (style === "wavy") wave(-8, -22, 14, 16);
    return;
  }
  // ── front view ──
  if (view === "f") {
    B(c, -7, -28, 14, 4, hx, 0.14);
    B(c, -5, -27, 6, 1, hl, 0, false);
    switch (style) {
      case "bob":
        B(c, -7, -24, 2, 10, hx, 0.14, false);
        B(c, 5, -24, 2, 10, hx, 0.14, false);
        B(c, -5, -24, 4, 2, hx, 0.14, false);
        B(c, 1, -24, 4, 2, hx, 0.14, false);
        B(c, -5, -22, 2, 1, hx, 0, false);
        B(c, 3, -22, 2, 1, hx, 0, false);
        B(c, -1, -24, 2, 1, hd, 0, false);
        break;
      case "short":
        B(c, -7, -24, 1, 4, hx, 0.14, false);
        B(c, 6, -24, 1, 4, hx, 0.14, false);
        B(c, -6, -24, 12, 1, hx, 0.14, false);
        B(c, -3, -30, 3, 2, hx, 0.14, false);
        B(c, 1, -29, 3, 1, hl, 0, false);
        B(c, -4, -23, 2, 1, hx, 0, false);
        B(c, 2, -23, 2, 1, hx, 0, false);
        break;
      case "swept":
        B(c, -7, -24, 2, 8, hx, 0.14, false);
        B(c, 5, -24, 2, 4, hx, 0.14, false);
        B(c, -6, -24, 9, 3, hx, 0.14, false);
        B(c, 3, -24, 3, 1, hx, 0.14, false);
        B(c, -3, -22, 3, 1, hx, 0, false);
        B(c, 2, -31, 1, 3, hx, 0, false);
        break;
      case "spiky":
        B(c, -6, -31, 3, 3, hx, 0.14, false);
        B(c, -2, -33, 3, 5, hx, 0.14, false);
        B(c, 2, -31, 3, 3, hx, 0.14, false);
        B(c, 5, -29, 3, 2, hx, 0.14, false);
        B(c, -8, -29, 3, 2, hx, 0.14, false);
        B(c, -7, -24, 1, 4, hx, 0.14, false);
        B(c, 6, -24, 1, 4, hx, 0.14, false);
        B(c, -6, -24, 3, 2, hx, 0, false);
        B(c, -1, -24, 3, 1, hx, 0, false);
        B(c, 3, -24, 3, 2, hx, 0, false);
        break;
      case "undercut":
        B(c, -6, -25, 10, 2, hx, 0.14, false);
        B(c, -1, -30, 8, 3, hl, 0.1, false);
        B(c, -7, -24, 1, 3, hd, 0, false);
        B(c, 6, -24, 1, 3, hd, 0, false);
        break;
      case "pompadour":
        B(c, -7, -32, 14, 5, hx, 0.14);
        B(c, -5, -31, 8, 1, hl, 0, false);
        B(c, -7, -24, 1, 5, hx, 0.14, false);
        B(c, 6, -24, 1, 5, hx, 0.14, false);
        B(c, -6, -24, 12, 1, hd, 0, false);
        break;
      case "ponytail":
        B(c, -7, -24, 1, 4, hx, 0.14, false);
        B(c, 6, -24, 1, 4, hx, 0.14, false);
        B(c, -6, -24, 12, 1, hx, 0.14, false);
        B(c, -4, -23, 3, 1, hx, 0, false);
        B(c, 5, -27, 3, 2, tie, 0, false);
        B(c, 6 + sway, -25, 3, 12, hx, 0.14, false);
        break;
      case "twintail":
        B(c, -7, -24, 1, 5, hx, 0.14, false);
        B(c, 6, -24, 1, 5, hx, 0.14, false);
        B(c, -6, -24, 12, 2, hx, 0.14, false);
        B(c, -10, -25, 3, 2, tie, 0, false);
        B(c, 7, -25, 3, 2, tie, 0, false);
        B(c, -10 + sway, -23, 3, 14, hx, 0.14, false);
        B(c, 7 - sway, -23, 3, 14, hx, 0.14, false);
        break;
      case "long":
        B(c, -8, -24, 3, 16, hx, 0.14, false);
        B(c, 5, -24, 3, 16, hx, 0.14, false);
        B(c, -6, -24, 12, 2, hx, 0.14, false);
        B(c, -1, -24, 2, 1, hd, 0, false);
        break;
      case "bun":
        B(c, -3, -34, 6, 6, hx, 0.14);
        B(c, -3, -29, 6, 1, tie, 0, false);
        B(c, -7, -24, 1, 4, hx, 0.14, false);
        B(c, 6, -24, 1, 4, hx, 0.14, false);
        B(c, -6, -24, 12, 2, hx, 0.14, false);
        B(c, -1, -22, 2, 1, hx, 0, false);
        break;
      case "braid":
        B(c, -7, -24, 1, 5, hx, 0.14, false);
        B(c, 6, -24, 1, 5, hx, 0.14, false);
        B(c, -6, -24, 12, 2, hx, 0.14, false);
        B(c, 5, -23, 3, 2, tie, 0, false);
        for (let i = 0; i < 5; i++) B(c, 5 + (i % 2) + sway, -21 + i * 3, 3, 3, i % 2 ? hx : hd, 0.1, false);
        B(c, 6 + sway, -6, 3, 1, tie, 0, false);
        break;
      case "curly":
        B(c, -9, -31, 18, 9, hx, 0.22);
        B(c, -9, -23, 3, 10, hx, 0.22, false);
        B(c, 6, -23, 3, 10, hx, 0.22, false);
        B(c, -6, -24, 12, 2, hx, 0.2, false);
        B(c, -7, -33, 4, 3, hx, 0.2, false);
        B(c, 3, -33, 4, 3, hx, 0.2, false);
        break;
      case "odango":
        B(c, -10, -33, 5, 5, hx, 0.14);
        B(c, 5, -33, 5, 5, hx, 0.14);
        B(c, -8, -28, 2, 1, tie, 0, false);
        B(c, 6, -28, 2, 1, tie, 0, false);
        B(c, -7, -24, 1, 5, hx, 0.14, false);
        B(c, 6, -24, 1, 5, hx, 0.14, false);
        B(c, -6, -24, 12, 2, hx, 0.14, false);
        break;
      case "wavy":
        wave(-8, -24, 16);
        wave(5, -24, 16);
        B(c, -6, -24, 12, 2, hx, 0.14, false);
        B(c, -2, -22, 2, 1, hx, 0, false);
        break;
    }
    return;
  }
  // ── side view (facing right) ──
  B(c, -7, -28, 14, 4, hx, 0.14);
  B(c, -5, -27, 6, 1, hl, 0, false);
  B(c, -7, -24, 6, bob ? 10 : swept ? 7 : 4, hx, 0.14);
  B(c, 1, -24, 5, bob ? 2 : 1, hx, 0.14, false);
  if (bob) B(c, 3, -22, 2, 1, hx, 0, false);
  if (swept) {
    B(c, 4, -23, 3, 2, hx, 0.14, false);
    B(c, 1, -31, 1, 3, hx, 0, false);
  }
  switch (style) {
    case "short":
      B(c, 0, -30, 3, 2, hx, 0.14, false);
      break;
    case "spiky":
      B(c, -5, -31, 3, 3, hx, 0.14, false);
      B(c, -1, -33, 3, 5, hx, 0.14, false);
      B(c, 3, -31, 3, 3, hx, 0.14, false);
      B(c, -9, -28, 3, 2, hx, 0.14, false);
      break;
    case "undercut":
      B(c, 0, -31, 8, 3, hl, 0.1, false);
      B(c, -7, -24, 3, 3, hd, 0, false);
      break;
    case "pompadour":
      B(c, -4, -32, 12, 5, hx, 0.14);
      B(c, -2, -31, 8, 1, hl, 0, false);
      break;
    case "ponytail":
      B(c, -9, -27, 3, 2, tie, 0, false);
      B(c, -11 + sway, -25, 4, 12, hx, 0.14, false);
      break;
    case "twintail":
      B(c, -9, -26, 3, 2, tie, 0, false);
      B(c, -11 + sway, -24, 4, 14, hx, 0.14, false);
      break;
    case "long":
      B(c, -9, -24, 6, 18, hx, 0.14, false);
      break;
    case "bun":
      B(c, -4, -34, 7, 6, hx, 0.14);
      B(c, -4, -29, 7, 1, tie, 0, false);
      break;
    case "braid":
      B(c, -9, -23, 3, 2, tie, 0, false);
      for (let i = 0; i < 5; i++) B(c, -10 + (i % 2) + sway, -21 + i * 3, 3, 3, i % 2 ? hx : hd, 0.1, false);
      break;
    case "curly":
      B(c, -9, -31, 17, 9, hx, 0.22);
      B(c, -9, -23, 6, 9, hx, 0.22, false);
      B(c, -7, -33, 4, 3, hx, 0.2, false);
      B(c, 1, -33, 4, 3, hx, 0.2, false);
      break;
    case "odango":
      B(c, -6, -33, 5, 5, hx, 0.14);
      B(c, -7, -28, 2, 1, tie, 0, false);
      break;
    case "wavy":
      wave(-9, -24, 16, 6);
      break;
  }
}

function face(c: Ctx, dir: number, tn: number) {
  const eye = (x: number) => {
    B(c, x, -22, 2, 3, "#2a2440", 0, false);
    c.fillStyle = IRIS;
    c.fillRect(x, -20, 2, 1);
    c.fillStyle = "#ffffff";
    c.fillRect(x, -22, 1, 1);
  };
  c.fillStyle = "#f0908a";
  if (dir === 0) {
    const e = tn;
    if (tn <= 0) eye(-4 + e);
    else {
      B(c, -3 + e, -22, 1, 3, "#2a2440", 0, false);
    }
    if (tn >= 0) eye(2 + e);
    else B(c, 2 + e, -22, 1, 3, "#2a2440", 0, false);
    c.fillStyle = "#f2988f";
    c.fillRect(-5 + e, -18, 2, 1);
    c.fillRect(3 + e, -18, 2, 1);
    c.fillStyle = "#7a5a46";
    c.fillRect(-4 + e, -23, 2, 1);
    c.fillRect(2 + e, -23, 2, 1);
    c.fillStyle = "#a8584a";
    c.fillRect(-1 + e, -17, 2, 1);
  } else {
    eye(2);
    c.fillStyle = "#f2988f";
    c.fillRect(3, -18, 2, 1);
    c.fillStyle = "#7a5a46";
    c.fillRect(2, -23, 2, 1);
    c.fillStyle = "#a8584a";
    c.fillRect(4, -17, 2, 1);
  }
}

function headgear(c: Ctx, p: ActorParts, dir: number) {
  const side = dir === 1 || dir === 2;
  const jl = JOB_LOOK[p.job ?? ""];
  const u = p.upper ?? jl?.hat;
  if (u?.hat === "headband" || u?.hat === "bandana") {
    const th = u.hat === "bandana" ? 3 : 1;
    B(c, -7, -27 + (th === 3 ? 0 : 1), 14, th, u.tint, 0, false);
    if (dir === 3) B(c, -2, -25, 3, 5, u.tint, 0, false);
    if (side) B(c, -10, -26, 4, 4, u.tint, 0, false);
  } else if (u?.hat === "hood") {
    if (dir === 0) {
      B(c, -8, -31, 16, 6, u.tint, 0.1);
      B(c, -8, -25, 3, 10, u.tint, 0.1);
      B(c, 5, -25, 3, 10, u.tint, 0.1);
    } else if (dir === 3) B(c, -8, -31, 16, 17, u.tint, 0.1);
    else {
      B(c, -8, -31, 16, 6, u.tint, 0.1);
      B(c, -8, -25, 8, 11, u.tint, 0.1);
    }
  } else if (u?.hat === "helm") {
    B(c, -7, -31, 14, 7, "#aeb8c4", 0.08);
    B(c, -7, -26, 14, 1, "#7a8290", 0, false);
    if (dir === 0) B(c, -1, -25, 2, 5, "#9aa4b0", 0, false);
    B(c, -1, -36, 2, 5, u.tint, 0.05, false);
    B(c, side ? -3 : -1, -36, side ? 4 : 2, 2, u.tint, 0, false);
  }
  if (u?.hat === "wizard") {
    B(c, -10, -27, 20, 2, u.tint, 0.1);
    B(c, -6, -33, 12, 7, shade(u.tint, 0.05), 0.1);
    B(c, -4, -38, 8, 5, shade(u.tint, 0.08), 0.1);
    B(c, -1, -42, 5, 4, shade(u.tint, 0.1), 0.1);
    B(c, 2, -44, 3, 2, shade(u.tint, 0.1), 0.1, false);
    B(c, -6, -29, 12, 2, "#e4b15a", 0, false);
  } else if (u?.hat === "cap" || u?.hat === "feather") {
    B(c, -7, -30, 14, 5, u.tint, 0.1);
    if (dir === 0) B(c, -7, -25, 14, 1, shade(u.tint, -0.3), 0, false);
    else if (side) B(c, 2, -25, 7, 1, shade(u.tint, -0.3), 0, false);
    if (u.hat === "feather") {
      B(c, 4, -36, 1, 7, "#e4b15a", 0, false);
      B(c, 5, -35, 1, 4, "#f6d68a", 0, false);
    }
  } else if (u?.hat === "circlet") {
    B(c, -7, -24, 14, 1, u.tint, 0, false);
    if (dir === 0) B(c, -1, -26, 2, 3, "#ffffff", 0, false);
  } else if (u?.hat === "brim") {
    B(c, -11, -26, 22, 2, u.tint, 0.1);
    B(c, -5, -33, 10, 7, shade(u.tint, 0.05), 0.1);
    B(c, -5, -28, 10, 1, shade(u.tint, -0.3), 0, false);
  }
  const m = p.mid ?? jl?.mid;
  if (m?.hat === "glasses" && dir !== 3) {
    c.fillStyle = m.tint;
    if (dir === 0) {
      c.fillRect(-5, -23, 5, 1);
      c.fillRect(-5, -19, 5, 1);
      c.fillRect(-5, -22, 1, 3);
      c.fillRect(-1, -22, 1, 3);
      c.fillRect(1, -23, 5, 1);
      c.fillRect(1, -19, 5, 1);
      c.fillRect(1, -22, 1, 3);
      c.fillRect(5, -22, 1, 3);
      c.fillRect(0, -21, 1, 1);
    } else {
      c.fillRect(1, -23, 5, 1);
      c.fillRect(1, -19, 5, 1);
      c.fillRect(1, -22, 1, 3);
      c.fillRect(5, -22, 1, 3);
      c.fillRect(-6, -22, 7, 1);
    }
  } else if (m?.hat === "mask" && dir !== 3) {
    B(c, dir === 0 ? -6 : 0, -23, dir === 0 ? 12 : 6, 4, m.tint, 0, false);
    c.fillStyle = "#fff";
    if (dir === 0) {
      c.fillRect(-4, -22, 2, 1);
      c.fillRect(2, -22, 2, 1);
    } else c.fillRect(2, -22, 2, 1);
  }
  const l = p.lower;
  if (l?.hat === "ribbon") {
    if (dir === 0 || dir === 3) {
      B(c, -10, -25, 4, 4, l.tint, 0.1);
      B(c, 6, -25, 4, 4, l.tint, 0.1);
    } else B(c, -9, -25, 4, 4, l.tint, 0.1);
  }
}

function weapon(c: Ctx, w: NonNullable<ActorParts["weapon"]>, x: number, y: number, ang: number, xs: number, pull = 0, glow = 0, nock = false) {
  const kind = w.weapon;
  const hi = shade(w.tint, 0.3);
  const ca = Math.cos(rad(ang));
  const sa = Math.sin(rad(ang));
  if (kind === "bow") {
    // stave bulges forward; string runs tip to tip and is drawn back by `pull`
    const wood = "#a8743a";
    const nx = x - pull * 6 * Math.abs(xs);
    const sgn = xs < 0 ? -1 : 1;
    for (let i = -9; i <= 9; i++) {
      const bx = x + (2 - Math.round((i * i) / 36)) * xs * (Math.abs(xs) < 0.6 ? 1.6 : 1);
      B(c, bx, y + i, 1, 1, i % 4 === 0 ? shade(wood, -0.2) : wood, 0, false);
    }
    c.fillStyle = "#e6e6e6";
    for (let i = 0; i <= 9; i++) {
      const t = i / 9;
      const sx = lerp(x, nx, 1 - t);
      c.fillRect(Math.round(sx), Math.round(y - 9 + i), 1, 1);
      c.fillRect(Math.round(sx), Math.round(y + 9 - i), 1, 1);
    }
    if (nock) {
      line(c, nx, y, 0, 13, 1, "#c9b48a", xs * sgn);
      c.fillStyle = "#dfe6ee";
      c.fillRect(Math.round(nx + 13 * xs), Math.round(y - 1), 1, 3);
      c.fillStyle = w.tint;
      c.fillRect(Math.round(nx + 1 * xs), Math.round(y - 1), 2, 1);
      c.fillRect(Math.round(nx + 1 * xs), Math.round(y + 1), 2, 1);
    }
  } else if (kind === "spear") {
    line(c, x - ca * 12 * xs, y - sa * 12, ang, 46, 1, "#8a6238", xs);
    const tx = x + ca * 32 * xs;
    const ty = y + sa * 32;
    line(c, tx, ty, ang, 8, 3, "#d5d9e0", xs, 0);
    line(c, tx, ty, ang, 8, 1, "#ffffff", xs, 1);
    line(c, x + ca * 28 * xs, y + sa * 28, ang, 3, 2, w.tint, xs);
  } else if (kind === "mace") {
    line(c, x - ca * 3 * xs, y - sa * 3, ang, 16, 2, "#7a5632", xs);
    const tx = x + ca * 13 * xs;
    const ty = y + sa * 13;
    B(c, tx - 3, ty - 3, 6, 6, w.tint, 0.1);
    c.fillStyle = hi;
    c.fillRect(Math.round(tx - 2), Math.round(ty - 2), 2, 2);
    c.fillStyle = "#4a4f58";
    c.fillRect(Math.round(tx - 4), Math.round(ty - 1), 1, 2);
    c.fillRect(Math.round(tx + 3), Math.round(ty - 1), 1, 2);
  } else if (kind === "axe") {
    line(c, x - ca * 3 * xs, y - sa * 3, ang, 20, 2, "#7a5632", xs);
    const tx = x + ca * 15 * xs;
    const ty = y + sa * 15;
    B(c, tx - 1, ty - 4, 7, 8, w.tint, 0.08);
    c.fillStyle = hi;
    c.fillRect(Math.round(tx + 3), Math.round(ty - 3), 2, 6);
    c.fillStyle = "#4a4f58";
    c.fillRect(Math.round(tx - 2), Math.round(ty - 1), 2, 3);
  } else if (kind === "katar") {
    line(c, x, y, ang, 3, 3, "#5c3a28", xs, 0);
    line(c, x + ca * 3 * xs, y + sa * 3, ang, 13, 3, "#cfd6de", xs, 0);
    line(c, x + ca * 3 * xs, y + sa * 3, ang, 13, 1, "#f2f6fa", xs, 1);
    line(c, x + ca * 2 * xs - sa * 3 * xs, y + sa * 2 + ca * 3, ang, 8, 1, "#aeb8c4", xs);
    line(c, x + ca * 2 * xs + sa * 3 * xs, y + sa * 2 - ca * 3, ang, 8, 1, "#aeb8c4", xs);
  } else if (kind === "knuckle") {
    B(c, x - 2, y - 2, 5, 5, w.tint, 0.08);
    c.fillStyle = hi;
    c.fillRect(Math.round(x + 2), Math.round(y - 2), 1, 1);
    c.fillRect(Math.round(x + 2), Math.round(y + 1), 1, 1);
    c.fillStyle = "#4a4f58";
    c.fillRect(Math.round(x + 3 * xs), Math.round(y - 1), 1, 3);
  } else if (kind === "harp") {
    line(c, x - ca * 6 * xs, y - sa * 6, ang, 18, 1, "#7a5632", xs);
    const bx = x + ca * 8 * xs;
    const by = y + sa * 8;
    B(c, bx - 3, by - 4, 7, 9, w.tint, 0.1);
    c.fillStyle = hi;
    c.fillRect(Math.round(bx - 2), Math.round(by - 3), 2, 7);
    c.fillStyle = "#f4efe0";
    c.fillRect(Math.round(bx), Math.round(by - 3), 1, 7);
    if (glow > 0.3) {
      c.fillStyle = `rgba(255,220,255,${glow * 0.7})`;
      c.fillRect(Math.round(bx + 5), Math.round(by - 4), 2, 2);
      c.fillRect(Math.round(bx + 7), Math.round(by - 7), 2, 2);
      c.fillRect(Math.round(bx + 4), Math.round(by - 8), 1, 3);
    }
  } else if (kind === "staff") {
    line(c, x - ca * 7 * xs, y - sa * 7, ang, 36, 2, "#7a5632", xs);
    const tx = x + ca * 28 * xs;
    const ty = y + sa * 28;
    if (glow > 0) {
      c.fillStyle = `rgba(255,255,255,${0.18 + glow * 0.3})`;
      const r = 5 + Math.round(glow * 3);
      c.fillRect(Math.round(tx - r), Math.round(ty - 1), r * 2, 2);
      c.fillRect(Math.round(tx - 1), Math.round(ty - r), 2, r * 2);
      c.fillStyle = w.tint;
      c.fillRect(Math.round(tx - r + 1), Math.round(ty - r + 1), 2, 2);
      c.fillRect(Math.round(tx + r - 3), Math.round(ty + r - 3), 2, 2);
    }
    B(c, tx - 3, ty - 3, 6, 6, glow > 0.4 ? shade(w.tint, 0.35) : w.tint, 0.1);
    c.fillStyle = "#fff";
    c.fillRect(Math.round(tx - 2), Math.round(ty - 2), 2, 1);
  } else {
    const len = kind === "dagger" ? 10 : 18;
    line(c, x, y, ang, 4, 2, "#5c3a28", xs, 0);
    const gx = x + ca * 4 * xs;
    const gy = y + sa * 4;
    line(c, gx - Math.cos(rad(ang + 90)) * 3 * xs, gy - Math.sin(rad(ang + 90)) * 3, ang + 90, 7, 1, "#d2a23a", xs);
    line(c, gx, gy, ang, len, 3, "#cfd6de", xs, 0);
    line(c, gx, gy, ang, len, 1, kind === "dagger" ? "#eef2f6" : hi, xs, 1);
  }
}

function shield(c: Ctx, s: NonNullable<ActorParts["shield"]>, x: number, y: number) {
  B(c, x, y, 6, 9, s.tint, 0.1);
  B(c, x + 2, y + 1, 2, 7, shade(s.tint, 0.3), 0, false);
}

const REST: Record<string, number> = { sword: -55, dagger: -40, staff: -85, bow: -90, mace: -55, axe: -55, spear: -75, katar: -40, knuckle: -35, harp: -70 };

type Pose = { hand?: number; rest?: number; ang: number; bend: number; lunge: number; wang?: number; far?: number; pull: number; glow: number; nock: boolean };

/** Per-weapon attack animation. Release moments match the damage timing in sim.ts. */
function poseFor(wk0: string, a: number): Pose {
  const wk = wk0 === "spear" || wk0 === "katar" || wk0 === "knuckle" ? "dagger" : wk0 === "harp" ? "staff" : wk0;
  const base = atkPose(a);
  if (a < 0 || (wk !== "bow" && wk !== "staff" && wk !== "dagger")) return { ...base, pull: 0, glow: 0, nock: false };
  if (wk === "bow") {
    const REL = 0.55;
    if (a < REL) {
      const up = ease(Math.min(1, a / 0.16));
      const dr = ease(Math.max(0, (a - 0.14) / (REL - 0.14)));
      return { ang: lerp(90, -2, up), bend: 0, lunge: -dr, far: a < 0.14 ? lerp(90, 0, ease(a / 0.14)) : lerp(0, -158, dr), hand: dr, rest: 0, pull: dr, glow: 0, nock: a > 0.1 };
    }
    const r = ease((a - REL) / (1 - REL));
    const snap = Math.max(0, 1 - (a - REL) / 0.08);
    return { ang: a < 0.72 ? -2 : lerp(-2, 90, ease((a - 0.72) / 0.28)), bend: 0, lunge: lerp(1.5, 0, r), far: lerp(-170, 90, ease(Math.min(1, (a - REL) / 0.3))), hand: 1 + snap * 0.25, rest: ease(Math.max(0, (a - 0.7) / 0.3)), pull: 0, glow: 0, nock: false };
  }
  if (wk === "staff") {
    if (a < 0.3) {
      const e = ease(a / 0.3);
      return { ang: lerp(90, -70, e), bend: 0, wang: lerp(-85, -128, e), lunge: -e * 0.6, pull: 0, glow: e * 0.3, nock: false };
    }
    if (a < 0.52) {
      const e = ease((a - 0.3) / 0.22);
      return { ang: lerp(-70, -8, e), bend: 0, wang: lerp(-128, -12, e), lunge: lerp(-0.6, 2, e), pull: 0, glow: 0.3 + e * 0.7, nock: false };
    }
    const e = ease((a - 0.52) / 0.48);
    return { ang: lerp(-8, 90, e), bend: 0, wang: lerp(-12, -85, e), lunge: lerp(2, 0, e), pull: 0, glow: Math.max(0, 1 - e * 1.6), nock: false };
  }
  // dagger: cock back, quick stab, recover
  if (a < 0.25) {
    const e = ease(a / 0.25);
    return { ang: lerp(90, 150, e), bend: 0, wang: lerp(-40, -12, e), lunge: -e, pull: 0, glow: 0, nock: false };
  }
  if (a < 0.45) {
    const e = ease((a - 0.25) / 0.2);
    return { ang: lerp(150, 0, e), bend: 0, wang: lerp(-12, 0, e), lunge: lerp(-1, 3, e), pull: 0, glow: 0, nock: false };
  }
  if (a < 0.58) return { ang: 0, bend: 0, wang: 0, lunge: 3, pull: 0, glow: 0, nock: false };
  const e = ease((a - 0.58) / 0.42);
  return { ang: lerp(0, 90, e), bend: 0, wang: lerp(0, -40, e), lunge: lerp(3, 0, e), pull: 0, glow: 0, nock: false };
}

type JobLook = {
  shirt: string;
  pants: string;
  robe?: string;
  hat?: { hat: string; tint: string };
  mid?: { hat: string; tint: string };
  pads?: string;
  quiver?: boolean;
  scarf?: string;
};

const JOB_LOOK: Record<string, JobLook> = {
  swordman: { shirt: "#b8433a", pants: "#4a3a30", pads: "#aeb8c4", hat: { hat: "headband", tint: "#d03030" } },
  knight: { shirt: "#8c93a3", pants: "#3a3f4a", pads: "#d4dae4", hat: { hat: "helm", tint: "#c33a3a" } },
  crusader: { shirt: "#e8eaf2", pants: "#2f4a8c", pads: "#d2a23a", hat: { hat: "helm", tint: "#3a5ab0" }, scarf: "#2f4a8c" },
  mage: { shirt: "#5a4fb0", pants: "#3b3482", robe: "#4b3fa0", hat: { hat: "wizard", tint: "#4a44b8" } },
  wizard: { shirt: "#2a2f7a", pants: "#1f2358", robe: "#262b72", hat: { hat: "wizard", tint: "#232866" } },
  sage: { shirt: "#2f7a64", pants: "#245a4a", robe: "#2a6e5a", hat: { hat: "brim", tint: "#2f7a64" }, mid: { hat: "glasses", tint: "#222222" } },
  archer: { shirt: "#4f8a3a", pants: "#6a5236", quiver: true, hat: { hat: "feather", tint: "#3f7a34" } },
  hunter: { shirt: "#3a6a3a", pants: "#5a4630", quiver: true, hat: { hat: "hood", tint: "#4a5a32" } },
  bard: { shirt: "#a84a9a", pants: "#3a2a5a", hat: { hat: "feather", tint: "#c04ab0" }, scarf: "#e4b15a" },
  acolyte: { shirt: "#f1ead8", pants: "#cfc4a8", robe: "#e8e0c8" },
  priest: { shirt: "#f6f6fa", pants: "#d8d8e4", robe: "#f2f2f8", hat: { hat: "circlet", tint: "#e4b15a" } },
  monk: { shirt: "#e8923a", pants: "#7a4a20", hat: { hat: "headband", tint: "#f4f0e8" } },
  thief: { shirt: "#4a4f58", pants: "#2e3138", hat: { hat: "bandana", tint: "#8a3a3a" } },
  assassin: { shirt: "#1f2228", pants: "#15171b", hat: { hat: "hood", tint: "#22252b" }, mid: { hat: "mask", tint: "#2a2d34" } },
  rogue: { shirt: "#6a5a3a", pants: "#3a4a2a", hat: { hat: "bandana", tint: "#2f6a4a" } },
  merchant: { shirt: "#b87a3a", pants: "#5a4630", hat: { hat: "cap", tint: "#c9a43a" } },
  blacksmith: { shirt: "#8a5a3a", pants: "#3a3a3a", pads: "#6a6e76", hat: { hat: "cap", tint: "#5a5a62" }, mid: { hat: "glasses", tint: "#9aa4b0" } },
  alchemist: { shirt: "#f0f0f4", pants: "#4a4a6a", robe: "#eeeef4", mid: { hat: "glasses", tint: "#e4b15a" }, hat: { hat: "cap", tint: "#7aa0c8" } },
};

/**
 * Paint the player/NPC into the scratch buffer and blit it with the feet at the
 * current transform origin. dir: 0 front, 1 left, 2 right, 3 back; turn = -1/+1
 * gives the 3/4 diagonal views. phase = walk cycle (radians), amt = 0..1 movement,
 * atk = attack progress (or -1).
 */
export function drawBlockActor(
  ctx: Ctx,
  dir: number,
  phase: number,
  amt: number,
  style: string,
  hairCol: string,
  trimCol: string,
  parts: ActorParts,
  sit: boolean,
  flash: number,
  atk: number,
  time: number,
  turn = 0,
) {
  const { c } = scratch();
  const side = dir === 1 || dir === 2;
  const front = dir === 0;
  const s = sit ? 0 : Math.sin(phase) * amt;
  const wk = parts.weapon?.weapon ?? "sword";
  const pose = poseFor(wk, atk);
  const jl = JOB_LOOK[parts.job ?? ""];
  const shirt = parts.armor ? parts.armor.tint : jl ? jl.shirt : trimCol;
  const sy = sit ? 4 : 0;
  const PANTS = jl?.pants ?? PANTS0;
  const idle = Math.sin(time * 2.2) > 0.8 && amt < 0.1 ? 1 : 0;
  const yb = sit ? 0 : -Math.round(Math.abs(Math.cos(phase)) * amt * 1.2);
  const lunge = Math.round(pose.lunge);
  const restAng = REST[wk] ?? -55;
  const shoe = parts.shoes?.tint ?? "#5a4632";
  const LH = sit ? 4 : 7;
  const sway = Math.round(Math.sin(phase - 1) * amt * 1.6);
  if (dir === 1) c.scale(-1, 1);

  const belt = (x: number, w: number) => {
    B(c, x, -8, w, 1, "#3a2818", 0, false);
    if (w > 5) B(c, x + Math.floor(w / 2) - 1, -8, 2, 1, "#e4b15a", 0, false);
  };

  if (!side) {
    const tn = turn;
    const liftL = sit ? 0 : Math.round(Math.max(0, s) * 2.2);
    const liftR = sit ? 0 : Math.round(Math.max(0, -s) * 2.2);
    const stride = tn && !sit ? Math.round(s * 2) * tn : 0;
    const lxA = -4 + tn + Math.max(0, -stride);
    const lxB = 0 + tn + Math.min(0, -stride);
    B(c, lxA, -LH - liftL, 4, LH - 2, PANTS, 0.1);
    B(c, lxB, -LH - liftR, 4, LH - 2, shade(PANTS, -0.06), 0.1);
    B(c, lxA, -2 - liftL, 4, 2, shoe, 0.1);
    B(c, lxB, -2 - liftR, 4, 2, shoe, 0.1);
    if (front) {
      B(c, lxA, -1 - liftL, 5, 1, shade(shoe, -0.25), 0, false);
      B(c, lxB, -1 - liftR, 5, 1, shade(shoe, -0.25), 0, false);
    }
    c.save();
    c.translate(0, sy + yb + idle);
    if (jl?.quiver && front) B(c, 3 + tn * 2, -19, 2, 6, "#6b4a2b", 0, false);
    const nearX = tn * 5.5;
    const farX = -tn * 2.5;
    const wpnX = tn === 0 ? (front ? 5.5 : -5.5) : front ? (tn > 0 ? nearX : farX) : tn > 0 ? farX : nearX;
    const othX = tn === 0 ? (front ? -5.5 : 5.5) : front ? (tn > 0 ? farX : nearX) : tn > 0 ? nearX : farX;
    const xs = tn ? 0.7 : 0.35;
    const armO = atk >= 0 && pose.far !== undefined ? pose.far : sit ? 90 : 90 + s * 14;
    const rightAng = atk >= 0 ? pose.ang : sit ? 90 : 90 - s * 14;
    const wpnIsNear = tn === 0 || (front ? tn > 0 : tn < 0);
    if (tn) limbPx(c, wpnIsNear ? othX : wpnX, -14, wpnIsNear ? armO : rightAng, 8, 3, shade(shirt, -0.2), shade(SKIN, -0.12), 0.45, xs);
    const tw = tn ? 6 : 8;
    const tx0 = tn ? -3 + tn : -4;
    B(c, tx0, -15, tw, 8, shirt, 0.12);
    B(c, tx0, -9, tw, 2, shade(shirt, -0.18), 0.08, false);
    belt(tx0, tw);
    if (front) {
      B(c, tx0 + tw / 2 - 2, -15, 4, 1, shade(shirt, 0.3), 0, false);
      B(c, tx0 + tw / 2 - 1, -14, 2, 1, shade(shirt, 0.18), 0, false);
    }
    if (parts.armor) {
      B(c, tx0 + 1, -14, tw - 2, 1, shade(shirt, 0.25), 0, false);
      B(c, tx0 + tw / 2 - 1, -12, 2, 4, shade(shirt, 0.15), 0, false);
    }
    if (tn) {
      limbPx(c, wpnIsNear ? wpnX : othX, -14, wpnIsNear ? rightAng : armO, 8, 3, shirt, SKIN, 0.45, xs);
    } else {
      limbPx(c, othX, -14, armO, 8, 3, shirt, SKIN, 0.45, xs);
      limbPx(c, wpnX, -14, rightAng, 8, 3, shirt, SKIN, 0.45, xs);
    }
    if (parts.armor || jl?.pads) {
      const pc = parts.armor ? shade(shirt, 0.25) : jl!.pads!;
      B(c, -7 + tn, -15, 3, 2, pc, 0.05);
      B(c, 4 + tn, -15, 3, 2, pc, 0.05);
    }
    if (jl?.robe) {
      B(c, tx0 - 1, -9, tw + 2, 7, jl.robe, 0.12);
      B(c, tx0 + tw / 2 - 1, -9, 2, 7, shade(jl.robe, 0.2), 0, false);
      B(c, tx0 - 1, -3, tw + 2, 1, "#e4b15a", 0, false);
    }
    if (jl?.quiver && dir === 3) {
      B(c, -2 + tn, -20, 5, 11, "#6b4a2b", 0.1);
      B(c, -2 + tn, -22, 1, 2, "#e8e8e8", 0, false);
      B(c, 0 + tn, -23, 1, 3, "#e8e8e8", 0, false);
      B(c, 2 + tn, -22, 1, 2, "#e8e8e8", 0, false);
    }
    if (parts.garment) {
      if (dir === 3) B(c, tx0 - 1, -15, tw + 2, 16 + Math.round(amt), parts.garment.tint, 0.14);
      else B(c, tx0 - 1, -15, tw + 2, 2, parts.garment.tint, 0.1);
    }
    if (parts.lower?.hat === "scarf") B(c, tx0 - 1, -16, tw + 2, 3, parts.lower.tint, 0.1, false);
    else if (jl?.scarf) B(c, tx0 - 1, -16, tw + 2, 2, jl.scarf, 0.1, false);
    c.save();
    c.translate(tn, 0);
    B(c, -6, -26, 12, 11, SKIN, 0.08);
    B(c, -6, -16, 12, 1, SKIN_D, 0, false);
    if (front) face(c, 0, tn);
    hair(c, style, hairCol, dir, sway);
    headgear(c, parts, dir);
    c.restore();
    if (parts.weapon) {
      const ex = wpnX + Math.cos(rad(rightAng)) * 8 * xs;
      const ey = -14 + Math.sin(rad(rightAng)) * 8;
      weapon(c, parts.weapon, ex, ey, pose.wang ?? rightAng + (restAng - 90) * (atk >= 0 ? pose.bend : 1), xs, pose.pull, pose.glow, false);
    }
    if (parts.shield) shield(c, parts.shield, (front ? -11 : 5) + (tn ? tn * 2 : 0), -13);
    if (parts.acc && front) B(c, -1 + tn * 2, -12, 2, 2, parts.acc, 0, false);
    c.restore();
  } else {
    const legF = sit ? 90 : 90 + s * 34;
    const legB = sit ? 90 : 90 - s * 34;
    limbPx(c, 0, -LH, legB, LH + 1, 4, shade(PANTS, -0.1), shade(shoe, -0.1), 0.72);
    limbPx(c, 0, -LH, legF, LH + 1, 4, PANTS, shoe, 0.72);
    c.save();
    c.translate(lunge, sy + yb + idle);
    if (parts.garment) {
      const flow = Math.round(amt * 2 + (lunge < 0 ? 1 : 0));
      B(c, -4 - flow, -15, 2 + flow, 16, parts.garment.tint, 0.14);
    }
    const farAng = sit ? 90 : 90 - s * 36;
    const bowDraw = atk >= 0 && wk === "bow" && pose.hand !== undefined;
    if (!bowDraw) limbPx(c, 0, -13, farAng, 8, 3, shade(shirt, -0.2), shade(SKIN, -0.12), 0.45);
    if (jl?.quiver) {
      B(c, -6, -19, 3, 9, "#6b4a2b", 0.1, false);
      B(c, -6, -21, 1, 2, "#e8e8e8", 0, false);
      B(c, -4, -22, 1, 3, "#e8e8e8", 0, false);
    }
    B(c, -3, -15, 5, 8, shirt, 0.12);
    B(c, -3, -9, 5, 2, shade(shirt, -0.18), 0.08, false);
    belt(-3, 5);
    if (parts.shield) shield(c, parts.shield, -2, -13);
    const nearAng = atk >= 0 ? pose.ang : sit ? 90 : 90 + s * (parts.weapon ? 18 : 36);
    limbPx(c, 0, -13, nearAng, 8, 3, shirt, SKIN, 0.45);
    if (bowDraw) {
      const hd = pose.hand ?? 0;
      const rs = pose.rest ?? 0;
      const tx = lerp(8 - 6 * hd, 0, rs);
      const ty = lerp(-13, -5, rs);
      const dx = tx - 0;
      const dy = ty + 13;
      const d = Math.max(2, Math.min(9.6, Math.hypot(dx, dy)));
      const base = Math.atan2(dy, dx);
      const off = Math.acos(Math.min(1, d / 10));
      const upA = (base - off) * (180 / Math.PI);
      const ex2 = Math.cos(rad(upA)) * 5;
      const ey2 = -13 + Math.sin(rad(upA)) * 5;
      const loA = Math.atan2(ty - ey2, tx - ex2) * (180 / Math.PI);
      limbPx(c, 0, -13, upA, 5, 3, shirt, shirt, 0.5);
      limbPx(c, ex2, ey2, loA, 5, 3, shirt, SKIN, 0.3);
    }
    if (parts.armor || jl?.pads) B(c, -2, -15, 3, 2, parts.armor ? shade(shirt, 0.25) : jl!.pads!, 0.05);
    if (jl?.robe) B(c, -4, -9, 7, 7, jl.robe, 0.12);
    if (parts.weapon) {
      const ex = Math.cos(rad(nearAng)) * 8;
      const ey = -13 + Math.sin(rad(nearAng)) * 8;
      weapon(c, parts.weapon, ex, ey, pose.wang ?? nearAng + (restAng - 90) * (atk >= 0 ? pose.bend : 1), 1, pose.pull, pose.glow, pose.nock);
    }
    if (parts.lower?.hat === "scarf") B(c, -4, -16, 6, 3, parts.lower.tint, 0.1, false);
    B(c, -6, -26, 12, 11, SKIN, 0.08);
    B(c, -6, -16, 12, 1, SKIN_D, 0, false);
    face(c, 2, 0);
    hair(c, style, hairCol, 2, sway);
    headgear(c, parts, 2);
    c.restore();
  }
  castShadowScratch(ctx);
  blitScratch(ctx, flash);
}

// re-exports used by draw.ts
export { blit, mk };
