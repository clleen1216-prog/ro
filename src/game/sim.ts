import { castVfx, stepVfx } from "@/game/vfx";
import { followSnapshots, isPartyMate, net, netTick, send as netSend, sendHit } from "@/game/net";
import { EPX } from "@/game/blocky";
import { sfxBow, sfxCrit, sfxCast, sfxDown, sfxFoot, sfxHeal, sfxHit, sfxMiss, sfxPickup, sfxPortal, sfxSwing } from "@/game/audio";
import { ITEMS, MONSTERS, SKILLS, TILE, getMap, isBlocked } from "@/game/content";
import type { BuffStat, Dir, Drop, MapId, Monster, SkillDef, SkillId } from "@/game/types";
import { INV_CAP, autoEquip, bump, burst, derive, dust, enterMap, float, grantKill, log, openNpc, useStack, world } from "@/game/world";

function logPickup(name: string, rare?: boolean) {
  log(rare ? `Rare drop! You picked up ${name}.` : `Picked up ${name}.`);
}

function held() {
  return world.qaKeys ?? world.keys;
}

function tileOf(x: number, y: number) {
  return { tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) };
}

function lineClear(x0: number, y0: number, x1: number, y1: number) {
  const map = getMap(world.mapId);
  const distPx = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(distPx / 10));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (isBlocked(map, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

function smoothPath(start: { x: number; y: number }, pts: { x: number; y: number }[]) {
  const all = [start, ...pts];
  if (all.length <= 2) return pts;
  const kept: { x: number; y: number }[] = [];
  let i = 0;
  while (i < all.length - 1) {
    let j = all.length - 1;
    while (j > i + 1 && !lineClear(all[i]!.x, all[i]!.y, all[j]!.x, all[j]!.y)) j--;
    kept.push(all[j]!);
    i = j;
  }
  return kept;
}

function pathTo(x: number, y: number) {
  const map = getMap(world.mapId);
  const p = world.player;
  if (!p) return [] as { x: number; y: number }[];
  const nearest = (sx: number, sy: number) => {
    if (!isBlocked(map, (sx + 0.5) * TILE, (sy + 0.5) * TILE)) return { x: sx, y: sy };
    for (let r = 1; r <= 5; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const nx = sx + dx;
          const ny = sy + dy;
          if (!isBlocked(map, (nx + 0.5) * TILE, (ny + 0.5) * TILE)) return { x: nx, y: ny };
        }
      }
    }
    return { x: sx, y: sy };
  };
  const start = tileOf(p.x, p.y);
  const goal = nearest(Math.floor(x / TILE), Math.floor(y / TILE));
  const gx = goal.x;
  const gy = goal.y;
  const exact =
    !isBlocked(map, x, y) && Math.floor(x / TILE) === gx && Math.floor(y / TILE) === gy
      ? { x, y }
      : { x: (gx + 0.5) * TILE, y: (gy + 0.5) * TILE };
  if (start.tx === gx && start.ty === gy) return [exact];
  const cols = map.cols;
  const rows = map.rows;
  const key = (tx: number, ty: number) => ty * cols + tx;
  const blocked = (tx: number, ty: number) =>
    tx < 0 || ty < 0 || tx >= cols || ty >= rows || isBlocked(map, (tx + 0.5) * TILE, (ty + 0.5) * TILE);
  const heuristic = (tx: number, ty: number) => {
    const dx = Math.abs(tx - gx);
    const dy = Math.abs(ty - gy);
    const diag = Math.min(dx, dy);
    return diag * 1.414 + (Math.max(dx, dy) - diag);
  };
  const startK = key(start.tx, start.ty);
  const goalK = key(gx, gy);
  const gscore = new Map<number, number>([[startK, 0]]);
  const parent = new Map<number, number>();
  const open = [startK];
  const closed = new Set<number>();
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  let guard = 0;
  while (open.length && guard < 4000) {
    guard++;
    let bestI = 0;
    let bestF = Infinity;
    for (let i = 0; i < open.length; i++) {
      const k = open[i]!;
      const tx = k % cols;
      const ty = (k / cols) | 0;
      const f = (gscore.get(k) ?? 0) + heuristic(tx, ty);
      if (f < bestF) {
        bestF = f;
        bestI = i;
      }
    }
    const cur = open.splice(bestI, 1)[0]!;
    if (closed.has(cur)) continue;
    closed.add(cur);
    if (cur === goalK) {
      const pts: { x: number; y: number }[] = [];
      let walk: number | undefined = cur;
      while (walk !== undefined && walk !== startK) {
        const wx = walk % cols;
        const wy = (walk / cols) | 0;
        pts.push({ x: (wx + 0.5) * TILE, y: (wy + 0.5) * TILE });
        walk = parent.get(walk);
      }
      pts.reverse();
      if (pts.length) pts[pts.length - 1] = exact;
      return smoothPath({ x: p.x, y: p.y }, pts);
    }
    const cx = cur % cols;
    const cy = (cur / cols) | 0;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx!;
      const ny = cy + dy!;
      if (blocked(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (blocked(cx + dx!, cy) || blocked(cx, cy + dy!))) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const cost = (gscore.get(cur) ?? 0) + (dx !== 0 && dy !== 0 ? 1.414 : 1);
      if (cost < (gscore.get(nk) ?? 1e9)) {
        gscore.set(nk, cost);
        parent.set(nk, cur);
        open.push(nk);
      }
    }
  }
  return [];
}

function face(dx: number, dy: number): Dir {
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 1 : 2;
  return dy < 0 ? 3 : 0;
}

function faceHold(dx: number, dy: number, prev: Dir): Dir {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax > ay * 1.35) return dx < 0 ? 1 : 2;
  if (ay > ax * 1.35) return dy < 0 ? 3 : 0;
  return prev;
}

function travel(dx: number, dy: number, dist: number) {
  const p = world.player;
  if (!p || dist <= 0) return 0;
  const map = getMap(world.mapId);
  const len = Math.hypot(dx, dy) || 1;
  const vx = (dx / len) * dist;
  const vy = (dy / len) * dist;
  const ox = p.x;
  const oy = p.y;
  let slid = false;
  if (!isBlocked(map, p.x + vx, p.y)) {
    p.x += vx;
    slid = true;
  }
  if (!isBlocked(map, p.x, p.y + vy)) {
    p.y += vy;
    slid = true;
  }
  if (slid) p.dir = faceHold(vx, vy, p.dir);
  return Math.hypot(p.x - ox, p.y - oy);
}

function followPath(budget: number) {
  const p = world.player;
  if (!p) return 0;
  let moved = 0;
  let guard = 0;
  while (budget > 0.25 && world.path.length && guard < 8) {
    guard++;
    const pt = world.path[0]!;
    const dx = pt.x - p.x;
    const dy = pt.y - p.y;
    const len = Math.hypot(dx, dy);
    if (len < 4) {
      world.path.shift();
      continue;
    }
    const stepLen = Math.min(budget, len);
    const got = travel(dx, dy, stepLen);
    if (got < Math.min(0.35, stepLen * 0.3)) {
      world.path = [];
      world.repath = 0.28;
      break;
    }
    moved += got;
    budget -= stepLen;
    if (Math.hypot(pt.x - p.x, pt.y - p.y) < 4) world.path.shift();
  }
  return moved;
}

// Movement smoothing: the character eases into a run and slides to a stop
// instead of snapping between standing and full speed.
let gain = 0;
let lastMx = 0;
let lastMy = 1;
let dustAcc = 0;

