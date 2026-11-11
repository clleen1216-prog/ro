// Ragnarok-Online-style data: monsters, drop tables and items.
//
// Stats and drop rates are modelled on the classic (pre-renewal) iRO database
// and then tuned to this game's combat formulas. Base/Job EXP carry a built-in
// 3x "event rate" so a session of play actually levels you. Card drop rates are
// boosted well above the real 0.01% so you can see one in a sitting.

import { BOSS_DEFS } from "@/game/bosses";
import type { ItemDef } from "@/game/content";
import type { Behavior, IconKind } from "@/game/types";

export type DropEntry = { id: string; rate: number };

export type MonsterDef = {
  name: string;
  hp: number;
  atk: number;
  def: number;
  mdef: number;
  exp: number;
  jexp: number;
  level: number;
  behavior: Behavior;
  speed: number;
  aggro: number;
  draw: number;
  /** procedural look id (monsters without PNG art) */
  look?: string;
  boss?: boolean;
  /** mid-tier boss: bigger bar, recoloured model, fast respawn */
  mini?: boolean;
  /** colour wash over the model */
  tint?: string;
  fly?: boolean;
  /** special skills this monster can use (see mobskills.ts) */
  skills?: string[];
  /** fighting style: hitrun backs off after each blow, kite keeps its distance, pack calls allies */
  ai?: "hitrun" | "kite" | "pack";
  /** seconds before respawn */
  respawn?: number;
  /** zeny per kill */
  zeny: [number, number];
  /** classic RO element/race label shown in the target panel */
  tag: string;
  drops: DropEntry[];
};

const it = (d: ItemDef): ItemDef => d;

function etc(id: string, name: string, icon: IconKind, tint: string, sell: number, desc: string): ItemDef {
  return it({ id, name, slot: "etc", icon, tint, desc, price: sell * 2, sell, stack: true });
}

function use(
  id: string,
  name: string,
  icon: IconKind,
  tint: string,
  price: number,
  desc: string,
  extra: Partial<ItemDef>,
): ItemDef {
  return it({ id, name, slot: "use", icon, tint, desc, price, sell: Math.floor(price / 2), stack: true, ...extra });
}

function gear(
  id: string,
  name: string,
  slot: ItemDef["slot"],
  icon: IconKind,
  tint: string,
  price: number,
  desc: string,
  extra: Partial<ItemDef>,
): ItemDef {
  return it({ id, name, slot, icon, tint, desc, price, sell: Math.floor(price / 2), ...extra });
}

