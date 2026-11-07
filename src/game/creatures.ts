// Block (Minecraft-style) monster models.
// Each model is built from bevelled blocks in "design texels" (a 66px monster
// is ~22 texels tall) with its feet at (0,0), facing right in side view.
// `f` scales the design to the monster's draw size.

import { B, atkPose, blitScratch, castShadowScratch, limbPx, line, scratch, shade } from "@/game/blocky";

type Ctx = CanvasRenderingContext2D;
type View = "f" | "s" | "b";
type G = { c: Ctx; f: number; t: number; m: number; v: View; atk: number };

const INK = "#1b1620";

function R(g: G, x: number, y: number, w: number, h: number, col: string, n = 0.12, bevel = true) {
  const x0 = Math.round(x * g.f);
  const y0 = Math.round(y * g.f);
  const x1 = Math.round((x + w) * g.f);
  const y1 = Math.round((y + h) * g.f);
  B(g.c, x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0), col, n, bevel);
}

const sw = (g: G, speed = 10) => Math.sin(g.t * (g.m ? speed : 2));

/** Big shiny eyes: two on the front, one on the side, none from behind. */
function eye1(g: G, x: number, y: number, w: number, h: number, col: string) {
  R(g, x, y, w, h, col, 0, false);
  R(g, x, y, 1, 1, "#ffffff", 0, false);
}

function eyes(g: G, x: number, y: number, gap: number, col = INK, size = 2) {
  if (g.v === "b") return;
  const w = Math.max(2, size + 1);
  const h = w + 1;
  if (g.v === "f") {
    eye1(g, x - gap / 2 - w / 2, y, w, h, col);
    eye1(g, x + gap / 2 - w / 2, y, w, h, col);
  } else eye1(g, x + gap / 2, y, w, h, col);
}

// ── Slimes ──────────────────────────────────────────────────────────────

function slime(g: G, col: string, hi: string, core: string, tail?: (g: G, h: number) => void) {
  const sq = Math.sin(g.t * (g.m ? 9 : 3)) * (g.m ? 1.6 : 0.7);
  const h = 15 - sq;
  const w = 18 + sq;
  R(g, -w / 2, -h, w, h, col, 0.1);
  R(g, -w / 2 + 2, -h + 2, 4, 2, hi, 0, false);
  R(g, -5, -h + 4, 10, 8, core, 0.1);
  eyes(g, g.v === "s" ? 1 : 0, -h + 6, 5, INK, 2);
  if (g.v !== "b") R(g, g.v === "s" ? 2 : -1, -h + 10, 2, 1, INK, 0, false);
  tail?.(g, h);
}

// ── Humanoids ───────────────────────────────────────────────────────────

type Hum = {
  skin: string;
  shirt: string;
  pants: string;
  eye?: string;
  weapon?: "axe" | "club" | "bow" | "sword";
  armsFwd?: boolean;
  wide?: number;
  ribs?: boolean;
  rot?: boolean;
  tusks?: boolean;
  shoulder?: string;
  crown?: string;
  ears?: boolean;
  headW?: number;
};