function noteSteps(movedPx: number) {
  const p = world.player;
  if (!p) return;
  if (movedPx > 0.4) {
    p.anim += movedPx / 26;
    world.foot += movedPx;
    dustAcc += movedPx;
    if (world.foot > 54) {
      world.foot = 0;
      sfxFoot();
    }
    if (dustAcc > 34) {
      dustAcc = 0;
      dust(p.x + (Math.random() - 0.5) * 8, p.y - 1, getMap(world.mapId).ground[Math.floor(p.y / TILE) * getMap(world.mapId).cols + Math.floor(p.x / TILE)] ?? 0);
    }
  }
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function monsterById(id: string | null) {
  if (!id) return null;
  return world.monsters.find((m) => m.id === id && m.alive) ?? null;
}

export function basicAttack() {
  const p = world.player;
  if (!p || p.downFor > 0) return;
  const target = monsterById(world.targetId);
  if (!target) return;
  const d = derive(p);
  if (dist(p.x, p.y, target.x, target.y) > d.range + 8) return;
  if (p.attackCd > 0) return;
  p.sit = false;
  p.feign = 0;
  p.dir = face(target.x - p.x, target.y - p.y);
  p.attackCd = d.aspd;
  const weapon = p.eq.weapon ? ITEMS[p.eq.weapon] : undefined;
  const kind = weapon?.weapon;
  const ranged = kind === "bow" || kind === "staff" || kind === "harp";
  const magicHit = kind === "staff" || kind === "harp";
  world.swingMax = ranged ? Math.max(0.4, Math.min(0.62, d.aspd * 0.55)) : Math.max(0.26, Math.min(0.42, d.aspd * 0.45));
  p.swing = world.swingMax;
  const rel = world.swingMax * (kind === "bow" ? 0.55 : kind === "staff" || kind === "harp" ? 0.5 : kind === "dagger" || kind === "katar" || kind === "spear" || kind === "knuckle" ? 0.45 : 0.4);
  const dd = dist(p.x, p.y, target.x, target.y);
  const fl = ranged ? dd / (kind === "bow" ? 1000 : 720) : 0;
  const px0 = p.x;
  const py0 = p.y;
  later(rel, () => {
    if (kind === "bow") sfxBow();
    else if (kind === "staff" || kind === "harp") sfxCast();
    else sfxSwing();
    if (ranged) shoot(kind === "bow" ? "arrow" : "bolt", p.x + Math.sign(target.x - px0) * 14, p.y - 40, target.x, target.y - 34, kind === "bow" ? "#e8dcb8" : weapon?.tint ?? "#8fb4ff", Math.max(0.05, fl));
  });
  const hitChance = Math.max(0.25, Math.min(0.97, d.hit / (d.hit + 8 + MONSTERS[target.kind]!.level * 2)));
  if (Math.random() > hitChance) {
    later(rel + fl, () => {
      float(target.x, target.y - 56, "Miss", "#b7ad9c");
      sfxMiss();
    });
    return;
  }
  const st = MONSTERS[target.kind]!;
  let raw = magicHit ? d.matk * 0.95 + d.atk * 0.4 - st.mdef * 0.5 : d.atk - st.def * 0.55;
  raw *= 0.9 + Math.random() * 0.2;
  let crit = false;
  if (Math.random() * 100 < d.crit) {
    raw *= 1.7;
    crit = true;
  }
  const dmg = Math.max(1, Math.round(raw));
  later(rel + fl, () => {
    if (!target.alive) return;
    hurtNow(target, dmg, crit ? CRIT : magicHit ? "#bcd4ff" : "#f6f0e4");
    sfxHit();
    world.shake = Math.min(5, world.shake + (crit ? 3 : 1.4));
  });
}

const laterQ: { t: number; fn: () => void }[] = [];
let hitDelay = 0;

function later(sec: number, fn: () => void) {
  laterQ.push({ t: sec, fn });
}

function shoot(kind: string, fx: number, fy: number, tx: number, ty: number, color: string, dur: number) {
  world.shots.push({ kind, x: fx, y: fy, tx, ty, t: 0, dur, color });
}

function runLater(dt: number) {
  for (let i = laterQ.length - 1; i >= 0; i--) {
    const q = laterQ[i]!;
    q.t -= dt;
    if (q.t <= 0) {
      laterQ.splice(i, 1);
      q.fn();
    }
  }
  for (const sh of world.shots) sh.t += dt;
  world.shots = world.shots.filter((sh) => sh.t < sh.dur);
}

function hurtMonster(m: Monster, dmg: number, color: string) {
  if (hitDelay > 0) {
    later(hitDelay, () => {
      if (m.alive) hurtNow(m, dmg, color);
    });
    return;
  }
  hurtNow(m, dmg, color);
}

const CRIT = "#ffcf3a";

function hurtNow(m: Monster, dmg: number, color: string, by?: string) {
  const st = MONSTERS[m.kind]!;
  const p = world.player;
  if (!m.alive) return;
  m.hp -= dmg;
  m.hurt = 0.2;
  m.aggro = st.behavior !== "skittish";
  m.windup = 0;
  const isCrit = color === CRIT;
  burst(m.x, m.y - 36, color);
  const big = dmg >= st.hp * 0.25 || color === "#e4b15a";
  if (isCrit) {
    for (let i = 0; i < 3; i++) burst(m.x + (Math.random() - 0.5) * 22, m.y - 36 + (Math.random() - 0.5) * 22, i === 1 ? "#ffffff" : "#ff7a2a");
    world.crits.push({ x: m.x, y: m.y - 38, t: 0 });
    float(m.x + (Math.random() - 0.5) * 10, m.y - 66, `${dmg}!`, CRIT, true, true);
    float(m.x, m.y - 112, "CRITICAL!", "#ff6a2a", false);
    world.hitStop = Math.max(world.hitStop, 0.075);
    world.shake = Math.min(11, world.shake + 6);
    world.flash = Math.min(0.35, world.flash + 0.22);
    m.hurt = 0.32;
    sfxCrit();
  } else float(m.x + (Math.random() - 0.5) * 14, m.y - 64, String(dmg), color, big);
  if (p && !st.boss) {
    const dx = m.x - p.x;
    const dy = m.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const k = isCrit ? 210 : big ? 150 : 90;
    m.kbx = (dx / len) * k;
    m.kby = (dy / len) * k;
  }
  if (net.active && !net.host) {
    // the host owns monster life and death; we only show the hit and report it
    if (!by) sendHit(m.id, dmg, color);
    if (m.hp <= 0) m.hp = 1;
    return;
  }
  if (m.hp <= 0) {
    m.alive = false;
    m.dyingT = 0.6;
    m.deadUntil = (st.respawn ?? 10) * (st.boss || st.mini ? 1 : 0.6);
    if (net.active) {
      const killer = by ?? net.id ?? "";
      netSend({ t: "kill", kind: m.kind, x: Math.round(m.x), y: Math.round(m.y), killer });
      onKill(killer, m.kind, m.x, m.y);
    } else grantKill(m.kind, m.x, m.y);
    world.targetId = world.targetId === m.id ? null : world.targetId;
  }
}

function runFx(sk: SkillDef, lv: number, d: ReturnType<typeof derive>, target: Monster | null): boolean {
  const p = world.player!;
  const fx = sk.fx!;
  if (fx.t === "heal") {
    healSelf(Math.round((fx.heal! + (fx.hr ?? 0) * lv) * (1 + d.int / 60)));
    for (const b of fx.buff ?? []) addBuff(b.stat, b.a + b.ar * lv, b.dur);
    burst(p.x, p.y - 30, "#9ae08a");
    return true;
  }
  if (fx.t === "buff") {
    for (const b of fx.buff ?? []) addBuff(b.stat, Math.round(b.a + b.ar * lv), b.dur);
    if (fx.hide) {
      p.feign = 0;
      world.targetId = null;
      world.path = [];
      for (const m of world.monsters) m.aggro = false;
    }
    burst(p.x, p.y - 30, "#e4b15a");
    return true;
  }
  const st = (m: Monster) => MONSTERS[m.kind]!;
  const hitOne = (m: Monster, order: number, mult: number) => {
    const hits = Math.max(1, Math.round((fx.n ?? 1) + (fx.nr ?? 0) * lv));
    for (let i = 0; i < hits; i++) {
      later(hitDelay + i * 0.09 + order * 0.04, () => {
        if (!m.alive) return;
        const defv = fx.ign ? 0 : fx.mg ? st(m).mdef * 0.35 : st(m).def * 0.4;
        let raw = (fx.mg ? d.matk : d.atk * (1 + (fx.dexBonus ?? 0) * d.dex)) * mult * (0.92 + Math.random() * 0.16) - defv;
        let crit = false;
        if (!fx.mg && Math.random() * 100 < d.crit * 0.5 + (fx.crit ?? 0)) {
          raw *= 1.6;
          crit = true;
        }
        if (!fx.mg && Math.random() > Math.min(0.99, 0.72 + d.hit / 500)) {
          float(m.x, m.y - 56, "Miss", "#b7ad9c");
          sfxMiss();
          return;
        }
        hurtNow(m, Math.max(1, Math.round(raw)), crit ? CRIT : fx.col ?? "#f6f0e4");
        sfxHit();
      });
    }
    later(hitDelay + 0.02, () => {
      if (!m.alive) return;
      if (fx.stun) {
        m.cd = Math.max(m.cd, fx.stun + (fx.sr ?? 0) * lv);
        m.windup = 0;
        float(m.x, m.y - 74, "Stun", "#f0e07a");
      }
      if (fx.psn) {
        m.poison = fx.psn + (fx.pr ?? 0) * lv;
        m.psnDps = Math.max(1, Math.round(d.atk * 0.22));
        m.psnT = 1;
      }
      if (fx.kb) {
        const dx = m.x - p.x;
        const dy = m.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const map = getMap(world.mapId);
        const nx = m.x + (dx / len) * 34;
        const ny = m.y + (dy / len) * 34;
        if (!isBlocked(map, nx, m.y)) m.x = nx;
        if (!isBlocked(map, m.x, ny)) m.y = ny;
      }
    });
  };
  let mult = (fx.m ?? 1) + (fx.r ?? 0) * lv;
  if (fx.all) {
    mult += Math.min(6, p.sp / 30);
    p.sp = 0;
  }
  if (fx.t === "hit") {
    if (!target) return false;
    p.dir = face(target.x - p.x, target.y - p.y);
    hitOne(target, 0, mult);
    if (fx.loot) {
      const gain = Math.round((10 + st(target).level * 3) * (0.6 + lv * 0.25));
      later(hitDelay + 0.1, () => {
        p.marks += gain;
        float(p.x, p.y - 74, `+${gain}z`, "#e4b15a");
      });
    }
    return true;
  }
  // area
  const origin = fx.self ? p : target ?? p;
  const radius = (fx.rad ?? 90) + (fx.rr ?? 0) * lv;
  let hits = 0;
  for (const m of world.monsters) {
    if (!m.alive || dist(origin.x, origin.y, m.x, m.y) > radius) continue;
    hitOne(m, hits, mult);
    hits++;
  }
  if (hits === 0) {
    float(p.x, p.y - 40, "No one there", "#b7ad9c");
    return false;
  }
  if (fx.self) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      burst(p.x + Math.cos(a) * radius * 0.7, p.y - 20 + Math.sin(a) * radius * 0.35, fx.col ?? "#f6f0e4");
    }
  }
  world.shake = Math.min(8, world.shake + 4);
  return true;
}

