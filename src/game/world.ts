import { sfxCoin, sfxEquip, sfxHeal, sfxLevel } from "@/game/audio";
import {
  BASE_STAT,
  ITEMS,
  JOBS,
  MONSTERS,
  SKILLS,
  canEquip,
  MAX_BASE,
  TILE as TILE_PX,
  MAX_JOB,
  expNeed,
  getMap,
  jobExpNeed,
  sellPrice,
  jobBonus,
  rollLoot,
} from "@/game/content";
import type {
  Dialog,
  Drop,
  FloatText,
  GearSlot,
  HotSlot,
  JobId,
  MapId,
  Monster,
  Particle,
  Player,
  SkillId,
} from "@/game/types";

const KEY = "ambercross-save-v1";

type Screen = "title" | "create" | "play";

export const world = {
  screen: "title" as Screen,
  hasSave: false,
  assetsReady: false,
  loadError: "",
  debug: false,
  mapId: "ambercross" as MapId,
  time: 0,
  player: null as Player | null,
  monsters: [] as Monster[],
  drops: [] as Drop[],
  floats: [] as FloatText[],
  particles: [] as Particle[],
  logs: [] as string[],
  dialog: null as Dialog | null,
  shop: null as null | "smith" | "outfit" | "supply",
  storageOpen: false,
  panels: { status: false, equip: false, inv: false, skills: false, help: false },
  keys: new Set<string>(),
  qaKeys: null as Set<string> | null,
  touch: { x: 0, y: 0, attack: false },
  path: [] as { x: number; y: number }[],
  targetId: null as string | null,
  pendingTalk: null as string | null,
  repath: 0,
  chaseX: 0,
  chaseY: 0,
  cam: { x: 200, y: 200 },
  shake: 0,
  banner: "Ambercross",
  bannerUntil: 0,
  say: "",
  sayUntil: 0,
  portalLock: 0,
  saveAcc: 0,
  foot: 0,
  musicOn: true,
  draft: { name: "Alder", hair: "auburn", style: "bob" as Player["style"], trim: "brass" },
  viewW: 800,
  viewH: 600,
  dpr: 1,
  hover: "",
  /** click-to-move marker */
  clickMark: null as null | { x: number; y: number; t: number },
};

let rev = 0;
const listeners = new Set<() => void>();

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function getRev() {
  return rev;
}
export function bump() {
  rev++;
  listeners.forEach((fn) => fn());
}

export function log(text: string) {
  world.logs = [...world.logs, text].slice(-40);
}

let seq = 1;
export function uid() {
  seq += 1;
  return `e${seq}`;
}

export function bootClient() {
  world.hasSave = Boolean(localStorage.getItem(KEY));
  world.debug = location.search.includes("debug=1");
  bump();
}

function emptyEq(): Record<GearSlot, string | null> {
  return {
    headUpper: null,
    headMid: null,
    headLower: null,
    armor: "cotton-shirt",
    weapon: "worn-knife",
    shield: null,
    garment: null,
    shoes: "worn-shoes",
    acc1: null,
    acc2: null,
  };
}

export type Derived = ReturnType<typeof derive>;

