// Card and socket system, after Ragnarok Online: gear has 0-4 card slots, a monster card slots into
// gear of its kind and adds its bonus for as long as that gear is worn.
import { ITEMS, type ItemDef } from "@/game/content";
import { RARITY, rarityOf } from "@/game/gear";
import type { GearSlot, Player } from "@/game/types";

export type CardKind = "weapon" | "armor" | "head" | "shield" | "garment" | "shoes";

export type Mods = {
  str?: number;
  agi?: number;
  vit?: number;
  int?: number;
  dex?: number;
  luk?: number;
  atk?: number;
  matk?: number;
  def?: number;
  mdef?: number;
  hit?: number;
  flee?: number;
  crit?: number;
  hp?: number;
  sp?: number;
  hpPct?: number;
  spPct?: number;
  atkPct?: number;
  matkPct?: number;
  aspdPct?: number;
  speedPct?: number;
  /** extra damage against bosses and mini-bosses (%) */
  bossPct?: number;
  /** heal this % of damage dealt */
  drain?: number;
  /** resist abnormal states (%) */
  rStun?: number;
  rSleep?: number;
  rPoison?: number;
  rCurse?: number;
  rSilence?: number;
  rFreeze?: number;
  rSlow?: number;
};

type CardDef = { kind: CardKind; mods: Mods };

const C = (kind: CardKind, mods: Mods): CardDef => ({ kind, mods });

/** keyed by monster id; the card item is `${id}-card` */
export const CARD_FX: Record<string, CardDef> = {
  poring: C("armor", { luk: 2, flee: 3 }),
  drops: C("weapon", { dex: 1, hit: 5 }),
  lunatic: C("armor", { crit: 2, luk: 1 }),
  fabre: C("armor", { hp: 100 }),
  pupa: C("armor", { hp: 180, def: 1 }),
  willow: C("head", { sp: 60, int: 1 }),
  rocker: C("weapon", { atk: 5, hit: 3 }),
  hornet: C("weapon", { atk: 8 }),
  creamy: C("garment", { flee: 6, rSleep: 30 }),
  condor: C("shoes", { agi: 1, speedPct: 3 }),
  scorpion: C("weapon", { atk: 6, crit: 3 }),
  "desert-wolf": C("weapon", { aspdPct: 3 }),
  "peco-peco": C("armor", { hp: 150, vit: 1 }),
  familiar: C("head", { mdef: 3, rCurse: 30 }),
  zombie: C("armor", { vit: 1, rPoison: 40 }),
  skeleton: C("weapon", { atk: 10, hit: 3 }),
  poporing: C("garment", { rPoison: 50 }),
  goblin: C("shoes", { atk: 3, speedPct: 4 }),
  "orc-zombie": C("armor", { hp: 250, vit: 2 }),
  "orc-warrior": C("weapon", { atk: 12, str: 1 }),
  "orc-skeleton": C("shield", { def: 3, rStun: 35 }),
  // mini-bosses
  mastering: C("weapon", { atkPct: 4, str: 1 }),
  eclipse: C("shoes", { speedPct: 6, flee: 6 }),
  "ancient-willow": C("head", { int: 2, spPct: 8, mdef: 3 }),
  "hive-captain": C("weapon", { aspdPct: 6, atk: 6 }),
  "scorpion-lord": C("weapon", { atkPct: 6, bossPct: 8 }),
  "dune-stalker": C("shoes", { speedPct: 8, agi: 2 }),
  "zombie-master": C("armor", { hpPct: 8, vit: 3, rPoison: 60 }),
  "skeleton-general": C("shield", { def: 6, rStun: 50 }),
  "goblin-leader": C("weapon", { atk: 12, str: 2 }),
  "orc-archer-chief": C("shield", { def: 5, hpPct: 6 }),
  // MVPs
  "golden-poring": C("armor", { luk: 5, hpPct: 5, flee: 8 }),
  mistress: C("head", { dex: 2, hit: 12, rSilence: 40 }),
  "moonlight-flower": C("garment", { flee: 12, agi: 2, rSleep: 50, rFreeze: 30 }),
  eddga: C("weapon", { atkPct: 8, crit: 5 }),
  phreeoni: C("weapon", { hit: 20, dex: 3, aspdPct: 6 }),
  osiris: C("armor", { hpPct: 12, vit: 3, mdef: 8, drain: 2 }),
  drake: C("weapon", { atkPct: 10, bossPct: 20 }),
  baphomet: C("head", { matkPct: 12, int: 4, spPct: 15 }),
  "orc-lord": C("armor", { vit: 4, def: 8, hpPct: 10, rStun: 40 }),
  "orc-hero": C("weapon", { atkPct: 12, str: 3, crit: 5, drain: 3 }),
  "golden-bug": C("garment", { flee: 15, luk: 4, rSleep: 40, rStun: 30 }),
};