function humanoid(g: G, o: Hum) {
  const ph = sw(g);
  const f = g.f;
  const S = (v: number) => Math.round(v * f);
  const lw = 4 + (o.wide ?? 0) / 2;
  const tw = 8 + (o.wide ?? 0);
  const hw = o.headW ?? 10;
  const side = g.v === "s";
  const pose = atkPose(g.atk);
  const amt = g.m ? 1 : 0;
  const armsFwd = o.armsFwd && g.atk < 0;
  const nearAng = g.atk >= 0 ? pose.ang : armsFwd ? -8 + ph * 5 * amt : 90 + ph * 30 * amt;
  const legCol = o.pants;
  if (!side) {
    const liftA = Math.max(0, ph) * 2;
    const liftB = Math.max(0, -ph) * 2;
    R(g, -lw, -6 - liftA * (g.m ? 1 : 0), lw, 6, legCol, 0.1);
    R(g, 0, -6 - liftB * (g.m ? 1 : 0), lw, 6, shade(legCol, -0.06), 0.1);
  } else {
    limbPx(g.c, 0, -S(6), 90 - ph * 34 * amt, S(7), S(4), shade(legCol, -0.1), shade(legCol, -0.25), 0.8);
    limbPx(g.c, 0, -S(6), 90 + ph * 34 * amt, S(7), S(4), legCol, shade(legCol, -0.15), 0.8);
  }
  const tw2 = side ? tw * 0.55 : tw;
  const lunge = g.atk >= 0 ? pose.lunge : 0;
  g.c.save();
  g.c.translate(Math.round(lunge * (side ? f : 0)), 0);
  if (side) limbPx(g.c, 0, -S(13), 90 - ph * 36 * amt, S(8), S(3), shade(o.skin, -0.12), shade(o.skin, -0.2), 0.8);
  R(g, -tw2 / 2, -14, tw2, 8, o.shirt, 0.14);
  if (o.ribs && g.v !== "b") for (let i = 0; i < 3; i++) R(g, -tw2 / 2 + 1, -13 + i * 2.5, tw2 - 2, 1, shade(o.shirt, -0.4), 0, false);
  if (o.rot) {
    R(g, -tw2 / 2 + 1, -11, 2, 2, "#4a5a36", 0, false);
    R(g, tw2 / 2 - 3, -8, 2, 1, "#4a5a36", 0, false);
  }
  const aw = 3;
  const wpnTip = { x: 0, y: 0, ang: 0, xs: 1 };
  if (side) {
    limbPx(g.c, 0, -S(13), nearAng, S(8), S(3), o.skin, shade(o.skin, -0.05), 0.8);
    wpnTip.x = Math.cos((nearAng * Math.PI) / 180) * S(8);
    wpnTip.y = -S(13) + Math.sin((nearAng * Math.PI) / 180) * S(8);
    wpnTip.ang = nearAng;
  } else {
    const xs = 0.4;
    const ax = tw / 2 + aw / 2;
    const raise = g.atk >= 0 ? pose.ang : 90 - ph * 12 * amt;
    if (armsFwd && g.v === "f") {
      R(g, -tw / 2 - aw, -14, aw, 3, o.skin, 0.1);
      R(g, tw / 2, -14, aw, 3, o.skin, 0.1);
    } else {
      limbPx(g.c, -S(ax), -S(13), 90 + ph * 12 * amt, S(8), S(3), o.skin, shade(o.skin, -0.05), 0.8, xs);
      limbPx(g.c, S(ax), -S(13), raise, S(8), S(3), o.skin, shade(o.skin, -0.05), 0.8, xs);
    }
    wpnTip.x = S(ax) + Math.cos((raise * Math.PI) / 180) * S(8) * xs;
    wpnTip.y = -S(13) + Math.sin((raise * Math.PI) / 180) * S(8);
    wpnTip.ang = raise;
    wpnTip.xs = xs;
  }
  if (o.shoulder) {
    if (side) R(g, -2.5, -15, 5, 2, o.shoulder, 0.1);
    else {
      R(g, -tw / 2 - aw - 1, -15, aw + 2, 2, o.shoulder, 0.1);
      R(g, tw / 2 - 1, -15, aw + 2, 2, o.shoulder, 0.1);
    }
  }
  const hx = -hw / 2;
  R(g, hx, -24, hw, 10, o.skin, 0.12);
  if (o.ears) {
    R(g, hx - 2, -20, 2, 3, o.skin, 0, false);
    R(g, hx + hw, -20, 2, 3, o.skin, 0, false);
  }
  eyes(g, 0, -20, hw > 10 ? 5 : 4, o.eye ?? INK, 1);
  if (g.v !== "b") {
    R(g, side ? 2 : -1, -16, 2, 1, shade(o.skin, -0.4), 0, false);
    if (o.tusks) {
      R(g, side ? 3 : -3, -16, 1, 2, "#f2ecda", 0, false);
      if (!side) R(g, 2, -16, 1, 2, "#f2ecda", 0, false);
    }
  }
  if (o.crown) R(g, hx - 0.5, -26, hw + 1, 3, o.crown, 0.1);
  // weapon follows the hand and swings with the arm
  const bend = g.atk >= 0 ? pose.bend : 1;
  const wa = wpnTip.ang + (-75 - 90) * bend;
  const { x: wx, y: wy, xs: wxs } = wpnTip;
  const c = g.c;
  const len = S(15);
  const tipX = wx + Math.cos((wa * Math.PI) / 180) * len * wxs;
  const tipY = wy + Math.sin((wa * Math.PI) / 180) * len;
  if (o.weapon === "axe") {
    line(c, wx, wy, wa, len, 1, "#6b442c", wxs);
    B(c, tipX - S(2), tipY - S(2), S(4), S(5), "#9aa0aa", 0.1);
  } else if (o.weapon === "club") {
    line(c, wx, wy, wa, len, S(2), "#7a5632", wxs);
    B(c, tipX - S(2), tipY - S(3), S(4), S(6), "#8a6638", 0.14);
  } else if (o.weapon === "bow") {
    line(c, wx + 1, wy + 6, -90, S(13), 1, "#7a5632", 1);
    line(c, wx + 3, wy + 6, -90, S(13), 1, "#ddd", 1);
  } else if (o.weapon === "sword") {
    line(c, wx, wy, wa, len, 2, "#cfd6de", wxs);
  }
  g.c.restore();
}