export function derive(p: Player) {
  let atk = 0;
  let matk = 0;
  let def = 0;
  let mdef = 0;
  let str = 0;
  let agi = 0;
  let vit = 0;
  let intel = 0;
  let dex = 0;
  let luk = 0;
  let range = 42;
  for (const slot of Object.keys(p.eq) as GearSlot[]) {
    const id = p.eq[slot];
    if (!id) continue;
    const it = ITEMS[id];
    if (!it) continue;
    atk += it.atk ?? 0;
    matk += it.matk ?? 0;
    def += it.def ?? 0;
    mdef += it.mdef ?? 0;
    str += it.str ?? 0;
    agi += it.agi ?? 0;
    vit += it.vit ?? 0;
    intel += it.int ?? 0;
    dex += it.dex ?? 0;
    luk += it.luk ?? 0;
    if (it.range) range = it.range;
  }
  if (p.job === "mage") range = Math.max(range, 156);
  if (p.job === "archer") range += 28;
  const now = world.time;
  let bAtk = 0;
  let bDef = 0;
  let bFlee = 0;
  let bHit = 0;
  for (const b of p.buffs) {
    if (b.until <= now) continue;
    if (b.stat === "atk") bAtk += b.amount;
    if (b.stat === "def") bDef += b.amount;
    if (b.stat === "flee") bFlee += b.amount;
    if (b.stat === "hit") bHit += b.amount;
  }
  const S = p.str + str;
  const A = p.agi + agi;
  const V = p.vit + vit;
  const I = p.int + intel;
  const D = p.dex + dex;
  const L = p.luk + luk;
  return {
    str: S,
    agi: A,
    vit: V,
    int: I,
    dex: D,
    luk: L,
    maxHp: 48 + p.baseLevel * 12 + V * 8,
    maxSp: 20 + p.baseLevel * 4 + I * 5,
    atk: 5 + S * 2 + p.baseLevel + atk + bAtk,
    matk: 3 + I * 2 + matk,
    def: Math.floor(V / 2) + def + bDef,
    mdef,
    hit: 60 + D * 2 + p.baseLevel + bHit,
    flee: 10 + A * 2 + p.baseLevel + bFlee,
    crit: Math.min(45, L * 0.5),
    aspd: Math.max(0.42, 1.28 - A * 0.018 - D * 0.006),
    speed: 148 + A * 1.7,
    range,
  };
}

export function makePlayer(draft = world.draft): Player {
  const p: Player = {
    name: draft.name.trim().slice(0, 14) || "Alder",
    x: 0,
    y: 0,
    dir: 0,
    anim: 0,
    hair: draft.hair,
    style: draft.style,
    trim: draft.trim,
    job: "novice",
    baseLevel: 1,
    baseExp: 0,
    jobLevel: 1,
    jobExp: 0,
    statPoints: 5,
    skillPoints: 1,
    str: BASE_STAT,
    agi: BASE_STAT,
    vit: BASE_STAT,
    int: BASE_STAT,
    dex: BASE_STAT,
    luk: BASE_STAT,
    hp: 1,
    sp: 1,
    marks: 80,
    skills: { firstAid: 1 },
    eq: emptyEq(),
    inv: [{ itemId: "salve", qty: 3 }],
    storage: [],
    hotbar: [{ kind: "skill", id: "firstAid" }, null, null, null, null, null, null, null, null],
    buffs: [],
    quest: "none",
    questCount: 0,
    attackCd: 0,
    itemCd: 0,
    sit: false,
    flash: 0,
    invuln: 0,
    downFor: 0,
    speedInstant: 0,
    swing: 0,
    feign: 0,
    seenIntro: false,
  };
  const d = derive(p);
  p.hp = d.maxHp;
  p.sp = d.maxSp;
  return p;
}

export function spawnMonsters(mapId: MapId): Monster[] {
  return getMap(mapId).spawns.map((s, i) => {
    const st = MONSTERS[s.kind]!;
    return {
      id: `${s.kind}-${i}-${uid()}`,
      kind: s.kind,
      x: s.x,
      y: s.y,
      homeX: s.x,
      homeY: s.y,
      hp: st.hp,
      maxHp: st.hp,
      dir: 0,
      anim: Math.random() * 4,
      cd: 0.6 + Math.random(),
      hurt: 0,
      aggro: false,
      alive: true,
      deadUntil: 0,
      wanderX: s.x,
      wanderY: s.y,
      pause: Math.random() * 2,
      moving: false,
      ease: 0,
      dyingT: 0,
      windup: 0,
      lunge: 0,
      kbx: 0,
      kby: 0,
      spawnT: 0.5,
    };
  });
}

export function enterMap(id: MapId, x: number, y: number) {
  world.mapId = id;
  const p = world.player;
  if (p) {
    p.x = x;
    p.y = y;
  }
  world.monsters = spawnMonsters(id);
  world.drops = [];
  world.path = [];
  world.targetId = null;
  world.pendingTalk = null;
  world.portalLock = 0.9;
  const map = getMap(id);
  world.banner = map.name;
  world.bannerUntil = world.time + 2.8;
  world.clickMark = null;
  log(map.levels ? `You arrive in ${map.name}. Monsters here: ${map.levels}.` : `You arrive in ${map.name}.`);
  bump();
}

