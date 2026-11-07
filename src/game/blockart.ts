// Block (Minecraft-style) props, buildings and the humanoid actor.
// All painted in texel space — see blocky.ts.

import { B, PX, atkPose, blit, blitScratch, castShadowScratch, hash, lerp, limbPx, line, mk, rad, scratch, shade, sprite } from "@/game/blocky";

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

// ── Chibi humanoid actor ────────────────────────────────────────────────
// Big-head proportions: legs 7, torso 8, head 12 wide x 11 tall (~28 texels).

const IRIS = "#3b3a8c";

function hair(c: Ctx, style: string, hx: string, dir: number) {
  const hd = shade(hx, -0.16);
  const hl = shade(hx, 0.22);
  const bob = style === "bob";
  const swept = style === "swept";
  if (dir === 3) {
    B(c, -7, -28, 14, bob ? 14 : swept ? 11 : 9, hx, 0.14);
    B(c, -5, -27, 6, 1, hl, 0, false);
    B(c, -7, bob ? -15 : swept ? -18 : -20, 14, 1, hd, 0, false);
    if (style === "short") B(c, -3, -30, 3, 2, hx, 0.14, false);
    return;
  }
  if (dir === 0) {
    B(c, -7, -28, 14, 4, hx, 0.14);
    B(c, -5, -27, 6, 1, hl, 0, false);
    if (bob) {
      B(c, -7, -24, 2, 10, hx, 0.14, false);
      B(c, 5, -24, 2, 10, hx, 0.14, false);
      B(c, -5, -24, 4, 2, hx, 0.14, false);
      B(c, 1, -24, 4, 2, hx, 0.14, false);
      B(c, -5, -22, 2, 1, hx, 0, false);
      B(c, 3, -22, 2, 1, hx, 0, false);
      B(c, -1, -24, 2, 1, hd, 0, false);
    } else if (style === "short") {
      B(c, -7, -24, 1, 4, hx, 0.14, false);
      B(c, 6, -24, 1, 4, hx, 0.14, false);
      B(c, -6, -24, 12, 1, hx, 0.14, false);
      B(c, -3, -30, 3, 2, hx, 0.14, false);
      B(c, 1, -29, 3, 1, hl, 0, false);
      B(c, -4, -23, 2, 1, hx, 0, false);
      B(c, 2, -23, 2, 1, hx, 0, false);
    } else {
      B(c, -7, -24, 2, 8, hx, 0.14, false);
      B(c, 5, -24, 2, 4, hx, 0.14, false);
      B(c, -6, -24, 9, 3, hx, 0.14, false);
      B(c, 3, -24, 3, 1, hx, 0.14, false);
      B(c, -3, -22, 3, 1, hx, 0, false);
      B(c, 2, -31, 1, 3, hx, 0, false);
    }
    return;
  }
  // side (facing right)
  B(c, -7, -28, 14, 4, hx, 0.14);
  B(c, -5, -27, 6, 1, hl, 0, false);
  B(c, -7, -24, 6, bob ? 10 : swept ? 7 : 4, hx, 0.14);
  B(c, 1, -24, 5, bob ? 2 : 1, hx, 0.14, false);
  if (bob) B(c, 3, -22, 2, 1, hx, 0, false);
  if (swept) {
    B(c, 4, -23, 3, 2, hx, 0.14, false);
    B(c, 1, -31, 1, 3, hx, 0, false);
  }
  if (style === "short") B(c, 0, -30, 3, 2, hx, 0.14, false);
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
  const u = p.upper;
  if (u?.hat === "cap" || u?.hat === "feather") {
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
  const m = p.mid;
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

function weapon(c: Ctx, w: NonNullable<ActorParts["weapon"]>, x: number, y: number, ang: number, xs: number) {
  const kind = w.weapon;
  const hi = shade(w.tint, 0.3);
  const ca = Math.cos(rad(ang));
  const sa = Math.sin(rad(ang));
  if (kind === "bow") {
    line(c, x, y + 8, -90, 18, 1, "#7a5632", xs);
    line(c, x + 2 * xs, y + 8, -90, 18, 1, "#e6e6e6", xs);
    c.fillStyle = w.tint;
    c.fillRect(Math.round(x), Math.round(y - 10), 1, 2);
  } else if (kind === "staff") {
    line(c, x - ca * 7 * xs, y - sa * 7, ang, 36, 2, "#7a5632", xs);
    const tx = x + ca * 28 * xs;
    const ty = y + sa * 28;
    B(c, tx - 3, ty - 3, 6, 6, w.tint, 0.1);
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

const REST: Record<string, number> = { sword: -55, dagger: -40, staff: -85, bow: -90 };

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
  const shirt = parts.armor ? parts.armor.tint : trimCol;
  const sy = sit ? 4 : 0;
  const pose = atkPose(atk);
  const idle = Math.sin(time * 2.2) > 0.8 && amt < 0.1 ? 1 : 0;
  const yb = sit ? 0 : -Math.round(Math.abs(Math.cos(phase)) * amt * 1.2);
  const lunge = Math.round(pose.lunge);
  const wk = parts.weapon?.weapon ?? "sword";
  const restAng = REST[wk] ?? -55;
  const shoe = parts.shoes?.tint ?? "#5a4632";
  const LH = sit ? 4 : 7;
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
    const nearX = tn * 5.5;
    const farX = -tn * 2.5;
    const wpnX = tn === 0 ? (front ? 5.5 : -5.5) : front ? (tn > 0 ? nearX : farX) : tn > 0 ? farX : nearX;
    const othX = tn === 0 ? (front ? -5.5 : 5.5) : front ? (tn > 0 ? farX : nearX) : tn > 0 ? nearX : farX;
    const xs = tn ? 0.7 : 0.35;
    const armO = sit ? 90 : 90 + s * 14;
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
    if (parts.armor) {
      B(c, -7 + tn, -15, 3, 2, shade(shirt, 0.25), 0.05);
      B(c, 4 + tn, -15, 3, 2, shade(shirt, 0.25), 0.05);
    }
    if (parts.garment) {
      if (dir === 3) B(c, tx0 - 1, -15, tw + 2, 16 + Math.round(amt), parts.garment.tint, 0.14);
      else B(c, tx0 - 1, -15, tw + 2, 2, parts.garment.tint, 0.1);
    }
    if (parts.lower?.hat === "scarf") B(c, tx0 - 1, -16, tw + 2, 3, parts.lower.tint, 0.1, false);
    c.save();
    c.translate(tn, 0);
    B(c, -6, -26, 12, 11, SKIN, 0.08);
    B(c, -6, -16, 12, 1, SKIN_D, 0, false);
    if (front) face(c, 0, tn);
    hair(c, style, hairCol, dir);
    headgear(c, parts, dir);
    c.restore();
    if (parts.weapon) {
      const ex = wpnX + Math.cos(rad(rightAng)) * 8 * xs;
      const ey = -14 + Math.sin(rad(rightAng)) * 8;
      weapon(c, parts.weapon, ex, ey, rightAng + (restAng - 90) * (atk >= 0 ? pose.bend : 1), xs);
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
    limbPx(c, 0, -13, farAng, 8, 3, shade(shirt, -0.2), shade(SKIN, -0.12), 0.45);
    B(c, -3, -15, 5, 8, shirt, 0.12);
    B(c, -3, -9, 5, 2, shade(shirt, -0.18), 0.08, false);
    belt(-3, 5);
    if (parts.shield) shield(c, parts.shield, -2, -13);
    const nearAng = atk >= 0 ? pose.ang : sit ? 90 : 90 + s * (parts.weapon ? 18 : 36);
    limbPx(c, 0, -13, nearAng, 8, 3, shirt, SKIN, 0.45);
    if (parts.armor) B(c, -2, -15, 3, 2, shade(shirt, 0.25), 0.05);
    if (parts.weapon) {
      const ex = Math.cos(rad(nearAng)) * 8;
      const ey = -13 + Math.sin(rad(nearAng)) * 8;
      weapon(c, parts.weapon, ex, ey, nearAng + (restAng - 90) * (atk >= 0 ? pose.bend : 1), 1);
    }
    if (parts.lower?.hat === "scarf") B(c, -4, -16, 6, 3, parts.lower.tint, 0.1, false);
    B(c, -6, -26, 12, 11, SKIN, 0.08);
    B(c, -6, -16, 12, 1, SKIN_D, 0, false);
    face(c, 2, 0);
    hair(c, style, hairCol, 2);
    headgear(c, parts, 2);
    c.restore();
  }
  castShadowScratch(ctx);
  blitScratch(ctx, flash);
}

// re-exports used by draw.ts
export { blit, mk };