export function castSkill(id: SkillId) {
  try {
    castSkillInner(id);
  } finally {
    hitDelay = 0;
  }
}

function castSkillInner(id: SkillId) {
  const p = world.player;
  if (!p || p.downFor > 0) return;
  const sk = SKILLS[id];
  if (!sk) return;
  const lv = p.skills[id] ?? 0;
  if (lv <= 0) return;
  if (sk.target === "passive") return;
  const cost = sk.sp + Math.max(0, lv - 1) * 2;
  if (p.sp < cost) {
    float(p.x, p.y - 50, "No SP", "#3d8fd1");
    return;
  }
  const d = derive(p);
  if (sk.target !== "self") {
    let target = monsterById(world.targetId);
    if (!target) {
      target = nearestMonster(sk.target === "area" ? 160 : d.range + 20);
      if (target) world.targetId = target.id;
    }
    if (!target && sk.target === "enemy") {
      float(p.x, p.y - 50, "No target", "#f6f0e4");
      return;
    }
    if (target && sk.target === "enemy" && dist(p.x, p.y, target.x, target.y) > d.range + 24) {
      world.path = pathTo(target.x, target.y);
      return;
    }
  }
  const fxz = sk.fx?.zeny ?? 0;
  if (fxz && p.marks < fxz) {
    float(p.x, p.y - 50, "Need zeny", "#e4b15a");
    return;
  }
  p.sp -= cost;
  if (fxz) p.marks -= fxz;
  p.sit = false;
  p.feign = 0;
  p.attackCd = Math.max(p.attackCd, d.aspd * 0.75);
  world.swingMax = 0.46;
  p.swing = world.swingMax;
  sfxCast();
  const target = monsterById(world.targetId);
  {
    // skills land at the moment of release/impact, not when the key is pressed
    const wk = p.eq.weapon ? ITEMS[p.eq.weapon]?.weapon : undefined;
    const fxs = sk.fx;
    const rangedSkill = ["spark", "frost", "ember", "twin", "shower", "storm"].includes(id) || !!(fxs && fxs.shot);
    const rel = rangedSkill ? world.swingMax * (wk === "bow" ? 0.55 : 0.5) : id === "firstAid" || id === "guard" || id === "focus" || id === "playDead" || fxs?.t === "heal" || fxs?.t === "buff" ? 0 : world.swingMax * 0.4;
    const tgt = target ?? p;
    const fl = rangedSkill ? dist(p.x, p.y, tgt.x, tgt.y) / 760 : 0;
    hitDelay = rel + fl;
    if (rangedSkill) {
      const col = fxs?.col ?? (id === "frost" ? "#8fd0f0" : id === "spark" || id === "ember" ? "#ff8a3a" : id === "storm" ? "#f2e46a" : "#e8dcb8");
      const kind2 = fxs?.shot ?? (id === "twin" ? "arrow" : id === "shower" ? "rain" : id === "storm" ? "strike" : "bolt");
      later(rel, () => {
        shoot(kind2, p.x + Math.sign(tgt.x - p.x) * 14, p.y - 40, tgt.x, tgt.y - (kind2 === "rain" || kind2 === "strike" ? 0 : 34), col, Math.max(0.08, fl));
        if (id === "twin") later(0.08, () => shoot("arrow", p.x + Math.sign(tgt.x - p.x) * 14, p.y - 40, tgt.x, tgt.y - 30, col, Math.max(0.08, fl)));
      });
    }
  }
  castVfx(id, sk, p, target ?? null, later);
  if (net.active) netSend({ t: "fx", f: { id, x: Math.round(p.x), y: Math.round(p.y), tx: target ? Math.round(target.x) : undefined, ty: target ? Math.round(target.y) : undefined } });
  if (sk.fx && sk.fx.t !== "passive") {
    if (!runFx(sk, lv, d, target)) p.sp += cost;
  } else if (id === "firstAid") healSelf(8 + p.baseLevel * 3);
  else if (id === "playDead") {
    p.feign = 5.5;
    p.sit = true;
    p.swing = 0;
    world.targetId = null;
    world.path = [];
    for (const m of world.monsters) m.aggro = false;
    float(p.x, p.y - 50, "…", "#b7ad9c");
  } else if (id === "guard") {
    addBuff("def", 4 + 3 * lv, 10 + 4 * lv);
    p.invuln = Math.max(p.invuln, 0.12 * lv);
  } else if (id === "focus") {
    addBuff("hit", 8 + 5 * lv, 20);
    addBuff("flee", 6 + 4 * lv, 20);
  } else if (id === "arcCut" && target) {
    p.dir = face(target.x - p.x, target.y - p.y);
    const hitChance = Math.min(0.98, 0.55 + lv * 0.08 + d.hit / 400);
    if (Math.random() > hitChance) {
      float(target.x, target.y - 56, "Miss", "#b7ad9c");
      sfxMiss();
    } else {
      const raw = d.atk * (1.3 + 0.28 * lv) - MONSTERS[target.kind]!.def * 0.4;
      hurtMonster(target, Math.max(1, Math.round(raw)), "#f6f0e4");
      sfxHit();
    }
  } else if (id === "spark" && target) {
    p.dir = face(target.x - p.x, target.y - p.y);
    for (let bolt = 0; bolt < lv && target.alive; bolt++) {
      const raw = d.matk * (0.85 + Math.random() * 0.2) - MONSTERS[target.kind]!.mdef * 0.35;
      hurtMonster(target, Math.max(1, Math.round(raw)), "#e07a4a");
    }
    sfxHit();
  } else if (id === "twin" && target) {
    p.dir = face(target.x - p.x, target.y - p.y);
    const hit = Math.max(1, Math.round(d.atk * (0.9 + 0.24 * lv) - MONSTERS[target.kind]!.def * 0.28));
    hurtMonster(target, hit, "#f6f0e4");
    if (target.alive) hurtMonster(target, hit, "#f6f0e4");
    sfxHit();
  } else if (id === "crush" && target) {
    p.dir = face(target.x - p.x, target.y - p.y);
    const hitChance = Math.min(0.98, 0.6 + lv * 0.07 + d.hit / 400);
    if (Math.random() > hitChance) {
      float(target.x, target.y - 56, "Miss", "#b7ad9c");
      sfxMiss();
    } else {
      const map = getMap(world.mapId);
      const dirX = target.x - p.x;
      const dirY = target.y - p.y;
      const len = Math.hypot(dirX, dirY) || 1;
      const raw = d.atk * (1.6 + 0.3 * lv) - MONSTERS[target.kind]!.def * 0.4;
      const ox = target.x;
      const oy = target.y;
      hurtMonster(target, Math.max(1, Math.round(raw)), "#e4b15a");
      for (const m of world.monsters) {
        if (!m.alive || m.id === target.id) continue;
        if (dist(ox, oy, m.x, m.y) > 70 + lv * 6) continue;
        const sp = Math.max(1, Math.round(raw * 0.55));
        hurtMonster(m, sp, "#f6f0e4");
        const nx = m.x + (dirX / len) * 30;
        const ny = m.y + (dirY / len) * 30;
        if (!isBlocked(map, nx, m.y)) m.x = nx;
        if (!isBlocked(map, m.x, ny)) m.y = ny;
      }
      world.shake = Math.min(7, world.shake + 3);
      sfxHit();
    }
  } else if (id === "frost" && target) {
    p.dir = face(target.x - p.x, target.y - p.y);
    for (let bolt = 0; bolt < lv && target.alive; bolt++) {
      const raw = d.matk * (0.85 + Math.random() * 0.2) - MONSTERS[target.kind]!.mdef * 0.35;
      hurtMonster(target, Math.max(1, Math.round(raw)), "#8fd0f0");
    }
    if (target.alive) {
      target.cd = Math.max(target.cd, 1.1 + lv * 0.15);
      target.windup = 0;
      target.ease = 0;
      burst(target.x, target.y - 30, "#c8ecff");
    }
    sfxHit();
  } else if (id === "storm") {
    const origin = target ?? p;
    const radius = 100 + lv * 8;
    let hits = 0;
    for (const m of world.monsters) {
      if (!m.alive || dist(origin.x, origin.y, m.x, m.y) > radius) continue;
      for (let strike = 0; strike < 2 + Math.ceil(lv / 2) && m.alive; strike++) {
        const raw = d.matk * (0.7 + 0.12 * lv) - MONSTERS[m.kind]!.mdef * 0.3;
        hurtMonster(m, Math.max(1, Math.round(raw * (0.85 + Math.random() * 0.3))), "#f2e46a");
      }
      hits++;
    }
    if (hits === 0) {
      p.sp += cost;
      float(p.x, p.y - 40, "No one there", "#b7ad9c");
    } else {
      world.shake = Math.min(8, world.shake + 4);
      sfxHit();
    }
  } else if (id === "shower") {
    const origin = target ?? p;
    const radius = 90 + lv * 8;
    const map = getMap(world.mapId);
    let hits = 0;
    for (const m of world.monsters) {
      if (!m.alive || dist(origin.x, origin.y, m.x, m.y) > radius) continue;
      const raw = d.atk * (1.0 + 0.22 * lv) - MONSTERS[m.kind]!.def * 0.3;
      hurtMonster(m, Math.max(1, Math.round(raw)), "#f6f0e4");
      const dx = m.x - origin.x;
      const dy = m.y - origin.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = m.x + (dx / len) * 22;
      const ny = m.y + (dy / len) * 22;
      if (!isBlocked(map, nx, m.y)) m.x = nx;
      if (!isBlocked(map, m.x, ny)) m.y = ny;
      hits++;
    }
    if (hits === 0) {
      p.sp += cost;
      float(p.x, p.y - 40, "No one there", "#b7ad9c");
    } else sfxBow();
  } else if (id === "ringCut") {
    const map = getMap(world.mapId);
    const radius = 72 + lv * 6;
    let hits = 0;
    for (const m of world.monsters) {
      if (!m.alive) continue;
      if (dist(p.x, p.y, m.x, m.y) > radius) continue;
      const raw = d.atk * (1.15 + 0.22 * lv) - MONSTERS[m.kind]!.def * 0.35;
      hurtMonster(m, Math.max(1, Math.round(raw)), "#e07a4a");
      const dx = m.x - p.x;
      const dy = m.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const push = 26 + lv * 5;
      const nx = m.x + (dx / len) * push;
      const ny = m.y + (dy / len) * push;
      if (!isBlocked(map, nx, m.y)) m.x = nx;
      if (!isBlocked(map, m.x, ny)) m.y = ny;
      hits++;
    }
    if (hits === 0) {
      p.sp += cost;
      float(p.x, p.y - 40, "No one there", "#b7ad9c");
    } else {
      sfxHit();
      world.shake = Math.min(6, world.shake + 2);
    }
  } else if (id === "ember") {
    const origin = target ?? p;
    const radius = 84 + lv * 8;
    let hits = 0;
    for (const m of world.monsters) {
      if (!m.alive) continue;
      if (dist(origin.x, origin.y, m.x, m.y) <= radius) {
        const raw = d.matk * (1.35 + 0.32 * lv) - MONSTERS[m.kind]!.mdef * 0.35;
        hurtMonster(m, Math.max(1, Math.round(raw)), "#e07a4a");
        hits++;
      }
    }
    if (hits === 0) {
      p.sp += cost;
      float(p.x, p.y - 40, "No one there", "#b7ad9c");
    } else sfxHit();
  }
}