export function beginNew() {
  const map = getMap("ambercross");
  world.player = makePlayer(world.draft);
  world.player.x = map.start.x;
  world.player.y = map.start.y;
  world.mapId = "ambercross";
  world.monsters = [];
  world.drops = [];
  world.logs = [];
  world.path = [];
  world.targetId = null;
  world.shop = null;
  world.storageOpen = false;
  world.screen = "play";
  world.banner = "Ambercross";
  world.bannerUntil = world.time + 3;
  log("The plaza bell notes the hour.");
  if (!world.player.seenIntro) {
    world.player.seenIntro = true;
    world.dialog = {
      speaker: "Ambercross",
      lines: [
        "Honey-stone streets ring a sun fountain. This is the capital plaza.",
        "Click the ground to walk, or hold WASD. Click a named person to talk, a creature to fight.",
        "You start as a Novice. Hair, trim, and the ten gear slots all show on you.",
        "Seren, on the south road, witnesses a Swordman, Mage, or Archer once base and job level reach 4.",
        "The south gate leads to Southmead. Maela, by the west stall, is holding a sun cap for a small hunt.",
      ],
      index: 0,
    };
  }
  persist();
  bump();
}

export function continueGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as { v: number; mapId: MapId; player: Player };
    if (data.v !== 1 || !data.player) return false;
    data.player.buffs = [];
    data.player.attackCd = 0;
    data.player.downFor = 0;
    data.player.flash = 0;
    data.player.speedInstant = 0;
    data.player.swing = 0;
    data.player.feign = 0;
    data.player.inv = data.player.inv.filter((st) => ITEMS[st.itemId]);
    const legacy: Record<string, Player["job"]> = {
      wanderer: "novice",
      blade: "swordman",
      arcanist: "mage",
      cleric: "mage",
      ranger: "archer",
      broker: "novice",
      shade: "novice",
    };
    const savedJob = data.player.job as string;
    data.player.job = legacy[savedJob] ?? (savedJob === "novice" || savedJob === "swordman" || savedJob === "mage" || savedJob === "archer" ? savedJob : "novice");
    data.player.hotbar = data.player.hotbar.map((slot) => (slot && slot.kind === "skill" && !(slot.id in SKILLS) ? null : slot));
    world.player = data.player;
    world.mapId = (["ambercross", "southmead", "poring", "woods", "dunes", "crypt"] as MapId[]).includes(data.mapId) ? data.mapId : "ambercross";
    world.monsters = spawnMonsters(world.mapId);
    world.drops = [];
    world.path = [];
    world.dialog = null;
    world.shop = null;
    world.screen = "play";
    world.banner = getMap(world.mapId).name;
    world.bannerUntil = world.time + 2.4;
    log("Your record is where you left it.");
    bump();
    return true;
  } catch {
    return false;
  }
}

export function persist() {
  const p = world.player;
  if (!p || world.screen !== "play") return;
  const player: Player = {
    ...p,
    buffs: [],
    attackCd: 0,
    downFor: 0,
    flash: 0,
    speedInstant: 0,
    swing: 0,
    feign: 0,
  };
  localStorage.setItem(KEY, JSON.stringify({ v: 1, mapId: world.mapId, player }));
  world.hasSave = true;
}

export function float(x: number, y: number, text: string, color: string, big = false) {
  world.floats.push({ x, y, text, life: big ? 1.15 : 0.9, color, big });
  if (world.floats.length > 36) world.floats.shift();
}

const DUST_COLOR: Record<number, string> = {
  0: "#9cc58a",
  1: "#d8cfb8",
  2: "#c9a878",
  3: "#9ac8e8",
  4: "#e8d4a0",
  5: "#9a96b0",
  6: "#6a9a62",
};

