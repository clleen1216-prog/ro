// Pixel-quantised skill effects. Everything is built from 3px squares so it matches the block art.
import { world } from "@/game/world";
import type { SkillDef } from "@/game/types";

export type VfxKind =
  | "aura" | "heal" | "pillar" | "ring" | "bolt" | "slash" | "slash360" | "cross" | "spikes" | "ice"
  | "fire" | "meteor" | "notes" | "nova" | "smoke" | "coins" | "dome" | "orbs" | "shock" | "bubbles" | "multislash" | "stormbolts" | "warn" | "cloud" | "runes" | "howl";

export type Vfx = { kind: VfxKind; x: number; y: number; col: string; t: number; dur: number; r: number; seed: number; txt?: string };

const U = 3;
const q = (v: number) => Math.round(v / U) * U;
const DUR: Record<VfxKind, number> = {
  aura: 1.0, heal: 1.1, pillar: 0.9, ring: 0.7, bolt: 0.5, slash: 0.35, slash360: 0.45, cross: 0.7, spikes: 0.8, ice: 0.8,
  fire: 0.9, meteor: 1.0, notes: 1.4, nova: 0.7, smoke: 0.9, coins: 0.9, dome: 1.2, orbs: 0.9, shock: 0.55, bubbles: 1.1, multislash: 0.5, stormbolts: 1.0, warn: 1, cloud: 1.8, runes: 1.3, howl: 0.9,
};

export function spawnVfx(kind: VfxKind, x: number, y: number, col: string, r = 60, dur?: number, txt?: string) {
  world.vfx.push({ kind, x, y, col, t: 0, dur: dur ?? DUR[kind], r, seed: Math.random() * 1000, txt });
  if (world.vfx.length > 90) world.vfx.shift();
}

export function stepVfx(dt: number) {
  for (const v of world.vfx) v.t += dt;
  world.vfx = world.vfx.filter((v) => v.t < v.dur);
}