function healSelf(amount: number) {
  const p = world.player;
  if (!p) return;
  const d = derive(p);
  const before = p.hp;
  p.hp = Math.min(d.maxHp, p.hp + amount);
  float(p.x, p.y - 66, `+${p.hp - before}`, "#7dba6a");
  sfxHeal();
}

function addBuff(stat: BuffStat, amount: number, seconds: number) {
  const p = world.player;
  if (!p) return;
  p.buffs = p.buffs.filter((b) => b.stat !== stat);
  p.buffs.push({ stat, amount, until: world.time + seconds });
  float(p.x, p.y - 60, stat.toUpperCase(), "#e4b15a");
}

function nearestMonster(radius: number) {
  const p = world.player;
  if (!p) return null;
  let best: Monster | null = null;
  let bestD = radius;
  for (const m of world.monsters) {
    if (!m.alive) continue;
    const dd = dist(p.x, p.y, m.x, m.y);
    if (dd < bestD) {
      best = m;
      bestD = dd;
    }
  }
  return best;
}

export function pickAt(wx: number, wy: number) {
  const map = getMap(world.mapId);
  let best = "";
  let bestD = 42;
  for (const n of map.npcs) {
    const dd = dist(wx, wy, n.x, n.y - 14 * EPX);
    if (dd < bestD * (EPX / 3)) {
      best = `npc:${n.id}`;
      bestD = 46;
    }
  }
  for (const m of world.monsters) {
    if (!m.alive) continue;
    const dd = dist(wx, wy, m.x, m.y - 10 * EPX);
    if (dd < 40 * (EPX / 3) && dd < bestD * (EPX / 3) + 8) {
      best = `mon:${m.id}`;
      bestD = dd;
    }
  }
  return best;
}