/** A small puff kicked up by footsteps, tinted to the ground underfoot. */
export function dust(x: number, y: number, tile: number) {
  const color = DUST_COLOR[tile] ?? "#cfc3a8";
  for (let i = 0; i < 2; i++) {
    world.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 22,
      vy: -8 - Math.random() * 12,
      life: 0.42,
      max: 0.42,
      color,
      size: 3 + Math.random() * 2.5,
      puff: true,
    });
  }
  if (world.particles.length > 220) world.particles.splice(0, world.particles.length - 220);
}

export function burst(x: number, y: number, color: string) {
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10;
    world.particles.push({
      x,
      y,
      vx: Math.cos(a) * 40,
      vy: Math.sin(a) * 28 - 20,
      life: 0.6,
      max: 0.6,
      color,
      grav: 90,
    });
  }
}

export const INV_CAP = 40;
const INV_MAX = INV_CAP;

export function addItem(itemId: string, qty: number) {
  const p = world.player;
  if (!p) return false;
  const it = ITEMS[itemId];
  if (!it) return false;
  if (it.stack) {
    const stack = p.inv.find((s) => s.itemId === itemId);
    if (stack) {
      stack.qty += qty;
      return true;
    }
  }
  if (p.inv.length >= INV_MAX) return false;
  p.inv.push({ itemId, qty });
  return true;
}

export function give(itemId: string, qty: number) {
  const p = world.player;
  if (!p) return;
  if (!addItem(itemId, qty)) {
    world.drops.push({
      id: uid(),
      itemId,
      qty,
      x: p.x + 16,
      y: p.y + 10,
      mapId: world.mapId,
    });
    log("No room in the bag. It drops at your feet.");
  }
}

export function equipFromInventory(index: number) {
  const p = world.player;
  if (!p) return;
  const stack = p.inv[index];
  if (!stack) return;
  const it = ITEMS[stack.itemId];
  if (!it) return;
  if (it.slot === "use") {
    useStack(index);
    return;
  }
  if (it.slot === "etc" || !canEquip(p.job, it)) {
    log(it.jobs ? `Only a ${it.jobs.map((j) => JOBS[j].name).join(" or ")} can equip that.` : "That doesn't equip.");
    bump();
    return;
  }
  let slot: GearSlot;
  if (it.slot === "acc") {
    slot = !p.eq.acc1 ? "acc1" : !p.eq.acc2 ? "acc2" : "acc1";
  } else {
    slot = it.slot;
  }
  const prev = p.eq[slot];
  p.eq[slot] = stack.itemId;
  stack.qty -= 1;
  if (stack.qty <= 0) p.inv.splice(index, 1);
  if (prev) addItem(prev, 1);
  sfxEquip();
  log(`Equipped ${it.name} in ${SLOT_NAME[slot]}.`);
  const d = derive(p);
  p.hp = Math.min(p.hp, d.maxHp);
  p.sp = Math.min(p.sp, d.maxSp);
  persist();
  bump();
}

const SLOT_NAME: Record<GearSlot, string> = {
  headUpper: "upper head",
  headMid: "mid head",
  headLower: "lower head",
  armor: "armor",
  weapon: "weapon",
  shield: "shield",
  garment: "garment",
  shoes: "shoes",
  acc1: "right accessory",
  acc2: "left accessory",
};

export function unequip(slot: GearSlot) {
  const p = world.player;
  if (!p) return;
  const id = p.eq[slot];
  if (!id) return;
  if (!addItem(id, 1)) {
    log("The bag is full.");
    bump();
    return;
  }
  p.eq[slot] = null;
  sfxEquip();
  persist();
  bump();
}