function orc(g: G, o: { skin: string; armor: string; cloth: string; weapon: Hum["weapon"]; rot?: boolean; bone?: boolean; boss?: boolean }) {
  humanoid(g, {
    skin: o.skin,
    shirt: o.bone ? "#e2dcc8" : o.cloth,
    pants: o.cloth,
    eye: o.bone ? "#d4534a" : "#2a1a10",
    weapon: o.weapon,
    wide: 2,
    headW: 11,
    tusks: !o.bone,
    ribs: o.bone,
    rot: o.rot,
    shoulder: o.armor,
    crown: o.boss ? "#e4b15a" : undefined,
  });
}

// ── Insects, birds, beasts ──────────────────────────────────────────────

function bee(g: G, body: string, stripe: string, s: number) {
  const flap = Math.sin(g.t * 38) > 0 ? 1 : 0;
  const wing = "rgba(220,240,255,0.8)";
  if (g.v === "s") {
    R(g, -5 * s, -9 * s, 10 * s, 7 * s, body, 0.1);
    for (let i = 0; i < 3; i++) R(g, (-4 + i * 3) * s, -9 * s, 1.5 * s, 7 * s, stripe, 0.05, false);
    R(g, 5 * s, -8 * s, 4 * s, 5 * s, shade(body, -0.1), 0.1);
    R(g, 8 * s, -7 * s, 1 * s, 1 * s, INK, 0, false);
    R(g, -8 * s, -6 * s, 3 * s, 2 * s, "#2a2118", 0, false);
    R(g, -3 * s, -14 * s + flap * 2, 6 * s, 5 * s, wing, 0, false);
  } else {
    R(g, -4 * s, -10 * s, 8 * s, 8 * s, body, 0.1);
    for (let i = 0; i < 3; i++) R(g, -4 * s, (-10 + i * 3) * s, 8 * s, 1.5 * s, stripe, 0.05, false);
    if (g.v === "f") eyes(g, 0, -9 * s, 4 * s, INK, 2);
    R(g, -10 * s, -13 * s + flap * 2, 6 * s, 5 * s, wing, 0, false);
    R(g, 4 * s, -13 * s + flap * 2, 6 * s, 5 * s, wing, 0, false);
    if (g.v === "b") R(g, -1, -3 * s, 2, 3 * s, "#2a2118", 0, false);
  }
}

