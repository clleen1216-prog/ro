// Multiplayer client. A tiny relay server (server/server.mjs) puts everyone on a map in a room.
// One device per map ("host") simulates the monsters and streams snapshots; the others render
// them and send their hits to the host. Parties share EXP and see each other's HP.
import { bump, world } from "@/game/world";
import { statusFlags } from "@/game/status";
import type { Dir, GearSlot, HairStyle, JobId, MapId } from "@/game/types";

export type Look = { style: HairStyle; hair: string; trim: string; job: JobId; eq: Record<GearSlot, string | null>; lv: number };
export type Remote = {
  id: string;
  name: string;
  look: Look | null;
  x: number;
  y: number;
  tx: number;
  ty: number;
  dir: Dir;
  anim: number;
  amt: number;
  atk: number;
  sit: boolean;
  down: boolean;
  hp: number;
  maxHp: number;
  /** status bitmask (see status.ts) */
  sf: number;
  seen: number;
};
export type PartyMember = { id: string; name: string; hp: number; maxHp: number; sp: number; maxSp: number; lv: number; map: string | null };
export type PartyState = { id: string; leader: string; members: PartyMember[] };

type Hooks = {
  hit?: (from: string, mid: string, dmg: number, col: string) => void;
  mhit?: (raw: number, lvl: number, sk?: number, st?: { kind: any; secs: number; power?: number } | null) => void;
  vfx?: (f: { k: string; x: number; y: number; c: string; r: number; d?: number; lb?: string }) => void;
  kill?: (killer: string, kind: string, x: number, y: number) => void;
  fx?: (f: { id: string; x: number; y: number; tx?: number; ty?: number }) => void;
  maxHp?: () => number;
  maxSp?: () => number;
};

const KEY_URL = "ro.server";
const KEY_ON = "ro.online";

function ls(k: string): string {
  try {
    return localStorage.getItem(k) ?? "";
  } catch {
    return "";
  }
}
function lsSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage optional */
  }
}

export const net = {
  status: "off" as "off" | "connecting" | "on",
  url: ls(KEY_URL) || (((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_WS_URL as string | undefined) ?? ""),
  wantOn: ls(KEY_ON) === "1",
  id: null as string | null,
  host: false,
  others: new Map<string, Remote>(),
  party: null as PartyState | null,
  invite: null as { from: string; name: string; party: string } | null,
  note: "",
  hooks: {} as Hooks,
  /** connected and in a room, so game code should route through the network */
  get active() {
    return this.status === "on";
  },
};

let ws: WebSocket | null = null;
let retryIn = 0;
let backoff = 2;
let tPos = 0;
let tMons = 0;
let tStat = 0;
let tLook = 0;
let lastLook = "";
let mapSent: MapId | null = null;
const pendingSnap: { s: number[][] | null } = { s: null };
const flagsPrev = new Map<number, number>();
const target = new Map<number, { x: number; y: number }>();

export function send(m: Record<string, unknown>) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(m));
}

function myLook(): Look | null {
  const p = world.player;
  if (!p) return null;
  return { style: p.style, hair: p.hair, trim: p.trim, job: p.job, eq: p.eq, lv: p.baseLevel };
}

function say(text: string) {
  net.note = text;
  bump();
}

export function connect(url: string) {
  disconnect(false);
  net.url = url.trim();
  lsSet(KEY_URL, net.url);
  lsSet(KEY_ON, "1");
  net.wantOn = true;
  if (!net.url) return say("Enter a server address.");
  net.status = "connecting";
  say("Connecting…");
  try {
    ws = new WebSocket(net.url);
  } catch {
    net.status = "off";
    return say("Bad server address.");
  }
  const sock = ws;
  sock.onopen = () => {
    const p = world.player;
    send({ t: "hello", name: p?.name ?? "Hero", look: myLook() });
    net.status = "on";
    backoff = 2;
    mapSent = null;
    say("Online.");
  };
  sock.onmessage = (e) => {
    try {
      onMsg(JSON.parse(String(e.data)));
    } catch {
      /* ignore bad frame */
    }
  };
  sock.onclose = () => {
    if (ws !== sock) return;
    ws = null;
    reset();
    net.status = "off";
    retryIn = net.wantOn ? backoff : 0;
    backoff = Math.min(20, backoff * 2);
    say(net.wantOn ? "Disconnected. Retrying…" : "Offline.");
  };
  sock.onerror = () => {
    /* onclose follows */
  };
}

function reset() {
  net.id = null;
  net.host = false;
  net.others.clear();
  net.party = null;
  net.invite = null;
  flagsPrev.clear();
  target.clear();
}