export function pointerDown(wx: number, wy: number) {
  const p = world.player;
  if (!p || p.downFor > 0) return;
  p.sit = false;
  const hit = pickAt(wx, wy);
  if (hit.startsWith("npc:")) {
    const id = hit.slice(4);
    const npc = getMap(world.mapId).npcs.find((n) => n.id === id);
    world.targetId = null;
    world.pendingTalk = id;
    world.path = pathTo(npc ? npc.x : wx, npc ? npc.y : wy);
    return;
  }
  if (hit.startsWith("mon:")) {
    world.pendingTalk = null;
    world.targetId = hit.slice(4);
    world.path = [];
    return;
  }
  world.targetId = null;
  world.pendingTalk = null;
  world.path = pathTo(wx, wy);
  world.clickMark = { x: wx, y: wy, t: 0 };
}

let holdAt = 0;

/** Holding the mouse on open ground keeps walking toward the cursor. */
export function holdMove(wx: number, wy: number) {
  const p = world.player;
  if (!p || p.downFor > 0 || world.targetId || world.pendingTalk) return;
  if (world.time - holdAt < 0.12) return;
  holdAt = world.time;
  p.sit = false;
  world.path = pathTo(wx, wy);
  world.clickMark = { x: wx, y: wy, t: 0.35 };
}

function hurtPlayer(amount: number) {
  const p = world.player;
  if (!p || p.invuln > 0 || p.downFor > 0 || p.feign > 0) return;
  const dmg = Math.max(1, Math.round(amount));
  p.hp -= dmg;
  p.flash = 0.16;
  p.invuln = 0.35;
  float(p.x, p.y - 70, String(dmg), "#d4534a");
  world.shake = Math.min(6, world.shake + 2);
  sfxHit();
  if (p.hp <= 0) {
    p.hp = 0;
    p.downFor = 1.5;
    p.sit = false;
    p.feign = 0;
    world.targetId = null;
    world.path = [];
    sfxDown();
  }
}

function respawn() {
  const p = world.player;
  if (!p) return;
  const map = getMap("ambercross");
  if (p.job !== "novice") p.baseExp = Math.floor(p.baseExp * 0.9);
  p.downFor = 0;
  p.feign = 0;
  p.invuln = 1.6;
  const d = derive(p);
  p.hp = d.maxHp;
  p.sp = Math.floor(d.maxSp * 0.5);
  world.auto.travel = null;
  enterMap("ambercross", map.start.x, map.start.y);
  sfxPortal();
}

function creep(m: Monster, tx: number, ty: number, distPx: number) {
  const map = getMap(world.mapId);
  const dx = tx - m.x;
  const dy = ty - m.y;
  const len = Math.hypot(dx, dy) || 1;
  const vx = (dx / len) * distPx;
  const vy = (dy / len) * distPx;
  const ox = m.x;
  const oy = m.y;
  if (!isBlocked(map, m.x + vx, m.y)) m.x += vx;
  if (!isBlocked(map, m.x, m.y + vy)) m.y += vy;
  if (Math.hypot(m.x - ox, m.y - oy) < distPx * 0.3) {
    if (!isBlocked(map, ox - vy, oy)) m.x = ox - vy;
    else if (!isBlocked(map, ox + vy, oy)) m.x = ox + vy;
    if (!isBlocked(map, m.x, oy + vx)) m.y = oy + vx;
    else if (!isBlocked(map, m.x, oy - vx)) m.y = oy - vx;
  }
  const moved = Math.hypot(m.x - ox, m.y - oy);
  if (moved > 0.4) m.dir = faceHold(m.x - ox, m.y - oy, m.dir);
  return moved;
}

function separateMonsters() {
  const map = getMap(world.mapId);
  const list = world.monsters;
  for (let i = 0; i < list.length; i++) {
    const a = list[i]!;
    if (!a.alive) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j]!;
      if (!b.alive) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let d = Math.hypot(dx, dy);
      if (d < 0.01) {
        dx = 1;
        dy = 0;
        d = 1;
      }
      if (d >= 26) continue;
      const push = (26 - d) * 0.5;
      const ox = (dx / d) * push;
      const oy = (dy / d) * push;
      if (!isBlocked(map, a.x - ox, a.y)) a.x -= ox;
      if (!isBlocked(map, a.x, a.y - oy)) a.y -= oy;
      if (!isBlocked(map, b.x + ox, b.y)) b.x += ox;
      if (!isBlocked(map, b.x, b.y + oy)) b.y += oy;
    }
  }
}

/** a monster's blow lands on this hero: armor and flee apply here, on the victim's own device */
function strikePlayer(rawAtk: number, level: number) {
  const p = world.player;
  if (!p) return;
  const d = derive(p);
  const raw = (rawAtk - d.def * 0.55);
  const chance = Math.max(0.3, Math.min(0.95, (50 + level * 4) / (50 + level * 4 + d.flee)));
  if (Math.random() > chance) float(p.x, p.y - 48, "Miss", "#b7ad9c");
  else hurtPlayer(raw);
}

/** a monster died: the killer gets everything, party mates on the map get shared EXP */
function onKill(killer: string, kind: string, x: number, y: number) {
  if (!killer || killer === net.id) grantKill(kind, x, y);
  else if (isPartyMate(killer)) grantKill(kind, x, y, { mult: 0.8, loot: false });
}