const rnd = (s: number) => {
  const x = Math.sin(s * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

type Spec = { kind: VfxKind; at?: "self" | "target"; delay?: number; col?: string; r?: number };

const BY_ID: Record<string, Spec[]> = {
  spark: [{ kind: "bolt", at: "target", delay: 0.18 }],
  ember: [{ kind: "fire", at: "target", delay: 0.2 }],
  frost: [{ kind: "ice", at: "target", delay: 0.2 }],
  storm: [{ kind: "stormbolts", at: "target", delay: 0.2 }],
  ringCut: [{ kind: "shock", at: "self" }, { kind: "slash360", at: "self" }],
  arcCut: [{ kind: "slash360", at: "self" }],
  guard: [{ kind: "dome", at: "self" }],
  focus: [{ kind: "aura", at: "self" }],
  firstAid: [{ kind: "heal", at: "self" }],
  playDead: [{ kind: "smoke", at: "self" }],
  heal: [{ kind: "heal", at: "self" }, { kind: "pillar", at: "self", col: "#fff2a8" }],
  blessing: [{ kind: "aura", at: "self", col: "#fff2a8" }],
  incAgi: [{ kind: "aura", at: "self", col: "#7ad0ff" }],
  holyLight: [{ kind: "pillar", at: "target", delay: 0.15, col: "#fff2a8" }],
  envenom: [{ kind: "slash", at: "target", col: "#b070e8" }, { kind: "bubbles", at: "target", col: "#9a5ad0" }],
  hiding: [{ kind: "smoke", at: "self" }],
  throwStone: [{ kind: "shock", at: "target", delay: 0.15, r: 30 }],
  mammonite: [{ kind: "coins", at: "target" }, { kind: "shock", at: "target", r: 40 }],
  cartRev: [{ kind: "slash360", at: "self", col: "#e4b15a" }, { kind: "coins", at: "self" }],
  loudExc: [{ kind: "nova", at: "self", col: "#ffcf4a" }],
  pierce: [{ kind: "multislash", at: "target" }],
  brandish: [{ kind: "slash360", at: "self" }, { kind: "shock", at: "self" }],
  twoHandQuick: [{ kind: "aura", at: "self", col: "#ffe27a" }],
  holyCross: [{ kind: "cross", at: "target", col: "#fff2a8" }],
  shieldCharge: [{ kind: "shock", at: "target", col: "#aeb8c4" }],
  grandCross: [{ kind: "cross", at: "self", col: "#fff2a8", r: 110 }, { kind: "ring", at: "self", col: "#fff2a8", r: 110 }],
  autoGuard: [{ kind: "dome", at: "self", col: "#aeb8c4" }],
  jupitel: [{ kind: "orbs", at: "target", delay: 0.2, col: "#f2e46a" }],
  lov: [{ kind: "stormbolts", at: "target", delay: 0.2, col: "#f2e46a", r: 120 }, { kind: "ring", at: "target", delay: 0.2, col: "#f2e46a", r: 120 }],
  meteor: [{ kind: "meteor", at: "target", delay: 0.1, r: 110 }],
  energyCoat: [{ kind: "dome", at: "self", col: "#8fb0ff" }],
  earthSpike: [{ kind: "spikes", at: "target", delay: 0.15, col: "#b08850" }],
  heavensDrive: [{ kind: "spikes", at: "self", col: "#b08850", r: 90 }],
  endowBlaze: [{ kind: "fire", at: "self", col: "#ff8a3a" }],
  blitz: [{ kind: "bolt", at: "target", delay: 0.2, col: "#e8dcb8" }],
  ankleSnare: [{ kind: "ring", at: "target", col: "#b7ad9c", r: 36 }],
  sharpShoot: [{ kind: "shock", at: "target", delay: 0.2, col: "#e8dcb8" }, { kind: "cross", at: "target", delay: 0.2, col: "#e8dcb8", r: 40 }],
  melody: [{ kind: "notes", at: "target" }],
  whistle: [{ kind: "notes", at: "self" }],
  assassinCross: [{ kind: "notes", at: "self", col: "#ff9ad0" }, { kind: "aura", at: "self", col: "#ff9ad0" }],
  appleIdun: [{ kind: "heal", at: "self", col: "#7ad04a" }, { kind: "notes", at: "self", col: "#7ad04a" }],
  sanctuary: [{ kind: "ring", at: "self", col: "#fff2a8", r: 90 }, { kind: "heal", at: "self" }, { kind: "pillar", at: "self", col: "#fff2a8", r: 70 }],
  kyrie: [{ kind: "dome", at: "self", col: "#fff2a8" }],
  magnus: [{ kind: "cross", at: "self", col: "#fff2a8", r: 120 }, { kind: "pillar", at: "self", col: "#fff2a8", r: 100 }],
  impositio: [{ kind: "aura", at: "self", col: "#fff2a8" }],
  investigate: [{ kind: "shock", at: "target", col: "#ffcf4a" }],
  fingerOff: [{ kind: "orbs", at: "target", col: "#ffcf4a" }],
  asura: [{ kind: "nova", at: "target", col: "#ff6a2a", r: 100 }, { kind: "shock", at: "target", col: "#ff6a2a", r: 100 }],
  explSpirits: [{ kind: "orbs", at: "self", col: "#ffcf4a" }, { kind: "aura", at: "self", col: "#ffcf4a" }],
  sonic: [{ kind: "multislash", at: "target", col: "#ff4a6a" }],
  grimtooth: [{ kind: "spikes", at: "target", col: "#c8d0d8", r: 40 }],
  enchantPoison: [{ kind: "bubbles", at: "self", col: "#9a5ad0" }],
  cloaking: [{ kind: "smoke", at: "self", col: "#586070" }],
  backstab: [{ kind: "slash", at: "target", col: "#ff4a6a" }, { kind: "shock", at: "target" }],
  raid: [{ kind: "smoke", at: "self" }, { kind: "slash360", at: "self", col: "#c8d0d8" }],
  stealCoin: [{ kind: "coins", at: "target" }],
  intimidate: [{ kind: "nova", at: "target", col: "#ff4a6a", r: 60 }],
  hammerFall: [{ kind: "shock", at: "target", r: 110, col: "#e4b15a" }, { kind: "ring", at: "target", r: 110, col: "#e4b15a" }],
  adrenaline: [{ kind: "aura", at: "self", col: "#ff8a3a" }],
  overThrust: [{ kind: "fire", at: "self", col: "#ff6a2a" }, { kind: "aura", at: "self", col: "#ff6a2a" }],
  acidTerror: [{ kind: "bubbles", at: "target", col: "#7ad04a" }],
  demonstration: [{ kind: "fire", at: "target", r: 90 }, { kind: "bubbles", at: "target", col: "#ff8a3a", r: 90 }],
  potionPitcher: [{ kind: "bubbles", at: "self", col: "#ff6a8a" }, { kind: "heal", at: "self", col: "#ff6a8a" }],
};

/** default look from the fx recipe for anything not listed above */
function fallback(sk: SkillDef): Spec[] {
  const f = sk.fx;
  if (!f) return [{ kind: "shock", at: "target" }];
  if (f.t === "heal") return [{ kind: "heal", at: "self" }];
  if (f.t === "buff") return [{ kind: "aura", at: "self" }];
  if (f.t === "area") return [{ kind: "shock", at: f.self ? "self" : "target", r: f.rad ?? 80 }];
  return [{ kind: "slash", at: "target" }];
}

export function castVfx(id: string, sk: SkillDef, self: { x: number; y: number }, target: { x: number; y: number } | null, later: (s: number, fn: () => void) => void) {
  const list = BY_ID[id] ?? fallback(sk);
  const baseCol = sk.fx?.col ?? "#f6f0e4";
  for (const s of list) {
    const pt = s.at === "target" && target ? target : self;
    const col = s.col ?? baseCol;
    const r = s.r ?? sk.fx?.rad ?? 60;
    const go = () => spawnVfx(s.kind, pt.x, pt.y, col, r);
    if (s.delay) later(s.delay, go);
    else go();
  }
}

// ───────────────────────── drawing ─────────────────────────
function px(ctx: CanvasRenderingContext2D, x: number, y: number, w = U, h = U) {
  ctx.fillRect(q(x), q(y), w, h);
}

function drawOne(ctx: CanvasRenderingContext2D, v: Vfx) {
  const k = v.t / v.dur;
  const fade = 1 - k;
  const col = v.col;
  ctx.save();
  ctx.translate(Math.round(v.x), Math.round(v.y));
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  switch (v.kind) {
    case "aura": {
      ctx.globalAlpha = Math.min(1, fade * 1.6);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + v.t * 3;
        const rr = 20 + (i % 3) * 3;
        const up = ((k * 2 + i * 0.13) % 1);
        px(ctx, Math.cos(a) * rr, -up * 56 + Math.sin(a) * rr * 0.4);
      }
      ctx.globalAlpha = fade * 0.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24 + k * 6, 9, 0, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    }
    case "heal": {
      ctx.globalAlpha = Math.min(1, fade * 1.8);
      for (let i = 0; i < 6; i++) {
        const ox = (rnd(v.seed + i) - 0.5) * 40;
        const up = (k + i * 0.11) % 1;
        const y = -up * 70;
        px(ctx, ox - 3, y, 9, 3);
        px(ctx, ox, y - 3, 3, 9);
      }
      break;
    }
    case "pillar": {
      const w = q(v.r * 0.35 * Math.sin(Math.min(1, k * 3) * Math.PI * 0.5) * (1 - k * 0.5));
      ctx.globalAlpha = fade * 0.55;
      ctx.fillRect(-w, -170, w * 2, 170);
      ctx.globalAlpha = fade * 0.9;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-q(w * 0.4), -170, q(w * 0.8), 170);
      break;
    }
    case "ring": {
      const rr = v.r * Math.min(1, k * 2.2);
      ctx.globalAlpha = fade;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(0, 0, rr, rr * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.globalAlpha = fade * 0.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, rr * 0.7, rr * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "bolt": {
      ctx.globalAlpha = k < 0.6 ? 1 : fade * 2.2;
      let x = 0, y = -180;
      while (y < -34) {
        const nx = x + (rnd(v.seed + y) - 0.5) * 30;
        const ny = y + 20;
        ctx.lineWidth = 6;
        ctx.strokeStyle = col;
        ctx.beginPath(); ctx.moveTo(q(x), q(y)); ctx.lineTo(q(nx), q(ny)); ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#fff";
        ctx.beginPath(); ctx.moveTo(q(x), q(y)); ctx.lineTo(q(nx), q(ny)); ctx.stroke();
        x = nx; y = ny;
      }
      ctx.globalAlpha = fade;
      ctx.fillStyle = "#fff";
      px(ctx, -9, -40, 18, 6);
      break;
    }
    case "stormbolts": {
      for (let b = 0; b < 5; b++) {
        const start = b * 0.12;
        const kk = (k - start) / 0.4;
        if (kk < 0 || kk > 1) continue;
        const bx = (rnd(v.seed + b) - 0.5) * v.r * 1.6;
        const by = (rnd(v.seed + b + 9) - 0.5) * v.r * 0.7;
        ctx.globalAlpha = 1 - kk;
        let x = bx, y = by - 160;
        while (y < by - 8) {
          const nx = bx + (rnd(v.seed + y + b) - 0.5) * 20;
          const ny = y + 22;
          ctx.lineWidth = 5; ctx.strokeStyle = col;
          ctx.beginPath(); ctx.moveTo(q(x), q(y)); ctx.lineTo(q(nx), q(ny)); ctx.stroke();
          ctx.lineWidth = 2; ctx.strokeStyle = "#fff";
          ctx.beginPath(); ctx.moveTo(q(x), q(y)); ctx.lineTo(q(nx), q(ny)); ctx.stroke();
          x = nx; y = ny;
        }
        ctx.fillStyle = "#fff";
        px(ctx, bx - 9, by - 3, 18, 6);
      }
      break;
    }
    case "slash": {
      const a = Math.min(1, k * 3);
      ctx.globalAlpha = fade * 1.2;
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(-26 + a * 4, -62); ctx.lineTo(-26 + a * 52, -62 + a * 50); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = "#fff";
      ctx.beginPath(); ctx.moveTo(-26 + a * 4, -62); ctx.lineTo(-26 + a * 52, -62 + a * 50); ctx.stroke();
      break;
    }
    case "multislash": {
      for (let i = 0; i < 4; i++) {
        const kk = (k - i * 0.1) / 0.4;
        if (kk < 0 || kk > 1) continue;
        ctx.globalAlpha = 1 - kk;
        const oy = -30 - i * 8, ox = (i % 2 ? 1 : -1) * 6;
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(ox - 28, oy - 14); ctx.lineTo(ox + 28, oy + 14); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = "#fff";
        ctx.beginPath(); ctx.moveTo(ox - 28, oy - 14); ctx.lineTo(ox + 28, oy + 14); ctx.stroke();
        ctx.strokeStyle = col;
      }
      break;
    }
    case "slash360": {
      const a = k * Math.PI * 2.2;
      ctx.globalAlpha = fade;
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.ellipse(0, -14, 56, 24, 0, a - 2.2, a); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = "#fff";
      ctx.beginPath(); ctx.ellipse(0, -14, 56, 24, 0, a - 1.6, a); ctx.stroke();
      break;
    }
    case "cross": {
      const s = v.r * Math.min(1, k * 4);
      ctx.globalAlpha = fade;
      const w = q(10 + (v.r > 80 ? 8 : 0));
      ctx.fillRect(-w / 2, -s * 1.6, w, s * 2.4);
      ctx.fillRect(-s, -s * 0.6 - w / 2, s * 2, w);
      ctx.fillStyle = "#fff";
      ctx.fillRect(-w / 6, -s * 1.6, w / 3, s * 2.4);
      ctx.fillRect(-s, -s * 0.6 - w / 6, s * 2, w / 3);
      break;
    }
    case "spikes": {
      const n = v.r > 60 ? 9 : 5;
      for (let i = 0; i < n; i++) {
        const kk = Math.min(1, Math.max(0, (k - i * 0.04) * 3));
        const ox = (rnd(v.seed + i) - 0.5) * v.r * 1.3;
        const oy = (rnd(v.seed + i + 5) - 0.5) * v.r * 0.5;
        const h = (22 + rnd(v.seed + i + 2) * 22) * kk * (k > 0.7 ? (1 - k) / 0.3 : 1);
        ctx.globalAlpha = 1;
        for (let r = 0; r < h; r += U) {
          const w = Math.max(U, q((h - r) * 0.25));
          ctx.fillStyle = r > h * 0.7 ? "#fff" : col;
          ctx.fillRect(q(ox - w / 2), q(oy - r), w, U);
        }
      }
      break;
    }
    case "ice": {
      ctx.globalAlpha = fade * 1.3;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const d = 8 + k * 38;
        ctx.fillStyle = i % 2 ? "#ffffff" : col;
        px(ctx, Math.cos(a) * d - 3, -34 + Math.sin(a) * d * 0.7 - 3, 6, 9);
      }
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = fade;
      px(ctx, -6, -40, 12, 12);
      break;
    }
    case "fire": {
      ctx.globalAlpha = Math.min(1, fade * 1.5);
      const n = v.r > 60 ? 16 : 10;
      for (let i = 0; i < n; i++) {
        const ox = (rnd(v.seed + i) - 0.5) * v.r * 0.8;
        const up = (k * 1.4 + rnd(v.seed + i + 3)) % 1;
        const sz = q(12 - up * 9);
        ctx.fillStyle = up < 0.35 ? "#fff2a8" : up < 0.65 ? col : "#a8321a";
        px(ctx, ox, -up * 58, sz, sz);
      }
      break;
    }
    case "meteor": {
      for (let i = 0; i < 4; i++) {
        const t0 = i * 0.15;
        const kk = (k - t0) / 0.4;
        const ox = (rnd(v.seed + i) - 0.5) * v.r * 1.3;
        const oy = (rnd(v.seed + i + 4) - 0.5) * v.r * 0.5;
        if (kk < 0) continue;
        if (kk < 1) {
          const x = ox + 90 * (1 - kk), y = oy - 220 * (1 - kk);
          ctx.globalAlpha = 1;
          for (let tr = 0; tr < 6; tr++) {
            ctx.fillStyle = tr < 2 ? "#fff2a8" : "#ff6a2a";
            px(ctx, x + tr * 7, y - tr * 14, 12 - tr, 12 - tr);
          }
          ctx.fillStyle = "#fff"; px(ctx, x - 6, y - 6, 15, 15);
        } else {
          const bk = Math.min(1, kk - 1);
          ctx.globalAlpha = Math.max(0, 1 - bk * 1.5);
          ctx.fillStyle = "#2a1a14";
          ctx.beginPath(); ctx.ellipse(ox, oy, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#ff8a3a"; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.ellipse(ox, oy, 12 + bk * 32, 5 + bk * 14, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = "#ffcf4a"; px(ctx, ox - 9, oy - 24 * bk - 9, 18, 18);
        }
      }
      break;
    }
    case "notes": {
      ctx.globalAlpha = Math.min(1, fade * 1.8);
      for (let i = 0; i < 6; i++) {
        const up = (k + i * 0.13) % 1;
        const ox = Math.sin(up * 7 + i) * 18 + (i - 3) * 8;
        const y = -20 - up * 60;
        px(ctx, ox, y, 6, 6);
        px(ctx, ox + 6, y - 12, 3, 15);
        px(ctx, ox + 6, y - 12, 9, 3);
      }
      break;
    }
    case "nova": {
      const rr = v.r * Math.min(1, k * 1.8);
      ctx.globalAlpha = fade;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        px(ctx, Math.cos(a) * rr, -20 + Math.sin(a) * rr * 0.6, 9, 9);
      }
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = Math.max(0, 1 - k * 3);
      px(ctx, -24, -44, 48, 48);
      break;
    }
    case "shock": {
      const rr = v.r * Math.min(1, k * 2);
      ctx.globalAlpha = fade;
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.globalAlpha = Math.max(0, 1 - k * 4);
      px(ctx, -18, -30, 36, 36);
      break;
    }
    case "smoke": {
      ctx.globalAlpha = fade * 0.8;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + v.seed;
        const d = k * 26;
        const sz = q(14 + k * 12);
        ctx.fillStyle = i % 2 ? "#8a8294" : col === "#f6f0e4" ? "#b7ad9c" : col;
        px(ctx, Math.cos(a) * d - sz / 2, -20 + Math.sin(a) * d * 0.6 - k * 14, sz, sz);
      }
      break;
    }
    case "coins": {
      ctx.globalAlpha = Math.min(1, fade * 1.5);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + v.seed;
        const d = 14 + k * 34;
        const x = Math.cos(a) * d, y = -30 + Math.sin(a) * d * 0.6 + k * k * 36 - Math.sin(k * 3) * 10;
        ctx.fillStyle = "#e4b15a"; px(ctx, x, y, 9, 9);
        ctx.fillStyle = "#fff2a8"; px(ctx, x, y, 3, 3);
      }
      break;
    }
    case "dome": {
      const rr = 30 + Math.sin(k * 20) * 1.5;
      ctx.globalAlpha = Math.min(0.55, fade);
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(0, -24, rr, rr * 1.15, 0, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -2, rr, rr * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = fade * 0.18;
      ctx.beginPath(); ctx.ellipse(0, -24, rr, rr * 1.15, 0, Math.PI, 0); ctx.fill();
      break;
    }
    case "orbs": {
      ctx.globalAlpha = fade * 1.4;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + v.t * 6;
        const d = 22 * (1 - k * 0.3);
        ctx.fillStyle = col; px(ctx, Math.cos(a) * d - 6, -36 + Math.sin(a) * d * 0.5 - 6, 12, 12);
        ctx.fillStyle = "#fff"; px(ctx, Math.cos(a) * d - 3, -36 + Math.sin(a) * d * 0.5 - 3, 6, 6);
      }
      break;
    }
    case "warn": {
      // ground telegraph: the red disc fills up until the skill lands
      const rr = v.r;
      const pulse = 0.5 + 0.5 * Math.sin(v.t * 14);
      ctx.fillStyle = "#ff3a2a";
      ctx.globalAlpha = 0.1 + 0.1 * pulse;
      ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.28 + 0.12 * pulse;
      ctx.beginPath(); ctx.ellipse(0, 0, rr * Math.min(1, k), rr * 0.45 * Math.min(1, k), 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = pulse > 0.5 ? "#ffd24a" : "#ff5a3a";
      ctx.lineWidth = 3;
      ctx.setLineDash([9, 6]);
      ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffd24a";
      ctx.globalAlpha = 1;
      px(ctx, -3, -12, 6, 12);
      px(ctx, -3, 3, 6, 6);
      break;
    }
    case "cloud": {
      const spread = v.r * Math.min(1, 0.4 + k * 1.6);
      ctx.globalAlpha = Math.min(0.7, fade * 1.1, k * 6);
      for (let i = 0; i < 26; i++) {
        const a = rnd(v.seed + i) * Math.PI * 2;
        const d = Math.sqrt(rnd(v.seed + i + 40)) * spread;
        const sz = q(14 + rnd(v.seed + i + 9) * 18);
        const bob = Math.sin(v.t * 2 + i) * 4;
        ctx.fillStyle = i % 3 === 0 ? "#ffffff" : col;
        px(ctx, Math.cos(a) * d - sz / 2, Math.sin(a) * d * 0.45 - sz / 2 - 10 + bob, sz, sz);
      }
      break;
    }
    case "runes": {
      ctx.globalAlpha = Math.min(1, fade * 1.5);
      ctx.lineWidth = 3;
      for (let ring = 0; ring < 2; ring++) {
        const rr = v.r * (ring ? 0.6 : 1) * Math.min(1, k * 3);
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -v.t * (ring ? -60 : 60);
        ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.setLineDash([]);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + v.t * 1.6;
        const rr = v.r * 0.8 * Math.min(1, k * 3);
        const gx = Math.cos(a) * rr, gy = Math.sin(a) * rr * 0.45;
        px(ctx, gx, gy - 9, 6, 6);
        px(ctx, gx + 6, gy - 3, 3, 9);
      }
      for (let i = 0; i < 6; i++) {
        const up = (k * 1.5 + i * 0.17) % 1;
        px(ctx, (rnd(v.seed + i) - 0.5) * v.r, -up * 60, 6, 6);
      }
      break;
    }
    case "howl": {
      for (let i = 0; i < 3; i++) {
        const kk = k * 1.4 - i * 0.18;
        if (kk <= 0 || kk >= 1) continue;
        ctx.globalAlpha = (1 - kk) * 0.9;
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.ellipse(0, -20, v.r * kk, v.r * kk * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = fade;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const d0 = 20 + k * v.r * 0.7;
        px(ctx, Math.cos(a) * d0, -20 + Math.sin(a) * d0 * 0.45, 6, 6);
      }
      break;
    }
    case "bubbles": {
      ctx.globalAlpha = Math.min(1, fade * 1.6);
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const up = (k + i * 0.12) % 1;
        const ox = (rnd(v.seed + i) - 0.5) * v.r * 0.7;
        const sz = 6 + rnd(v.seed + i + 1) * 8;
        ctx.strokeRect(q(ox), q(-up * 56), q(sz), q(sz));
      }
      break;
    }
  }
  if (v.txt) {
    ctx.globalAlpha = 1;
    ctx.font = "700 12px sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#1a0f0a";
    ctx.strokeText(v.txt, 0, -v.r * 0.45 - 14);
    ctx.fillStyle = "#ffd24a";
    ctx.fillText(v.txt, 0, -v.r * 0.45 - 14);
  }
  ctx.restore();
}