function quad(g: G, o: { body: string; head: string; ear: string; tail: string; legs: string; big?: number; snout?: string }) {
  const b = o.big ?? 1;
  const ph = sw(g);
  if (g.v === "s") {
    const am = g.m ? 28 : 0;
    const S = (v: number) => Math.round(v * g.f);
    limbPx(g.c, S(-6 * b), -S(4), 90 + ph * am, S(5), S(3), o.legs, shade(o.legs, -0.25), 0.75);
    limbPx(g.c, S(-1 * b), -S(4), 90 - ph * am, S(5), S(3), shade(o.legs, -0.1), shade(o.legs, -0.3), 0.75);
    limbPx(g.c, S(4 * b), -S(4), 90 - ph * am, S(5), S(3), o.legs, shade(o.legs, -0.25), 0.75);
    limbPx(g.c, S(7 * b), -S(4), 90 + ph * am, S(5), S(3), shade(o.legs, -0.1), shade(o.legs, -0.3), 0.75);
    R(g, -9 * b, -11 * b, 18 * b, 8 * b, o.body, 0.14);
    R(g, -12 * b, -12 * b + Math.round(ph), 4, 3, o.tail, 0.1);
    R(g, 6 * b, -18 * b, 10, 9, o.head, 0.12);
    R(g, 15 * b, -13 * b, 4, 3, o.snout ?? o.head, 0.1);
    R(g, 7 * b, -21 * b, 2, 4, o.ear, 0, false);
    R(g, 12 * b, -21 * b, 2, 4, o.ear, 0, false);
    eye1(g, 11 * b, -16 * b, 2, 3, INK);
  } else {
    R(g, -4 * b, -4, 3, 4, o.legs, 0.1);
    R(g, 1 * b, -4, 3, 4, shade(o.legs, -0.1), 0.1);
    R(g, -5 * b, -12 * b, 10 * b, 9 * b, o.body, 0.14);
    if (g.v === "f") {
      R(g, -5, -21 * b, 10, 10, o.head, 0.12);
      R(g, -2, -14 * b, 4, 3, o.snout ?? o.head, 0.1);
      R(g, -6, -24 * b, 2, 4, o.ear, 0, false);
      R(g, 4, -24 * b, 2, 4, o.ear, 0, false);
      eyes(g, 0, -18 * b, 6, INK, 1);
    } else R(g, -1, -9 * b, 2, 5, o.tail, 0, false);
  }
}

function wingPair(g: G, y: number, span: number, col: string, speed: number) {
  const up = Math.sin(g.t * speed) * 3;
  if (g.v === "s") R(g, -3, y - 4 + up, 7, 6, col, 0.1);
  else {
    R(g, -span - 3, y + up, span, 4, col, 0.1);
    R(g, 3, y + up, span, 4, col, 0.1);
  }
}

// ── Look table ──────────────────────────────────────────────────────────