export const isCard = (itemId: string) => itemId.endsWith("-card") && !!CARD_FX[itemId.slice(0, -5)];
export const cardDef = (itemId: string): CardDef | undefined => (itemId.endsWith("-card") ? CARD_FX[itemId.slice(0, -5)] : undefined);

export function gearKind(it: ItemDef): CardKind | null {
  switch (it.slot) {
    case "weapon":
      return "weapon";
    case "armor":
      return "armor";
    case "shield":
      return "shield";
    case "garment":
      return "garment";
    case "shoes":
      return "shoes";
    case "headUpper":
    case "headMid":
    case "headLower":
      return "head";
    default:
      return null;
  }
}

export const KIND_LABEL: Record<CardKind, string> = { weapon: "Weapon", armor: "Armor", head: "Headgear", shield: "Shield", garment: "Garment", shoes: "Shoes" };

const hashStr = (s: string) => {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/** how many cards this piece can hold: early gear has more slots, top-end gear fewer (as in RO) */
export function socketSlots(it: ItemDef | undefined): number {
  if (!it) return 0;
  const kind = gearKind(it);
  if (!kind || it.id === "cotton-shirt") return 0;
  const rank = RARITY[rarityOf(it)].rank;
  const h = hashStr(it.id);
  if (kind === "weapon") return [4 - (h % 2), 3, 2, 1, h % 2][rank] ?? 0;
  if (kind === "head") return rank >= 4 ? 0 : h % 3 === 0 ? 0 : 1;
  return rank >= 4 ? h % 2 : rank >= 2 ? 1 : 1 + (h % 4 === 0 ? 1 : 0) - (h % 5 === 0 ? 1 : 0);
}

export function cardFits(cardId: string, it: ItemDef | undefined): boolean {
  const c = cardDef(cardId);
  if (!c || !it) return false;
  return gearKind(it) === c.kind;
}

const EMPTY: Mods = {};

export function sumMods(list: Mods[]): Mods {
  const out: Record<string, number> = {};
  for (const m of list) for (const [k, v] of Object.entries(m)) out[k] = (out[k] ?? 0) + (v as number);
  return out as Mods;
}

/** card bonuses from everything worn */
export function cardMods(p: Player): Mods {
  const cards = p.eqCards;
  if (!cards) return EMPTY;
  const list: Mods[] = [];
  for (const slot of Object.keys(cards) as GearSlot[]) {
    if (!p.eq[slot]) continue;
    for (const id of cards[slot] ?? []) {
      const c = cardDef(id);
      if (c) list.push(c.mods);
    }
  }
  return list.length ? sumMods(list) : EMPTY;
}

const LABELS: [keyof Mods, string, string][] = [
  ["str", "STR", ""], ["agi", "AGI", ""], ["vit", "VIT", ""], ["int", "INT", ""], ["dex", "DEX", ""], ["luk", "LUK", ""],
  ["atk", "ATK", ""], ["matk", "MATK", ""], ["def", "DEF", ""], ["mdef", "MDEF", ""], ["hit", "HIT", ""], ["flee", "FLEE", ""], ["crit", "CRIT", ""],
  ["hp", "Max HP", ""], ["sp", "Max SP", ""], ["hpPct", "Max HP", "%"], ["spPct", "Max SP", "%"], ["atkPct", "ATK", "%"], ["matkPct", "MATK", "%"],
  ["aspdPct", "Attack speed", "%"], ["speedPct", "Move speed", "%"], ["bossPct", "Damage vs bosses", "%"], ["drain", "Life drain", "%"],
];
const RES: [keyof Mods, string][] = [["rStun", "Stun"], ["rSleep", "Sleep"], ["rPoison", "Poison"], ["rCurse", "Curse"], ["rSilence", "Silence"], ["rFreeze", "Freeze"], ["rSlow", "Slow"]];

export function describeMods(m: Mods): string[] {
  const out: string[] = [];
  for (const [k, label, unit] of LABELS) if (m[k]) out.push(`${label} ${m[k]! > 0 ? "+" : ""}${m[k]}${unit}`);
  for (const [k, label] of RES) if (m[k]) out.push(`${label} resist ${m[k]}%`);
  return out;
}

export const cardText = (cardId: string): string => {
  const c = cardDef(cardId);
  return c ? `${KIND_LABEL[c.kind]}: ${describeMods(c.mods).join(", ")}` : "";
};

export const cardName = (cardId: string) => ITEMS[cardId]?.name ?? cardId;