const ITEM_LIST: ItemDef[] = [
  // ── Consumables ────────────────────────────────────────────────
  use("red-potion", "Red Potion", "potion", "#d4534a", 50, "A weak healing potion. Heals about 60 HP.", { heal: 60 }),
  use("orange-potion", "Orange Potion", "potion", "#e0833a", 200, "Heals about 120 HP.", { heal: 120 }),
  use("yellow-potion", "Yellow Potion", "potion", "#e4c24a", 550, "Heals about 220 HP.", { heal: 220 }),
  use("white-potion", "White Potion", "potion", "#f2efe4", 1200, "Heals about 380 HP.", { heal: 380 }),
  use("blue-potion", "Blue Potion", "ether", "#3d8fd1", 1500, "Restores about 60 SP.", { spRestore: 60 }),
  use("green-herb", "Green Herb", "herb", "#5aa05a", 12, "A bitter herb. Heals about 20 HP.", { heal: 20 }),
  use("apple", "Apple", "apple", "#c8453a", 15, "Crisp and sweet. Heals about 16 HP.", { heal: 16 }),
  use("carrot", "Carrot", "herb", "#e0833a", 20, "Heals about 20 HP.", { heal: 20 }),
  use("honey", "Honey", "jelly", "#e4b15a", 80, "Heals 70 HP and restores 10 SP.", { heal: 70, spRestore: 10 }),
  use("fly-wing", "Fly Wing", "wingfly", "#f6f0e4", 60, "Teleports you to a random spot on this map.", { effect: "fly" }),
  use("butterfly-wing", "Butterfly Wing", "wingfly", "#9ec7ee", 300, "Returns you to Ambercross.", { effect: "butterfly" }),

  // ── Loot (etc) ─────────────────────────────────────────────────
  etc("jellopy", "Jellopy", "jelly", "#e8c8d4", 6, "A small gooey lump that drops from Porings."),
  etc("sticky-mucus", "Sticky Mucus", "mucus", "#9ac8a0", 20, "Slimy and strands like glue."),
  etc("clover", "Clover", "herb", "#5fa85f", 7, "A common four-leaf clover."),
  etc("feather", "Feather", "plume", "#f6f0e4", 2, "A soft downy feather."),
  etc("chrysalis", "Chrysalis", "wood", "#b79a6a", 15, "A papery cocoon shell."),
  etc("stem", "Stem", "wood", "#6b8a3a", 5, "A slim green twig."),
  etc("grasshopper-leg", "Grasshopper's Leg", "claw", "#7aa04a", 8, "A springy green leg."),
  etc("bee-sting", "Sting", "sting", "#e4c24a", 14, "A needle-sharp stinger."),
  etc("butterfly-scale", "Powder of Butterfly", "gem", "#e8d6f2", 14, "Glittering wing dust."),
  etc("scorpion-tail", "Scorpion Tail", "sting", "#a2663a", 22, "A hooked, venom-dry tail."),
  etc("wolf-claw", "Claw of Desert Wolf", "claw", "#cbb892", 18, "A sandy, curved claw."),
  etc("beak", "Talon", "claw", "#e4b15a", 14, "A sharp raptor talon."),
  etc("peco-feather", "Yellow Plume", "plume", "#f0d04a", 10, "A bright yellow tail feather."),
  etc("bat-tooth", "Tooth of Bat", "bone", "#efe6d2", 20, "A needle tooth from a Familiar."),
  etc("rotten-bandage", "Rotten Bandage", "cloth", "#b8a88a", 20, "Mouldering linen wrap."),
  etc("decayed-nail", "Decayed Nail", "claw", "#7a6a4a", 34, "A blackened old nail."),
  etc("skel-bone", "Skel-Bone", "bone", "#e9e2cf", 34, "A knuckle of old skeleton."),
  etc("gold-nugget", "Gold", "gem", "#e4b15a", 700, "A solid gold chunk. Sells very well."),
  etc("orc-tusk", "Orc Tusk", "bone", "#efe6d2", 110, "A chipped tusk from an orc."),
  etc("iron-ore", "Iron Ore", "gem", "#8a8f9a", 90, "A heavy lump of ore."),
  etc("oridecon", "Oridecon", "gem", "#7ec8e8", 820, "A rare blue-white ore smiths prize."),
  etc("orcish-voucher", "Orcish Voucher", "cloth", "#c8a86a", 95, "A scrap carrying an orc's mark."),
  etc("goblin-ear", "Goblin Ear", "claw", "#7aa04a", 40, "A pointy green ear."),
  // Existing Southmead loot (amber-jelly, fluff, wing, heartwood) lives in content.ts.

  // ── Weapons ────────────────────────────────────────────────────
  gear("knife", "Knife", "weapon", "knife", "#cfd3da", 50, "A common dagger.", { atk: 11, weapon: "dagger", range: 46 }),
  gear("cutter", "Cutter", "weapon", "knife", "#d7dbe2", 500, "A short, wide blade.", { atk: 17, weapon: "dagger", range: 46 }),
  gear("main-gauche", "Main Gauche", "weapon", "knife", "#e0e4ea", 1200, "A parrying dagger with a basket guard.", { atk: 24, weapon: "dagger", range: 46, agi: 1 }),
  gear("sword", "Sword", "weapon", "sword", "#d5d8df", 500, "A plain one-handed sword.", { atk: 19, weapon: "sword", range: 54, jobs: ["novice", "swordman"] }),
  gear("blade", "Blade", "weapon", "sword", "#e1e5ec", 2500, "A balanced steel blade.", { atk: 27, weapon: "sword", range: 55, jobs: ["novice", "swordman"] }),
  gear("slayer", "Slayer", "weapon", "sword", "#c7d3e6", 4800, "A heavy two-edged sword. Hits hard.", { atk: 38, str: 1, weapon: "sword", range: 57, jobs: ["swordman"] }),
  gear("rod", "Rod", "weapon", "staff", "#8a6a3a", 50, "A plain casting rod.", { atk: 2, matk: 12, weapon: "staff", range: 156, jobs: ["novice", "mage", "acolyte"] }),
  gear("wand", "Wand", "weapon", "staff", "#7a8fd0", 800, "A short wand with a blue gem.", { atk: 2, matk: 20, int: 1, weapon: "staff", range: 160, jobs: ["mage"] }),
  gear("arc-wand", "Arc Wand", "weapon", "staff", "#b06ad0", 3400, "Crackles with stored mana.", { atk: 3, matk: 32, int: 2, weapon: "staff", range: 168, jobs: ["mage"] }),
  gear("bow", "Bow", "weapon", "bow", "#b8935a", 200, "A simple short bow.", { atk: 14, weapon: "bow", range: 176, jobs: ["novice", "archer"] }),
  gear("composite-bow", "Composite Bow", "weapon", "bow", "#a37a3a", 1800, "Layered horn and wood. A real pull.", { atk: 24, dex: 1, weapon: "bow", range: 190, jobs: ["archer"] }),
  gear("great-bow", "Great Bow", "weapon", "bow", "#7a5a2a", 4500, "Taller than the archer who draws it.", { atk: 34, dex: 2, weapon: "bow", range: 204, jobs: ["archer"] }),
  // ── Second-wave weapons (maces, spears, axes, katars, knuckles, instruments) ──
  gear("club", "Club", "weapon", "mace", "#9a7a4a", 120, "A stout wooden club.", { atk: 13, weapon: "mace", range: 48, jobs: ["acolyte", "merchant"] }),
  gear("mace", "Mace", "weapon", "mace", "#aeb4bd", 900, "A flanged iron mace. Reliable.", { atk: 21, weapon: "mace", range: 50, jobs: ["acolyte", "merchant"] }),
  gear("chain", "Chain", "weapon", "mace", "#8a8f98", 2800, "A spiked chain on a short haft.", { atk: 30, int: 1, weapon: "mace", range: 52, jobs: ["acolyte", "merchant"] }),
  gear("morning-star", "Morning Star", "weapon", "mace", "#c7ccd4", 5200, "A heavy spiked ball on a long grip.", { atk: 40, int: 1, vit: 1, weapon: "mace", range: 54, jobs: ["acolyte"] }),
  gear("javelin", "Javelin", "weapon", "spear", "#cfd3da", 650, "A light throwing spear used in melee.", { atk: 20, weapon: "spear", range: 68, jobs: ["knight", "crusader"] }),
  gear("spear", "Spear", "weapon", "spear", "#d5d8df", 2200, "A well-balanced war spear.", { atk: 30, weapon: "spear", range: 72, jobs: ["knight", "crusader"] }),
  gear("lance", "Lance", "weapon", "spear", "#e1e5ec", 5600, "A knight's long lance.", { atk: 43, str: 1, weapon: "spear", range: 76, jobs: ["knight", "crusader"] }),
  gear("axe", "Axe", "weapon", "axe", "#b5b9c1", 450, "A woodsman's axe.", { atk: 22, weapon: "axe", range: 50, jobs: ["merchant", "swordman"] }),
  gear("battle-axe", "Battle Axe", "weapon", "axe", "#c4c8d0", 2600, "A broad two-handed axe.", { atk: 36, str: 1, weapon: "axe", range: 52, jobs: ["merchant", "swordman"] }),
  gear("hammer", "Hammer", "weapon", "axe", "#9aa0aa", 5400, "A smith's war hammer. Hits very hard.", { atk: 47, str: 2, weapon: "axe", range: 54, jobs: ["merchant"] }),
  gear("katar", "Katar", "weapon", "katar", "#cfd3da", 800, "A punch dagger with an H-grip.", { atk: 17, weapon: "katar", range: 44, jobs: ["assassin"] }),
  gear("jur", "Jur", "weapon", "katar", "#d9dde4", 2900, "A twin-bladed katar.", { atk: 26, agi: 1, weapon: "katar", range: 44, jobs: ["assassin"] }),
  gear("scarlet-katar", "Scarlet Katar", "weapon", "katar", "#e07a7a", 5600, "Stained red from a hundred shadows.", { atk: 36, agi: 2, weapon: "katar", range: 46, jobs: ["assassin"] }),
  gear("knuckle-duster", "Knuckle Duster", "weapon", "knuckle", "#a8adb6", 600, "Brass knuckles.", { atk: 14, weapon: "knuckle", range: 40, jobs: ["monk"] }),
  gear("hora", "Hora", "weapon", "knuckle", "#c9a43a", 2500, "A spiked fist guard.", { atk: 22, str: 1, weapon: "knuckle", range: 42, jobs: ["monk"] }),
  gear("fist", "Fist of the Mountain", "weapon", "knuckle", "#e4b15a", 5200, "Gauntlets worn smooth by training.", { atk: 31, str: 1, agi: 1, weapon: "knuckle", range: 44, jobs: ["monk"] }),
  gear("violin", "Violin", "weapon", "harp", "#a8643a", 700, "A fiddle for marching songs.", { atk: 6, matk: 9, weapon: "harp", range: 150, jobs: ["bard"] }),
  gear("lute", "Lute", "weapon", "harp", "#b87a3a", 2700, "A warm, ringing lute.", { atk: 8, matk: 17, dex: 1, weapon: "harp", range: 156, jobs: ["bard"] }),
  gear("guitar", "Guitar", "weapon", "harp", "#d4a05a", 5000, "Electric with applause.", { atk: 10, matk: 27, dex: 1, int: 1, weapon: "harp", range: 162, jobs: ["bard"] }),

  // ── Armor ──────────────────────────────────────────────────────
  gear("jacket", "Jacket", "armor", "armor", "#9a8a6a", 120, "A light cloth jacket.", { def: 5 }),
  gear("padded-armor", "Padded Armor", "armor", "armor", "#b79a6a", 600, "Quilted cloth and leather. Light and tough.", { def: 11 }),
  gear("chain-mail", "Chain Mail", "armor", "armor", "#b7c0cc", 1800, "Woven steel rings.", { def: 20, vit: 1, jobs: ["novice", "swordman", "archer"] }),
  gear("silk-robe", "Silk Robe", "armor", "armor", "#c6b8ea", 2400, "Light silk with a warded hem.", { def: 9, mdef: 12, int: 1, jobs: ["novice", "mage"] }),
  gear("hood", "Hood", "garment", "cape", "#7a6a8a", 600, "A plain traveller's hood.", { def: 3, mdef: 2 }),
  gear("muffler", "Muffler", "garment", "cape", "#c6564a", 1500, "Thick wool, warm against the wind.", { def: 5, mdef: 4 }),
  gear("manteau", "Manteau", "garment", "cape", "#3a4a86", 4800, "A fine lined cloak.", { def: 8, mdef: 8 }),

  // ── Shoes ──────────────────────────────────────────────────────
  gear("sandals", "Sandals", "shoes", "boots", "#b79a6a", 400, "Open leather sandals.", { def: 2 }),
  gear("shoes", "Shoes", "shoes", "boots", "#6b442c", 900, "Sturdy walking shoes.", { def: 4 }),
  gear("boots", "Boots", "shoes", "boots", "#4a3a2a", 3500, "Tall leather boots.", { def: 6, agi: 1 }),

  // ── Shields ────────────────────────────────────────────────────
  gear("guard", "Guard", "shield", "shield", "#c9ccd1", 1600, "A small steel guard.", { def: 8, jobs: ["novice", "swordman"] }),
  gear("shield", "Shield", "shield", "shield", "#d8dce2", 3200, "A tall kite shield.", { def: 13, vit: 1, jobs: ["swordman"] }),

  // ── Headgear ───────────────────────────────────────────────────
  gear("hat", "Hat", "headUpper", "brim", "#8a6a3a", 200, "A wide, floppy hat.", { def: 2, hat: "brim" }),
  gear("cap", "Cap", "headUpper", "cap", "#4a6aa0", 400, "A practical work cap.", { def: 4, hat: "cap" }),
  gear("helm", "Helm", "headUpper", "cap", "#b7c0cc", 6000, "A steel helm.", { def: 9, hat: "cap", jobs: ["novice", "swordman"] }),
  gear("ribbon", "Ribbon", "headUpper", "ribbon", "#d4687a", 800, "A big red bow. Slightly mind-sharpening.", { def: 1, mdef: 3, int: 1, hat: "ribbon" }),
  gear("sunglasses", "Sunglasses", "headMid", "glasses", "#2a2a32", 1000, "Dark lenses.", { def: 1, hat: "glasses" }),

  // ── Headgear: top ─────────────────────────────────────────────
  gear("straw-hat", "Straw Hat", "headUpper", "brim", "#e0c070", 600, "A wide straw hat. Cool in summer.", { def: 2, hat: "straw" }),
  gear("hard-hat", "Hard Hat", "headUpper", "cap", "#f0c030", 900, "A yellow safety helmet.", { def: 6, hat: "hardhat" }),
  gear("bandana", "Bandana", "headUpper", "ribbon", "#c33a3a", 700, "A knotted cloth. Light on the head.", { def: 2, agi: 1, hat: "bandana" }),
  gear("headband", "Headband", "headUpper", "ribbon", "#f4f0e8", 900, "A white training band.", { def: 2, str: 1, hat: "headband" }),
  gear("beret", "Beret", "headUpper", "cap", "#a8384a", 1200, "A soft wool beret.", { def: 2, int: 1, hat: "beret" }),
  gear("bunny-band", "Bunny Band", "headUpper", "ribbon", "#f6e9ee", 1800, "Long floppy ears on a band.", { def: 1, mdef: 2, agi: 1, int: 1, hat: "bunny" }),
  gear("cat-ears", "Cat Ears", "headUpper", "ribbon", "#c9a278", 2200, "A band with two twitchy ears.", { def: 1, agi: 2, hat: "cat" }),
  gear("flower-wreath", "Flower Wreath", "headUpper", "ribbon", "#ff9ac0", 2800, "Blossoms woven into a green ring.", { mdef: 4, int: 1, luk: 1, hat: "flower" }),
  gear("poring-hat", "Poring Hat", "headUpper", "cap", "#ffa0b8", 3000, "A smiling pink blob. Surprisingly lucky.", { def: 3, vit: 1, luk: 2, hat: "poring" }),
  gear("santa-hat", "Santa Hat", "headUpper", "cap", "#d83a3a", 2600, "Red, fluffy and festive.", { def: 2, luk: 2, hat: "santa" }),
  gear("top-hat", "Top Hat", "headUpper", "brim", "#2a2a32", 3400, "A gentleman's silk hat.", { def: 3, dex: 1, luk: 1, hat: "tophat" }),
  gear("wizard-hat", "Wizard Hat", "headUpper", "brim", "#4a44b8", 4200, "A tall pointed hat humming with magic.", { def: 3, mdef: 8, int: 2, hat: "wizard", jobs: ["mage", "acolyte", "novice"] }),
  gear("pirate-hat", "Pirate Hat", "headUpper", "brim", "#25252d", 5200, "A tricorn with a grinning skull.", { def: 5, str: 1, dex: 1, hat: "pirate" }),
  gear("viking-helm", "Viking Helm", "headUpper", "cap", "#aeb8c4", 7500, "Iron cap with two long horns.", { def: 11, str: 2, vit: 1, hat: "viking", jobs: ["swordman", "merchant"] }),
  gear("crusader-helm", "Crusader Helm", "headUpper", "cap", "#3a5ab0", 8800, "A blue-crested great helm.", { def: 12, vit: 2, str: 1, hat: "helm", jobs: ["swordman"] }),
  gear("angel-halo", "Angel Halo", "headUpper", "ribbon", "#ffe27a", 9000, "A ring of light and tiny wings.", { def: 3, mdef: 8, int: 2, luk: 1, hat: "angel" }),
  gear("devil-horns", "Devil Horns", "headUpper", "ribbon", "#a82a2a", 9000, "Small, sharp, and a little smug.", { def: 3, atk: 6, str: 2, hat: "devil" }),
  gear("gold-crown", "Gold Crown", "headUpper", "ribbon", "#e4b15a", 16000, "A jeweled crown fit for a king.", { def: 8, mdef: 6, str: 1, int: 1, dex: 1, hat: "crown" }),
  gear("valkyrie-helm", "Valkyrie Helm", "headUpper", "cap", "#d9dde6", 22000, "A winged helm that sings in the wind.", { def: 14, mdef: 10, str: 2, agi: 2, dex: 2, hat: "valk" }),
  // ── Headgear: middle ──────────────────────────────────────────
  gear("clown-nose", "Clown Nose", "headMid", "glasses", "#d83a3a", 300, "Honk.", { luk: 1, hat: "clown" }),
  gear("eyepatch", "Eyepatch", "headMid", "glasses", "#1a1a1a", 1200, "Mysterious. Sharpens the other eye.", { dex: 1, luk: 1, hat: "eyepatch" }),
  gear("monocle", "Monocle", "headMid", "glasses", "#e4b15a", 1500, "A gold-rimmed lens on a chain.", { int: 1, dex: 1, hat: "monocle" }),
  gear("goggles", "Goggles", "headMid", "glasses", "#8a6a3a", 2400, "Brass goggles with blue lenses.", { def: 2, dex: 1, agi: 1, hat: "goggles" }),
  gear("star-mask", "Star Mask", "headMid", "glasses", "#7a3ab0", 4000, "A masquerade mask with a silver star.", { def: 2, mdef: 3, luk: 2, hat: "starmask" }),
  // ── Headgear: bottom ──────────────────────────────────────────
  gear("lollipop", "Lollipop", "headLower", "ribbon", "#ff6a9a", 400, "Sweet and sticky.", { luk: 1, hat: "lollipop" }),
  gear("mustache", "Mustache", "headLower", "ribbon", "#3a2a1a", 500, "A curled false mustache.", { def: 1, str: 1, hat: "mustache" }),
  gear("beard", "Beard", "headLower", "ribbon", "#8a6a3a", 900, "A thick, warm beard.", { def: 1, vit: 1, hat: "beard" }),
  gear("rose", "Rose", "headLower", "ribbon", "#d82a4a", 1500, "A red rose held in the teeth.", { mdef: 2, luk: 1, hat: "rose" }),
  gear("vampire-fangs", "Vampire Fangs", "headLower", "ribbon", "#ffffff", 3600, "Two very white, very pointy teeth.", { atk: 3, str: 1, luk: 1, hat: "fangs" }),

  // ── High tier ──────────────────────────────────────────────────
  gear("claymore", "Claymore", "weapon", "sword", "#e7ecf4", 9000, "A great hand-and-a-half sword.", { atk: 52, str: 2, weapon: "sword", range: 58, jobs: ["swordman"] }),
  gear("staff-of-soul", "Staff of Soul", "weapon", "staff", "#c27ae0", 8200, "A staff humming with borrowed spirit.", { atk: 4, matk: 48, int: 3, weapon: "staff", range: 172, jobs: ["mage"] }),
  gear("crossbow", "Crossbow", "weapon", "bow", "#6a4a2a", 7600, "Slow to draw, brutal to take.", { atk: 46, dex: 3, weapon: "bow", range: 210, jobs: ["archer"] }),
  gear("full-plate", "Full Plate", "armor", "armor", "#c9d2de", 21000, "Heavy steel from collar to knee.", { def: 34, vit: 2, jobs: ["swordman"] }),
  gear("saint-robe", "Saint Robe", "armor", "armor", "#f2efe4", 14000, "Blessed cloth that turns spells.", { def: 15, mdef: 26, int: 2, jobs: ["mage", "novice"] }),
  gear("ranger-coat", "Ranger Coat", "armor", "armor", "#4e7a3e", 12500, "Supple hide cut for moving fast.", { def: 20, agi: 2, dex: 1, jobs: ["archer", "novice", "swordman"] }),
  gear("greaves", "Greaves", "shoes", "boots", "#9aa0aa", 6200, "Steel shin guards over thick boots.", { def: 10, vit: 1 }),
  gear("orc-helm", "Orc Helm", "headUpper", "cap", "#6a7a3a", 12000, "A spiked helm taken from an orc warrior.", { def: 13, str: 1, hat: "cap", jobs: ["novice", "swordman", "archer"] }),
  gear("earring", "Earring", "acc", "ring", "#e4b15a", 4500, "A gold hoop that sharpens the mind.", { int: 2, mdef: 3 }),
  gear("orc-bracer", "Orcish Bracer", "acc", "ring", "#8a5a32", 7000, "Studded leather. Adds real muscle.", { str: 2, def: 3 }),

  // ── Accessories ────────────────────────────────────────────────
  gear("clip", "Clip", "acc", "ring", "#c9ccd1", 800, "A small metal clip.", { def: 1, mdef: 1 }),
  gear("glove", "Glove", "acc", "ring", "#8a6a3a", 2200, "A leather glove. Steadies the aim.", { def: 2, dex: 2 }),
  gear("rosary", "Rosary", "acc", "charm", "#e4b15a", 2000, "A string of prayer beads.", { mdef: 3, luk: 1 }),
];