net.hooks.hit = (from, mid, dmg, col) => {
  const m = monsterById(mid);
  if (m) hurtNow(m, dmg, col, from);
};
net.hooks.mhit = (raw, lvl) => strikePlayer(raw, lvl);
net.hooks.kill = onKill;
net.hooks.maxHp = () => (world.player ? derive(world.player).maxHp : 1);
net.hooks.maxSp = () => (world.player ? derive(world.player).maxSp : 1);
net.hooks.fx = (f) => {
  const sk = SKILLS[f.id as SkillId];
  if (sk) castVfx(f.id, sk, { x: f.x, y: f.y }, f.tx != null && f.ty != null ? { x: f.tx, y: f.ty } : null, later);
};

type Tgt = { x: number; y: number; hidden: boolean; down: boolean; id: string | null };

/** nearest player a monster can see: this hero or, when hosting, any other hero on the map */
function chooseTarget(m: Monster, p: NonNullable<typeof world.player>): Tgt {
  const me: Tgt = { x: p.x, y: p.y, hidden: p.downFor > 0 || p.feign > 0, down: p.downFor > 0, id: null };
  if (!net.active || !net.host) return me;
  let best = me.hidden ? null : me;
  let bd = best ? dist(m.x, m.y, me.x, me.y) : Infinity;
  for (const o of net.others.values()) {
    if (o.down) continue;
    const d = dist(m.x, m.y, o.x, o.y);
    if (d < bd) {
      bd = d;
      best = { x: o.x, y: o.y, hidden: false, down: false, id: o.id };
    }
  }
  return best ?? me;
}

function updateMonsters(dt: number) {
  const p = world.player;
  if (!p) return;
  if (net.active && !net.host) {
    followSnapshots(dt);
    return;
  }
  for (const m of world.monsters) {
    m.hurt = Math.max(0, m.hurt - dt);
    if (m.alive && (m.poison ?? 0) > 0) {
      m.poison = m.poison! - dt;
      m.psnT = (m.psnT ?? 1) - dt;
      if (m.psnT <= 0) {
        m.psnT += 1;
        hurtNow(m, m.psnDps ?? 1, "#9a5ad0");
      }
    }
    m.cd = Math.max(0, m.cd - dt);
    m.lunge = Math.max(0, m.lunge - dt);
    m.spawnT = Math.max(0, m.spawnT - dt);
    m.moving = false;
    if (m.kbx || m.kby) {
      const map = getMap(world.mapId);
      const nx = m.x + m.kbx * dt;
      const ny = m.y + m.kby * dt;
      if (!isBlocked(map, nx, m.y)) m.x = nx;
      if (!isBlocked(map, m.x, ny)) m.y = ny;
      const decay = Math.exp(-11 * dt);
      m.kbx *= decay;
      m.kby *= decay;
      if (Math.abs(m.kbx) + Math.abs(m.kby) < 4) {
        m.kbx = 0;
        m.kby = 0;
      }
    }
    if (!m.alive) {
      m.dyingT = Math.max(0, m.dyingT - dt);
      m.deadUntil -= dt;
      if (m.deadUntil <= 0) {
        m.alive = true;
        m.hp = m.maxHp;
        m.x = m.homeX;
        m.y = m.homeY;
        m.aggro = false;
        m.wanderX = m.homeX;
        m.wanderY = m.homeY;
        m.pause = 0.4 + Math.random();
        m.spawnT = 0.5;
        m.ease = 0;
        m.windup = 0;
        m.kbx = 0;
        m.kby = 0;
      }
      continue;
    }
    const st = MONSTERS[m.kind]!;
    const tg = chooseTarget(m, p);
    const hidden = tg.hidden;
    const dd = dist(m.x, m.y, tg.x, tg.y);
    const home = dist(m.x, m.y, m.homeX, m.homeY);
    if (hidden) m.aggro = false;
    if (home > 320) m.aggro = false;
    if (!hidden && !m.aggro && st.behavior === "aggressive" && dd < st.aggro) m.aggro = true;

    const reach = st.boss ? 46 : 36;
    if (!hidden && m.aggro && st.behavior !== "skittish" && dd < reach && !tg.down) {
      m.dir = face(tg.x - m.x, tg.y - m.y);
      m.moving = false;
      m.ease = Math.max(0, m.ease - dt * 10);
      m.anim += dt * 5;
      // Wind up (rear back), then strike with a lunge. Getting hit cancels it.
      if (m.windup > 0) {
        m.windup -= dt;
        if (m.windup <= 0) {
          m.lunge = 0.2;
          m.cd = st.boss ? 1.3 : 1.15;
          if (dist(m.x, m.y, tg.x, tg.y) < reach + 14) {
            if (tg.id) netSend({ t: "mhit", to: tg.id, raw: Math.round(st.atk * (0.88 + Math.random() * 0.24)), lvl: st.level });
            else strikePlayer(st.atk * (0.88 + Math.random() * 0.24), st.level);
          }
        }
      } else if (m.cd <= 0) {
        m.windup = 0.28;
      }
      continue;
    }
    m.windup = 0;

    let tx = m.wanderX;
    let ty = m.wanderY;
    let speed = st.speed * 0.5;
    if (st.speed <= 0) {
      m.anim += dt * 1.2;
      continue;
    }
    if (!hidden && m.aggro && st.behavior !== "skittish") {
      tx = tg.x;
      ty = tg.y;
      speed = st.speed;
    } else if (!hidden && st.behavior === "skittish" && dd < st.aggro + 24) {
      const dx = m.x - tg.x;
      const dy = m.y - tg.y;
      const len = Math.hypot(dx, dy) || 1;
      tx = m.x + (dx / len) * 96;
      ty = m.y + (dy / len) * 96;
      const hx = tx - m.homeX;
      const hy = ty - m.homeY;
      const hd = Math.hypot(hx, hy);
      if (hd > 150) {
        tx = m.homeX + (hx / hd) * 150;
        ty = m.homeY + (hy / hd) * 150;
      }
      speed = st.speed * 1.28;
    } else {
      m.aggro = false;
      const at = dist(m.x, m.y, m.wanderX, m.wanderY);
      if (at < 10) {
        m.pause -= dt;
        m.anim += dt * 1.6;
        if (m.pause > 0) continue;
        const ang = Math.random() * Math.PI * 2;
        const rad = 22 + Math.random() * (st.speed < 45 ? 36 : 78);
        m.wanderX = m.homeX + Math.cos(ang) * rad;
        m.wanderY = m.homeY + Math.sin(ang) * rad;
        m.pause = 0.8 + Math.random() * 1.8;
        continue;
      }
      tx = m.wanderX;
      ty = m.wanderY;
      speed = st.speed * (st.behavior === "aggressive" ? 0.42 : 0.55);
    }
    m.ease = Math.min(1, m.ease + dt * 6);
    const moved = creep(m, tx, ty, speed * dt * (0.35 + 0.65 * m.ease));
    m.moving = moved > 0.4;
    if (m.moving) m.anim += dt * (m.kind === "hare" ? 7 : 4);
    else {
      m.anim += dt * 1.4;
      m.ease = Math.max(0, m.ease - dt * 8);
    }
  }
  separateMonsters();
}

