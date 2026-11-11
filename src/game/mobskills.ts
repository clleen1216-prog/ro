// Special skills for monsters. Every skill is telegraphed: a warning shape appears on the ground
// for `wind` seconds, so players can step out of it.
import type { StatusKind } from "@/game/status";
import type { VfxKind } from "@/game/vfx";

export type MobSkill = {
  id: string;
  name: string;
  /** seconds before this monster may use any skill again after using this one */
  cd: number;
  /** preferred distance band to the target */
  min: number;
  max: number;
  /** wind-up (telegraph) seconds */
  wind: number;
  /** damage radius around the lock-on point */
  r: number;
  /** centred on the caster (true) or on the target's position (false) */
  self?: boolean;
  /** damage multiplier on the monster's ATK (0 = none) */
  dmg: number;
  status?: { kind: StatusKind; secs: number; power?: number };
  vfx: VfxKind;
  col: string;
  /** special behaviours */
  special?: "dash" | "heal" | "call" | "howl";
  /** only when below this HP fraction */
  hpBelow?: number;
};

export const MOB_SKILLS: Record<string, MobSkill> = {
  slam: { id: "slam", name: "Ground Slam", cd: 7, min: 0, max: 90, wind: 0.8, r: 86, self: true, dmg: 1.5, status: { kind: "stun", secs: 1.3 }, vfx: "shock", col: "#e4b15a" },
  quake: { id: "quake", name: "Earthquake", cd: 9, min: 0, max: 120, wind: 1.0, r: 130, self: true, dmg: 1.8, status: { kind: "stun", secs: 1.6 }, vfx: "spikes", col: "#b08850" },
  spit: { id: "spit", name: "Venom Spit", cd: 8, min: 70, max: 230, wind: 0.7, r: 44, dmg: 0.7, status: { kind: "poison", secs: 9, power: 3 }, vfx: "bubbles", col: "#8ad04a" },
  toxic: { id: "toxic", name: "Toxic Cloud", cd: 11, min: 40, max: 220, wind: 0.9, r: 96, dmg: 0.3, status: { kind: "poison", secs: 10, power: 4 }, vfx: "cloud", col: "#7ac43a" },
  sleep: { id: "sleep", name: "Sleep Powder", cd: 12, min: 40, max: 200, wind: 1.0, r: 96, dmg: 0, status: { kind: "sleep", secs: 3.2 }, vfx: "cloud", col: "#9ab8ff" },
  frost: { id: "frost", name: "Frost Nova", cd: 9, min: 0, max: 170, wind: 0.9, r: 100, dmg: 1.0, status: { kind: "freeze", secs: 1.8 }, vfx: "ice", col: "#8fd8ff" },
  nova: { id: "nova", name: "Inferno Nova", cd: 10, min: 0, max: 140, wind: 1.1, r: 130, self: true, dmg: 2.0, vfx: "fire", col: "#ff7a2a" },
  bolt: { id: "bolt", name: "Thunder Call", cd: 7, min: 60, max: 260, wind: 0.8, r: 56, dmg: 1.3, status: { kind: "stun", secs: 0.9 }, vfx: "stormbolts", col: "#f2e46a" },
  curse: { id: "curse", name: "Dark Curse", cd: 12, min: 50, max: 240, wind: 1.0, r: 110, dmg: 0.4, status: { kind: "curse", secs: 9 }, vfx: "runes", col: "#b070e8" },
  hex: { id: "hex", name: "Silence Hex", cd: 13, min: 50, max: 240, wind: 0.9, r: 90, dmg: 0.3, status: { kind: "silence", secs: 6 }, vfx: "runes", col: "#d8d0c0" },
  web: { id: "web", name: "Sticky Web", cd: 10, min: 60, max: 220, wind: 0.8, r: 80, dmg: 0.4, status: { kind: "slow", secs: 5 }, vfx: "cloud", col: "#d8d8d8" },
  howl: { id: "howl", name: "Pack Howl", cd: 14, min: 0, max: 300, wind: 0.9, r: 150, self: true, dmg: 0, status: { kind: "slow", secs: 3 }, vfx: "howl", col: "#e8e0ff", special: "howl" },
  call: { id: "call", name: "Call Reinforcements", cd: 20, min: 0, max: 320, wind: 1.1, r: 0, self: true, dmg: 0, vfx: "howl", col: "#ff9a5a", special: "call" },
  charge: { id: "charge", name: "Rampage Charge", cd: 8, min: 110, max: 330, wind: 0.8, r: 54, dmg: 1.6, status: { kind: "stun", secs: 1.0 }, vfx: "smoke", col: "#e4b15a", special: "dash" },
  mend: { id: "mend", name: "Regenerate", cd: 22, min: 0, max: 600, wind: 1.0, r: 0, self: true, dmg: 0, vfx: "heal", col: "#7ad04a", special: "heal", hpBelow: 0.55 },
};

/** skills for ordinary monsters and a few signature ones; bosses list their own in bosses.ts */
export const DEFAULT_SKILLS: Record<string, string[]> = {
  poporing: ["spit"],
  scorpion: ["spit"],
  hornet: ["spit"],
  creamy: ["sleep"],
  zombie: ["toxic"],
  "orc-zombie": ["toxic"],
  familiar: ["curse"],
  skeleton: ["hex"],
  "orc-skeleton": ["hex"],
  willow: ["web"],
  "desert-wolf": ["howl"],
  "orc-warrior": ["slam"],
  goblin: ["bolt"],
  lunatic: ["web"],
};

export const AI_BY_KIND: Record<string, "hitrun" | "kite" | "pack"> = {
  hornet: "hitrun",
  condor: "hitrun",
  familiar: "hitrun",
  poporing: "kite",
  scorpion: "hitrun",
  "desert-wolf": "pack",
  goblin: "pack",
  "orc-warrior": "pack",
};

export const BOSS_SKILLS: Record<string, string[]> = {
  mastering: ["slam", "spit"],
  eclipse: ["sleep", "web"],
  "golden-poring": ["bolt", "mend", "call"],
  "ancient-willow": ["web", "toxic", "mend"],
  "hive-captain": ["spit", "call", "charge"],
  mistress: ["toxic", "sleep", "charge", "call"],
  "moonlight-flower": ["howl", "charge", "curse", "call"],
  "scorpion-lord": ["spit", "slam", "charge"],
  "dune-stalker": ["howl", "charge", "web"],
  eddga: ["howl", "charge", "quake", "call", "mend"],
  phreeoni: ["bolt", "hex", "charge", "mend"],
  "zombie-master": ["toxic", "slam", "call"],
  "skeleton-general": ["hex", "slam", "call", "charge"],
  osiris: ["curse", "quake", "toxic", "mend", "call"],
  drake: ["frost", "slam", "charge", "nova"],
  baphomet: ["curse", "hex", "nova", "bolt", "call", "mend"],
  "goblin-leader": ["bolt", "call", "charge"],
  "orc-archer-chief": ["slam", "charge", "howl"],
  "orc-lord": ["quake", "nova", "charge", "call", "mend"],
  "orc-hero": ["slam", "quake", "charge", "howl", "mend"],
  "golden-bug": ["slam", "charge", "toxic"],
};

export const skillsFor = (kind: string): MobSkill[] => (BOSS_SKILLS[kind] ?? DEFAULT_SKILLS[kind] ?? []).map((id) => MOB_SKILLS[id]!).filter(Boolean);
export const aiFor = (kind: string): "hitrun" | "kite" | "pack" | undefined => AI_BY_KIND[kind];
