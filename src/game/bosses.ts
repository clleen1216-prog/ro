// Mini-bosses and MVPs. They reuse the existing procedural models, recoloured and enlarged,
// and respawn quickly so they are worth hunting.

import type { DropEntry, MonsterDef } from "@/game/rodata";

type Base = {
  name: string;
  look: string;
  tint: string;
  level: number;
  hp: number;
  atk: number;
  def: number;
  mdef: number;
  exp: number;
  jexp: number;
  draw: number;
  speed: number;
  respawn: number;
  zeny: [number, number];
  tag: string;
  fly?: boolean;
  drops: DropEntry[];
};

const mini = (b: Base): MonsterDef => ({
  name: b.name, level: b.level, hp: b.hp, atk: b.atk, def: b.def, mdef: b.mdef, exp: b.exp, jexp: b.jexp,
  behavior: "aggressive", speed: b.speed, aggro: 190, draw: b.draw, look: b.look, tint: b.tint, mini: true, fly: b.fly,
  respawn: b.respawn, zeny: b.zeny, tag: `Mini-Boss · ${b.tag}`, drops: b.drops,
});

const mvp = (b: Base): MonsterDef => ({
  name: b.name, level: b.level, hp: b.hp, atk: b.atk, def: b.def, mdef: b.mdef, exp: b.exp, jexp: b.jexp,
  behavior: "aggressive", speed: b.speed, aggro: 230, draw: b.draw, look: b.look, tint: b.tint, boss: true, fly: b.fly,
  respawn: b.respawn, zeny: b.zeny, tag: `MVP · ${b.tag}`, drops: b.drops,
});