export function useStack(index: number) {
  const p = world.player;
  if (!p) return;
  const stack = p.inv[index];
  if (!stack) return;
  const it = ITEMS[stack.itemId];
  if (!it || it.slot !== "use") return;
  if (p.itemCd > 0) return;
  const d = derive(p);
  if (it.effect === "fly") {
    const map = getMap(world.mapId);
    for (let i = 0; i < 60; i++) {
      const tx = 2 + Math.floor(Math.random() * (map.cols - 4));
      const ty = 2 + Math.floor(Math.random() * (map.rows - 4));
      if (map.block[ty * map.cols + tx]) continue;
      burst(p.x, p.y - 30, "#f6f0e4");
      p.x = (tx + 0.5) * TILE_PX;
      p.y = (ty + 0.5) * TILE_PX;
      burst(p.x, p.y - 30, "#f6f0e4");
      break;
    }
    world.path = [];
    world.targetId = null;
    world.cam.x = p.x - world.viewW / 2;
    world.cam.y = p.y - world.viewH / 2;
    log("You vanish and reappear elsewhere.");
    p.itemCd = 0.6;
    stack.qty -= 1;
    if (stack.qty <= 0) p.inv.splice(index, 1);
    persist();
    bump();
    return;
  }
  if (it.effect === "butterfly") {
    const home = getMap("ambercross");
    stack.qty -= 1;
    if (stack.qty <= 0) p.inv.splice(index, 1);
    p.itemCd = 0.6;
    burst(p.x, p.y - 30, "#9ec7ee");
    enterMap("ambercross", home.start.x, home.start.y);
    sfxHeal();
    return;
  }
  if (it.heal) {
    if (p.hp >= d.maxHp) {
      log("HP is already full.");
      bump();
      return;
    }
    p.hp = Math.min(d.maxHp, p.hp + it.heal);
    float(p.x, p.y - 70, `+${it.heal}`, "#7dba6a");
    sfxHeal();
  }
  if (it.spRestore) {
    if (p.sp >= d.maxSp && !it.heal) {
      log("SP is already full.");
      bump();
      return;
    }
    p.sp = Math.min(d.maxSp, p.sp + it.spRestore);
    float(p.x, p.y - 54, `+${it.spRestore} SP`, "#3d8fd1");
  }
  p.itemCd = 0.45;
  stack.qty -= 1;
  if (stack.qty <= 0) p.inv.splice(index, 1);
  persist();
  bump();
}

export function setHotbar(index: number, slot: HotSlot | null) {
  const p = world.player;
  if (!p) return;
  p.hotbar[index] = slot;
  persist();
  bump();
}

export function stashToHotbar(itemId: string) {
  const p = world.player;
  if (!p) return;
  const i = p.hotbar.findIndex((h) => !h);
  if (i < 0) {
    log("The hotbar is full.");
    bump();
    return;
  }
  p.hotbar[i] = { kind: "item", id: itemId };
  persist();
  bump();
}

export function learnSkill(id: SkillId) {
  const p = world.player;
  if (!p) return;
  const sk = SKILLS[id];
  const lv = p.skills[id] ?? 0;
  if (sk.job !== "novice" && sk.job !== p.job) {
    log("That skill belongs to another job.");
    bump();
    return;
  }
  if (lv >= sk.max) return;
  if (p.skillPoints <= 0) {
    log("No skill points.");
    bump();
    return;
  }
  p.skillPoints -= 1;
  p.skills[id] = lv + 1;
  if (!p.hotbar.some((h) => h && h.kind === "skill" && h.id === id) && sk.target !== "passive") {
    const i = p.hotbar.findIndex((h) => !h);
    if (i >= 0) p.hotbar[i] = { kind: "skill", id };
  }
  log(`${sk.name} is now level ${lv + 1}.`);
  persist();
  bump();
}

export function addStat(key: "str" | "agi" | "vit" | "int" | "dex" | "luk") {
  const p = world.player;
  if (!p || p.statPoints <= 0) return;
  p[key] += 1;
  p.statPoints -= 1;
  const d = derive(p);
  p.hp = Math.min(d.maxHp, p.hp);
  p.sp = Math.min(d.maxSp, p.sp);
  persist();
  bump();
}

export function buyPrice(base: number) {
  return Math.max(1, Math.round(base));
}

export function tryBuy(itemId: string) {
  const p = world.player;
  const it = ITEMS[itemId];
  if (!p || !it) return;
  const price = buyPrice(it.price);
  if (p.marks < price) {
    log("Not enough zeny.");
    bump();
    return;
  }
  if (!addItem(itemId, 1)) {
    log("The bag is full.");
    bump();
    return;
  }
  p.marks -= price;
  sfxCoin();
  log(`Bought ${it.name}.`);
  persist();
  bump();
}

