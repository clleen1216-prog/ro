import { buildingSprite, drawBlockActor, propSprite, type ActorParts } from "@/game/blockart";
import { B, EPX, PX, blit, castShadow, hash, mk, setEntityPx, tileTexture } from "@/game/blocky";
import { drawCreature, hasLook } from "@/game/creatures";
import { ITEMS, MONSTERS, TILE, getMap, hairHex, trimHex, type ItemDef } from "@/game/content";
import type { Dir, GearSlot, IconKind, Player } from "@/game/types";
import { world } from "@/game/world";

const FONT = "'Pixelify Sans', 'Courier New', monospace";
const MINI_COL: Record<number, string> = { 0: "#5d9b35", 1: "#8a8a8e", 2: "#866043", 3: "#2f58c8", 4: "#dccf9c", 5: "#6a6a72", 6: "#35662a" };



let groundKey = "";
let groundCanvas: HTMLCanvasElement | null = null;
let miniKey = "";
let miniCanvas: HTMLCanvasElement | null = null;
let fontAsked = false;
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


function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number) {
  const w = Math.max(PX * 3, Math.round((rx * 2) / PX) * PX);
  const h = Math.max(PX * 2, Math.round((rx * 0.7) / PX) * PX);
  const x0 = Math.round(x - w / 2);
  const y0 = Math.round(y - h / 2);
  ctx.fillStyle = "rgba(8, 14, 10, 0.3)";
  ctx.fillRect(x0 + PX, y0, w - PX * 2, h);
  ctx.fillRect(x0, y0 + PX, w, h - PX * 2);
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.font = `700 13px ${FONT}`;
  ctx.textAlign = "center";
  const w = Math.ceil(ctx.measureText(text).width) + 8;
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(Math.round(x - w / 2), Math.round(y - 12), w, 16);
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillText(text, Math.round(x) + 1, Math.round(y) + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, Math.round(x), Math.round(y));
}

type GearItem = { hat?: string; weapon?: string; tint: string };
function partsFromEq(eq: Record<GearSlot, string | null>): ActorParts {
  const g = (id: string | null): GearItem | undefined => (id ? (ITEMS[id] as GearItem | undefined) : undefined);
  const acc = g(eq.acc1) ?? g(eq.acc2);
  return {
    upper: g(eq.headUpper),
    mid: g(eq.headMid),
    lower: g(eq.headLower),
    armor: g(eq.armor),
    garment: g(eq.garment),
    shoes: g(eq.shoes),
    weapon: g(eq.weapon),
    shield: g(eq.shield),
    acc: acc?.tint,
  };
}

function drawActor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: Dir,
  phase: number,
  amt: number,
  style: Player["style"],
  hair: string,
  trim: string,
  eq: Record<GearSlot, string | null>,
  sit: boolean,
  flash: number,
  ox = 0,
  oy = 0,
  atk = -1,
  parts?: ActorParts,
  turn = 0,
) {
  shadow(ctx, x, y, 3 * EPX);
  ctx.save();
  ctx.translate(Math.round(x + ox), Math.round(y + oy));
  drawBlockActor(ctx, dir, phase, amt, style, hairHex(hair), trimHex(trim), parts ?? partsFromEq(eq), sit, flash, atk, world.time, turn);
  ctx.restore();
}


// 8-direction facing: derived from movement (or the attack target) and remembered.
const F_DIR: { dir: Dir; turn: number }[] = [
  { dir: 2, turn: 0 },
  { dir: 0, turn: 1 },
  { dir: 0, turn: 0 },
  { dir: 0, turn: -1 },
  { dir: 1, turn: 0 },
  { dir: 3, turn: -1 },
  { dir: 3, turn: 0 },
  { dir: 3, turn: 1 },
];
const DIR_F = [2, 4, 0, 6];
const faceMem = new Map<string, { x: number; y: number; f: number }>();
const sector = (a: number) => ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;