export function disconnect(user = true) {
  if (user) {
    net.wantOn = false;
    lsSet(KEY_ON, "0");
  }
  const s = ws;
  ws = null;
  if (s) {
    s.onclose = null;
    s.close();
  }
  reset();
  net.status = "off";
  if (user) say("Offline.");
}

function onMsg(m: Record<string, any>) {
  switch (m.t) {
    case "welcome":
      net.id = m.id;
      break;
    case "room": {
      net.others.clear();
      flagsPrev.clear();
      target.clear();
      for (const o of m.players as any[]) addRemote(o);
      net.host = m.host === net.id;
      if (net.host && m.snap) applySnap(m.snap, true);
      bump();
      break;
    }
    case "joined":
      addRemote(m.p);
      bump();
      break;
    case "left":
      net.others.delete(m.id);
      bump();
      break;
    case "look": {
      const o = net.others.get(m.id);
      if (o) o.look = m.look;
      break;
    }
    case "pos": {
      const o = net.others.get(m.id);
      if (!o) break;
      const p = m.p;
      o.tx = p.x;
      o.ty = p.y;
      o.dir = p.d;
      o.anim = p.a;
      o.amt = p.m;
      o.atk = p.k;
      o.sit = !!p.s;
      o.down = !!p.dn;
      o.hp = p.hp;
      o.maxHp = p.mx;
      o.sf = p.sf ?? 0;
      o.seen = world.time;
      break;
    }
    case "host":
      net.host = true;
      if (m.snap) applySnap(m.snap, true);
      say("You now run this map's monsters.");
      break;
    case "hostis":
      net.host = false;
      break;
    case "mons":
      if (!net.host) pendingSnap.s = m.s;
      break;
    case "hit":
      net.hooks.hit?.(m.from, m.mid, m.dmg, m.col);
      break;
    case "mhit":
      net.hooks.mhit?.(m.raw, m.lvl, m.sk, m.st ? { kind: m.st.kind, secs: m.st.secs, power: m.st.power } : null);
      break;
    case "kill":
      net.hooks.kill?.(m.killer, m.kind, m.x, m.y);
      break;
    case "fx":
      if (m.k) net.hooks.vfx?.(m as never);
      else net.hooks.fx?.(m as { id: string; x: number; y: number });
      break;
    case "party":
      net.party = m.id ? { id: m.id, leader: m.leader, members: m.members } : null;
      bump();
      break;
    case "invite":
      net.invite = { from: m.from, name: m.name, party: m.party };
      bump();
      break;
    case "note":
      say(m.text);
      break;
    case "full":
      say("That map is full.");
      break;
  }
}

function addRemote(o: any) {
  const p = o.pos ?? {};
  net.others.set(o.id, {
    id: o.id,
    name: o.name,
    look: o.look,
    x: p.x ?? 0,
    y: p.y ?? 0,
    tx: p.x ?? 0,
    ty: p.y ?? 0,
    dir: p.d ?? 0,
    anim: p.a ?? 0,
    amt: p.m ?? 0,
    atk: p.k ?? -1,
    sit: !!p.s,
    down: !!p.dn,
    hp: p.hp ?? 1,
    maxHp: p.mx ?? 1,
    sf: p.sf ?? 0,
    seen: world.time,
  });
}

export function isPartyMate(id: string | null | undefined) {
  return !!id && !!net.party?.members.some((m) => m.id === id);
}

// ───────── monster snapshots ─────────
// entry: [index, x, y, hp, dir, flags, anim, dyingT*10]
const F = { alive: 1, moving: 2, aggro: 4, hurt: 8, windup: 16, lunge: 32, stun: 64, poison: 128, enrage: 256 };

function encodeMonsters(): number[][] {
  const out: number[][] = [];
  world.monsters.forEach((m, i) => {
    const f = (m.alive ? F.alive : 0) | (m.moving ? F.moving : 0) | (m.aggro ? F.aggro : 0) | (m.hurt > 0.1 ? F.hurt : 0) | (m.windup > 0 ? F.windup : 0) | (m.lunge > 0 ? F.lunge : 0) | ((m.stunT ?? 0) > 0 ? F.stun : 0) | ((m.poison ?? 0) > 0 ? F.poison : 0) | (m.enraged ? F.enrage : 0);
    out.push([i, Math.round(m.x), Math.round(m.y), Math.max(0, Math.round(m.hp)), m.dir, f, Math.round(m.anim * 10) / 10, Math.round(m.dyingT * 10)]);
  });
  return out;
}