export function trySell(index: number) {
  const p = world.player;
  if (!p) return;
  const stack = p.inv[index];
  if (!stack) return;
  const it = ITEMS[stack.itemId];
  if (!it) return;
  const price = sellPrice(it);
  p.marks += price;
  stack.qty -= 1;
  if (stack.qty <= 0) p.inv.splice(index, 1);
  sfxCoin();
  log(`Sold for ${price}z.`);
  persist();
  bump();
}

export function moveStorage(from: "inv" | "storage", index: number) {
  const p = world.player;
  if (!p) return;
  const src = from === "inv" ? p.inv : p.storage;
  const dst = from === "inv" ? p.storage : p.inv;
  const stack = src[index];
  if (!stack) return;
  if (dst.length >= INV_MAX && !(ITEMS[stack.itemId]?.stack && dst.some((s) => s.itemId === stack.itemId))) {
    log("No room.");
    bump();
    return;
  }
  src.splice(index, 1);
  const it = ITEMS[stack.itemId];
  if (it?.stack) {
    const have = dst.find((s) => s.itemId === stack.itemId);
    if (have) have.qty += stack.qty;
    else dst.push(stack);
  } else dst.push(stack);
  persist();
  bump();
}

function fullHeal() {
  const p = world.player;
  if (!p) return;
  const d = derive(p);
  p.hp = d.maxHp;
  p.sp = d.maxSp;
  sfxHeal();
  float(p.x, p.y - 60, "Restored", "#7dba6a");
  log("You feel the road settle back into your bones.");
}

export function resetStats() {
  const p = world.player;
  if (!p) return;
  if (p.marks < 200) {
    log("Oren asks 200 zeny to unwind your training.");
    bump();
    return;
  }
  p.marks -= 200;
  const b = jobBonus(p.job);
  p.str = BASE_STAT + (b.str ?? 0);
  p.agi = BASE_STAT + (b.agi ?? 0);
  p.vit = BASE_STAT + (b.vit ?? 0);
  p.int = BASE_STAT + (b.int ?? 0);
  p.dex = BASE_STAT + (b.dex ?? 0);
  p.luk = BASE_STAT + (b.luk ?? 0);
  p.statPoints = 5 + (p.baseLevel - 1) * 3;
  log("Your stat points are back in your hands.");
  persist();
  bump();
}

export function changeJob(job: JobId) {
  const p = world.player;
  if (!p || p.job !== "novice" || p.baseLevel < 4 || p.jobLevel < 4) return;
  const b = jobBonus(job);
  p.str += b.str ?? 0;
  p.agi += b.agi ?? 0;
  p.vit += b.vit ?? 0;
  p.int += b.int ?? 0;
  p.dex += b.dex ?? 0;
  p.luk += b.luk ?? 0;
  p.job = job;
  let returned = false;
  for (const slot of Object.keys(p.eq) as GearSlot[]) {
    const id = p.eq[slot];
    if (!id) continue;
    const it = ITEMS[id];
    if (!it || canEquip(job, it)) continue;
    p.eq[slot] = null;
    give(id, 1);
    returned = true;
  }
  if (returned) log("Gear this job can't wear went back to the bag.");
  p.jobLevel = 1;
  p.jobExp = 0;
  p.skillPoints += 1;
  log(`Seren witnesses you as a ${JOBS[job].name}.`);
  sfxLevel();
  burst(p.x, p.y - 40, "#e4b15a");
  persist();
  bump();
}