function pickups() {
  const p = world.player;
  if (!p) return;
  for (const drop of [...world.drops]) {
    if (drop.mapId !== world.mapId) continue;
    const age = world.time - (drop.born ?? -9);
    if (age < 0.45) continue;
    const dd = dist(p.x, p.y, drop.x, drop.y);
    // Loot drifts toward the player once they are close, like a magnet.
    if (world.auto.battle && dd > 20) {
      // Auto Battle: every drop on the map is drawn in, no matter how far.
      const sp = Math.min(900, 260 + dd * 1.4) * 0.016;
      drop.x += ((p.x - drop.x) / dd) * Math.min(sp, dd);
      drop.y += ((p.y - drop.y) / dd) * Math.min(sp, dd);
      drop.ttl = drop.ttl === undefined ? undefined : Math.max(drop.ttl, 5);
    } else if (dd < 110 && dd > 20) {
      const k = 1 - dd / 110;
      drop.x += ((p.x - drop.x) / dd) * 180 * k * 0.016;
      drop.y += ((p.y - drop.y) / dd) * 180 * k * 0.016;
    }
    if (dd < 26) {
      const it = ITEMS[drop.itemId];
      if (!it) continue;
      if (it.stack) {
        const have = p.inv.find((s) => s.itemId === drop.itemId);
        if (have) have.qty += drop.qty;
        else if (p.inv.length < INV_CAP) p.inv.push({ itemId: drop.itemId, qty: drop.qty });
        else continue;
      } else if (p.inv.length < INV_CAP) p.inv.push({ itemId: drop.itemId, qty: drop.qty });
      else continue;
      world.drops = world.drops.filter((d) => d.id !== drop.id);
      float(drop.x, drop.y - 20, drop.qty > 1 ? `${it.name} ×${drop.qty}` : it.name, drop.rare ? "#e4b15a" : "#f6f0e4");
      logPickup(it.name, drop.rare);
      sfxPickup();
    }
  }
}

function decayWorld(dt: number) {
  for (const f of world.floats) {
    f.y -= (f.big ? 34 : 26) * dt * (0.4 + f.life);
    f.life -= dt * (f.big ? 0.8 : 1);
  }
  world.floats = world.floats.filter((f) => f.life > 0);
  for (const part of world.particles) {
    part.x += part.vx * dt;
    part.y += part.vy * dt;
    if (part.grav) part.vy += part.grav * dt;
    if (part.puff) {
      part.vx *= 1 - 3 * dt;
      part.vy *= 1 - 3 * dt;
    }
    part.life -= dt;
  }
  world.particles = world.particles.filter((part) => part.life > 0);
  for (const drop of world.drops) {
    if (drop.ttl !== undefined) drop.ttl -= dt;
  }
  world.drops = world.drops.filter((drop) => drop.ttl === undefined || drop.ttl > 0);
}

// ── Auto battle & auto navigation ───────────────────────────────────────

function routeNext(from: MapId, to: MapId): MapId | null {
  if (from === to) return null;
  const prev = new Map<MapId, MapId>([[from, from]]);
  const queue: MapId[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const po of getMap(cur).portals) {
      if (prev.has(po.to)) continue;
      prev.set(po.to, cur);
      if (po.to === to) {
        let at: MapId = to;
        while (prev.get(at) !== from) at = prev.get(at)!;
        return at;
      }
      queue.push(po.to);
    }
  }
  return null;
}

export function setAutoBattle(on: boolean) {
  world.auto.battle = on;
  if (!on) {
    world.targetId = null;
    world.path = [];
  }
  const p = world.player;
  if (p) float(p.x, p.y - 150, on ? "Auto Battle ON" : "Auto Battle OFF", on ? "#7dba6a" : "#b7ad9c", true);
  bump();
}

export function travelTo(dest: MapId) {
  const p = world.player;
  if (!p) return;
  if (dest === world.mapId) {
    world.auto.travel = null;
    bump();
    return;
  }
  if (!routeNext(world.mapId, dest)) {
    log("No known path there.");
    return;
  }
  world.auto.travel = dest;
  world.targetId = null;
  world.pendingTalk = null;
  world.path = [];
  p.sit = false;
  log(`Auto-navigating to ${getMap(dest).name}…`);
  bump();
}

export function cancelTravel() {
  if (world.auto.travel) {
    world.auto.travel = null;
    world.path = [];
    bump();
  }
}

function drinkIfNeeded(d: ReturnType<typeof derive>) {
  const p = world.player;
  if (!p || p.itemCd > 0) return;
  const want = p.hp < d.maxHp * 0.4 ? "hp" : p.sp < d.maxSp * 0.15 ? "sp" : "";
  if (!want) return;
  let best = -1;
  let bestVal = 0;
  p.inv.forEach((st, i) => {
    const it = ITEMS[st.itemId];
    if (!it || it.slot !== "use") return;
    const v = want === "hp" ? it.heal ?? 0 : it.spRestore ?? 0;
    if (v > bestVal) {
      best = i;
      bestVal = v;
    }
  });
  if (best >= 0) useStack(best);
}

/** Returns true while auto-navigation is steering. */
function autoStep(dt: number, d: ReturnType<typeof derive>) {
  const p = world.player;
  if (!p) return false;
  const au = world.auto;
  au.skillT = Math.max(0, au.skillT - dt);
  au.pathT = Math.max(0, au.pathT - dt);
  if (au.battle || au.travel) drinkIfNeeded(d);
  au.equipT -= dt;
  if (au.battle && au.autoEquip && au.equipT <= 0) {
    au.equipT = 2;
    autoEquip(true);
  }
  if (au.travel) {
    if (world.mapId === au.travel) {
      log(`Arrived at ${getMap(au.travel).name}.`);
      au.travel = null;
      world.path = [];
      bump();
      return false;
    }
    const next = routeNext(world.mapId, au.travel);
    const portal = next ? getMap(world.mapId).portals.find((po) => po.to === next) : undefined;
    if (!portal) {
      au.travel = null;
      return false;
    }
    p.sit = false;
    world.targetId = null;
    if (!world.path.length && au.pathT <= 0) {
      world.path = pathTo(portal.x + portal.w / 2, portal.y + portal.h / 2);
      au.pathT = 0.6;
    }
    return true;
  }
  if (!au.battle) return false;
  if (world.mapId === "ambercross") {
    au.battle = false;
    float(p.x, p.y - 150, "No monsters in town — go hunting!", "#f6f0e4", true);
    bump();
    return false;
  }
  p.sit = false;
  let target = monsterById(world.targetId);
  if (!target || !target.alive) {
    world.targetId = null;
    target = nearestMonster(900);
    if (target) world.targetId = target.id;
  }
  if (target) {
    const dd = dist(p.x, p.y, target.x, target.y);
    if (au.skillT <= 0 && dd < d.range + 120) {
      const choices = (Object.keys(SKILLS) as SkillId[]).filter((id) => {
        const sk = SKILLS[id];
        const lv = p.skills[id] ?? 0;
        if (!sk || lv <= 0 || world.auto.skills[id] === false) return false;
        if (sk.target === "passive") return false;
        const buff = sk.target === "self";
        if (buff && sk.fx?.t === "heal") return p.hp < derive(p).maxHp * 0.6;
        if (buff && sk.fx?.t === "buff" && sk.fx.hide) return false;
        if (buff && sk.fx?.t === "buff" && world.auto.skills[id] === true) return !(sk.fx.buff ?? []).every((b) => p.buffs.some((x) => x.stat === b.stat && x.until > world.time + 3));
        if (buff && (id === "playDead" || id === "firstAid" || world.auto.skills[id] !== true)) return false;
        return p.sp >= sk.sp + Math.max(0, lv - 1) * 2 + 4;
      });
      if (choices.length) {
        castSkill(choices[Math.floor(Math.random() * choices.length)]!);
        au.skillT = 1.4;
      }
    }
    return false;
  }
  // nothing to fight: collect nearby loot
  let loot: Drop | null = null;
  let bestD = 520;
  for (const dr of world.drops) {
    if (dr.mapId !== world.mapId) continue;
    const dd = dist(p.x, p.y, dr.x, dr.y);
    if (dd < bestD) {
      loot = dr;
      bestD = dd;
    }
  }
  if (loot && !world.path.length && au.pathT <= 0) {
    world.path = pathTo(loot.x, loot.y);
    au.pathT = 0.5;
  }
  return false;
}

