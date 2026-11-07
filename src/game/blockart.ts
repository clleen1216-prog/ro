// Block (Minecraft-style) props, buildings and the humanoid actor.
// All painted in texel space — see blocky.ts.

import { B, PX, blit, blitScratch, hash, mk, scratch, shade, sprite } from "@/game/blocky";

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
};

const SKIN = "#e0ac82";
const SKIN_D = "#c98f66";
const PANTS = "#3a4a8c";
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

// ── Humanoid actor ──────────────────────────────────────────────────────

function hair(c: Ctx, style: string, hx: string, dir: number) {
  const hd = shade(hx, -0.12);
  if (dir === 3) {
    B(c, -4, -32, 8, 8, hx, 0.14);
    if (style === "bob") B(c, -4, -24, 8, 3, hx, 0.14);
    return;
  }
  if (dir === 0) {
    B(c, -4, -32, 8, 3, hx, 0.14);
    if (style === "bob") {
      B(c, -4, -29, 1, 6, hx, 0.14, false);
      B(c, 3, -29, 1, 6, hx, 0.14, false);
      B(c, -3, -29, 6, 1, hd, 0.1, false);
    } else if (style === "short") {
      B(c, -4, -29, 1, 2, hx, 0.14, false);
      B(c, 3, -29, 1, 2, hx, 0.14, false);
    } else {
      B(c, -4, -29, 4, 1, hx, 0.14, false);
      B(c, -4, -29, 1, 3, hx, 0.14, false);
      B(c, 3, -29, 1, 2, hx, 0.14, false);
    }
    return;
  }
  // side (facing right)
  B(c, -4, -32, 8, 3, hx, 0.14);
  B(c, -4, -29, 3, style === "bob" ? 7 : style === "swept" ? 5 : 3, hx, 0.14);
  if (style === "swept") B(c, 2, -30, 2, 2, hx, 0.14, false);
}

function headgear(c: Ctx, p: ActorParts, dir: number) {
  const u = p.upper;
  if (u?.hat === "cap" || u?.hat === "feather") {
    B(c, -5, -35, 10, 4, u.tint, 0.1);
    if (dir !== 3) B(c, dir === 0 ? -5 : 1, -31, dir === 0 ? 10 : 5, 1, shade(u.tint, -0.2), 0, false);
    if (u.hat === "feather") {
      B(c, 3, -40, 1, 6, "#e4b15a", 0, false);
      B(c, 4, -39, 1, 3, "#f6d68a", 0, false);
    }
  } else if (u?.hat === "circlet") {
    B(c, -5, -31, 10, 1, u.tint, 0, false);
    if (dir === 0) B(c, -1, -32, 2, 2, "#fff", 0, false);
  } else if (u?.hat === "brim") {
    B(c, -8, -31, 16, 2, u.tint, 0.1);
    B(c, -4, -36, 8, 5, shade(u.tint, 0.05), 0.1);
  }
  const m = p.mid;
  if (m?.hat === "glasses" && dir !== 3) {
    c.fillStyle = m.tint;
    if (dir === 0) {
      c.fillRect(-4, -29, 3, 1);
      c.fillRect(1, -29, 3, 1);
      c.fillRect(-4, -28, 1, 1);
      c.fillRect(-1, -28, 1, 1);
      c.fillRect(1, -28, 1, 1);
      c.fillRect(3, -28, 1, 1);
      c.fillRect(-1, -29, 2, 1);
    } else {
      c.fillRect(0, -29, 4, 1);
      c.fillRect(0, -28, 1, 1);
      c.fillRect(3, -28, 1, 1);
    }
  } else if (m?.hat === "mask" && dir !== 3) {
    B(c, dir === 0 ? -4 : 0, -29, dir === 0 ? 8 : 4, 2, m.tint, 0, false);
  }
  const l = p.lower;
  if (l?.hat === "scarf") B(c, -5, -25, 10, 2, l.tint, 0.1, false);
  if (l?.hat === "ribbon") {
    B(c, -7, -30, 3, 3, l.tint, 0, false);
    B(c, 4, -30, 3, 3, l.tint, 0, false);
  }
}