function applySnap(s: number[][], hard = false) {
  for (const e of s) {
    const m = world.monsters[e[0]!];
    if (!m) continue;
    const f = e[5]!;
    const alive = (f & F.alive) !== 0;
    if (m.alive && !alive) m.dyingT = 0.6;
    if (!m.alive && alive) m.spawnT = 0.5;
    m.alive = alive;
    m.hp = e[3]!;
    m.dir = e[4]! as Dir;
    m.moving = (f & F.moving) !== 0;
    m.aggro = (f & F.aggro) !== 0;
    m.windup = f & F.windup ? 0.2 : 0;
    m.lunge = f & F.lunge ? 0.2 : 0;
    m.stunT = f & F.stun ? 0.5 : 0;
    m.poison = f & F.poison ? 1 : 0;
    m.enraged = (f & F.enrage) !== 0;
    const prev = flagsPrev.get(e[0]!) ?? 0;
    if (f & F.hurt && !(prev & F.hurt)) m.hurt = 0.2;
    flagsPrev.set(e[0]!, f);
    m.anim = e[6]!;
    if (!alive) m.dyingT = Math.max(m.dyingT, e[7]! / 10);
    if (hard || !alive) {
      m.x = e[1]!;
      m.y = e[2]!;
      target.delete(e[0]!);
    } else target.set(e[0]!, { x: e[1]!, y: e[2]! });
  }
}

/** non-host: ease monsters toward the last snapshot */
export function followSnapshots(dt: number) {
  if (pendingSnap.s) {
    applySnap(pendingSnap.s);
    pendingSnap.s = null;
  }
  const k = Math.min(1, dt * 14);
  world.monsters.forEach((m, i) => {
    m.hurt = Math.max(0, m.hurt - dt);
    m.spawnT = Math.max(0, m.spawnT - dt);
    if (!m.alive) m.dyingT = Math.max(0, m.dyingT - dt);
    const t = target.get(i);
    if (t) {
      m.x += (t.x - m.x) * k;
      m.y += (t.y - m.y) * k;
    }
  });
}

// ───────── per-frame ─────────
export function netTick(dt: number) {
  const p = world.player;
  if (!p) return;
  if (net.status === "off") {
    if (net.wantOn && net.url && retryIn > 0) {
      retryIn -= dt;
      if (retryIn <= 0) connect(net.url);
    }
    return;
  }
  if (net.status !== "on" || !ws || ws.readyState !== 1) return;

  if (mapSent !== world.mapId) {
    mapSent = world.mapId;
    net.others.clear();
    net.host = false;
    flagsPrev.clear();
    target.clear();
    send({ t: "map", map: world.mapId });
  }
  // glide remote players
  const k = Math.min(1, dt * 12);
  for (const o of net.others.values()) {
    o.x += (o.tx - o.x) * k;
    o.y += (o.ty - o.y) * k;
  }

  tPos -= dt;
  if (tPos <= 0) {
    tPos = 0.1;
    const moving = p.speedInstant > 8 && p.downFor <= 0 && p.feign <= 0;
    send({
      t: "pos",
      p: {
        x: Math.round(p.x),
        y: Math.round(p.y),
        d: p.dir,
        a: Math.round(p.anim * 100) / 100,
        m: moving ? Math.min(1, p.speedInstant / 70) : 0,
        k: p.swing > 0 ? 1 - p.swing / world.swingMax : -1,
        s: p.sit || p.feign > 0 ? 1 : 0,
        dn: p.downFor > 0 ? 1 : 0,
        hp: Math.round(p.hp),
        mx: net.hooks.maxHp?.() ?? 1,
        sf: statusFlags(),
      },
    });
  }
  tStat -= dt;
  if (tStat <= 0) {
    tStat = 0.6;
    if (net.party) send({ t: "stat", s: { hp: Math.round(p.hp), maxHp: net.hooks.maxHp?.() ?? 1, sp: Math.round(p.sp), maxSp: net.hooks.maxSp?.() ?? 1, lv: p.baseLevel } });
  }
  tLook -= dt;
  if (tLook <= 0) {
    tLook = 1.5;
    const l = JSON.stringify(myLook());
    if (l !== lastLook) {
      lastLook = l;
      send({ t: "look", look: myLook() });
    }
  }
  if (net.host && net.others.size > 0) {
    tMons -= dt;
    if (tMons <= 0) {
      tMons = 0.125;
      send({ t: "mons", s: encodeMonsters() });
    }
  }
}

export function sendHit(mid: string, dmg: number, col: string) {
  send({ t: "hit", mid, dmg, col });
}
export function invitePlayer(id: string) {
  send({ t: "invite", to: id });
}
export function acceptInvite() {
  if (net.invite) send({ t: "accept", party: net.invite.party });
  net.invite = null;
  bump();
}
export function declineInvite() {
  net.invite = null;
  bump();
}
export function leaveParty() {
  send({ t: "leave" });
}
export function kickMember(id: string) {
  send({ t: "kick", id });
}