export function grantKill(kind: Monster["kind"], mx?: number, my?: number) {
  const p = world.player;
  if (!p) return;
  const st = MONSTERS[kind]!;
  const x = mx ?? p.x;
  const y = my ?? p.y;
  // Fighting far above your level pays less, like the classic level-gap penalty.
  const gap = p.baseLevel - st.level;
  const mult = gap > 8 ? Math.max(0.25, 1 - (gap - 8) * 0.08) : 1;
  const exp = Math.max(1, Math.round(st.exp * mult));
  const jexp = Math.max(1, Math.round(st.jexp * mult));
  if (p.baseLevel < MAX_BASE) p.baseExp += exp;
  if (p.jobLevel < MAX_JOB) p.jobExp += jexp;
  const loot = rollLoot(kind);
  p.marks += loot.marks;
  float(p.x, p.y - 78, `+${exp} Base`, "#e4b15a");
  float(p.x - 6, p.y - 62, `+${jexp} Job`, "#8fd0e8");
  float(p.x + 8, p.y - 46, `+${loot.marks}z`, "#f2d7a2");
  // Items fall to the ground where the monster died. Walk over them to pick up.
  loot.items.forEach((drop, i) => {
    const rare = loot.rareIds.includes(drop.id) || (st.boss ?? false);
    const ang = Math.random() * Math.PI * 2 + i;
    const r = 14 + Math.random() * 22;
    world.drops.push({
      id: uid(),
      itemId: drop.id,
      qty: drop.qty,
      x: x + Math.cos(ang) * r,
      y: y + Math.sin(ang) * r * 0.6 + 6,
      mapId: world.mapId,
      born: world.time,
      dx: Math.cos(ang) * r,
      ttl: 90,
      rare,
    });
    if (rare) {
      log(`A rare ${ITEMS[drop.id]?.name ?? "item"} drops!`);
      burst(x, y - 20, "#e4b15a");
    }
  });
  if (loot.items.length === 0) log(`${st.name} defeated. +${exp} Base, +${jexp} Job, +${loot.marks}z.`);
  else log(`${st.name} defeated. +${exp} Base, +${jexp} Job, +${loot.marks}z. ${loot.items.length} drop${loot.items.length > 1 ? "s" : ""}.`);
  if (st.boss) {
    world.shake = Math.min(9, world.shake + 6);
    log(`${st.name} has fallen!`);
  }
  if (kind === "dew" && p.quest === "active") {
    p.questCount += 1;
    if (p.questCount >= 6) {
      p.quest = "done";
      log("Six dewdrops. Maela will want the news.");
    }
  }
  let leveled = false;
  while (p.baseLevel < MAX_BASE && p.baseExp >= expNeed(p.baseLevel)) {
    p.baseExp -= expNeed(p.baseLevel);
    p.baseLevel += 1;
    p.statPoints += 3 + Math.floor(p.baseLevel / 10);
    leveled = true;
    log(`Base level ${p.baseLevel}!`);
  }
  while (p.jobLevel < MAX_JOB && p.jobExp >= jobExpNeed(p.jobLevel)) {
    p.jobExp -= jobExpNeed(p.jobLevel);
    p.jobLevel += 1;
    p.skillPoints += 1;
    leveled = true;
    log(`Job level ${p.jobLevel}. Skill point gained.`);
  }
  const d = derive(p);
  if (leveled) {
    p.hp = d.maxHp;
    p.sp = d.maxSp;
    sfxLevel();
    burst(p.x, p.y - 30, "#e4b15a");
    float(p.x, p.y - 96, "LEVEL UP!", "#ffe27a", true);
    world.shake = Math.min(7, world.shake + 4);
  }
  persist();
}