function weapon(c: Ctx, w: NonNullable<ActorParts["weapon"]>, x: number, y: number, k: number) {
  const kind = w.weapon;
  if (kind === "bow") {
    B(c, x - 1, y - 13 - k, 1, 14, "#6b442c", 0, false);
    B(c, x, y - 15 - k, 1, 2, "#6b442c", 0, false);
    B(c, x, y + 1 - k, 1, 2, "#6b442c", 0, false);
    B(c, x + 2, y - 13 - k, 1, 14, "#ddd", 0, false);
    B(c, x + 1, y - 15 - k, 1, 1, w.tint, 0, false);
  } else if (kind === "staff") {
    B(c, x, y - 22 - k, 2, 28, "#6b442c", 0.1, false);
    B(c, x - 1, y - 27 - k, 4, 5, w.tint, 0.1);
    B(c, x, y - 26 - k, 1, 1, "#fff", 0, false);
  } else if (kind === "dagger") {
    B(c, x, y - 9 - k, 2, 8, "#d6dce4", 0.06, false);
    B(c, x - 1, y - 2 - k, 4, 1, w.tint, 0, false);
    B(c, x, y - 1 - k, 2, 3, "#5c3a28", 0, false);
  } else {
    B(c, x, y - 17 - k, 2, 15, "#d6dce4", 0.06, false);
    B(c, x + 1, y - 17 - k, 1, 15, shade(w.tint, 0.05), 0.1, false);
    B(c, x - 2, y - 3 - k, 6, 1, "#d2a23a", 0, false);
    B(c, x, y - 2 - k, 2, 4, "#5c3a28", 0, false);
  }
}

function shield(c: Ctx, s: NonNullable<ActorParts["shield"]>, x: number, y: number) {
  B(c, x, y, 5, 8, s.tint, 0.1);
  B(c, x + 2, y + 1, 1, 6, shade(s.tint, 0.3), 0, false);
}

/**
 * Paint the player/NPC into the scratch buffer and blit it with the feet at the
 * current transform origin. dir: 0 front, 1 left, 2 right, 3 back.
 */