export function step(dt0: number) {
  const p = world.player;
  if (!p) return;
  // critical hits freeze the action for a beat
  let dt = dt0;
  if (world.hitStop > 0) {
    world.hitStop = Math.max(0, world.hitStop - dt0);
    dt = dt0 * 0.1;
  }
  world.flash = Math.max(0, world.flash - dt0 * 1.6);
  if (world.bossBanner) {
    world.bossBanner.t += dt0;
    if (world.bossBanner.t > 3.4) world.bossBanner = null;
  }
  stepVfx(dt0);
  netTick(dt0);
  for (const c of world.crits) c.t += dt0;
  world.crits = world.crits.filter((c) => c.t < 0.45);
  runLater(dt);
  if (p.downFor > 0) {
    p.downFor -= dt;
    updateMonsters(dt);
    decayWorld(dt);
    if (p.downFor <= 0) respawn();
    return;
  }
  p.attackCd = Math.max(0, p.attackCd - dt);
  p.itemCd = Math.max(0, p.itemCd - dt);
  p.flash = Math.max(0, p.flash - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.swing = Math.max(0, (p.swing ?? 0) - dt);
  const wasFeign = p.feign > 0;
  p.feign = Math.max(0, (p.feign ?? 0) - dt);
  if (wasFeign && p.feign <= 0) p.sit = false;
  p.buffs = p.buffs.filter((b) => b.until > world.time);
  world.portalLock = Math.max(0, world.portalLock - dt);
  world.repath = Math.max(0, world.repath - dt);
  const d = derive(p);
  if (p.hp > d.maxHp) p.hp = d.maxHp;
  if (p.sp > d.maxSp) p.sp = d.maxSp;
  // Regeneration scales with max HP/SP, VIT/INT and job. Resting is much faster.
  const rest = p.sit || p.feign > 0 ? 5 : 1;
  p.hp = Math.min(d.maxHp, p.hp + dt * d.hpRegen * rest);
  p.sp = Math.min(d.maxSp, p.sp + dt * d.spRegen * rest);
  // announce when a stat hits its hard limit
  const caps = world.capSeen;
  const noteCap = (key: "aspd" | "crit", on: boolean, msg: string) => {
    if (on && !caps[key]) {
      log(msg);
      float(p.x, p.y - 80, msg.replace(/!$/, "").toUpperCase(), "#ffcf3a", true);
    }
    caps[key] = on;
  };
  noteCap("aspd", d.aspdCap, "Attack speed at its limit!");
  noteCap("crit", d.critCap, "Critical rate at its limit!");

  const keys = held();
  let mx = 0;
  let my = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) my -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) my += 1;
  mx += world.touch.x;
  my += world.touch.y;
  const manual = Math.abs(mx) + Math.abs(my) > 0.12;
  let movedPx = 0;
  if (p.feign > 0 && !manual) {
    p.speedInstant = 0;
    p.sit = true;
  } else if (manual) {
    p.sit = false;
    p.feign = 0;
    world.path = [];
    world.pendingTalk = null;
    const mag = Math.min(1, Math.hypot(mx, my));
    gain = Math.min(1, gain + dt * 8.5);
    lastMx = mx;
    lastMy = my;
    movedPx = travel(mx, my, d.speed * dt * mag * (0.35 + 0.65 * gain));
  } else if (!p.sit && world.path.length) {
    gain = Math.min(1, gain + dt * 8.5);
    const left = world.path.reduce((acc, pt, i, arr) => acc + Math.hypot(pt.x - (i ? arr[i - 1]!.x : p.x), pt.y - (i ? arr[i - 1]!.y : p.y)), 0);
    const arrive = Math.min(1, 0.45 + left / 70);
    const before = { x: p.x, y: p.y };
    movedPx = followPath(d.speed * dt * (0.35 + 0.65 * gain) * arrive);
    if (movedPx > 0.1) {
      lastMx = p.x - before.x;
      lastMy = p.y - before.y;
    }
  } else if (gain > 0.02 && !p.sit) {
    // coast to a stop
    gain = Math.max(0, gain - dt * 13);
    if (gain > 0.02) movedPx = travel(lastMx, lastMy, d.speed * dt * gain * 0.5);
  } else {
    gain = 0;
  }
  if (manual && world.auto.travel) cancelTravel();
  if (!manual) autoStep(dt, d);
  const rawSpeed = dt > 0 ? movedPx / dt : 0;
  p.speedInstant = rawSpeed;
  noteSteps(movedPx);

  const target = monsterById(world.targetId);
  if (p.feign > 0) {
    world.targetId = null;
  } else if (target && !manual && !p.sit) {
    const dd = dist(p.x, p.y, target.x, target.y);
    if (dd <= d.range) {
      world.path = [];
      p.dir = face(target.x - p.x, target.y - p.y);
      basicAttack();
    } else if (world.repath <= 0 && (world.path.length === 0 || dist(target.x, target.y, world.chaseX, world.chaseY) > 40)) {
      const away = Math.max(26, d.range - 6);
      const dx = p.x - target.x;
      const dy = p.y - target.y;
      const len = Math.hypot(dx, dy) || 1;
      world.chaseX = target.x;
      world.chaseY = target.y;
      world.path = pathTo(target.x + (dx / len) * away, target.y + (dy / len) * away);
    }
  } else if (!target) world.targetId = null;

  if (world.pendingTalk && !manual) {
    const npc = getMap(world.mapId).npcs.find((n) => n.id === world.pendingTalk);
    if (npc && dist(p.x, p.y, npc.x, npc.y) < 64) {
      world.path = [];
      world.pendingTalk = null;
      openNpc(npc.id);
    }
  }

  if (world.touch.attack && !p.sit) {
    if (!monsterById(world.targetId)) {
      const near = nearestMonster(220);
      if (near) world.targetId = near.id;
    }
    basicAttack();
  }

  if (world.portalLock <= 0) {
    for (const portal of getMap(world.mapId).portals) {
      if (p.x >= portal.x && p.x <= portal.x + portal.w && p.y >= portal.y && p.y <= portal.y + portal.h) {
        enterMap(portal.to, portal.tx, portal.ty);
        sfxPortal();
        break;
      }
    }
  }

  pickups();
  updateMonsters(dt);
  decayWorld(dt);

  if (keys.has("Space")) basicAttack();
}

export function installProbe() {
  window.__controlsTest = {
    getX: () => world.player?.x ?? 0,
    getY: () => world.player?.y ?? 0,
    getYaw: () => world.player?.dir ?? 0,
    getSpeed: () => world.player?.speedInstant ?? 0,
    setKeys: (codes: string[]) => {
      world.qaKeys = codes.length ? new Set(codes) : null;
    },
  };
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      getY: () => number;
      setKeys?: (codes: string[]) => void;
    };
  }
}