function face8(key: string, x: number, y: number, dir: Dir, aim?: { x: number; y: number } | null) {
  let m = faceMem.get(key);
  if (!m) {
    m = { x, y, f: DIR_F[dir]! };
    faceMem.set(key, m);
  }
  const vx = x - m.x;
  const vy = y - m.y;
  m.x = x;
  m.y = y;
  if (aim) m.f = sector(Math.atan2(aim.y - y, aim.x - x));
  else if (Math.hypot(vx, vy) > 0.35) m.f = sector(Math.atan2(vy, vx));
  else {
    const cur = F_DIR[m.f]!;
    const ok = cur.dir === dir || (cur.turn !== 0 && (m.f === 1 ? dir === 2 : m.f === 3 ? dir === 1 : m.f === 5 ? dir === 1 : dir === 2));
    if (!ok) m.f = DIR_F[dir]!;
  }
  return F_DIR[m.f]!;
}

const iconCache = new Map<string, HTMLCanvasElement>();

export function drawItemIcon(ctx: CanvasRenderingContext2D, item: ItemDef, x: number, y: number, s: number) {
  let cv = iconCache.get(item.id);
  if (!cv) {
    cv = mk(16, 16);
    const g = cv.getContext("2d")!;
    g.translate(8, 8.4);
    g.scale(0.5, 0.5);
    g.lineWidth = 2.2;
    g.lineCap = "round";
    g.strokeStyle = "#2a2118";
    g.fillStyle = item.tint;
    paintIcon(g, item.icon);
    iconCache.set(item.id, cv);
  }
  ctx.save();
  ctx.fillStyle = "rgba(24, 24, 30, 0.6)";
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(x, y, s, 2);
  ctx.fillRect(x, y, 2, s);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x, y + s - 2, s, 2);
  ctx.fillRect(x + s - 2, y, 2, s);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88);
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