export function drawBlockActor(
  ctx: Ctx,
  dir: number,
  frame: number,
  style: string,
  hairCol: string,
  trimCol: string,
  parts: ActorParts,
  sit: boolean,
  flash: number,
  swing: number,
) {
  const { c } = scratch();
  const s = [-1, 0, 1, 0][frame & 3] ?? 0;
  const k = Math.round(swing * 4);
  const shirt = parts.armor ? parts.armor.tint : trimCol;
  const sy = sit ? 6 : 0;
  const side = dir === 1 || dir === 2;
  if (dir === 1) c.scale(-1, 1);

  if (!side) {
    // legs
    const lL = sit ? 0 : s > 0 ? 2 * s : 0;
    const lR = sit ? 0 : s < 0 ? -2 * s : 0;
    const lh = sit ? 6 : 12;
    B(c, -4, -lh - lL, 4, lh, PANTS, 0.1);
    B(c, 0, -lh - lR, 4, lh, shade(PANTS, -0.06), 0.1);
    if (parts.shoes) {
      B(c, -4, -3 - lL, 4, 3, parts.shoes.tint, 0.1);
      B(c, 0, -3 - lR, 4, 3, parts.shoes.tint, 0.1);
    } else {
      B(c, -4, -2 - lL, 4, 2, "#4a4a52", 0.1, false);
      B(c, 0, -2 - lR, 4, 2, "#4a4a52", 0.1, false);
    }
    c.save();
    c.translate(0, sy);
    // cape behind (back view draws it over the body)
    if (parts.garment && dir === 3) {
      // drawn after body below
    }
    // body
    B(c, -4, -24, 8, 12, shirt, 0.12);
    B(c, -4, -14, 8, 2, shade(shirt, -0.3), 0, false);
    if (parts.armor) {
      B(c, -3, -23, 6, 1, shade(shirt, 0.25), 0, false);
      B(c, -1, -20, 2, 6, shade(shirt, 0.15), 0, false);
    }
    // arms (swing opposite legs)
    const aL = sit ? 0 : s < 0 ? -1 : s > 0 ? 1 : 0;
    const aR = sit ? 0 : s > 0 ? -1 : s < 0 ? 1 : 0;
    const armL = dir === 0 ? -8 : -8;
    B(c, armL, -24 + aL, 4, 4, shirt, 0.1);
    B(c, armL, -20 + aL, 4, 8, SKIN, 0.1);
    B(c, 4, -24 + aR - (k > 0 && parts.weapon ? k : 0), 4, 4, shirt, 0.1);
    B(c, 4, -20 + aR - (k > 0 && parts.weapon ? k : 0), 4, 8, SKIN, 0.1);
    if (parts.garment) {
      if (dir === 3) B(c, -4, -24, 8, 19, parts.garment.tint, 0.14);
      else B(c, -5, -24, 10, 2, parts.garment.tint, 0.1);
    }
    if (parts.lower?.hat === "scarf" && dir === 3) B(c, -5, -25, 10, 2, parts.lower.tint, 0.1, false);
    // head
    B(c, -4, -32, 8, 8, SKIN, 0.1);
    B(c, -4, -25, 8, 1, SKIN_D, 0, false);
    if (dir === 0) {
      c.fillStyle = "#ffffff";
      c.fillRect(-3, -29, 2, 1);
      c.fillRect(1, -29, 2, 1);
      c.fillStyle = "#3a2a4a";
      c.fillRect(-2, -29, 1, 1);
      c.fillRect(1, -29, 1, 1);
      c.fillStyle = "#b8704a";
      c.fillRect(-1, -26, 2, 1);
    }
    hair(c, style, hairCol, dir);
    headgear(c, parts, dir);
    // held items
    if (parts.weapon) weapon(c, parts.weapon, dir === 3 ? -7 : 6, -12 + aR, Math.max(0, k));
    if (parts.shield) shield(c, parts.shield, dir === 3 ? 4 : -10, -21);
    if (parts.acc && dir === 0) B(c, -1, -21, 2, 2, parts.acc, 0, false);
    c.restore();
  } else {
    // side view, facing right
    const legF = sit ? 2 : 3 * s;
    const legB = sit ? 2 : -3 * s;
    const lh = sit ? 6 : 12;
    B(c, -2 + legB, -lh - (legB > 0 ? 1 : 0), 4, lh, shade(PANTS, -0.1), 0.1);
    B(c, -2 + legF, -lh - (legF > 0 ? 1 : 0), 4, lh, PANTS, 0.1);
    const shoe = parts.shoes?.tint ?? "#4a4a52";
    B(c, -2 + legB, -2, 5, 2, shade(shoe, -0.1), 0.1, false);
    B(c, -2 + legF, -2, 5, 2, shoe, 0.1, false);
    c.save();
    c.translate(0, sy);
    if (parts.garment) B(c, -4, -24, 2, 19, parts.garment.tint, 0.14);
    // far arm
    B(c, -2 + (sit ? 0 : -2 * s), -24, 4, 4, shade(shirt, -0.12), 0.1);
    B(c, -2 + (sit ? 0 : -2 * s), -20, 4, 8, shade(SKIN, -0.1), 0.1);
    B(c, -2, -24, 4, 12, shirt, 0.12);
    B(c, -2, -14, 4, 2, shade(shirt, -0.3), 0, false);
    if (parts.shield) shield(c, parts.shield, -1, -21);
    // near arm
    const ax = sit ? 0 : 2 * s + (k > 0 ? 1 : 0);
    B(c, -2 + ax, -24 - (k > 0 ? k : 0), 4, 4, shirt, 0.1);
    B(c, -2 + ax, -20 - (k > 0 ? k : 0), 4, 8, SKIN, 0.1);
    if (parts.weapon) weapon(c, parts.weapon, 1 + ax + 2, -12 - (k > 0 ? 0 : 0), Math.max(0, k));
    if (parts.lower?.hat === "scarf") B(c, -3, -25, 6, 2, parts.lower.tint, 0.1, false);
    B(c, -4, -32, 8, 8, SKIN, 0.1);
    B(c, -4, -25, 8, 1, SKIN_D, 0, false);
    c.fillStyle = "#ffffff";
    c.fillRect(1, -29, 2, 1);
    c.fillStyle = "#3a2a4a";
    c.fillRect(2, -29, 1, 1);
    c.fillStyle = "#b8704a";
    c.fillRect(3, -26, 1, 1);
    hair(c, style, hairCol, 2);
    headgear(c, parts, 2);
    c.restore();
  }
  blitScratch(ctx, flash);
}

// re-exports used by draw.ts
export { blit, mk };