const LOOKS: Record<string, (g: G) => void> = {
  dew: (g) => slime(g, "#4a8ae8", "#9ec4ff", "#2a5ac0"),
  poring: (g) => slime(g, "#f6a6c0", "#ffe0ea", "#e07a9e"),
  drops: (g) => slime(g, "#f0a13a", "#ffd69a", "#d07a18", (gg, h) => R(gg, -1, -h - 3, 2, 3, "#3a8a32", 0, false)),
  poporing: (g) =>
    slime(g, "#6cc04a", "#b8f08a", "#3a8a2a", (gg, h) => {
      R(gg, -4, -h - 2, 3, 3, "#8a4ac0", 0, false);
      R(gg, 2, -h - 1, 3, 2, "#8a4ac0", 0, false);
    }),
  hare: (g) => quad(g, { body: "#b08658", head: "#c09468", ear: "#d8b48a", tail: "#f2eee6", legs: "#8a6a44", big: 0.9 }),
  lunatic: (g) => quad(g, { body: "#f2eee6", head: "#fffaf0", ear: "#e87a8a", tail: "#ffffff", legs: "#d9d4c8", big: 0.9 }),
  wasp: (g) => bee(g, "#f0c030", "#2a2118", 0.9),
  hornet: (g) => bee(g, "#d8602a", "#2a1a10", 1.1),
  wolf: (g) => quad(g, { body: "#c8a060", head: "#d4ae6c", ear: "#8a6a3a", tail: "#a8844a", legs: "#8a6a3a", big: 1.15, snout: "#e0c088" }),
  thorn: (g) => {
    R(g, -6, -10, 12, 10, "#7a5632", 0.16);
    R(g, -7, -12, 14, 3, "#5a8a30", 0.18);
    for (const x of [-5, -1, 3]) R(g, x, -16 + Math.round(Math.sin(g.t * 3 + x) * 0.6), 2, 4, "#c04a3a", 0, false);
    eyes(g, 0, -7, 5, INK, 2);
  },
  willow: (g) => {
    const sway = Math.round(Math.sin(g.t * (g.m ? 8 : 2)) * 1);
    R(g, -5, -12, 10, 12, "#7a5632", 0.16);
    R(g, -8 + sway, -22, 16, 10, "#3a8a32", 0.2);
    R(g, -5 + sway, -26, 10, 5, "#4a9a3a", 0.2);
    R(g, -8, -9, 3, 3, "#6a4a2a", 0, false);
    R(g, 5, -9, 3, 3, "#6a4a2a", 0, false);
    eyes(g, 0, -9, 5, INK, 2);
    if (g.v !== "b") R(g, -1, -5, 2, 1, INK, 0, false);
  },
  fabre: (g) => {
    const w = (i: number) => Math.round(Math.sin(g.t * (g.m ? 9 : 3) + i) * 1);
    if (g.v === "s") {
      for (let i = 0; i < 4; i++) R(g, -9 + i * 4, -6 + w(i), 5, 6, i % 2 ? "#5ab840" : "#6ac850", 0.14);
      R(g, 7, -9 + w(4), 6, 6, "#7ad860", 0.14);
      R(g, 11, -7, 1, 1, INK, 0, false);
      R(g, 8, -11, 1, 3, INK, 0, false);
    } else {
      R(g, -5, -9, 10, 9, "#6ac850", 0.14);
      R(g, -4, -5, 8, 5, "#5ab840", 0.14);
      eyes(g, 0, -7, 5, INK, 2);
    }
  },
  pupa: (g) => {
    R(g, -6, -14, 12, 14, "#d8c060", 0.14);
    R(g, -6, -10, 12, 1, "#a8903a", 0, false);
    R(g, -6, -6, 12, 1, "#a8903a", 0, false);
    R(g, -4, -17, 8, 3, "#e4cc70", 0.14);
    eyes(g, 0, -12, 5, INK, 1);
  },
  rocker: (g) => {
    const j = Math.round(Math.abs(sw(g, 8)) * 2);
    if (g.v === "s") {
      R(g, -8, -9 - j, 12, 6, "#6ab030", 0.16);
      R(g, 4, -12 - j, 6, 6, "#7ac040", 0.14);
      R(g, 8, -10 - j, 1, 1, INK, 0, false);
      R(g, 8, -16 - j, 1, 4, "#4a7a20", 0, false);
      R(g, -9, -3 - j, 7, 3, "#4a8a22", 0.1);
      R(g, 2, -4, 2, 4, "#4a8a22", 0.1);
    } else {
      R(g, -5, -10 - j, 10, 9, "#6ab030", 0.16);
      R(g, -3, -16 - j, 6, 6, "#7ac040", 0.14);
      eyes(g, 0, -14 - j, 3, INK, 1);
      R(g, -7, -4, 2, 4, "#4a8a22", 0, false);
      R(g, 5, -4, 2, 4, "#4a8a22", 0, false);
    }
  },
  creamy: (g) => {
    const fl = Math.abs(Math.sin(g.t * (g.m ? 10 : 6)));
    const ww = g.v === "s" ? 4 : 5 + fl * 5;
    R(g, -1, -10, 2, 9, "#4a3a2a", 0, false);
    if (g.v === "s") R(g, -2, -16 + fl * 3, 4, 8, "#f0a850", 0.12);
    else {
      R(g, -ww - 1, -16 + fl * 2, ww, 9, "#f0a850", 0.12);
      R(g, 1, -16 + fl * 2, ww, 9, "#f0a850", 0.12);
      R(g, -ww - 1, -9, ww - 1, 5, "#f8d890", 0.1);
      R(g, 2, -9, ww - 1, 5, "#f8d890", 0.1);
    }
    eyes(g, 0, -10, 2, INK, 1);
  },
  condor: (g) => {
    R(g, -4, -10, 8, 9, "#8a6a4a", 0.14);
    R(g, -3, -16, 6, 6, "#a0805a", 0.14);
    if (g.v !== "b") R(g, g.v === "s" ? 2 : -1, -13, 2, 2, "#e8b030", 0, false);
    eyes(g, 0, -15, 3, INK, 1);
    wingPair(g, -12, 8, "#6a4a30", 14);
    R(g, -1, -2, 2, 3, "#e8b030", 0, false);
  },
  familiar: (g) => {
    R(g, -4, -10, 8, 8, "#5a3a7a", 0.14);
    R(g, -4, -16, 8, 6, "#6a4a8a", 0.14);
    R(g, -4, -18, 2, 3, "#4a2a6a", 0, false);
    R(g, 2, -18, 2, 3, "#4a2a6a", 0, false);
    eyes(g, 0, -14, 4, "#ff6a6a", 1);
    wingPair(g, -12, 9, "#3a2a5a", 13);
  },
  peco: (g) => {
    const lg = Math.round(sw(g) * 2);
    if (g.v === "s") {
      R(g, -3 + lg, -10, 1, 10, "#e8a830", 0, false);
      R(g, 2 - lg, -10, 1, 10, "#e8a830", 0, false);
      R(g, -6, -19, 13, 9, "#f0c840", 0.14);
      R(g, -9, -18, 4, 4, "#e0b030", 0.12);
      R(g, 4, -27, 4, 9, "#f0c840", 0.14);
      R(g, 4, -31, 6, 5, "#f8d850", 0.14);
      R(g, 9, -29, 4, 2, "#e87a30", 0, false);
      R(g, 7, -30, 1, 1, INK, 0, false);
      R(g, -3, -16, 5, 4, "#d8a830", 0.1);
    } else {
      R(g, -3, -10, 1, 10, "#e8a830", 0, false);
      R(g, 2, -10, 1, 10, "#e8a830", 0, false);
      R(g, -5, -20, 10, 10, "#f0c840", 0.14);
      R(g, -2, -28, 4, 8, "#f0c840", 0.14);
      R(g, -3, -32, 6, 5, "#f8d850", 0.14);
      if (g.v === "f") {
        R(g, -1, -29, 2, 2, "#e87a30", 0, false);
        eyes(g, 0, -31, 3, INK, 1);
      }
    }
  },
  scorpion: (g) => {
    const tw = Math.round(Math.sin(g.t * (g.m ? 8 : 3)));
    const c = "#b0502a";
    if (g.v === "s") {
      R(g, -6, -7, 12, 5, c, 0.14);
      R(g, 5, -8, 5, 4, shade(c, 0.1), 0.14);
      R(g, 9, -10, 4, 3, shade(c, 0.1), 0.14);
      R(g, -8, -10 + tw, 3, 4, c, 0.12);
      R(g, -10, -15 + tw, 3, 6, c, 0.12);
      R(g, -9, -18 + tw, 4, 3, c, 0.12);
      R(g, -6, -17 + tw, 2, 1, "#f0e060", 0, false);
      for (let i = 0; i < 3; i++) R(g, -4 + i * 4, -2, 1, 2, "#7a3a1a", 0, false);
    } else {
      R(g, -6, -8, 12, 7, c, 0.14);
      R(g, -9, -10, 4, 4, shade(c, 0.1), 0.14);
      R(g, 5, -10, 4, 4, shade(c, 0.1), 0.14);
      R(g, -2, -14 + tw, 4, 6, c, 0.12);
      R(g, -1, -17 + tw, 2, 3, "#f0e060", 0, false);
      eyes(g, 0, -6, 5, INK, 1);
    }
  },
  goldbug: (g) => {
    const j = Math.round(Math.abs(sw(g, 6)));
    const gold = "#f0c82a";
    if (g.v === "s") {
      R(g, -9, -13 - j, 18, 10, gold, 0.14);
      R(g, -8, -13 - j, 16, 2, "#fff0a0", 0, false);
      R(g, 8, -10 - j, 6, 6, "#4a3a10", 0.12);
      R(g, 12, -9 - j, 1, 1, "#ff4a2a", 0, false);
      R(g, 13, -14 - j, 1, 4, "#4a3a10", 0, false);
      for (let i = 0; i < 3; i++) R(g, -6 + i * 5, -3, 2, 3, "#4a3a10", 0, false);
    } else {
      R(g, -8, -13 - j, 16, 11, gold, 0.14);
      R(g, -8, -13 - j, 16, 2, "#fff0a0", 0, false);
      R(g, 0, -13 - j, 1, 11, "#a88a10", 0, false);
      if (g.v === "f") {
        R(g, -4, -8, 8, 5, "#4a3a10", 0.12);
        eyes(g, 0, -7, 4, "#ff4a2a", 1);
      }
      R(g, -9, -4, 2, 4, "#4a3a10", 0, false);
      R(g, 7, -4, 2, 4, "#4a3a10", 0, false);
    }
  },
  zombie: (g) => humanoid(g, { skin: "#5f9a50", shirt: "#3a7a8a", pants: "#3a3a8a", armsFwd: true, eye: "#1a2a1a", rot: true }),
  skeleton: (g) => humanoid(g, { skin: "#dcd8c8", shirt: "#cfcbbb", pants: "#cfcbbb", weapon: "bow", ribs: true, eye: "#1a1a1a", armsFwd: true }),
  goblin: (g) => humanoid(g, { skin: "#7ab040", shirt: "#8a5a32", pants: "#5a3a22", weapon: "club", eye: "#2a1a10", ears: true, headW: 8 }),
  orc: (g) => orc(g, { skin: "#6e9a3e", armor: "#8a8f9a", cloth: "#6b442c", weapon: "axe" }),
  orczombie: (g) => orc(g, { skin: "#7a8a62", armor: "#5a5a50", cloth: "#4a4a3a", weapon: "club", rot: true }),
  orcskeleton: (g) => orc(g, { skin: "#efe9d8", armor: "#7a5a3a", cloth: "#6a6a62", weapon: "axe", bone: true, rot: true }),
  orchero: (g) => orc(g, { skin: "#5a8a30", armor: "#e4b15a", cloth: "#7a2a22", weapon: "axe", boss: true }),
};

export function hasLook(look: string | undefined): look is string {
  return Boolean(look && LOOKS[look]);
}

export function drawCreature(ctx: Ctx, look: string, t: number, moving: boolean, dir: number, size: number, flash: number, atk = -1) {
  const fn = LOOKS[look];
  if (!fn) return;
  const { c } = scratch();
  const f = Math.max(0.7, size / 66);
  if (dir === 1) c.scale(-1, 1);
  fn({ c, f, t, m: moving ? 1 : 0, v: dir === 3 ? "b" : dir === 0 ? "f" : "s", atk });
  castShadowScratch(ctx);
  blitScratch(ctx, flash);
}