function drawMonster(
  ctx: CanvasRenderingContext2D,
  kind: string,
  dir: Dir,
  anim: number,
  x: number,
  y: number,
  flash: number,
  moving: boolean,
  fx: { scaleX?: number; scaleY?: number; alpha?: number; lift?: number; rot?: number; atk?: number } = {},
) {
  const def = MONSTERS[kind];
  if (!def) return;
  const h = def.draw;
  const ent = EPX / 3;
  const t = world.time + anim;
  const flyBob = def.fly ? (Math.sin(t * 3.2) * 4 + 12) * ent : 0;
  shadow(ctx, x, y, h * ent * 0.22 * (def.fly ? 0.8 : 1) * (fx.alpha ?? 1));
  ctx.save();
  ctx.globalAlpha = fx.alpha ?? 1;
  if (hasLook(def.look)) {
    ctx.translate(Math.round(x), Math.round(y - (fx.lift ?? 0) - flyBob));
    if (fx.rot) ctx.rotate(fx.rot);
    ctx.scale(fx.scaleX ?? 1, fx.scaleY ?? 1);
    drawCreature(ctx, def.look, t, moving, dir, h, flash, fx.atk ?? -1);
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
  const focus = p ? { x: p.x + leadX, y: p.y - 4 * EPX + leadY } : map.plaza;
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
  const key = `${map.id}:blk`;
  if (groundCanvas && groundKey === key) return groundCanvas;
  const c = mk(map.pxW, map.pxH);
  const g = c.getContext("2d");
  if (!g) return null;
  g.imageSmoothingEnabled = false;
  for (let ty = 0; ty < map.rows; ty++) {
    for (let tx = 0; tx < map.cols; tx++) {
      const tile = map.ground[ty * map.cols + tx] ?? 0;
      const v = tile === 5 ? (hash(tx, ty, 5) > 0.7 ? 1 : 0) : Math.floor(hash(tx, ty, 3) * 3);
      g.drawImage(tileTexture(tile, v), tx * TILE, ty * TILE, TILE, TILE);
    }
  }
  // 2.5D relief: land stands above water, so show its south cliff face
  const faces = ["#8a6a42", "#72552f", "#5c4425", "#46321b"];
  for (let ty = 0; ty < map.rows - 1; ty++) {
    for (let tx = 0; tx < map.cols; tx++) {
      const here = map.ground[ty * map.cols + tx] ?? 0;
      const below = map.ground[(ty + 1) * map.cols + tx] ?? 0;
      if (here !== 3 && below === 3) {
        for (let r = 0; r < 4; r++) {
          for (let i = 0; i < 16; i++) {
            g.fillStyle = hash(tx * 16 + i, r, 11) > 0.8 ? faces[Math.min(3, r + 1)]! : faces[r]!;
            g.fillRect(tx * TILE + i * PX, (ty + 1) * TILE + r * PX, PX, PX);
          }
        }
        g.fillStyle = "rgba(0,20,60,0.28)";
        g.fillRect(tx * TILE, (ty + 1) * TILE + 4 * PX, TILE, PX * 2);
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
  if (!fontAsked) {
    fontAsked = true;
    try {
      void document.fonts?.load("700 13px 'Pixelify Sans'");
    } catch {
      /* font optional */
    }
  }
  const Z = Math.max(3, Math.min(6, Math.round(cssH / 150))) / 3;
  world.zoom = Z;
  const vw = cssW / Z;
  const vh = cssH / Z;
  updateCam(dt, vw, vh);
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
  ctx.scale(Z, Z);
  ctx.imageSmoothingEnabled = false;
  ctx.translate(-world.cam.x + shakeX, -world.cam.y + shakeY);

  const layer = bakedGround(map);
  if (layer) ctx.drawImage(layer, 0, 0);
  if (world.debug) {
    const x0 = Math.max(0, Math.floor(world.cam.x / TILE) - 1);
    const y0 = Math.max(0, Math.floor(world.cam.y / TILE) - 1);
    const x1 = Math.min(map.cols, Math.ceil((world.cam.x + vw) / TILE) + 1);
    const y1 = Math.min(map.rows, Math.ceil((world.cam.y + vh) / TILE) + 1);
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        if (!map.block[ty * map.cols + tx]) continue;
        ctx.fillStyle = "rgba(212,83,74,0.28)";
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
  }

  const viewL = world.cam.x - 140;
  const viewR = world.cam.x + vw + 140;
  const viewT = world.cam.y - 260;
  const viewB = world.cam.y + vh + 80;
  const drawers: { y: number; draw: () => void }[] = [];
  for (const prop of map.props) {
    if (prop.x < viewL || prop.x > viewR || prop.y < viewT || prop.y > viewB) continue;
    drawers.push({
      y: prop.y,
      draw: () => {
        const k = prop.kind;
        const t = world.time;
        const sp = propSprite(k, prop.x, prop.hue, prop.w ?? 180);
        if (sp) {
          const sh: Record<string, number> = { tree: 22, fountain: 40, cactus: 14, tomb: 17, pillar: 18, rock: 12 };
          if (sh[k]) shadow(ctx, prop.x, prop.y, sh[k]!);
          if (k === "lamp") {
            ctx.fillStyle = "rgba(244,199,90,0.12)";
            ctx.fillRect(prop.x - 36, prop.y - 96, 72, 72);
            ctx.fillStyle = "rgba(244,199,90,0.14)";
            ctx.fillRect(prop.x - 21, prop.y - 81, 42, 42);
          }
          if (k !== "flower" && k !== "bones" && k !== "sign") castShadow(ctx, sp, prop.x, prop.y, k === "tree" ? 0.3 : 0.24, k === "tree" ? 0.4 : 0.3);
          blit(ctx, sp, prop.x, prop.y);
          if (k === "fountain") {
            for (let i = 0; i < 5; i++) {
              const ph = (t * 0.9 + i * 0.2) % 1;
              const dx = (i - 2) * 9 * ph;
              ctx.fillStyle = i % 2 ? "#cfe4ff" : "#8ab4ff";
              ctx.fillRect(Math.round(prop.x + dx - 1.5), Math.round(prop.y - 102 + ph * ph * 56), 3, 3);
            }
          } else if (k === "torch") {
            const fl = Math.round(Math.sin(t * 14 + prop.x) * 1.4) * PX;
            const g2 = ctx.createRadialGradient(prop.x, prop.y - 46, 2, prop.x, prop.y - 46, 70);
            g2.addColorStop(0, "rgba(255,170,70,0.34)");
            g2.addColorStop(1, "rgba(255,170,70,0)");
            ctx.fillStyle = g2;
            ctx.fillRect(prop.x - 70, prop.y - 116, 140, 140);
            const fx = Math.round(prop.x / PX) * PX;
            const fy = Math.round(prop.y / PX) * PX - 42;
            ctx.fillStyle = "#e8581e";
            ctx.fillRect(fx - 6, fy - 12 - fl, 12, 15 + fl);
            ctx.fillStyle = "#ff9a3a";
            ctx.fillRect(fx - 3, fy - 15 - fl, 6, 15 + fl);
            ctx.fillStyle = "#ffe27a";
            ctx.fillRect(fx - 3, fy - 6, 6, 9);
          } else if (k === "sign") {
            ctx.font = `700 10px ${FONT}`;
            ctx.textAlign = "center";
            ctx.fillStyle = "#3a2410";
            ctx.fillText(prop.label ?? "", Math.round(prop.x), Math.round(prop.y - 33));
          }
        } else {
          shadow(ctx, prop.x, prop.y, (prop.w ?? 120) * 0.4);
          const bs = buildingSprite(k, prop.w ?? 120, prop.h ?? 100, prop.hue);
          castShadow(ctx, bs, prop.x, prop.y, 0.22, 0.28);
          blit(ctx, bs, prop.x, prop.y);
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
        const nh = npc.hat;
        const hatTint = trimHex(npc.trim);
        const nparts: ActorParts = {
          garment: npc.cape ? { tint: npc.cape } : undefined,
          upper: nh === "cap" || nh === "feather" || nh === "circlet" || nh === "brim" ? { hat: nh, tint: nh === "circlet" ? "#e4b15a" : hatTint } : undefined,
          mid: nh === "glasses" || nh === "mask" ? { hat: nh, tint: "#2a2118" } : undefined,
          lower: nh === "scarf" || nh === "ribbon" ? { hat: nh, tint: hatTint } : undefined,
        };
        drawActor(ctx, npc.x, npc.y, 0, 0, 0, npc.style, npc.hair, npc.trim, eq, false, 0, 0, -Math.round(bob), -1, nparts);
        label(ctx, npc.name, npc.x, npc.y - 33 * EPX, "#f6f0e4");
        const p = world.player;
        const bang =
          (npc.role === "waykeeper" && p && p.quest !== "claimed") ||
          (npc.role === "job" && p && p.job === "novice" && p.baseLevel >= 4 && p.jobLevel >= 4);
        if (bang) {
          const by = Math.round(npc.y - 33 * EPX - 30 + Math.sin(world.time * 4) * 2);
          ctx.fillStyle = "#2a2118";
          ctx.fillRect(Math.round(npc.x) - 9, by - 3, 18, 21);
          ctx.fillStyle = "#e4b15a";
          ctx.fillRect(Math.round(npc.x) - 6, by, 12, 15);
          ctx.fillStyle = "#2a2118";
          ctx.font = `700 14px ${FONT}`;
          ctx.textAlign = "center";
          ctx.fillText("!", Math.round(npc.x), by + 13);
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
          drawMonster(ctx, m.kind, m.dir, m.anim, m.x, m.y, k < 0.5 ? 1 : 0, false, {
            alpha: 1 - k * k,
            rot: (m.dir === 1 ? -1 : 1) * Math.min(1, k * 3) * (Math.PI / 2),
          });
          return;
        }
        const targeted = world.targetId === m.id;
        if (targeted) {
          const pulse = 1 + Math.sin(world.time * 6) * 0.06;
          const rw = Math.round(((20 + def.draw * 0.12) * (EPX / 3) * pulse + (def.boss ? 14 : 0)) / PX) * PX;
          const rh = Math.round((9 * pulse + (def.boss ? 5 : 0)) / PX) * PX;
          ctx.strokeStyle = "#f4d26a";
          ctx.lineWidth = 3;
          ctx.strokeRect(Math.round(m.x) - rw + 1.5, Math.round(m.y) - rh + 1.5, rw * 2 - 3, rh * 2 - 3);
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
        const matk = m.windup > 0 ? 0.3 * (1 - m.windup / 0.28) : m.lunge > 0 ? 0.3 + 0.25 * (1 - m.lunge / 0.2) : -1;
        drawMonster(ctx, m.kind, m.dir, m.anim, lx, ly, m.hurt, m.moving, {
          atk: matk,
          scaleX: sxs * (0.4 + 0.6 * e) * (1 + (m.hurt > 0 ? 0.08 : 0)),
          scaleY: sys * (0.4 + 0.6 * e) * (1 - (m.hurt > 0 ? 0.08 : 0)),
          alpha: Math.min(1, 0.3 + e),
        });
        const top = m.y - (def.draw + (def.fly ? 18 : 0)) * (EPX / 3);
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
        const amt = moving ? Math.min(1, p.speedInstant / 70) : 0;
        const phase = p.anim * (Math.PI / 2);
        const atk = p.swing > 0 ? 1 - p.swing / 0.34 : -1;
        const down = p.downFor > 0;
        ctx.save();
        if (down || p.feign > 0) ctx.globalAlpha = down ? 0.5 : 0.72;
        const tg = p.swing > 0 ? world.monsters.find((mm) => mm.id === world.targetId && mm.alive) : undefined;
        const fc = face8("player", p.x, p.y, p.dir, tg ?? null);
        drawActor(ctx, p.x, p.y, fc.dir, phase, amt, p.style, p.hair, p.trim, p.eq, p.sit || p.feign > 0 || down, p.flash, 0, 0, atk, undefined, fc.turn);
        ctx.restore();
        if (down) return;
        label(ctx, p.name, p.x, p.y - 33 * EPX, "#fff6df");
        if (p.feign > 0) label(ctx, "Playing dead", p.x, p.y - 33 * EPX - 18, "#b7ad9c");
        else if (p.sit) label(ctx, "Resting", p.x, p.y - 33 * EPX - 18, "#7dba6a");
        if (world.say && world.sayUntil > world.time) {
          ctx.font = `600 13px ${FONT}`;
          const w = Math.min(190, ctx.measureText(world.say).width + 16);
          const bx = Math.round(p.x - w / 2);
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(bx - 2, Math.round(p.y - 33 * EPX - 46) - 2, w + 4, 26);
          ctx.fillStyle = "#f3e6c8";
          ctx.fillRect(bx, Math.round(p.y - 33 * EPX - 46), w, 22);
          ctx.fillStyle = "#2a2118";
          ctx.textAlign = "center";
          ctx.fillText(world.say, Math.round(p.x), Math.round(p.y - 33 * EPX - 30));
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
      const r = Math.round((6 + k * 16) / PX) * PX;
      ctx.strokeStyle = `rgba(246,240,228,${0.9 * (1 - k)})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(Math.round(cm.x) - r + 1.5, Math.round(cm.y) - r * 0.6 + 1.5, r * 2 - 3, r * 1.2 - 3);
      ctx.fillStyle = `rgba(244,210,106,${1 - k})`;
      ctx.fillRect(Math.round(cm.x) - 3, Math.round(cm.y) - 3, 6, 6);
    }
  }
  for (const f of world.floats) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.4));
    const pop = f.big ? 1 + Math.max(0, 0.5 - (1.15 - f.life) * 3) : 1;
    ctx.font = `700 ${Math.round((f.big ? 20 : 15) * pop)}px ${FONT}`;
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
      const r = Math.max(PX, Math.round(((part.size ?? 4) * (1 + (1 - life / (part.max ?? 1)) * 0.9) * 1.6) / PX) * PX);
      ctx.fillRect(Math.round(part.x - r / 2), Math.round(part.y - r / 2), r, r);
    } else ctx.fillRect(Math.round(part.x), Math.round(part.y), 3, 3);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  const hz = ctx.createLinearGradient(0, 0, 0, cssH);
  hz.addColorStop(0, "rgba(190,215,255,0.1)");
  hz.addColorStop(0.5, "rgba(190,215,255,0)");
  hz.addColorStop(1, "rgba(0,0,10,0.14)");
  ctx.fillStyle = hz;
  ctx.fillRect(0, 0, cssW, cssH);

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
    ctx.fillStyle = "#101014";
    ctx.fillRect(mx - 3, my - 3, mw + 6, mh + 6);
    ctx.fillStyle = "#5a5a64";
    ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
    ctx.fillStyle = "rgba(20, 26, 36, 0.9)";
    ctx.fillRect(mx, my, mw, mh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, my, mw, mh);
    ctx.clip();
    const sx = mw / map.pxW;
    const sy = mh / map.pxH;
    const mini = bakedMini(map);
    if (mini) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(mini, mx, my);
    }
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
  const prevPx = EPX;
  setEntityPx(5);
  drawActor(ctx, w / 2, h - 18, p.dir, (p.anim ?? 0) * (Math.PI / 2), moving ? 1 : 0, p.style, p.hair, p.trim, p.eq, false, 0, 0, 0, -1);
  setEntityPx(prevPx);
}