export const RO_ITEMS: Record<string, ItemDef> = Object.fromEntries(ITEM_LIST.map((d) => [d.id, d]));

// Cards: one per new monster. They don't slot into gear here — they are
// collectible loot that sells for a lot of zeny.
function card(id: string, mobName: string, level: number): ItemDef {
  return it({
    id: `${id}-card`,
    name: `${mobName} Card`,
    slot: "etc",
    icon: "card",
    tint: "#e4b15a",
    desc: `A rare card carrying the likeness of a ${mobName}. Collectors pay well.`,
    price: 1,
    sell: 1500 + level * 160,
    stack: true,
  });
}

export const MONSTER_DEFS: Record<string, MonsterDef> = {
  poring: {
    name: "Poring", level: 1, hp: 50, atk: 8, def: 0, mdef: 5, exp: 6, jexp: 4,
    behavior: "passive", speed: 44, aggro: 0, draw: 66, look: "poring", zeny: [2, 8], tag: "Plant · Water 1",
    drops: [
      { id: "jellopy", rate: 70 }, { id: "apple", rate: 10 }, { id: "sticky-mucus", rate: 4 },
      { id: "knife", rate: 1 }, { id: "red-potion", rate: 3 }, { id: "poring-card", rate: 0.12 },
    ],
  },
  drops: {
    name: "Drops", level: 3, hp: 55, atk: 10, def: 2, mdef: 3, exp: 12, jexp: 8,
    behavior: "passive", speed: 46, aggro: 0, draw: 66, look: "drops", zeny: [4, 12], tag: "Plant · Fire 1",
    drops: [
      { id: "jellopy", rate: 55 }, { id: "apple", rate: 7 }, { id: "sticky-mucus", rate: 5 },
      { id: "cap", rate: 1.2 }, { id: "orange-potion", rate: 1.5 }, { id: "drops-card", rate: 0.12 },
    ],
  },
  lunatic: {
    name: "Lunatic", level: 3, hp: 55, atk: 9, def: 0, mdef: 20, exp: 12, jexp: 8,
    behavior: "passive", speed: 70, aggro: 0, draw: 70, look: "lunatic", zeny: [4, 12], tag: "Brute · Neutral 3",
    drops: [
      { id: "clover", rate: 70 }, { id: "feather", rate: 22 }, { id: "carrot", rate: 8 },
      { id: "sticky-mucus", rate: 3 }, { id: "cutter", rate: 0.6 }, { id: "lunatic-card", rate: 0.12 },
    ],
  },
  fabre: {
    name: "Fabre", level: 6, hp: 72, atk: 11, def: 0, mdef: 5, exp: 21, jexp: 13,
    behavior: "passive", speed: 40, aggro: 0, draw: 62, look: "fabre", zeny: [6, 16], tag: "Insect · Earth 1",
    drops: [
      { id: "fluff", rate: 55 }, { id: "clover", rate: 8 }, { id: "green-herb", rate: 9 },
      { id: "feather", rate: 10 }, { id: "sandals", rate: 0.8 }, { id: "fabre-card", rate: 0.12 },
    ],
  },
  pupa: {
    name: "Pupa", level: 2, hp: 140, atk: 5, def: 14, mdef: 20, exp: 9, jexp: 6,
    behavior: "passive", speed: 0, aggro: 0, draw: 58, look: "pupa", zeny: [3, 9], tag: "Insect · Earth 1",
    drops: [
      { id: "chrysalis", rate: 70 }, { id: "sticky-mucus", rate: 4 }, { id: "green-herb", rate: 3 },
      { id: "pupa-card", rate: 0.12 },
    ],
  },
  willow: {
    name: "Willow", level: 4, hp: 95, atk: 12, def: 3, mdef: 10, exp: 24, jexp: 15,
    behavior: "passive", speed: 38, aggro: 0, draw: 82, look: "willow", zeny: [6, 16], tag: "Plant · Earth 1",
    drops: [
      { id: "stem", rate: 70 }, { id: "sticky-mucus", rate: 9 }, { id: "green-herb", rate: 8 },
      { id: "hat", rate: 1.2 }, { id: "jacket", rate: 0.8 }, { id: "willow-card", rate: 0.12 },
    ],
  },
  rocker: {
    name: "Rocker", level: 9, hp: 198, atk: 20, def: 6, mdef: 5, exp: 57, jexp: 36,
    behavior: "passive", speed: 74, aggro: 0, draw: 74, look: "rocker", zeny: [12, 28], tag: "Insect · Earth 1",
    drops: [
      { id: "grasshopper-leg", rate: 70 }, { id: "honey", rate: 3 }, { id: "green-herb", rate: 7 },
      { id: "sword", rate: 0.4 }, { id: "padded-armor", rate: 0.5 }, { id: "rocker-card", rate: 0.12 },
    ],
  },
  hornet: {
    name: "Hornet", level: 14, hp: 176, atk: 24, def: 9, mdef: 5, exp: 78, jexp: 51,
    behavior: "aggressive", speed: 118, aggro: 190, draw: 66, look: "hornet", fly: true, zeny: [14, 34], tag: "Insect · Wind 1",
    drops: [
      { id: "bee-sting", rate: 70 }, { id: "honey", rate: 4 }, { id: "fly-wing", rate: 2.5 },
      { id: "orange-potion", rate: 1.5 }, { id: "rod", rate: 0.5 }, { id: "hornet-card", rate: 0.12 },
    ],
  },
  creamy: {
    name: "Creamy", level: 12, hp: 160, atk: 18, def: 4, mdef: 16, exp: 66, jexp: 42,
    behavior: "passive", speed: 70, aggro: 0, draw: 66, look: "creamy", fly: true, zeny: [10, 26], tag: "Insect · Wind 1",
    drops: [
      { id: "butterfly-scale", rate: 60 }, { id: "fly-wing", rate: 6 }, { id: "clover", rate: 10 },
      { id: "ribbon", rate: 0.5 }, { id: "creamy-card", rate: 0.12 },
    ],
  },
  condor: {
    name: "Condor", level: 5, hp: 110, atk: 16, def: 2, mdef: 5, exp: 36, jexp: 22,
    behavior: "aggressive", speed: 96, aggro: 160, draw: 70, look: "condor", fly: true, zeny: [8, 20], tag: "Brute · Wind 1",
    drops: [
      { id: "beak", rate: 55 }, { id: "feather", rate: 45 }, { id: "red-potion", rate: 4 },
      { id: "bow", rate: 0.5 }, { id: "condor-card", rate: 0.12 },
    ],
  },
  scorpion: {
    name: "Scorpion", level: 16, hp: 262, atk: 30, def: 12, mdef: 5, exp: 98, jexp: 64,
    behavior: "aggressive", speed: 72, aggro: 150, draw: 64, look: "scorpion", zeny: [18, 40], tag: "Insect · Fire 1",
    drops: [
      { id: "scorpion-tail", rate: 60 }, { id: "green-herb", rate: 8 }, { id: "orange-potion", rate: 3 },
      { id: "main-gauche", rate: 0.4 }, { id: "muffler", rate: 0.4 }, { id: "scorpion-card", rate: 0.12 },
    ],
  },
  "desert-wolf": {
    name: "Desert Wolf", level: 18, hp: 350, atk: 34, def: 10, mdef: 6, exp: 126, jexp: 82,
    behavior: "aggressive", speed: 112, aggro: 190, draw: 78, look: "wolf", zeny: [22, 48], tag: "Brute · Fire 1",
    drops: [
      { id: "wolf-claw", rate: 60 }, { id: "honey", rate: 4 }, { id: "yellow-potion", rate: 2 },
      { id: "chain-mail", rate: 0.4 }, { id: "shoes", rate: 0.6 }, { id: "desert-wolf-card", rate: 0.12 },
    ],
  },
  "peco-peco": {
    name: "Peco Peco", level: 19, hp: 520, atk: 36, def: 12, mdef: 5, exp: 190, jexp: 118,
    behavior: "passive", speed: 96, aggro: 0, draw: 92, look: "peco", zeny: [26, 56], tag: "Brute · Fire 1",
    drops: [
      { id: "peco-feather", rate: 65 }, { id: "feather", rate: 40 }, { id: "orange-potion", rate: 4 },
      { id: "yellow-potion", rate: 1.5 }, { id: "blade", rate: 0.3 }, { id: "peco-peco-card", rate: 0.12 },
    ],
  },
  familiar: {
    name: "Familiar", level: 8, hp: 155, atk: 20, def: 4, mdef: 5, exp: 54, jexp: 34,
    behavior: "aggressive", speed: 104, aggro: 180, draw: 62, look: "familiar", fly: true, zeny: [10, 24], tag: "Brute · Shadow 1",
    drops: [
      { id: "bat-tooth", rate: 55 }, { id: "red-potion", rate: 4 }, { id: "fly-wing", rate: 4 },
      { id: "wand", rate: 0.3 }, { id: "clip", rate: 0.6 }, { id: "familiar-card", rate: 0.12 },
    ],
  },
  zombie: {
    name: "Zombie", level: 15, hp: 420, atk: 38, def: 8, mdef: 3, exp: 110, jexp: 72,
    behavior: "aggressive", speed: 40, aggro: 140, draw: 90, look: "zombie", zeny: [20, 44], tag: "Undead · Undead 1",
    drops: [
      { id: "rotten-bandage", rate: 65 }, { id: "decayed-nail", rate: 20 }, { id: "orange-potion", rate: 2.5 },
      { id: "guard", rate: 0.4 }, { id: "hood", rate: 0.6 }, { id: "zombie-card", rate: 0.12 },
    ],
  },
  skeleton: {
    name: "Skeleton", level: 10, hp: 234, atk: 30, def: 8, mdef: 3, exp: 76, jexp: 48,
    behavior: "aggressive", speed: 64, aggro: 150, draw: 92, look: "skeleton", zeny: [14, 32], tag: "Undead · Undead 1",
    drops: [
      { id: "skel-bone", rate: 60 }, { id: "red-potion", rate: 3 }, { id: "decayed-nail", rate: 4 },
      { id: "sword", rate: 0.4 }, { id: "silk-robe", rate: 0.3 }, { id: "skeleton-card", rate: 0.12 },
    ],
  },
  poporing: {
    name: "Poporing", level: 14, hp: 344, atk: 28, def: 6, mdef: 18, exp: 96, jexp: 62,
    behavior: "passive", speed: 50, aggro: 0, draw: 70, look: "poporing", zeny: [16, 38], tag: "Plant · Poison 1",
    drops: [
      { id: "sticky-mucus", rate: 40 }, { id: "green-herb", rate: 10 }, { id: "orange-potion", rate: 2 },
      { id: "rosary", rate: 0.3 }, { id: "poporing-card", rate: 0.12 },
    ],
  },
  goblin: {
    name: "Goblin", level: 17, hp: 380, atk: 40, def: 10, mdef: 4, exp: 150, jexp: 96,
    behavior: "aggressive", speed: 92, aggro: 170, draw: 76, look: "goblin", zeny: [28, 60], tag: "Demi-Human · Wind 1",
    drops: [
      { id: "goblin-ear", rate: 60 }, { id: "iron-ore", rate: 10 }, { id: "orange-potion", rate: 4 },
      { id: "yellow-potion", rate: 1.5 }, { id: "greaves", rate: 0.3 }, { id: "goblin-card", rate: 0.12 },
    ],
  },
  "orc-zombie": {
    name: "Orc Zombie", level: 22, hp: 650, atk: 56, def: 14, mdef: 4, exp: 270, jexp: 170,
    behavior: "aggressive", speed: 42, aggro: 150, draw: 96, look: "orczombie", zeny: [40, 85], tag: "Undead · Undead 1",
    drops: [
      { id: "orcish-voucher", rate: 60 }, { id: "rotten-bandage", rate: 25 }, { id: "yellow-potion", rate: 3 },
      { id: "saint-robe", rate: 0.3 }, { id: "orc-zombie-card", rate: 0.12 },
    ],
  },
  "orc-warrior": {
    name: "Orc Warrior", level: 24, hp: 820, atk: 64, def: 20, mdef: 5, exp: 340, jexp: 215,
    behavior: "aggressive", speed: 70, aggro: 180, draw: 104, look: "orc", zeny: [50, 100], tag: "Demi-Human · Earth 1",
    drops: [
      { id: "orc-tusk", rate: 55 }, { id: "iron-ore", rate: 22 }, { id: "yellow-potion", rate: 5 },
      { id: "white-potion", rate: 1.2 }, { id: "oridecon", rate: 2 }, { id: "orc-helm", rate: 0.4 },
      { id: "claymore", rate: 0.25 }, { id: "orc-warrior-card", rate: 0.12 },
    ],
  },
  "orc-skeleton": {
    name: "Orc Skeleton", level: 28, hp: 900, atk: 70, def: 22, mdef: 6, exp: 420, jexp: 270,
    behavior: "aggressive", speed: 66, aggro: 180, draw: 104, look: "orcskeleton", zeny: [60, 120], tag: "Undead · Undead 1",
    drops: [
      { id: "orc-tusk", rate: 45 }, { id: "skel-bone", rate: 40 }, { id: "yellow-potion", rate: 5 },
      { id: "white-potion", rate: 1.5 }, { id: "oridecon", rate: 2.5 }, { id: "orc-bracer", rate: 0.3 },
      { id: "crossbow", rate: 0.25 }, { id: "orc-skeleton-card", rate: 0.12 },
    ],
  },
  "orc-hero": {
    name: "Orc Hero", level: 36, hp: 7200, atk: 100, def: 32, mdef: 18, exp: 5200, jexp: 3200,
    behavior: "aggressive", speed: 76, aggro: 210, draw: 150, look: "orchero", boss: true, respawn: 55, zeny: [900, 1500], tag: "Boss · Demi-Human · Earth 2",
    drops: [
      { id: "orc-tusk", rate: 100 }, { id: "oridecon", rate: 60 }, { id: "white-potion", rate: 40 },
      { id: "blue-potion", rate: 30 }, { id: "claymore", rate: 8 }, { id: "staff-of-soul", rate: 8 },
      { id: "crossbow", rate: 8 }, { id: "full-plate", rate: 5 }, { id: "ranger-coat", rate: 5 },
      { id: "earring", rate: 6 }, { id: "orc-hero-card", rate: 2 },
    ],
  },
  "golden-bug": {
    name: "Golden Thief Bug", level: 24, hp: 2600, atk: 52, def: 18, mdef: 20, exp: 1500, jexp: 900,
    behavior: "aggressive", speed: 84, aggro: 200, draw: 108, look: "goldbug", boss: true, respawn: 35, zeny: [400, 700], tag: "Boss · Insect · Fire 1",
    drops: [
      { id: "gold-nugget", rate: 70 }, { id: "white-potion", rate: 12 }, { id: "yellow-potion", rate: 25 },
      { id: "blue-potion", rate: 14 }, { id: "boots", rate: 6 }, { id: "great-bow", rate: 2.5 },
      { id: "arc-wand", rate: 2.5 }, { id: "slayer", rate: 2.5 }, { id: "manteau", rate: 3 },
      { id: "helm", rate: 3 }, { id: "shield", rate: 3 }, { id: "golden-bug-card", rate: 1.5 },
    ],
  },
};