export function openNpc(id: string) {
  const npc = getMap(world.mapId).npcs.find((n) => n.id === id);
  const p = world.player;
  if (!npc || !p) return;
  world.shop = null;
  world.storageOpen = false;
  if (npc.role === "citizen") {
    world.dialog = { speaker: npc.name, lines: [npc.line], index: 0 };
  } else if (npc.role === "smith") {
    world.dialog = {
      speaker: npc.name,
      lines: [npc.line],
      index: 0,
      choices: [
        { label: "Browse weapons", action: "shop-smith" },
        { label: "Leave", action: "close" },
      ],
    };
  } else if (npc.role === "outfit") {
    world.dialog = {
      speaker: npc.name,
      lines: [npc.line, "Head upper, mid, and lower sit apart. Accessories take the two side slots."],
      index: 0,
      choices: [
        { label: "Browse the racks", action: "shop-outfit" },
        { label: "Leave", action: "close" },
      ],
    };
  } else if (npc.role === "priest") {
    world.dialog = {
      speaker: npc.name,
      lines: [npc.line],
      index: 0,
      choices: [
        { label: "Heal", action: "heal" },
        { label: "Reset stats (200)", action: "reset" },
        { label: "Leave", action: "close" },
      ],
    };
  } else if (npc.role === "job") {
    const choices =
      p.job === "novice" && p.baseLevel >= 4 && p.jobLevel >= 4
        ? [
            { label: "Swordman", action: "job:swordman" },
            { label: "Mage", action: "job:mage" },
            { label: "Archer", action: "job:archer" },
            { label: "Not yet", action: "close" },
          ]
        : [{ label: "I see", action: "close" }];
    const line =
      p.job !== "novice"
        ? `You already walk as a ${JOBS[p.job].name}. Novice skills stay with you. Spend the new points on this job.`
        : p.baseLevel < 4 || p.jobLevel < 4
          ? "A Novice changes job at base level 4 and job level 4. Southmead teaches both. The classic gate is job level 10; this plaza keeps the short road."
          : "Choose Swordman, Mage, or Archer. The choice stays.";
    world.dialog = { speaker: npc.name, lines: [npc.line, line], index: 0, choices };
  } else {
    const choices = [
      { label: "Heal", action: "heal" },
      { label: "Storage", action: "storage" },
      { label: "Supplies", action: "shop-supply" },
      { label: "Save record", action: "save" },
      { label: "Leave", action: "close" },
    ];
    let questLine = "The south gate is quiet until it isn't.";
    if (p.quest === "none") {
      questLine = "Scatter six dewdrops in Southmead and the sun cap is yours.";
      choices.unshift({ label: "Take the hunt", action: "quest" });
    } else if (p.quest === "active") {
      questLine = `Dewdrops scattered: ${p.questCount} / 6.`;
    } else if (p.quest === "done") {
      questLine = "Six. The cap was getting dusty anyway.";
      choices.unshift({ label: "Claim the sun cap", action: "claim" });
    } else {
      questLine = "The meadow still jitters, but you kept your word.";
    }
    world.dialog = { speaker: npc.name, lines: [npc.line, questLine], index: 0, choices };
  }
  bump();
}

export function advanceDialog() {
  const d = world.dialog;
  if (!d) return;
  if (d.index < d.lines.length - 1) d.index += 1;
  else if (!d.choices) world.dialog = null;
  bump();
}

export function doAction(action: string) {
  const p = world.player;
  world.dialog = null;
  if (!p) {
    bump();
    return;
  }
  if (action === "heal") fullHeal();
  else if (action === "shop-smith") world.shop = "smith";
  else if (action === "shop-outfit") world.shop = "outfit";
  else if (action === "shop-supply") world.shop = "supply";
  else if (action === "storage") world.storageOpen = true;
  else if (action === "save") {
    persist();
    log("Maela files your record.");
  } else if (action === "reset") resetStats();
  else if (action === "quest") {
    p.quest = "active";
    p.questCount = 0;
    log("Hunt accepted: six dewdrops in Southmead.");
  } else if (action === "claim" && p.quest === "done") {
    p.quest = "claimed";
    p.marks += 150;
    give("sun-cap", 1);
    sfxCoin();
    log("Maela hands you a sun cap and 150 zeny.");
  } else if (action.startsWith("job:")) {
    changeJob(action.slice(4) as JobId);
  }
  persist();
  bump();
}

export function togglePanel(name: keyof typeof world.panels) {
  const open = !world.panels[name];
  if (world.viewW < 760) {
    for (const key of Object.keys(world.panels) as (keyof typeof world.panels)[]) world.panels[key] = false;
  }
  world.panels[name] = open;
  bump();
}

export function closeTransient() {
  world.dialog = null;
  world.shop = null;
  world.storageOpen = false;
  for (const key of Object.keys(world.panels) as (keyof typeof world.panels)[]) world.panels[key] = false;
  bump();
}