export const BOSS_DEFS: Record<string, MonsterDef> = {
  // ── Poring Fields ──
  mastering: mini({ name: "Mastering", look: "poring", tint: "#ff3a3a", level: 12, hp: 1700, atk: 26, def: 4, mdef: 12, exp: 260, jexp: 170, draw: 104, speed: 54, respawn: 28, zeny: [60, 140], tag: "Plant · Water 1",
    drops: [{ id: "jellopy", rate: 100 }, { id: "red-potion", rate: 40 }, { id: "yellow-potion", rate: 10 }, { id: "poring-hat", rate: 3 }, { id: "santa-hat", rate: 2 }, { id: "mastering-card", rate: 1 }] }),
  eclipse: mini({ name: "Eclipse", look: "lunatic", tint: "#a888ff", level: 14, hp: 2000, atk: 30, def: 6, mdef: 10, exp: 320, jexp: 210, draw: 106, speed: 66, respawn: 28, zeny: [70, 150], tag: "Brute · Neutral 3",
    drops: [{ id: "jellopy", rate: 100 }, { id: "red-potion", rate: 40 }, { id: "bunny-band", rate: 4 }, { id: "lollipop", rate: 6 }, { id: "eclipse-card", rate: 1 }] }),
  "golden-poring": mvp({ name: "Golden Poring", look: "poring", tint: "#ffd23a", level: 20, hp: 4600, atk: 44, def: 10, mdef: 25, exp: 1100, jexp: 700, draw: 150, speed: 60, respawn: 45, zeny: [300, 600], tag: "Plant · Holy 1",
    drops: [{ id: "gold-nugget", rate: 80 }, { id: "yellow-potion", rate: 40 }, { id: "white-potion", rate: 20 }, { id: "gold-crown", rate: 2 }, { id: "poring-hat", rate: 12 }, { id: "angel-halo", rate: 1 }, { id: "golden-poring-card", rate: 1.5 }] }),

  // ── Willow Woods ──
  "ancient-willow": mini({ name: "Ancient Willow", look: "willow", tint: "#55e08a", level: 16, hp: 2600, atk: 36, def: 10, mdef: 14, exp: 380, jexp: 250, draw: 108, speed: 40, respawn: 30, zeny: [80, 160], tag: "Plant · Earth 3",
    drops: [{ id: "red-potion", rate: 40 }, { id: "yellow-potion", rate: 12 }, { id: "flower-wreath", rate: 4 }, { id: "rose", rate: 5 }, { id: "ancient-willow-card", rate: 1 }] }),
  "hive-captain": mini({ name: "Hive Captain", look: "hornet", tint: "#ffd23a", level: 18, hp: 2400, atk: 42, def: 8, mdef: 12, exp: 420, jexp: 280, draw: 100, speed: 92, respawn: 30, zeny: [90, 170], tag: "Insect · Wind 2", fly: true,
    drops: [{ id: "yellow-potion", rate: 15 }, { id: "goggles", rate: 3 }, { id: "bandana", rate: 5 }, { id: "hive-captain-card", rate: 1 }] }),
  mistress: mvp({ name: "Mistress", look: "hornet", tint: "#ff9ad0", level: 26, hp: 7800, atk: 66, def: 16, mdef: 30, exp: 2400, jexp: 1500, draw: 150, speed: 98, respawn: 50, zeny: [500, 900], tag: "Insect · Wind 4", fly: true,
    drops: [{ id: "white-potion", rate: 40 }, { id: "blue-potion", rate: 25 }, { id: "star-mask", rate: 3 }, { id: "bunny-band", rate: 8 }, { id: "guitar", rate: 2 }, { id: "violin", rate: 6 }, { id: "mistress-card", rate: 1.5 }] }),
  "moonlight-flower": mvp({ name: "Moonlight Flower", look: "wolf", tint: "#e8e0ff", level: 30, hp: 11000, atk: 82, def: 20, mdef: 34, exp: 3600, jexp: 2300, draw: 152, speed: 104, respawn: 55, zeny: [700, 1200], tag: "Demi-Human · Fire 3",
    drops: [{ id: "white-potion", rate: 40 }, { id: "blue-potion", rate: 30 }, { id: "cat-ears", rate: 10 }, { id: "scarlet-katar", rate: 2 }, { id: "saint-robe", rate: 3 }, { id: "angel-halo", rate: 1.2 }, { id: "moonlight-flower-card", rate: 1.5 }] }),

  // ── Sograt Dunes ──
  "scorpion-lord": mini({ name: "Scorpion Lord", look: "scorpion", tint: "#ff4a8a", level: 20, hp: 3200, atk: 52, def: 14, mdef: 12, exp: 520, jexp: 340, draw: 106, speed: 70, respawn: 32, zeny: [100, 190], tag: "Insect · Fire 2",
    drops: [{ id: "yellow-potion", rate: 15 }, { id: "eyepatch", rate: 4 }, { id: "katar", rate: 3 }, { id: "scorpion-lord-card", rate: 1 }] }),
  "dune-stalker": mini({ name: "Dune Stalker", look: "wolf", tint: "#6a8aff", level: 22, hp: 3400, atk: 56, def: 12, mdef: 10, exp: 560, jexp: 370, draw: 106, speed: 96, respawn: 32, zeny: [110, 200], tag: "Brute · Earth 2",
    drops: [{ id: "yellow-potion", rate: 15 }, { id: "cat-ears", rate: 5 }, { id: "jur", rate: 2 }, { id: "dune-stalker-card", rate: 1 }] }),
  eddga: mvp({ name: "Eddga", look: "wolf", tint: "#ff9a3a", level: 32, hp: 13000, atk: 92, def: 22, mdef: 22, exp: 4200, jexp: 2700, draw: 160, speed: 108, respawn: 55, zeny: [800, 1300], tag: "Brute · Fire 1",
    drops: [{ id: "white-potion", rate: 40 }, { id: "blue-potion", rate: 30 }, { id: "oridecon", rate: 60 }, { id: "great-bow", rate: 5 }, { id: "lance", rate: 3 }, { id: "fist", rate: 3 }, { id: "viking-helm", rate: 4 }, { id: "eddga-card", rate: 1.5 }] }),
  phreeoni: mvp({ name: "Phreeoni", look: "condor", tint: "#7ad04a", level: 34, hp: 14500, atk: 96, def: 24, mdef: 26, exp: 4700, jexp: 3000, draw: 160, speed: 100, respawn: 55, zeny: [900, 1400], tag: "Brute · Neutral 3", fly: true,
    drops: [{ id: "white-potion", rate: 40 }, { id: "blue-potion", rate: 30 }, { id: "crossbow", rate: 5 }, { id: "hunter-bow", rate: 10 }, { id: "goggles", rate: 8 }, { id: "top-hat", rate: 5 }, { id: "phreeoni-card", rate: 1.5 }] }),

  // ── Culvert Crypt ──
  "zombie-master": mini({ name: "Zombie Master", look: "zombie", tint: "#44ff88", level: 24, hp: 3800, atk: 62, def: 18, mdef: 8, exp: 640, jexp: 420, draw: 108, speed: 48, respawn: 34, zeny: [120, 220], tag: "Undead · Undead 1",
    drops: [{ id: "yellow-potion", rate: 15 }, { id: "mustache", rate: 6 }, { id: "mace", rate: 4 }, { id: "zombie-master-card", rate: 1 }] }),
  "skeleton-general": mini({ name: "Skeleton General", look: "skeleton", tint: "#ff5a3a", level: 26, hp: 4200, atk: 70, def: 22, mdef: 10, exp: 720, jexp: 470, draw: 108, speed: 72, respawn: 34, zeny: [130, 240], tag: "Undead · Undead 1",
    drops: [{ id: "yellow-potion", rate: 15 }, { id: "pirate-hat", rate: 4 }, { id: "battle-axe", rate: 3 }, { id: "skeleton-general-card", rate: 1 }] }),
  osiris: mvp({ name: "Osiris", look: "zombie", tint: "#e4b15a", level: 36, hp: 16500, atk: 100, def: 28, mdef: 30, exp: 5400, jexp: 3400, draw: 162, speed: 70, respawn: 60, zeny: [1000, 1600], tag: "Undead · Undead 4",
    drops: [{ id: "white-potion", rate: 40 }, { id: "blue-potion", rate: 30 }, { id: "gold-crown", rate: 3 }, { id: "morning-star", rate: 4 }, { id: "chain", rate: 6 }, { id: "vampire-fangs", rate: 5 }, { id: "osiris-card", rate: 1.5 }] }),
  drake: mvp({ name: "Drake", look: "skeleton", tint: "#5ac8f0", level: 38, hp: 18500, atk: 108, def: 30, mdef: 24, exp: 6000, jexp: 3800, draw: 162, speed: 86, respawn: 60, zeny: [1100, 1700], tag: "Undead · Undead 1",
    drops: [{ id: "white-potion", rate: 40 }, { id: "blue-potion", rate: 30 }, { id: "pirate-hat", rate: 15 }, { id: "hammer", rate: 3 }, { id: "slayer", rate: 4 }, { id: "full-plate", rate: 5 }, { id: "drake-card", rate: 1.5 }] }),
  baphomet: mvp({ name: "Baphomet", look: "familiar", tint: "#9a3ab0", level: 42, hp: 24000, atk: 120, def: 34, mdef: 40, exp: 8200, jexp: 5200, draw: 170, speed: 94, respawn: 65, zeny: [1400, 2200], tag: "Demon · Dark 3", fly: true,
    drops: [{ id: "white-potion", rate: 40 }, { id: "blue-potion", rate: 30 }, { id: "devil-horns", rate: 8 }, { id: "wizard-hat", rate: 10 }, { id: "staff-of-soul", rate: 5 }, { id: "valkyrie-helm", rate: 1.5 }, { id: "baphomet-card", rate: 2 }] }),

  // ── Orc Village ──
  "goblin-leader": mini({ name: "Goblin Leader", look: "goblin", tint: "#ffd23a", level: 28, hp: 4600, atk: 74, def: 20, mdef: 10, exp: 820, jexp: 540, draw: 108, speed: 82, respawn: 36, zeny: [140, 260], tag: "Demi-Human · Wind 1",
    drops: [{ id: "yellow-potion", rate: 15 }, { id: "hard-hat", rate: 8 }, { id: "monocle", rate: 4 }, { id: "goblin-leader-card", rate: 1 }] }),
  "orc-archer-chief": mini({ name: "Orc Chief", look: "orc", tint: "#4a8aff", level: 32, hp: 5400, atk: 84, def: 24, mdef: 12, exp: 960, jexp: 620, draw: 112, speed: 72, respawn: 36, zeny: [160, 280], tag: "Demi-Human · Earth 1",
    drops: [{ id: "yellow-potion", rate: 15 }, { id: "viking-helm", rate: 4 }, { id: "orc-helm", rate: 8 }, { id: "orc-archer-chief-card", rate: 1 }] }),
  "orc-lord": mvp({ name: "Orc Lord", look: "orc", tint: "#40404e", level: 40, hp: 21000, atk: 114, def: 34, mdef: 22, exp: 7000, jexp: 4500, draw: 168, speed: 78, respawn: 60, zeny: [1200, 1900], tag: "Demi-Human · Earth 4",
    drops: [{ id: "white-potion", rate: 40 }, { id: "blue-potion", rate: 30 }, { id: "oridecon", rate: 60 }, { id: "claymore", rate: 8 }, { id: "battle-axe", rate: 6 }, { id: "crusader-helm", rate: 8 }, { id: "viking-helm", rate: 10 }, { id: "orc-lord-card", rate: 2 }] }),
};