Object.assign(MONSTER_DEFS, BOSS_DEFS);

// Fancy headgear now drops from monsters that suit it (rate is a percentage).
const HAT_DROPS: Record<string, [string, number][]> = {
  poring: [["poring-hat", 0.2], ["santa-hat", 0.15]],
  poporing: [["flower-wreath", 0.25], ["clown-nose", 0.6]],
  lunatic: [["bunny-band", 0.25], ["lollipop", 0.8]],
  fabre: [["straw-hat", 0.6]],
  pupa: [["beret", 0.3]],
  willow: [["flower-wreath", 0.2], ["rose", 0.5]],
  rocker: [["bandana", 0.5], ["headband", 0.4]],
  hornet: [["goggles", 0.2]],
  creamy: [["clown-nose", 0.8], ["bunny-band", 0.15]],
  scorpion: [["eyepatch", 0.25]],
  "desert-wolf": [["cat-ears", 0.25]],
  "peco-peco": [["straw-hat", 0.5], ["hard-hat", 0.3]],
  familiar: [["devil-horns", 0.08], ["wizard-hat", 0.3]],
  zombie: [["mustache", 0.4]],
  skeleton: [["pirate-hat", 0.15]],
  goblin: [["hard-hat", 0.5], ["lollipop", 0.7]],
  "orc-zombie": [["beard", 0.4]],
  "orc-warrior": [["viking-helm", 0.15], ["monocle", 0.2]],
  "orc-skeleton": [["vampire-fangs", 0.1], ["top-hat", 0.12]],
  "orc-hero": [["valkyrie-helm", 1.2], ["gold-crown", 1.2], ["crusader-helm", 4]],
  "golden-bug": [["angel-halo", 1.5], ["star-mask", 2], ["top-hat", 3]],
};
for (const [mid, list] of Object.entries(HAT_DROPS)) {
  const d = MONSTER_DEFS[mid];
  if (d) for (const [id, rate] of list) d.drops.push({ id, rate });
}

