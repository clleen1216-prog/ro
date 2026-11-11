// Skills for the first jobs (Acolyte, Thief, Merchant) and every second job.
// Data-driven: each skill carries an `fx` recipe that sim.ts interprets.
// Inspired by the classic RO skill trees (irowiki.org), tuned for this game's numbers.

import type { JobId, SkillDef, SkillFx } from "@/game/types";

type Row = [name: string, job: JobId, sp: number, max: number, target: SkillDef["target"], blurb: string, fx: SkillFx];

function defs<K extends string>(rows: Record<K, Row>) {
  const out = {} as Record<K, SkillDef>;
  for (const id of Object.keys(rows) as K[]) {
    const [name, job, sp, max, target, blurb, fx] = rows[id];
    (out as Record<string, SkillDef>)[id] = { id: id as never, name, job, sp, max, target, blurb, fx };
  }
  return out;
}

const HOLY = "#fff2a8";
const FIRE = "#ff8a3a";
const POISON = "#9a5ad0";

export const NEW_SKILLS = defs({
  // ───────────── Acolyte ─────────────
  heal: ["Heal", "acolyte", 13, 10, "self", "Restore HP by a large amount. Scales with INT.", { t: "heal", heal: 30, hr: 28 }],
  blessing: ["Blessing", "acolyte", 24, 5, "self", "ATK and HIT rise for a while.", { t: "buff", buff: [{ stat: "atk", a: 4, ar: 3, dur: 60 }, { stat: "hit", a: 6, ar: 4, dur: 60 }, { stat: "str", a: 2, ar: 1, dur: 60 }, { stat: "int", a: 2, ar: 1, dur: 60 }, { stat: "dex", a: 2, ar: 1, dur: 60 }] }],
  incAgi: ["Increase AGI", "acolyte", 18, 5, "self", "FLEE and attack speed rise.", { t: "buff", buff: [{ stat: "flee", a: 6, ar: 5, dur: 50 }, { stat: "aspd", a: 4, ar: 3, dur: 50 }, { stat: "agi", a: 3, ar: 1.5, dur: 50 }] }],
  holyLight: ["Holy Light", "acolyte", 15, 1, "enemy", "A ray of holy magic that always hits.", { t: "hit", m: 1.7, mg: true, rng: true, col: HOLY, shot: "bolt" }],
  divineProt: ["Divine Protection", "acolyte", 0, 10, "passive", "Passive. DEF rises with rank.", { t: "passive", pass: { def: 2 } }],

  // ───────────── Thief ─────────────
  envenom: ["Envenom", "thief", 10, 10, "enemy", "A poisoned stab. Poison ticks for several seconds.", { t: "hit", m: 1.15, r: 0.1, col: POISON, psn: 6, pr: 1 }],
  hiding: ["Hiding", "thief", 12, 5, "self", "Vanish. Monsters lose track of you and FLEE soars for a while.", { t: "buff", hide: true, buff: [{ stat: "flee", a: 20, ar: 8, dur: 12 }] }],
  throwStone: ["Stone Fling", "thief", 3, 1, "enemy", "Hurl a stone. Cheap, ranged, and dizzies the target.", { t: "hit", m: 0.8, rng: true, col: "#b7ad9c", shot: "bolt", stun: 1.2 }],
  improveDodge: ["Improve Dodge", "thief", 0, 10, "passive", "Passive. FLEE rises with rank.", { t: "passive", pass: { flee: 3 } }],
  doubleAttack: ["Double Attack", "thief", 0, 10, "passive", "Passive. Attack power and crit rise with rank.", { t: "passive", pass: { atk: 2, crit: 1 } }],

  // ───────────── Merchant ─────────────
  mammonite: ["Mammonite", "merchant", 10, 10, "enemy", "A heavy blow powered by coin. Costs 100 zeny per cast.", { t: "hit", m: 1.6, r: 0.2, col: "#e4b15a", zeny: 100 }],
  cartRev: ["Cart Revolution", "merchant", 12, 10, "area", "Swing the cart: damages and shoves everything around you.", { t: "area", m: 1.2, r: 0.13, rad: 80, rr: 3, col: "#c9a43a", kb: true, self: true }],
  loudExc: ["Loud Exclamation", "merchant", 8, 1, "self", "A thunderous shout. ATK jumps for a minute.", { t: "buff", buff: [{ stat: "atk", a: 10, ar: 0, dur: 60 }, { stat: "str", a: 4, ar: 0, dur: 60 }] }],
  discount: ["Discount", "merchant", 0, 10, "passive", "Passive. Shop prices drop by 2.4% per rank.", { t: "passive", pass: { disc: 2.4 } }],

  // ───────────── Knight ─────────────
  pierce: ["Pierce", "knight", 7, 10, "enemy", "Three rapid thrusts of the spear.", { t: "hit", m: 0.95, r: 0.12, n: 3, col: "#e4e8f0" }],
  brandish: ["Brandish Spear", "knight", 12, 10, "area", "A sweeping arc of the spear that hits everything near you.", { t: "area", m: 1.5, r: 0.2, rad: 96, rr: 3, col: "#e4e8f0", kb: true, self: true }],
  twoHandQuick: ["Two-Hand Quicken", "knight", 14, 10, "self", "Attack speed and ATK surge.", { t: "buff", buff: [{ stat: "aspd", a: 18, ar: 1.5, dur: 60 }, { stat: "atk", a: 3, ar: 2, dur: 60 }] }],
  spearMastery: ["Spear Mastery", "knight", 0, 10, "passive", "Passive. ATK rises with rank.", { t: "passive", pass: { atk: 4 } }],
  peco: ["Cavalier Mastery", "knight", 0, 5, "passive", "Passive. HP and speed of attack rise.", { t: "passive", pass: { hp: 3, aspd: 2 } }],

  // ───────────── Crusader ─────────────
  holyCross: ["Holy Cross", "crusader", 11, 10, "enemy", "Two holy slashes in a cross.", { t: "hit", m: 1.1, r: 0.14, n: 2, col: HOLY, mg: false }],
  shieldCharge: ["Shield Charge", "crusader", 10, 5, "enemy", "Slam with your shield: damages, knocks back and stuns.", { t: "hit", m: 1.0, r: 0.12, col: "#aeb8c4", kb: true, stun: 1.5, sr: 0.4 }],
  grandCross: ["Grand Cross", "crusader", 30, 10, "area", "A huge cross of holy light around you.", { t: "area", m: 1.9, r: 0.22, rad: 110, rr: 3, col: HOLY, self: true, n: 2 }],
  autoGuard: ["Auto Guard", "crusader", 20, 10, "self", "A rock-steady stance. DEF rises sharply.", { t: "buff", buff: [{ stat: "def", a: 6, ar: 3, dur: 45 }] }],
  faith: ["Faith", "crusader", 0, 10, "passive", "Passive. Maximum HP rises 3% per rank.", { t: "passive", pass: { hp: 3 } }],

  // ───────────── Wizard ─────────────
  jupitel: ["Jupitel Thunder", "wizard", 20, 10, "enemy", "A string of lightning orbs that knock the target back.", { t: "hit", m: 0.8, r: 0.1, n: 3, nr: 0.5, mg: true, rng: true, col: "#f2e46a", shot: "bolt", kb: true }],
  lov: ["Lord of Vermilion", "wizard", 45, 10, "area", "A great wind of lightning across a wide area.", { t: "area", m: 1.1, r: 0.14, rad: 150, rr: 4, mg: true, rng: true, col: "#f2e46a", shot: "strike", n: 4 }],
  meteor: ["Meteor Storm", "wizard", 38, 10, "area", "Meteors rain on the target area.", { t: "area", m: 1.3, r: 0.15, rad: 130, rr: 3, mg: true, rng: true, col: FIRE, shot: "strike", n: 3, stun: 0.8 }],
  energyCoat: ["Energy Coat", "wizard", 30, 5, "self", "A mana shell. DEF and attack speed rise.", { t: "buff", buff: [{ stat: "def", a: 8, ar: 4, dur: 60 }] }],
  soulDrain: ["Soul Drain", "wizard", 0, 10, "passive", "Passive. Maximum SP and MATK rise.", { t: "passive", pass: { sp: 3, matk: 2 } }],

  // ───────────── Sage ─────────────
  earthSpike: ["Earth Spike", "sage", 14, 10, "enemy", "Spikes of stone rise under the target, hitting once per rank.", { t: "hit", m: 0.7, r: 0.05, n: 2, nr: 0.4, mg: true, rng: true, col: "#b08a4a", shot: "strike" }],
  heavensDrive: ["Heaven's Drive", "sage", 28, 10, "area", "The earth erupts across a wide area.", { t: "area", m: 1.2, r: 0.13, rad: 120, rr: 4, mg: true, rng: true, col: "#b08a4a", shot: "strike", n: 2 }],
  endowBlaze: ["Endow Blaze", "sage", 25, 5, "self", "Fire fills your weapon and spells. ATK and MATK rise.", { t: "buff", buff: [{ stat: "atk", a: 5, ar: 3, dur: 90 }, { stat: "matk", a: 6, ar: 5, dur: 90 }] }],
  study: ["Study", "sage", 0, 10, "passive", "Passive. MATK and SP rise with rank.", { t: "passive", pass: { matk: 2, sp: 2 } }],

  // ───────────── Hunter ─────────────
  blitz: ["Blitz Beat", "hunter", 14, 10, "enemy", "Your falcon dives. Hits more as your DEX grows.", { t: "hit", m: 1.0, r: 0.12, n: 2, col: "#e4e8f0", rng: true, shot: "arrow", dexBonus: 0.015 }],
  ankleSnare: ["Ankle Snare", "hunter", 12, 5, "enemy", "A snare pins the target in place for several seconds.", { t: "hit", m: 0.5, rng: true, col: "#8a8a8a", stun: 3, sr: 1.5 }],
  sharpShoot: ["Sharp Shooting", "hunter", 18, 10, "enemy", "A precise shot with huge crit chance.", { t: "hit", m: 1.9, r: 0.24, rng: true, col: "#e8dcb8", shot: "arrow", crit: 60, ign: true }],
  steelCrow: ["Steel Crow", "hunter", 0, 10, "passive", "Passive. Falcon damage, ATK rises.", { t: "passive", pass: { atk: 3, hit: 1 } }],

  // ───────────── Bard ─────────────
  melody: ["Melody Strike", "bard", 12, 10, "enemy", "A sonic note that always hits.", { t: "hit", m: 1.35, r: 0.14, mg: true, rng: true, col: "#e86ac8", shot: "bolt" }],
  whistle: ["A Whistle", "bard", 22, 10, "self", "FLEE and HIT rise.", { t: "buff", buff: [{ stat: "flee", a: 8, ar: 4, dur: 60 }, { stat: "hit", a: 6, ar: 3, dur: 60 }] }],
  assassinCross: ["Assassin Cross of Sunset", "bard", 30, 5, "self", "A fast march. Attack speed jumps.", { t: "buff", buff: [{ stat: "aspd", a: 14, ar: 3, dur: 60 }] }],
  appleIdun: ["Apple of Idun", "bard", 24, 5, "self", "A restoring song. Heals and raises DEF.", { t: "heal", heal: 40, hr: 22, buff: [{ stat: "def", a: 4, ar: 2, dur: 30 }] }],

  // ───────────── Priest ─────────────
  sanctuary: ["Sanctuary", "priest", 25, 10, "self", "A holy ground. Heals a lot.", { t: "heal", heal: 90, hr: 55 }],
  kyrie: ["Kyrie Eleison", "priest", 20, 10, "self", "A barrier of grace. DEF soars for a while.", { t: "buff", buff: [{ stat: "def", a: 8, ar: 4, dur: 30 }] }],
  magnus: ["Magnus Exorcismus", "priest", 40, 10, "area", "Holy cross magic across a wide area.", { t: "area", m: 1.1, r: 0.16, rad: 120, rr: 4, mg: true, rng: true, col: HOLY, shot: "strike", n: 3 }],
  impositio: ["Impositio Manus", "priest", 16, 5, "self", "Hands on your weapon. ATK rises.", { t: "buff", buff: [{ stat: "atk", a: 8, ar: 4, dur: 80 }] }],

  // ───────────── Monk ─────────────
  investigate: ["Investigate", "monk", 10, 10, "enemy", "A blow that ignores armour.", { t: "hit", m: 1.4, r: 0.18, col: "#f6d28a", ign: true }],
  fingerOff: ["Finger Offensive", "monk", 14, 10, "enemy", "Fire spirit spheres, one per rank.", { t: "hit", m: 0.9, r: 0.05, n: 1, nr: 0.6, rng: true, col: "#f6d28a", shot: "bolt" }],
  asura: ["Asura Strike", "monk", 30, 5, "enemy", "Pour all your remaining SP into one thundering blow.", { t: "hit", m: 3.2, r: 0.5, col: "#ffd25a", all: true, ign: true }],
  explSpirits: ["Explosion Spirits", "monk", 20, 5, "self", "Spirits blaze. ATK and crit climb.", { t: "buff", buff: [{ stat: "atk", a: 6, ar: 3, dur: 60 }, { stat: "crit", a: 12, ar: 4, dur: 60 }] }],
  tripleAttack: ["Triple Attack", "monk", 0, 10, "passive", "Passive. ATK and attack speed rise.", { t: "passive", pass: { atk: 3, aspd: 1.5 } }],

  // ───────────── Assassin ─────────────
  sonic: ["Sonic Blow", "assassin", 16, 10, "enemy", "Eight blindingly fast slashes.", { t: "hit", m: 0.55, r: 0.07, n: 8, col: "#d6dbe4", crit: 12 }],
  grimtooth: ["Grimtooth", "assassin", 10, 5, "enemy", "A stab that reaches far and poisons.", { t: "hit", m: 1.3, r: 0.18, rng: true, col: POISON, psn: 5, pr: 1, shot: "bolt" }],
  enchantPoison: ["Enchant Poison", "assassin", 18, 10, "self", "Your blade drips venom. ATK rises.", { t: "buff", buff: [{ stat: "atk", a: 6, ar: 3, dur: 60 }] }],
  cloaking: ["Cloaking", "assassin", 14, 10, "self", "Vanish. FLEE and attack speed soar for a short while.", { t: "buff", hide: true, buff: [{ stat: "flee", a: 25, ar: 6, dur: 15 }, { stat: "aspd", a: 8, ar: 1, dur: 15 }] }],
  katarMastery: ["Katar Mastery", "assassin", 0, 10, "passive", "Passive. ATK and crit rise.", { t: "passive", pass: { atk: 4, crit: 1 } }],

  // ───────────── Rogue ─────────────
  backstab: ["Back Stab", "rogue", 12, 10, "enemy", "Two vicious stabs from behind.", { t: "hit", m: 1.0, r: 0.14, n: 2, col: "#d6dbe4", crit: 20 }],
  raid: ["Raid", "rogue", 14, 5, "area", "Leap in and strike everyone near you. They are stunned.", { t: "area", m: 1.2, r: 0.15, rad: 90, rr: 3, col: "#c0c6d0", self: true, stun: 2 }],
  stealCoin: ["Steal Coin", "rogue", 8, 10, "enemy", "A quick stab that lifts coin from the target.", { t: "hit", m: 0.9, r: 0.08, col: "#e4b15a", loot: 1 }],
  intimidate: ["Intimidate", "rogue", 12, 5, "enemy", "A shove that sends the target flying.", { t: "hit", m: 1.2, r: 0.12, col: "#aeb8c4", kb: true, stun: 1 }],
  dodgeMastery: ["Vulture's Eye", "rogue", 0, 10, "passive", "Passive. HIT and FLEE rise.", { t: "passive", pass: { hit: 2, flee: 2 } }],

  // ───────────── Blacksmith ─────────────
  hammerFall: ["Hammer Fall", "blacksmith", 14, 5, "area", "Slam the ground. Everything near you is stunned.", { t: "area", m: 1.1, r: 0.12, rad: 90, rr: 3, col: "#c9a43a", self: true, stun: 2.2, sr: 0.3 }],
  adrenaline: ["Adrenaline Rush", "blacksmith", 20, 5, "self", "Axes and maces swing much faster.", { t: "buff", buff: [{ stat: "aspd", a: 18, ar: 2, dur: 60 }] }],
  overThrust: ["Over Thrust", "blacksmith", 24, 5, "self", "Push your weapon to the limit. ATK soars.", { t: "buff", buff: [{ stat: "atk", a: 10, ar: 5, dur: 60 }] }],
  ironHand: ["Hilt Binding", "blacksmith", 0, 10, "passive", "Passive. ATK and HIT rise.", { t: "passive", pass: { atk: 3, hit: 1 } }],

  // ───────────── Alchemist ─────────────
  acidTerror: ["Acid Terror", "alchemist", 15, 10, "enemy", "Flask of acid. Ignores armour.", { t: "hit", m: 1.5, r: 0.2, rng: true, col: "#8ae04a", shot: "bolt", ign: true }],
  demonstration: ["Demonstration", "alchemist", 22, 10, "area", "A fire bomb: burning damage on an area.", { t: "area", m: 1.1, r: 0.15, rad: 100, rr: 3, rng: true, col: FIRE, shot: "strike", n: 2 }],
  potionPitcher: ["Potion Pitcher", "alchemist", 18, 5, "self", "A fine potion. Heals a lot.", { t: "heal", heal: 60, hr: 40 }],
  alchemyStudy: ["Axe Mastery", "alchemist", 0, 10, "passive", "Passive. ATK rises with rank.", { t: "passive", pass: { atk: 3 } }],
});
