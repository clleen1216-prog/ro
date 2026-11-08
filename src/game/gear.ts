// Item rarity, weapon-type balance and gear scoring (iRO-style trade-offs).

import { JOBS, type ItemDef } from "@/game/content";
import type { JobId, WeaponKind } from "@/game/types";

export type Rarity = "normal" | "rare" | "hero" | "mystic" | "legendary";

export const RARITY: Record<Rarity, { label: string; color: string; rank: number }> = {
  normal: { label: "Normal", color: "#d9d4c8", rank: 0 },
  rare: { label: "Rare", color: "#4aa8ff", rank: 1 },
  hero: { label: "Hero", color: "#a96bff", rank: 2 },
  mystic: { label: "Mystic", color: "#ff5fae", rank: 3 },
  legendary: { label: "Legendary", color: "#ffb02e", rank: 4 },
};

const RANKS: Rarity[] = ["normal", "rare", "hero", "mystic", "legendary"];
const LEGEND_CARDS = new Set(["orc-hero-card", "golden-bug-card"]);
const HERO_CARDS = new Set(["zombie-card", "skeleton-card", "goblin-card", "orc-zombie-card", "orc-warrior-card", "orc-skeleton-card", "peco-peco-card", "familiar-card", "desert-wolf-card", "scorpion-card"]);

export function rarityOf(it: ItemDef): Rarity {
  if (it.slot === "use") return "normal";
  if (it.id.endsWith("-card")) return LEGEND_CARDS.has(it.id) ? "legendary" : HERO_CARDS.has(it.id) ? "hero" : "rare";
  const v = it.price;
  if (it.slot === "etc") return v >= 1000 ? "hero" : v >= 100 ? "rare" : "normal";
  return v >= 10000 ? "legendary" : v >= 4000 ? "mystic" : v >= 1000 ? "hero" : v >= 250 ? "rare" : "normal";
}

export const rarityColor = (it: ItemDef) => RARITY[rarityOf(it)].color;
export const isRareOrBetter = (it: ItemDef) => RARITY[rarityOf(it)].rank >= 1;
export { RANKS };

/**
 * Weapon types, after the classic RO classes of weapon:
 *  speed = attack-interval multiplier (lower is faster), atk = damage multiplier,
 *  crit/hit = flat bonuses, range = default reach in px.
 */
export const WEAPON_TYPES: Record<WeaponKind, { label: string; speed: number; atk: number; crit: number; hit: number; range: number; pros: string; cons: string }> = {
  dagger: { label: "Dagger", speed: 0.72, atk: 0.82, crit: 14, hit: 4, range: 40, pros: "Very fast attacks, high crit", cons: "Short reach, low damage per hit" },
  sword: { label: "Sword", speed: 1, atk: 1.08, crit: 0, hit: 0, range: 48, pros: "Balanced; best melee damage", cons: "Average speed, no ranged option" },
  staff: { label: "Staff", speed: 1.18, atk: 0.5, crit: 0, hit: 6, range: 160, pros: "Magic bolts from afar; boosts MATK", cons: "Slow, weak physical damage" },
  bow: { label: "Bow", speed: 1.06, atk: 0.95, crit: 3, hit: 10, range: 150, pros: "Long range, accurate; scales with DEX", cons: "Slower than melee, dies when rushed" },
  mace: { label: "Mace", speed: 1, atk: 1, crit: 0, hit: 4, range: 46, pros: "Steady damage and accuracy; fits healers", cons: "Nothing stands out" },
  spear: { label: "Spear", speed: 1.12, atk: 1.12, crit: 0, hit: -2, range: 66, pros: "Long melee reach, heavy thrusts", cons: "Slow recovery between thrusts" },
  axe: { label: "Axe", speed: 1.15, atk: 1.2, crit: 0, hit: -4, range: 46, pros: "Highest raw melee damage", cons: "Slow and a little inaccurate" },
  katar: { label: "Katar", speed: 0.78, atk: 0.9, crit: 22, hit: 0, range: 40, pros: "Fast hits with a very high crit chance", cons: "Short reach; Assassin only" },
  knuckle: { label: "Knuckle", speed: 0.68, atk: 0.7, crit: 8, hit: 8, range: 38, pros: "Fastest combo speed, accurate", cons: "Low damage per hit, very short reach" },
  harp: { label: "Instrument", speed: 1.1, atk: 0.55, crit: 0, hit: 6, range: 150, pros: "Songs from afar; boosts MATK", cons: "Weak physical damage, slow" },
};

export function weaponNote(it: ItemDef) {
  if (!it.weapon) return "";
  const t = WEAPON_TYPES[it.weapon];
  return `${t.label}: ${t.pros}. Cons: ${t.cons}.`;
}

/** Rough "how good is this for my job" score used by auto-equip. */
export function gearScore(it: ItemDef, job: JobId): number {
  const jd = JOBS[job];
  const phys = jd.magic ? 0.4 : 1;
  const mag = jd.magic ? 1.8 : 0.35;
  let s = (it.atk ?? 0) * phys * 2 + (it.matk ?? 0) * mag * 2;
  s += (it.def ?? 0) * 1.6 + (it.mdef ?? 0) * 0.9;
  const f = jd.focus;
  const w = { str: f === "str" ? 2 : 1, agi: f === "agi" ? 2 : 1, vit: f === "vit" ? 2 : 1.2, int: f === "int" ? 2.4 : 0.5, dex: f === "dex" ? 2.4 : 1, luk: 0.8 };
  s += (it.str ?? 0) * w.str + (it.agi ?? 0) * w.agi + (it.vit ?? 0) * w.vit + (it.int ?? 0) * w.int + (it.dex ?? 0) * w.dex + (it.luk ?? 0) * w.luk;
  if (it.weapon) {
    const t = WEAPON_TYPES[it.weapon];
    const rank = jd.weapons.indexOf(it.weapon);
    s = s * (t.atk > 0.6 ? t.atk / t.speed : 1 / t.speed) + (rank === 0 ? 90 : rank > 0 ? 25 : -30);
    s += (it.range ?? 0) * 0.02;
  }
  return s + RARITY[rarityOf(it)].rank * 0.5;
}
