import { images } from "@/game/assets";
import { drawCreature, hasLook } from "@/game/creatures";
import { ITEMS, MONSTERS, TILE, getMap, trimHex, type ItemDef } from "@/game/content";
import { getLook } from "@/game/looks";
import type { Dir, GearSlot, IconKind, Player } from "@/game/types";
import { world } from "@/game/world";

const GROUND = ["grass", "cobble", "dirt", "water"] as const;
const PROC_BASE: Record<number, string> = { 4: "#dcc48c", 5: "#5c586f", 6: "#3d7646" };
const MINI_COL: Record<number, string> = { 0: "#3e7a48", 1: "#cbb892", 2: "#b08958", 3: "#3d8fd1", 4: "#d8c08a", 5: "#5c586f", 6: "#2f5e3a" };

function hash2(x: number, y: number, i: number) {
  let h = (x * 374761393 + y * 668265263 + i * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function paintProcTile(g: CanvasRenderingContext2D, tile: number, dx: number, dy: number, tx: number, ty: number) {
  if (tile === 6 && images.grass) {
    g.drawImage(images.grass, dx, dy, TILE + 0.6, TILE + 0.6);
    g.fillStyle = "rgba(8,44,22,0.42)";
    g.fillRect(dx, dy, TILE + 0.6, TILE + 0.6);
    return;
  }
  g.fillStyle = PROC_BASE[tile] ?? "#6ea86a";
  g.fillRect(dx, dy, TILE + 0.6, TILE + 0.6);
  const n = tile === 5 ? 4 : 9;
  for (let i = 0; i < n; i++) {
    const px = dx + hash2(tx, ty, i) * (TILE - 4);
    const py = dy + hash2(tx, ty, i + 40) * (TILE - 4);
    const light = hash2(tx, ty, i + 80) > 0.5;
    g.fillStyle = tile === 4 ? (light ? "rgba(255,244,210,0.45)" : "rgba(150,110,50,0.22)") : tile === 5 ? (light ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.16)") : light ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";
    if (tile === 4) {
      g.beginPath();
      g.ellipse(px, py, 6 + hash2(tx, ty, i + 9) * 8, 1.6, 0, 0, Math.PI * 2);
      g.fill();
    } else g.fillRect(px, py, 3 + hash2(tx, ty, i + 5) * 5, 3);
  }
  if (tile === 5) {
    g.strokeStyle = "rgba(10,8,24,0.45)";
    g.lineWidth = 1.5;
    g.strokeRect(dx + 0.75, dy + 0.75, TILE - 1.5, TILE - 1.5);
    if (hash2(tx, ty, 99) > 0.8) {
      g.beginPath();
      g.moveTo(dx + 8, dy + 10);
      g.lineTo(dx + 22, dy + 24);
      g.lineTo(dx + 18, dy + 38);
      g.stroke();
    }
  }
}

let groundKey = "";
let groundCanvas: HTMLCanvasElement | null = null;
let miniKey = "";
let miniCanvas: HTMLCanvasElement | null = null;
let leadX = 0;
let leadY = 0;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawItemIcon(ctx: CanvasRenderingContext2D, item: ItemDef, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(20,24,32,0.35)";
  roundRect(ctx, 0, 0, s, s, s * 0.16);
  ctx.fill();
  ctx.translate(s * 0.5, s * 0.52);
  const k = s / 32;
  ctx.scale(k, k);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#2a2118";
  ctx.fillStyle = item.tint;
  paintIcon(ctx, item.icon);
  ctx.restore();
}

function paintIcon(ctx: CanvasRenderingContext2D, kind: IconKind) {
  const fill = ctx.fillStyle;
  if (kind === "cap" || kind === "feather") {
    ctx.beginPath();
    ctx.ellipse(0, -2, 8, 6, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-10, -2, 20, 3);
    if (kind === "feather") {
      ctx.strokeStyle = "#e4b15a";
      ctx.beginPath();
      ctx.moveTo(4, -8);
      ctx.quadraticCurveTo(12, -16, 8, -2);
      ctx.stroke();
    }
  } else if (kind === "circlet") {
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 5, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -4, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "brim") {
    ctx.beginPath();
    ctx.moveTo(-12, 4);
    ctx.lineTo(0, -12);
    ctx.lineTo(12, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-8, 4, 16, 3);
  } else if (kind === "glasses") {
    ctx.strokeStyle = String(fill);
    ctx.beginPath();
    ctx.arc(-5, 0, 4, 0, Math.PI * 2);
    ctx.arc(5, 0, 4, 0, Math.PI * 2);
    ctx.moveTo(-1, 0);
    ctx.lineTo(1, 0);
    ctx.stroke();
  } else if (kind === "mask") {
    ctx.fillRect(-9, -3, 18, 7);
    ctx.fillStyle = "#f6f0e4";
    ctx.fillRect(-6, -1, 3, 2);
    ctx.fillRect(3, -1, 3, 2);
  } else if (kind === "scarf") {
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.quadraticCurveTo(0, 6, 10, -2);
    ctx.quadraticCurveTo(4, 8, -2, 10);
    ctx.fill();
  } else if (kind === "ribbon") {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-9, -6);
    ctx.lineTo(-5, 2);
    ctx.lineTo(0, 0);
    ctx.lineTo(9, -6);
    ctx.lineTo(5, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "sword" || kind === "knife") {
    ctx.fillRect(-1.2, -12, kind === "knife" ? 2 : 2.4, 16);
    ctx.fillRect(-5, 4, 10, 2);
    ctx.fillStyle = "#6b442c";
    ctx.fillRect(-1.4, 6, 2.8, 5);
  } else if (kind === "staff") {
    ctx.fillStyle = "#6b442c";
    ctx.fillRect(-1.2, -12, 2.4, 24);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(0, -12, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "bow") {
    ctx.strokeStyle = String(fill);
    ctx.beginPath();
    ctx.arc(2, 0, 10, Math.PI * 0.6, Math.PI * 1.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, -8);
    ctx.lineTo(2, 8);
    ctx.stroke();
  } else if (kind === "shield") {
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(9, -4);
    ctx.lineTo(7, 8);
    ctx.lineTo(0, 12);
    ctx.lineTo(-7, 8);
    ctx.lineTo(-9, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e4b15a";
    ctx.beginPath();
    ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "cape") {
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(8, -8);
    ctx.quadraticCurveTo(10, 8, 0, 12);
    ctx.quadraticCurveTo(-10, 8, -8, -8);
    ctx.fill();
  } else if (kind === "armor") {
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(8, -6);
    ctx.lineTo(6, 10);
    ctx.lineTo(-6, 10);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "boots") {
    ctx.fillRect(-7, -2, 5, 8);
    ctx.fillRect(2, -2, 5, 8);
    ctx.fillRect(-8, 6, 7, 3);
    ctx.fillRect(1, 6, 7, 3);
  } else if (kind === "ring") {
    ctx.beginPath();
    ctx.arc(0, 2, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "charm") {
    ctx.beginPath();
    ctx.arc(0, 2, 3, 0, Math.PI * 2);
    ctx.arc(-4, -1, 3, 0, Math.PI * 2);
    ctx.arc(4, -1, 3, 0, Math.PI * 2);
    ctx.arc(0, -4, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "potion" || kind === "ether") {
    ctx.fillStyle = "#efe6d2";
    ctx.fillRect(-2, -10, 4, 4);
    ctx.fillStyle = fill;
    roundRect(ctx, -5, -6, 10, 14, 3);
    ctx.fill();
  } else if (kind === "jelly") {
    ctx.beginPath();
    ctx.ellipse(0, 2, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "fluff") {
    ctx.beginPath();
    ctx.arc(-4, 2, 4, 0, Math.PI * 2);
    ctx.arc(3, 2, 5, 0, Math.PI * 2);
    ctx.arc(0, -2, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "apple") {
    ctx.beginPath();
    ctx.arc(-3, 2, 6, 0, Math.PI * 2);
    ctx.arc(3, 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4f8a38";
    ctx.fillRect(-0.8, -8, 1.8, 5);
    ctx.beginPath();
    ctx.ellipse(4, -6, 4, 2, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "herb") {
    ctx.strokeStyle = String(fill);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, -4);
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(-9, 2, -8, -6);
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(9, -2, 8, -10);
    ctx.stroke();
  } else if (kind === "bone") {
    ctx.save();
    ctx.rotate(-0.7);
    ctx.fillRect(-9, -2, 18, 4);
    ctx.beginPath();
    ctx.arc(-9, -3, 3, 0, Math.PI * 2);
    ctx.arc(-9, 3, 3, 0, Math.PI * 2);
    ctx.arc(9, -3, 3, 0, Math.PI * 2);
    ctx.arc(9, 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (kind === "claw") {
    ctx.beginPath();
    ctx.moveTo(-6, 10);
    ctx.quadraticCurveTo(-8, -6, 6, -10);
    ctx.quadraticCurveTo(0, -2, 2, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (kind === "plume") {
    ctx.beginPath();
    ctx.moveTo(-6, 10);
    ctx.quadraticCurveTo(-10, -4, 6, -11);
    ctx.quadraticCurveTo(10, 0, -6, 10);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6, 10);
    ctx.lineTo(3, -6);
    ctx.stroke();
  } else if (kind === "gem") {
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(9, -2);
    ctx.lineTo(0, 10);
    ctx.lineTo(-9, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.moveTo(-5, -3);
    ctx.lineTo(0, -8);
    ctx.lineTo(1, -3);
    ctx.fill();
  } else if (kind === "card") {
    roundRect(ctx, -7, -10, 14, 20, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#2a2118";
    ctx.fillRect(-4, -7, 8, 9);
    ctx.fillStyle = "#f6f0e4";
    ctx.fillRect(-4, 5, 8, 2);
  } else if (kind === "sting") {
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(4, 6);
    ctx.lineTo(-4, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (kind === "cloth") {
    ctx.fillRect(-9, -6, 18, 5);
    ctx.fillRect(-7, 0, 14, 5);
    ctx.fillRect(-9, 6, 18, 4);
    ctx.strokeRect(-9, -6, 18, 16);
  } else if (kind === "mucus") {
    ctx.beginPath();
    ctx.moveTo(-8, 6);
    ctx.quadraticCurveTo(-8, -8, 0, -9);
    ctx.quadraticCurveTo(8, -8, 8, 6);
    ctx.quadraticCurveTo(0, 10, -8, 6);
    ctx.fill();
    ctx.stroke();
  } else if (kind === "wingfly") {
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(-14, 2, -10, -9);
    ctx.quadraticCurveTo(-2, -4, 0, 8);
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(14, 2, 10, -9);
    ctx.quadraticCurveTo(2, -4, 0, 8);
    ctx.fill();
    ctx.stroke();
  } else if (kind === "wing") {
    ctx.beginPath();
    ctx.moveTo(-2, 4);
    ctx.quadraticCurveTo(-12, -2, -2, -10);
    ctx.quadraticCurveTo(2, -2, -2, 4);
    ctx.fill();
  } else {
    ctx.fillRect(-8, -2, 16, 6);
    ctx.fillRect(-3, -8, 6, 8);
  }
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number) {
  ctx.save();
  ctx.fillStyle = "rgba(20, 28, 22, 0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number) {
  shadow(ctx, x, y, 22);
  ctx.fillStyle = "#5c3a28";
  ctx.fillRect(x - 5, y - 34, 10, 36);
  ctx.fillStyle = "#3a2418";
  ctx.fillRect(x - 2, y - 34, 3, 36);
  const grass = images.grass;
  const puffs: [number, number, number][] = [
    [0, -58, 26],
    [-14, -46, 18],
    [15, -44, 16],
    [-2, -36, 12],
  ];
  for (const [ox, oy, r] of puffs) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
    ctx.clip();
    if (grass) {
      ctx.drawImage(grass, x + ox - r - 8, y + oy - r - 6, r * 2 + 16, r * 2 + 12);
      ctx.fillStyle = "rgba(12, 48, 24, 0.22)";
      ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    } else {
      ctx.fillStyle = "#2f6b45";
      ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
    ctx.restore();
  }
}

function drawBuilding(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number, w: number, h: number, hue?: string) {
  shadow(ctx, x, y, w * 0.38);
  const left = x - w / 2;
  const top = y - h;
  if (kind === "sanctum") {
    ctx.fillStyle = "#a33b32";
    ctx.beginPath();
    ctx.moveTo(left - 8, top + h * 0.42);
    ctx.lineTo(x, top);
    ctx.lineTo(left + w + 8, top + h * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e7d3a8";
    ctx.fillRect(left, top + h * 0.38, w, h * 0.62);
    ctx.fillStyle = "#c45c4a";
    ctx.beginPath();
    ctx.arc(x, top + h * 0.18, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f2e2a8";
    ctx.beginPath();
    ctx.arc(x, top + h * 0.55, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a2e22";
    roundRect(ctx, x - 14, y - h * 0.32, 28, h * 0.32, 8);
    ctx.fill();
    return;
  }
  if (kind === "arch") {
    const tw = w * 0.22;
    ctx.fillStyle = "#e7d3a8";
    ctx.fillRect(left, top + 16, tw, h - 16);
    ctx.fillRect(left + w - tw, top + 16, tw, h - 16);
    ctx.fillStyle = "#a33b32";
    ctx.fillRect(left - 4, top + 8, tw + 8, 14);
    ctx.fillRect(left + w - tw - 4, top + 8, tw + 8, 14);
    ctx.fillStyle = "#d7c59a";
    ctx.beginPath();
    ctx.moveTo(left + tw, top + h * 0.45);
    ctx.quadraticCurveTo(x, top + 10, left + w - tw, top + h * 0.45);
    ctx.lineTo(left + w - tw, top + h * 0.62);
    ctx.quadraticCurveTo(x, top + h * 0.28, left + tw, top + h * 0.62);
    ctx.fill();
    return;
  }
  if (kind === "stall") {
    ctx.fillStyle = "#6b442c";
    ctx.fillRect(left + 8, y - 28, w - 16, 28);
    ctx.fillStyle = hue ?? "#2f8f86";
    ctx.beginPath();
    ctx.moveTo(left, y - 30);
    ctx.lineTo(x, y - h);
    ctx.lineTo(left + w, y - 30);
    ctx.closePath();
    ctx.fill();
    return;
  }
  ctx.fillStyle = "#f3e6c8";
  ctx.fillRect(left, top + h * 0.34, w, h * 0.66);
  ctx.fillStyle = "#5c3a2a";
  ctx.fillRect(left + w * 0.18, top + h * 0.34, 6, h * 0.66);
  ctx.fillRect(left + w * 0.72, top + h * 0.34, 6, h * 0.66);
  ctx.fillStyle = "#a33b32";
  ctx.beginPath();
  ctx.moveTo(left - 6, top + h * 0.4);
  ctx.lineTo(x, top);
  ctx.lineTo(left + w + 6, top + h * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hue ?? "#2f8f6a";
  ctx.fillRect(left + 6, top + h * 0.46, w - 12, 16);
  ctx.fillStyle = "#9fd0ea";
  ctx.fillRect(left + w * 0.2, top + h * 0.62, w * 0.22, h * 0.16);
  ctx.fillStyle = "#4a2e22";
  ctx.fillRect(x - 10, y - h * 0.28, 20, h * 0.28);
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.font = "600 13px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(16, 18, 24, 0.85)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawGear(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: Dir,
  h: number,
  eq: Record<GearSlot, string | null>,
  behind: boolean,
  swing = 0,
) {
  const upper = eq.headUpper ? ITEMS[eq.headUpper] : undefined;
  const mid = eq.headMid ? ITEMS[eq.headMid] : undefined;
  const lower = eq.headLower ? ITEMS[eq.headLower] : undefined;
  const garment = eq.garment ? ITEMS[eq.garment] : undefined;
  const weapon = eq.weapon ? ITEMS[eq.weapon] : undefined;
  const shield = eq.shield ? ITEMS[eq.shield] : undefined;
  const shoes = eq.shoes ? ITEMS[eq.shoes] : undefined;
  const side = dir === 1 ? -1 : 1;
  if (behind && garment) {
    ctx.save();
    ctx.fillStyle = garment.tint;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.42, h * 0.22, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (behind) return;
  if (shoes) {
    ctx.fillStyle = shoes.tint;
    ctx.beginPath();
    ctx.ellipse(x - 7, y - 4, 6, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 7, y - 4, 6, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (weapon && dir !== 3) {
    drawWeapon(ctx, weapon, x + side * h * 0.24, y - h * 0.34, dir, swing);
  } else if (weapon && dir === 3) {
    drawWeapon(ctx, weapon, x + h * 0.18, y - h * 0.48, dir, swing);
  }
  if (shield) {
    ctx.save();
    ctx.translate(x - side * h * 0.22, y - h * 0.4);
    ctx.fillStyle = shield.tint;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, -2);
    ctx.lineTo(6, 10);
    ctx.lineTo(0, 14);
    ctx.lineTo(-6, 10);
    ctx.lineTo(-8, -2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  const hx = x + (dir === 1 ? -h * 0.04 : dir === 2 ? h * 0.04 : 0);
  const hy = y - h * 0.72;
  if (lower?.hat === "scarf") {
    ctx.fillStyle = lower.tint;
    ctx.beginPath();
    ctx.ellipse(hx, hy + h * 0.16, 11, 5, 0, 0, Math.PI);
    ctx.fill();
  }
  if (lower?.hat === "ribbon") {
    ctx.fillStyle = lower.tint;
    ctx.beginPath();
    ctx.arc(hx - 6, hy + h * 0.12, 4, 0, Math.PI * 2);
    ctx.arc(hx + 6, hy + h * 0.12, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (upper?.hat === "cap" || upper?.hat === "feather") {
    ctx.fillStyle = upper.tint;
    ctx.beginPath();
    ctx.ellipse(hx, hy, 12, 7, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(hx - 14, hy - 1, 28, 4);
    if (upper.hat === "feather") {
      ctx.strokeStyle = "#e4b15a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx + 6, hy - 4);
      ctx.quadraticCurveTo(hx + 16, hy - 18, hx + 8, hy);
      ctx.stroke();
    }
  } else if (upper?.hat === "circlet") {
    ctx.strokeStyle = upper.tint;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(hx, hy + 2, 11, 6, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else if (upper?.hat === "brim") {
    ctx.fillStyle = upper.tint;
    ctx.beginPath();
    ctx.moveTo(hx - 16, hy + 4);
    ctx.lineTo(hx, hy - 16);
    ctx.lineTo(hx + 16, hy + 4);
    ctx.closePath();
    ctx.fill();
  }
  if (mid?.hat === "glasses" || mid?.hat === "mask") {
    ctx.strokeStyle = mid.tint;
    ctx.fillStyle = mid.tint;
    ctx.lineWidth = 2;
    if (mid.hat === "glasses" && dir !== 3) {
      ctx.beginPath();
      ctx.arc(hx - 5, hy + 8, 3.5, 0, Math.PI * 2);
      ctx.arc(hx + 5, hy + 8, 3.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (mid.hat === "mask" && dir !== 3) {
      ctx.globalAlpha = 0.85;
      ctx.fillRect(hx - 10, hy + 5, 20, 6);
      ctx.globalAlpha = 1;
    }
  }
  if (eq.acc1 || eq.acc2) {
    ctx.fillStyle = eq.acc1 ? ITEMS[eq.acc1]!.tint : ITEMS[eq.acc2!]!.tint;
    ctx.beginPath();
    ctx.arc(hx + 10, hy + 10, 2.4, 0, Math.PI * 2);
    if (eq.acc1 && eq.acc2) ctx.arc(hx - 10, hy + 12, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWeapon(ctx: CanvasRenderingContext2D, item: ItemDef, x: number, y: number, dir: Dir, swing = 0) {
  ctx.save();
  ctx.translate(x, y);
  if (dir === 1) ctx.scale(-1, 1);
  ctx.rotate(swing * 0.9);
  ctx.fillStyle = item.tint;
  ctx.strokeStyle = "#2a2118";
  if (item.weapon === "bow") {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14, -1, 1);
    ctx.stroke();
  } else if (item.weapon === "staff") {
    ctx.fillStyle = "#6b442c";
    ctx.fillRect(-2, -16, 4, 32);
    ctx.fillStyle = item.tint;
    ctx.beginPath();
    ctx.arc(0, -16, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.rotate(-0.7);
    ctx.fillRect(-2, -16, 4, 22);
    ctx.fillStyle = "#e4b15a";
    ctx.fillRect(-6, 4, 12, 3);
  }
  ctx.restore();
}

function drawActor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: Dir,
  frame: number,
  style: Player["style"],
  hair: string,
  trim: string,
  eq: Record<GearSlot, string | null>,
  sit: boolean,
  flash: number,
  ox = 0,
  oy = 0,
  swing = 0,
) {
  const look = getLook(style, hair);
  if (!look) return;
  const h = sit ? 96 : 108;
  const row = dir;
  const px = x + ox;
  const py = y + oy;
  shadow(ctx, x, y, 16);
  drawGear(ctx, px, py + (sit ? 8 : 0), dir, h, eq, true, swing);
  const dw = h;
  const dh = h;
  const dx = px - dw / 2;
  const dy = py - dh + 8 + (sit ? 10 : 0);
  ctx.save();
  ctx.drawImage(look, frame * 96, row * 96, 96, 96, dx, dy, dw, dh);
  if (flash > 0) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.55;
    ctx.drawImage(look, frame * 96, row * 96, 96, 96, dx, dy, dw, dh);
  }
  ctx.restore();
  ctx.fillStyle = trimHex(trim);
  ctx.fillRect(px - 8, py - h * 0.34 + (sit ? 8 : 0), 16, 4);
  drawGear(ctx, px, py + (sit ? 8 : 0), dir, h, eq, false, swing);
}

function facingCell(kind: string, dir: Dir) {
  if (kind === "wasp") {
    if (dir === 1) return 2;
    if (dir === 2) return 1;
  }
  return dir;
}

function drawMonster(
  ctx: CanvasRenderingContext2D,
  kind: string,
  dir: Dir,
  anim: number,
  x: number,
  y: number,
  flash: number,
  moving: boolean,
  fx: { scaleX?: number; scaleY?: number; alpha?: number; lift?: number; rot?: number } = {},
) {
  const def = MONSTERS[kind];
  if (!def) return;
  const h = def.draw;
  const t = world.time + anim;
  const flyBob = def.fly ? Math.sin(t * 3.2) * 4 + 12 : 0;
  shadow(ctx, x, y, h * 0.22 * (def.fly ? 0.8 : 1) * (fx.alpha ?? 1));
  ctx.save();
  ctx.globalAlpha = fx.alpha ?? 1;
  if (hasLook(def.look)) {
    ctx.translate(x, y - (fx.lift ?? 0) - flyBob);
    if (fx.rot) ctx.rotate(fx.rot);
    ctx.scale(fx.scaleX ?? 1, fx.scaleY ?? 1);
    drawCreature(ctx, def.look, t, moving, dir, h, flash);
    ctx.restore();
    return;
  }
  const img = images[kind];
  if (!img) {
    ctx.restore();
    return;
  }
  const cell = img.width / 2;
  const pose = facingCell(kind, dir);
  const sx = (pose % 2) * cell;
  const sy = Math.floor(pose / 2) * cell;
  let oy = 0;
  let scx = 1;
  let scy = 1;
  if (kind === "hare") {
    const hop = moving ? Math.abs(Math.sin(anim * Math.PI)) * 12 : Math.sin(t * 2) * 1;
    oy = -hop;
    scy = 1 + (moving ? hop / 90 : 0);
    scx = 1 - (moving ? hop / 160 : 0);
  } else if (kind === "wasp") {
    oy = Math.sin(t * (moving ? 16 : 10)) * (moving ? 5 : 2.4);
  } else if (kind === "thorn") {
    scx = 1 + Math.sin(t * 1.7) * 0.04;
    oy = moving ? Math.abs(Math.sin(anim * 2)) * 2 : 0;
  } else {
    const b = Math.sin(t * 3.1);
    oy = b * (moving ? 3.2 : 2);
    scx = 1 + b * 0.05;
    scy = 1 - b * 0.045;
  }
  ctx.translate(x, y + oy - (fx.lift ?? 0));
  if (fx.rot) ctx.rotate(fx.rot);
  ctx.scale(scx * (fx.scaleX ?? 1), scy * (fx.scaleY ?? 1));
  ctx.drawImage(img, sx, sy, cell, cell, -h / 2, -h, h, h);
  if (flash > 0) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.65 * (fx.alpha ?? 1);
    ctx.drawImage(img, sx, sy, cell, cell, -h / 2, -h, h, h);
  }
  ctx.restore();
}

function updateCam(dt: number, cssW: number, cssH: number) {
  const map = getMap(world.mapId);
  const p = world.screen === "play" ? world.player : null;
  const moving = Boolean(p && p.speedInstant > 12 && p.downFor <= 0);
  let wantX = 0;
  let wantY = 0;
  if (moving && p) {
    if (p.dir === 1) wantX = -16;
    else if (p.dir === 2) wantX = 16;
    if (p.dir === 3) wantY = -12;
    else if (p.dir === 0) wantY = 10;
  }
  const lk = 1 - Math.exp(-3.2 * dt);
  leadX += (wantX - leadX) * lk;
  leadY += (wantY - leadY) * lk;
  const focus = p ? { x: p.x + leadX, y: p.y - 18 + leadY } : map.plaza;
  let dx = focus.x - cssW / 2;
  let dy = focus.y - cssH / 2;
  if (world.screen !== "play") {
    dx += Math.sin(world.time * 0.22) * 36;
    dy += Math.cos(world.time * 0.16) * 18;
  }
  dx = Math.max(0, Math.min(dx, Math.max(0, map.pxW - cssW)));
  dy = Math.max(0, Math.min(dy, Math.max(0, map.pxH - cssH)));
  const k = 1 - Math.exp(-11 * dt);
  world.cam.x += (dx - world.cam.x) * (world.screen === "play" ? k : 0.04);
  world.cam.y += (dy - world.cam.y) * (world.screen === "play" ? k : 0.04);
}

function bakedGround(map: ReturnType<typeof getMap>) {
  const pictured = Boolean(images.grass && images.cobble && images.dirt && images.water);
  const key = `${map.id}:${pictured ? 1 : 0}`;
  if (groundCanvas && groundKey === key) return groundCanvas;
  const c = document.createElement("canvas");
  c.width = map.pxW;
  c.height = map.pxH;
  const g = c.getContext("2d");
  if (!g) return null;
  for (let ty = 0; ty < map.rows; ty++) {
    for (let tx = 0; tx < map.cols; tx++) {
      const tile = map.ground[ty * map.cols + tx] ?? 0;
      const img = images[GROUND[tile] ?? "grass"];
      const dx = tx * TILE;
      const dy = ty * TILE;
      if (tile >= 4) paintProcTile(g, tile, dx, dy, tx, ty);
      else if (img) g.drawImage(img, dx, dy, TILE + 0.6, TILE + 0.6);
      else {
        g.fillStyle = tile === 3 ? "#3d8fd1" : tile === 1 ? "#cbb892" : tile === 2 ? "#b08958" : "#6ea86a";
        g.fillRect(dx, dy, TILE + 0.6, TILE + 0.6);
      }
    }
  }
  groundCanvas = c;
  groundKey = key;
  return c;
}

function bakedMini(map: ReturnType<typeof getMap>) {
  const key = map.id;
  if (miniCanvas && miniKey === key) return miniCanvas;
  const mw = 136;
  const mh = 104;
  const c = document.createElement("canvas");
  c.width = mw;
  c.height = mh;
  const g = c.getContext("2d");
  if (!g) return null;
  const sx = mw / map.pxW;
  const sy = mh / map.pxH;
  for (let ty = 0; ty < map.rows; ty++) {
    for (let tx = 0; tx < map.cols; tx++) {
      const tile = map.ground[ty * map.cols + tx] ?? 0;
      g.fillStyle = map.block[ty * map.cols + tx] && tile !== 3 ? "#2c2a34" : (MINI_COL[tile] ?? "#3e7a48");
      g.fillRect(tx * TILE * sx, ty * TILE * sy, Math.ceil(TILE * sx), Math.ceil(TILE * sy));
    }
  }
  miniCanvas = c;
  miniKey = key;
  return c;
}

export function renderFrame(canvas: HTMLCanvasElement, dt: number) {
  const cssW = world.viewW;
  const cssH = world.viewH;
  const ctx = canvas.getContext("2d");
  if (!ctx || cssW < 2 || cssH < 2) return;
  updateCam(dt, cssW, cssH);
  const dpr = world.dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = "#1a2a22";
  ctx.fillRect(0, 0, cssW, cssH);
  const map = getMap(world.mapId);
  const shakeX = (Math.random() - 0.5) * world.shake;
  const shakeY = (Math.random() - 0.5) * world.shake;
  world.shake = Math.max(0, world.shake - dt * 14);
  ctx.save();
  ctx.translate(-world.cam.x + shakeX, -world.cam.y + shakeY);

  const layer = bakedGround(map);
  if (layer) ctx.drawImage(layer, 0, 0);
  if (world.debug) {
    const x0 = Math.max(0, Math.floor(world.cam.x / TILE) - 1);
    const y0 = Math.max(0, Math.floor(world.cam.y / TILE) - 1);
    const x1 = Math.min(map.cols, Math.ceil((world.cam.x + cssW) / TILE) + 1);
    const y1 = Math.min(map.rows, Math.ceil((world.cam.y + cssH) / TILE) + 1);
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        if (!map.block[ty * map.cols + tx]) continue;
        ctx.fillStyle = "rgba(212,83,74,0.28)";
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
  }

  const viewL = world.cam.x - 140;
  const viewR = world.cam.x + cssW + 140;
  const viewT = world.cam.y - 260;
  const viewB = world.cam.y + cssH + 80;
  const drawers: { y: number; draw: () => void }[] = [];
  for (const prop of map.props) {
    if (prop.x < viewL || prop.x > viewR || prop.y < viewT || prop.y > viewB) continue;
    drawers.push({
      y: prop.y,
      draw: () => {
        if (prop.kind === "tree") drawTree(ctx, prop.x, prop.y);
        else if (prop.kind === "fountain" && images.fountain) {
          shadow(ctx, prop.x, prop.y, 40);
          const w = prop.w ?? 180;
          ctx.drawImage(images.fountain, prop.x - w / 2, prop.y - (prop.h ?? 170), w, prop.h ?? 170);
        } else if (prop.kind === "flower") {
          ctx.fillStyle = "#2f6b3a";
          ctx.fillRect(prop.x - 1, prop.y - 10, 2, 10);
          ctx.fillStyle = prop.hue ?? "#d4687a";
          ctx.beginPath();
          ctx.arc(prop.x, prop.y - 12, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (prop.kind === "lamp") {
          ctx.fillStyle = "#5c3a2a";
          ctx.fillRect(prop.x - 2, prop.y - 32, 4, 32);
          ctx.fillStyle = "rgba(228,177,90,0.35)";
          ctx.beginPath();
          ctx.arc(prop.x, prop.y - 34, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#e4b15a";
          ctx.beginPath();
          ctx.arc(prop.x, prop.y - 34, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (prop.kind === "cactus") {
          shadow(ctx, prop.x, prop.y, 14);
          const sway = Math.sin(world.time * 0.8 + prop.x) * 0.6;
          ctx.fillStyle = "#4f8a4a";
          ctx.strokeStyle = "#2a4a2a";
          ctx.lineWidth = 1.5;
          roundRect(ctx, prop.x - 6, prop.y - 46 + sway, 12, 46, 6);
          ctx.fill();
          ctx.stroke();
          roundRect(ctx, prop.x - 18, prop.y - 34 + sway, 8, 20, 4);
          ctx.fill();
          ctx.stroke();
          roundRect(ctx, prop.x + 10, prop.y - 40 + sway, 8, 22, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#e8d6a0";
          ctx.fillRect(prop.x - 1, prop.y - 38, 2, 2);
          ctx.fillRect(prop.x + 2, prop.y - 24, 2, 2);
        } else if (prop.kind === "tomb") {
          shadow(ctx, prop.x, prop.y, 17);
          ctx.fillStyle = "#8b879c";
          ctx.strokeStyle = "#2a2838";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(prop.x - 14, prop.y);
          ctx.lineTo(prop.x - 14, prop.y - 30);
          ctx.arc(prop.x, prop.y - 30, 14, Math.PI, 0);
          ctx.lineTo(prop.x + 14, prop.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#5a566c";
          ctx.fillRect(prop.x - 1.5, prop.y - 38, 3, 16);
          ctx.fillRect(prop.x - 6, prop.y - 33, 12, 3);
        } else if (prop.kind === "pillar") {
          shadow(ctx, prop.x, prop.y, 18);
          ctx.fillStyle = "#6e6a84";
          ctx.strokeStyle = "#2a2838";
          ctx.lineWidth = 2;
          ctx.fillRect(prop.x - 12, prop.y - 70, 24, 70);
          ctx.strokeRect(prop.x - 12, prop.y - 70, 24, 70);
          ctx.fillStyle = "#8b879c";
          ctx.fillRect(prop.x - 17, prop.y - 76, 34, 9);
          ctx.fillRect(prop.x - 16, prop.y - 8, 32, 8);
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.fillRect(prop.x + 3, prop.y - 68, 9, 60);
        } else if (prop.kind === "bones") {
          ctx.strokeStyle = "#e9e2cf";
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(prop.x - 9, prop.y - 3);
          ctx.lineTo(prop.x + 9, prop.y - 7);
          ctx.moveTo(prop.x - 6, prop.y - 9);
          ctx.lineTo(prop.x + 7, prop.y - 1);
          ctx.stroke();
          ctx.fillStyle = "#f2ecda";
          ctx.beginPath();
          ctx.arc(prop.x + 4, prop.y - 8, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#2a2118";
          ctx.fillRect(prop.x + 2, prop.y - 9, 1.6, 2);
          ctx.fillRect(prop.x + 5.4, prop.y - 9, 1.6, 2);
        } else if (prop.kind === "torch") {
          ctx.fillStyle = "#4a3a2a";
          ctx.fillRect(prop.x - 2, prop.y - 40, 4, 40);
          const fl = Math.sin(world.time * 14 + prop.x) * 2;
          ctx.save();
          const g2 = ctx.createRadialGradient(prop.x, prop.y - 46, 2, prop.x, prop.y - 46, 70);
          g2.addColorStop(0, "rgba(255,170,70,0.38)");
          g2.addColorStop(1, "rgba(255,170,70,0)");
          ctx.fillStyle = g2;
          ctx.fillRect(prop.x - 70, prop.y - 116, 140, 140);
          ctx.restore();
          ctx.fillStyle = "#ff9a3a";
          ctx.beginPath();
          ctx.ellipse(prop.x, prop.y - 46, 6, 10 + fl, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffe27a";
          ctx.beginPath();
          ctx.ellipse(prop.x, prop.y - 44, 3, 6 + fl * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (prop.kind === "rock") {
          ctx.fillStyle = "#8d8678";
          ctx.beginPath();
          ctx.ellipse(prop.x, prop.y - 6, 14, 8, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (prop.kind === "sign") {
          ctx.fillStyle = "#6b442c";
          ctx.fillRect(prop.x - 2, prop.y - 28, 4, 28);
          ctx.fillStyle = "#e7d3a8";
          roundRect(ctx, prop.x - 28, prop.y - 48, 56, 20, 3);
          ctx.fill();
          ctx.fillStyle = "#2a2118";
          ctx.font = "600 10px Outfit, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(prop.label ?? "", prop.x, prop.y - 35);
        } else {
          drawBuilding(ctx, prop.kind, prop.x, prop.y, prop.w ?? 120, prop.h ?? 100, prop.hue);
        }
      },
    });
  }

  for (const npc of map.npcs) {
    if (npc.x < viewL || npc.x > viewR || npc.y < viewT || npc.y > viewB) continue;
    drawers.push({
      y: npc.y,
      draw: () => {
        const bob = Math.sin(world.time * 1.7 + npc.x * 0.01) * 1.1;
        const eq: Record<GearSlot, string | null> = {
          headUpper: null,
          headMid: null,
          headLower: null,
          armor: null,
          weapon: null,
          shield: null,
          garment: null,
          shoes: null,
          acc1: null,
          acc2: null,
        };
        if (npc.cape) {
          ctx.save();
          ctx.fillStyle = npc.cape;
          ctx.beginPath();
          ctx.ellipse(npc.x, npc.y - 46, 22, 28, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        drawActor(ctx, npc.x, npc.y, 0, 1, npc.style, npc.hair, npc.trim, eq, false, 0, 0, -bob, 0);
        if (npc.hat) {
          const fake = ITEMS["sun-cap"];
          if (fake) {
            const standIn = { ...eq, headUpper: npc.hat === "cap" || npc.hat === "feather" || npc.hat === "circlet" || npc.hat === "brim" ? "sun-cap" : null };
            void standIn;
          }
          drawGear(
            ctx,
            npc.x,
            npc.y,
            0,
            108,
            {
              ...eq,
              headUpper:
                npc.hat === "cap"
                  ? "sun-cap"
                  : npc.hat === "circlet"
                    ? "laurel"
                    : npc.hat === "brim"
                      ? "arc-brim"
                      : npc.hat === "feather"
                        ? "finch-cap"
                        : null,
              headMid: npc.hat === "glasses" ? "spectacles" : npc.hat === "mask" ? "eye-mask" : null,
              headLower: npc.hat === "scarf" ? "soft-scarf" : npc.hat === "ribbon" ? "cheek-ribbon" : null,
            },
            false,
          );
        }
        label(ctx, npc.name, npc.x, npc.y - 116, "#f6f0e4");
        const p = world.player;
        const bang =
          (npc.role === "waykeeper" && p && p.quest !== "claimed") ||
          (npc.role === "job" && p && p.job === "novice" && p.baseLevel >= 4 && p.jobLevel >= 4);
        if (bang) {
          ctx.fillStyle = "#e4b15a";
          ctx.beginPath();
          ctx.arc(npc.x, npc.y - 132, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#2a2118";
          ctx.font = "700 12px Outfit, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("!", npc.x, npc.y - 128);
        }
      },
    });
  }

  for (const m of world.monsters) {
    if (!m.alive && m.dyingT <= 0) continue;
    if (m.x < viewL || m.x > viewR || m.y < viewT || m.y > viewB) continue;
    drawers.push({
      y: m.y,
      draw: () => {
        const def = MONSTERS[m.kind];
        if (!def) return;
        if (!m.alive) {
          // Death: spin a little, flatten, fade out.
          const k = 1 - m.dyingT / 0.6;
          drawMonster(ctx, m.kind, m.dir, m.anim, m.x, m.y, k < 0.25 ? 1 : 0, false, {
            alpha: 1 - k,
            scaleX: 1 + k * 0.35,
            scaleY: 1 - k * 0.8,
            rot: (m.dir === 1 ? -1 : 1) * k * 0.6,
            lift: Math.sin(k * Math.PI) * 14,
          });
          return;
        }
        const targeted = world.targetId === m.id;
        if (targeted) {
          const pulse = 1 + Math.sin(world.time * 6) * 0.06;
          ctx.strokeStyle = "#e4b15a";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(m.x, m.y, 20 * pulse + (def.boss ? 14 : 0), 8 * pulse + (def.boss ? 5 : 0), 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 1;
        }
        let lx = m.x;
        let ly = m.y;
        let sxs = 1;
        let sys = 1;
        const fwd = m.dir === 0 ? [0, 1] : m.dir === 3 ? [0, -1] : m.dir === 1 ? [-1, 0] : [1, 0];
        if (m.windup > 0) {
          // rear back and coil before the strike
          const k = 1 - m.windup / 0.28;
          lx -= fwd[0]! * k * 7;
          ly -= fwd[1]! * k * 7;
          sxs = 1 + k * 0.1;
          sys = 1 - k * 0.12;
        } else if (m.lunge > 0) {
          const k = Math.sin((m.lunge / 0.2) * Math.PI * 0.5);
          lx += fwd[0]! * k * 24;
          ly += fwd[1]! * k * 24;
          sxs = 1 - k * 0.08;
          sys = 1 + k * 0.1;
        }
        const pop = m.spawnT > 0 ? 1 - m.spawnT / 0.5 : 1;
        const e = pop < 1 ? 1 - Math.pow(1 - pop, 3) : 1;
        drawMonster(ctx, m.kind, m.dir, m.anim, lx, ly, m.hurt, m.moving, {
          scaleX: sxs * (0.4 + 0.6 * e) * (1 + (m.hurt > 0 ? 0.08 : 0)),
          scaleY: sys * (0.4 + 0.6 * e) * (1 - (m.hurt > 0 ? 0.08 : 0)),
          alpha: Math.min(1, 0.3 + e),
        });
        const top = m.y - def.draw - (def.fly ? 18 : 0);
        label(ctx, `${def.boss ? "★ " : ""}${def.name}`, m.x, top - 6, def.boss ? "#ffd86a" : "#f6f0e4");
        if (m.hp < m.maxHp || targeted || def.boss) {
          const bw = def.boss ? 56 : 36;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(m.x - bw / 2 - 1, top - 1, bw + 2, 6);
          ctx.fillStyle = "#3a1a1a";
          ctx.fillRect(m.x - bw / 2, top, bw, 4);
          ctx.fillStyle = m.hp / m.maxHp > 0.35 ? "#d4534a" : "#ff7a5a";
          ctx.fillRect(m.x - bw / 2, top, bw * Math.max(0, m.hp / m.maxHp), 4);
        }
      },
    });
  }

  for (const drop of world.drops) {
    if (drop.mapId !== world.mapId) continue;
    if (drop.x < viewL || drop.x > viewR || drop.y < viewT || drop.y > viewB) continue;
    const it = ITEMS[drop.itemId];
    if (!it) continue;
    drawers.push({
      y: drop.y,
      draw: () => {
        const age = world.time - (drop.born ?? -9);
        // pop out of the monster in an arc, bounce once, then hover
        let lift = 0;
        let dxs = 0;
        if (age < 0.5) {
          const k = age / 0.5;
          lift = Math.sin(k * Math.PI) * 34 * (1 - k * 0.3);
          dxs = (1 - k) * -((drop.dx ?? 0));
        } else lift = Math.abs(Math.sin((age - 0.5) * 7)) * Math.max(0, 6 - (age - 0.5) * 12);
        const bob = age > 0.8 ? Math.sin(world.time * 4 + drop.x) * 2.5 : 0;
        shadow(ctx, drop.x, drop.y, 10);
        if (drop.rare) {
          const glow = 0.35 + Math.sin(world.time * 5) * 0.15;
          ctx.save();
          const grad = ctx.createRadialGradient(drop.x, drop.y - 16, 2, drop.x, drop.y - 16, 30);
          grad.addColorStop(0, `rgba(255,226,122,${glow + 0.25})`);
          grad.addColorStop(1, "rgba(255,226,122,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(drop.x - 30, drop.y - 46, 60, 60);
          ctx.fillStyle = `rgba(255,226,122,${glow * 0.6})`;
          ctx.fillRect(drop.x - 1.5, drop.y - 90, 3, 78);
          ctx.restore();
        }
        drawItemIcon(ctx, it, drop.x - 12 + dxs, drop.y - 28 - lift + bob, 24);
        const pl = world.player;
        if (pl && Math.hypot(pl.x - drop.x, pl.y - drop.y) < 120 && age > 0.5) {
          label(ctx, it.name, drop.x, drop.y - 34 + bob, drop.rare ? "#ffd86a" : "#f6f0e4");
        }
      },
    });
  }

  const p = world.player;
  if (world.screen === "play" && p) {
    drawers.push({
      y: p.y,
      draw: () => {
        const moving = p.speedInstant > 8 && p.downFor <= 0 && p.feign <= 0;
        const frame = moving ? Math.floor(p.anim) % 4 : 1;
        const bob = moving ? Math.abs(Math.sin(p.anim * Math.PI)) * (2.2 + Math.min(1.6, p.speedInstant / 110)) : Math.sin(world.time * 2.1) * 0.7;
        const swingT = p.swing > 0 ? Math.sin((1 - p.swing / 0.18) * Math.PI) : 0;
        let ox = 0;
        let oy = -bob;
        if (p.dir === 0) oy += swingT * 6;
        else if (p.dir === 3) oy -= swingT * 7;
        else if (p.dir === 1) ox -= swingT * 8;
        else ox += swingT * 8;
        const down = p.downFor > 0;
        ctx.save();
        if (down || p.feign > 0) ctx.globalAlpha = down ? 0.5 : 0.72;
        // squash & stretch: stretch up when a step lifts, squash when it lands, lean into the run
        const stepK = moving ? Math.sin(p.anim * Math.PI * 2) : 0;
        const sqx = 1 - stepK * 0.025 + swingT * 0.05;
        const sqy = 1 + stepK * 0.035 - swingT * 0.04;
        const lean = moving ? (p.dir === 1 ? -0.035 : p.dir === 2 ? 0.035 : 0) * Math.min(1, p.speedInstant / 120) : 0;
        ctx.translate(p.x, p.y);
        ctx.rotate(lean);
        ctx.scale(sqx, sqy);
        ctx.translate(-p.x, -p.y);
        drawActor(ctx, p.x, p.y, p.dir, frame, p.style, p.hair, p.trim, p.eq, p.sit || p.feign > 0 || down, p.flash, ox, oy, swingT);
        ctx.restore();
        if (down) return;
        label(ctx, p.name, p.x, p.y - 120, "#fff6df");
        if (p.feign > 0) label(ctx, "Playing dead", p.x, p.y - 136, "#b7ad9c");
        else if (p.sit) label(ctx, "Resting", p.x, p.y - 136, "#7dba6a");
        if (world.say && world.sayUntil > world.time) {
          ctx.font = "500 13px Outfit, sans-serif";
          const w = Math.min(180, ctx.measureText(world.say).width + 16);
          ctx.fillStyle = "#f3e6c8";
          roundRect(ctx, p.x - w / 2, p.y - 156, w, 22, 6);
          ctx.fill();
          ctx.fillStyle = "#2a2118";
          ctx.textAlign = "center";
          ctx.fillText(world.say, p.x, p.y - 141);
        }
      },
    });
  }

  drawers.sort((a, b) => a.y - b.y);
  for (const d of drawers) d.draw();

  if (world.clickMark) {
    const cm = world.clickMark;
    cm.t += dt;
    if (cm.t > 0.7) world.clickMark = null;
    else {
      const k = cm.t / 0.7;
      ctx.strokeStyle = `rgba(246,240,228,${0.9 * (1 - k)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cm.x, cm.y, 6 + k * 16, (6 + k * 16) * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(228,177,90,${1 - k})`;
      ctx.beginPath();
      ctx.ellipse(cm.x, cm.y, 3, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const f of world.floats) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.4));
    const pop = f.big ? 1 + Math.max(0, 0.5 - (1.15 - f.life) * 3) : 1;
    ctx.font = `700 ${(f.big ? 20 : 15) * pop}px Outfit, sans-serif`;
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(16,18,24,0.8)";
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }
  for (const part of world.particles) {
    const life = Math.max(0, part.life);
    ctx.globalAlpha = part.max ? Math.min(1, life / part.max) * (part.puff ? 0.55 : 1) : Math.min(1, life);
    ctx.fillStyle = part.color;
    if (part.puff) {
      const r = (part.size ?? 4) * (1 + (1 - life / (part.max ?? 1)) * 0.9);
      ctx.beginPath();
      ctx.arc(part.x, part.y, r, 0, Math.PI * 2);
      ctx.fill();
    } else ctx.fillRect(part.x, part.y, 3, 3);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  if (map.tint) {
    ctx.fillStyle = map.tint;
    ctx.fillRect(0, 0, cssW, cssH);
  }
  if (map.vignette) {
    const vg = ctx.createRadialGradient(cssW / 2, cssH / 2, Math.min(cssW, cssH) * 0.28, cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.72);
    vg.addColorStop(0, "rgba(4,2,16,0)");
    vg.addColorStop(1, `rgba(4,2,16,${map.vignette})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  if (cssW >= 860) {
    const mw = 136;
    const mh = 104;
    const mx = cssW - mw - 14;
    const my = 58;
    ctx.fillStyle = "rgba(20, 26, 36, 0.72)";
    roundRect(ctx, mx, my, mw, mh, 8);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, mx, my, mw, mh, 8);
    ctx.clip();
    const sx = mw / map.pxW;
    const sy = mh / map.pxH;
    const mini = bakedMini(map);
    if (mini) ctx.drawImage(mini, mx, my);
    if (p && world.screen === "play") {
      ctx.fillStyle = "#f6f0e4";
      ctx.fillRect(mx + p.x * sx - 2, my + p.y * sy - 2, 4, 4);
    }
    ctx.restore();
  }
}

export function drawPreview(canvas: HTMLCanvasElement, p: Pick<Player, "style" | "hair" | "trim" | "eq" | "dir"> & { anim?: number; speedInstant?: number }) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 180;
  const h = canvas.clientHeight || 200;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const moving = (p.speedInstant ?? 0) > 8;
  const frame = moving ? Math.floor(p.anim ?? 0) % 4 : 1;
  drawActor(ctx, w / 2, h - 18, p.dir, frame, p.style, p.hair, p.trim, p.eq, false, 0, 0, moving ? -Math.abs(Math.sin((p.anim ?? 0) * Math.PI)) * 2 : 0, 0);
}