export function drawVfx(ctx: CanvasRenderingContext2D) {
  for (const v of world.vfx) drawOne(ctx, v);
}

// ───────── status overlays on a body (feet at x,y) ─────────
export const SF = { stun: 1, sleep: 2, poison: 4, slow: 8, curse: 16, freeze: 32, silence: 64, enrage: 256 };

export function drawStatusFx(ctx: CanvasRenderingContext2D, x: number, y: number, flags: number, t: number, head = 118, scale = 1) {
  if (!flags) return;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);
  const hy = -head;
  if (flags & SF.freeze) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#9ee4ff";
    ctx.fillRect(-18, hy - 6, 36, head + 8);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#e8fbff";
    ctx.fillRect(-18, hy - 6, 36, 3);
    ctx.fillRect(-18, hy - 6, 3, head + 8);
    ctx.fillRect(9, hy + 6, 3, 18);
    ctx.fillRect(-9, hy + 30, 9, 3);
  }
  if (flags & SF.stun) {
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + (i / 3) * Math.PI * 2;
      const sx = Math.cos(a) * 16, sy = Math.sin(a) * 5;
      ctx.fillStyle = "#ffe24a";
      px(ctx, sx - 3, hy - 10 + sy, 6, 6);
      px(ctx, sx - 6, hy - 7 + sy, 12, 0.1 + 3);
      px(ctx, sx - 1.5, hy - 13 + sy, 3, 12);
    }
  }
  if (flags & SF.sleep) {
    for (let i = 0; i < 3; i++) {
      const up = (t * 0.6 + i / 3) % 1;
      const zx = 10 + up * 14, zy = hy - 6 - up * 30;
      ctx.globalAlpha = 1 - up;
      ctx.fillStyle = "#bcd0ff";
      const s = 6 + i * 3;
      px(ctx, zx, zy, s, 3);
      px(ctx, zx + s - 3, zy, 3, s);
      px(ctx, zx, zy + s - 3, s, 3);
    }
    ctx.globalAlpha = 1;
  }
  if (flags & SF.poison) {
    for (let i = 0; i < 6; i++) {
      const up = (t * 0.8 + i * 0.17) % 1;
      const bx = Math.sin(i * 2.1 + t) * 14;
      ctx.globalAlpha = (1 - up) * 0.9;
      ctx.fillStyle = i % 2 ? "#8ad04a" : "#5a9a2a";
      px(ctx, bx, -up * (head * 0.8), 6 - up * 3, 6 - up * 3);
    }
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#6ad03a";
    ctx.fillRect(-16, hy, 32, head);
    ctx.globalAlpha = 1;
  }
  if (flags & SF.slow) {
    ctx.strokeStyle = "#7ad0c8";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 6);
    ctx.beginPath(); ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(14, 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (flags & SF.curse) {
    ctx.strokeStyle = "#b070e8";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.ellipse(0, 0, 26, 10, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 4; i++) {
      const up = (t * 0.7 + i * 0.25) % 1;
      ctx.globalAlpha = 1 - up;
      ctx.fillStyle = "#b070e8";
      px(ctx, Math.cos(i * 1.6) * 16, -up * head * 0.9, 6, 6);
    }
    ctx.globalAlpha = 1;
  }
  if (flags & SF.silence) {
    ctx.fillStyle = "#e8e0d0";
    ctx.fillRect(-12, hy - 22, 24, 12);
    ctx.fillStyle = "#c0382a";
    ctx.fillRect(-9, hy - 19, 6, 3);
    ctx.fillRect(-3, hy - 16, 6, 3);
    ctx.fillRect(3, hy - 19, 6, 3);
  }
  if (flags & SF.enrage) {
    for (let i = 0; i < 7; i++) {
      const up = (t * 1.4 + i * 0.14) % 1;
      ctx.globalAlpha = (1 - up) * 0.9;
      ctx.fillStyle = i % 2 ? "#ff5a2a" : "#ffb03a";
      px(ctx, Math.sin(i * 1.9) * 22 * scale, -up * head, 9 - up * 6, 9 - up * 6);
    }
    ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 8);
    ctx.strokeStyle = "#ff3a2a";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(0, 0, 34, 13, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