for (const [id, def] of Object.entries(MONSTER_DEFS)) {
  RO_ITEMS[`${id}-card`] = card(id, def.name, def.level);
}

export const SHOP_WEAPONS = [
  "knife", "cutter", "main-gauche", "sword", "blade", "slayer",
  "rod", "wand", "arc-wand", "bow", "composite-bow", "great-bow", "claymore", "staff-of-soul", "crossbow",
  "club", "mace", "chain", "morning-star", "javelin", "spear", "lance", "axe", "battle-axe", "hammer",
  "katar", "jur", "scarlet-katar", "knuckle-duster", "hora", "fist", "violin", "lute", "guitar",
];
export const SHOP_ARMOR = [
  "jacket", "padded-armor", "chain-mail", "silk-robe", "hood", "muffler", "manteau",
  "sandals", "shoes", "boots", "greaves", "guard", "shield", "full-plate", "saint-robe", "ranger-coat", "earring",
  "hat", "cap", "helm", "ribbon", "sunglasses", "clip", "glove", "rosary",
  "straw-hat", "hard-hat", "bandana", "headband", "beret", "bunny-band", "cat-ears", "flower-wreath", "poring-hat", "santa-hat", "top-hat",
  "wizard-hat", "pirate-hat", "viking-helm", "crusader-helm", "angel-halo", "devil-horns", "gold-crown", "valkyrie-helm",
  "clown-nose", "eyepatch", "monocle", "goggles", "star-mask", "lollipop", "mustache", "beard", "rose", "vampire-fangs",
];
export const SHOP_TOOLS = [
  "red-potion", "orange-potion", "yellow-potion", "white-potion", "blue-potion",
  "green-herb", "apple", "carrot", "honey", "fly-wing", "butterfly-wing",
];
