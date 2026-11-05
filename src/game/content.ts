import type {
  Behavior,
  GearSlot,
  HatKind,
  IconKind,
  ItemSlot,
  JobId,
  MapId,
  MonsterKind,
  SkillId,
  WeaponKind,
} from "@/game/types";

export const TILE = 48;
export const BASE_STAT = 5;

export const GEAR_SLOTS: GearSlot[] = [
  "headUpper",
  "headMid",
  "headLower",
  "armor",
  "weapon",
  "shield",
  "garment",
  "shoes",
  "acc1",
  "acc2",
];

export const SLOT_LABEL: Record<GearSlot, string> = {
  headUpper: "Upper",
  headMid: "Mid",
  headLower: "Lower",
  armor: "Armor",
  weapon: "Weapon",
  shield: "Shield",
  garment: "Garment",
  shoes: "Shoes",
  acc1: "Acc. R",
  acc2: "Acc. L",
};

export const HAIR_COLORS = [
  { id: "ink", label: "Ink", hex: "#2a2a32" },
  { id: "auburn", label: "Auburn", hex: "#a24b32" },
  { id: "honey", label: "Honey", hex: "#e0b15a" },
  { id: "wheat", label: "Wheat", hex: "#f2d7a2" },
  { id: "rose", label: "Rose", hex: "#d4687a" },
  { id: "violet", label: "Violet", hex: "#7a5ea7" },
  { id: "sky", label: "Sky", hex: "#6aa8d8" },
  { id: "mint", label: "Mint", hex: "#7dcea0" },
] as const;

export const TRIMS = [
  { id: "brass", label: "Brass", hex: "#c4a15a" },
  { id: "wine", label: "Wine", hex: "#8c3a4a" },
  { id: "pine", label: "Pine", hex: "#2f6b4a" },
  { id: "indigo", label: "Indigo", hex: "#3a4a86" },
  { id: "ivory", label: "Ivory", hex: "#efe6d2" },
  { id: "ink", label: "Ink", hex: "#2a2a32" },
] as const;

export const STYLES: { id: "bob" | "short" | "swept"; label: string }[] = [
  { id: "bob", label: "Bob" },
  { id: "short", label: "Cropped" },
  { id: "swept", label: "Swept" },
];

export type ItemDef = {
  id: string;
  name: string;
  slot: ItemSlot;
  icon: IconKind;
  tint: string;
  desc: string;
  price: number;
  stack?: boolean;
  heal?: number;
  spRestore?: number;
  atk?: number;
  matk?: number;
  def?: number;
  mdef?: number;
  str?: number;
  agi?: number;
  vit?: number;
  int?: number;
  dex?: number;
  luk?: number;
  jobs?: JobId[];
  weapon?: WeaponKind;
  range?: number;
  hat?: HatKind;
};

const item = (partial: ItemDef): ItemDef => partial;

export const ITEMS: Record<string, ItemDef> = {
  "worn-knife": item({
    id: "worn-knife",
    name: "Worn Knife",
    slot: "weapon",
    icon: "knife",
    tint: "#c9ccd1",
    desc: "A traveler's knife. Anyone can hold it.",
    price: 20,
    atk: 6,
    weapon: "dagger",
    range: 46,
  }),
  "short-sword": item({
    id: "short-sword",
    name: "Plaza Sword",
    slot: "weapon",
    icon: "sword",
    tint: "#d5d8df",
    desc: "A straight sword sold on the west road.",
    price: 340,
    atk: 16,
    weapon: "sword",
    range: 54,
    jobs: ["novice", "swordman"],
  }),
  "sun-blade": item({
    id: "sun-blade",
    name: "Sun Blade",
    slot: "weapon",
    icon: "sword",
    tint: "#e4b15a",
    desc: "Gilt edge, heavy enough to matter.",
    price: 980,
    atk: 28,
    str: 1,
    weapon: "sword",
    range: 56,
    jobs: ["swordman"],
  }),
  "oak-staff": item({
    id: "oak-staff",
    name: "Oak Staff",
    slot: "weapon",
    icon: "staff",
    tint: "#8a5a32",
    desc: "A walking staff with a blue spark in the crook.",
    price: 320,
    atk: 4,
    matk: 16,
    weapon: "staff",
    range: 156,
    jobs: ["mage"],
  }),
  "crystal-rod": item({
    id: "crystal-rod",
    name: "Crystal Rod",
    slot: "weapon",
    icon: "staff",
    tint: "#7eb6e0",
    desc: "The crystal remembers every bolt.",
    price: 1040,
    atk: 4,
    matk: 30,
    int: 1,
    weapon: "staff",
    range: 170,
    jobs: ["mage"],
  }),
  "hunter-bow": item({
    id: "hunter-bow",
    name: "Hunter Bow",
    slot: "weapon",
    icon: "bow",
    tint: "#c4a15a",
    desc: "Short enough for the meadow.",
    price: 360,
    atk: 15,
    weapon: "bow",
    range: 176,
    dex: 1,
    jobs: ["archer"],
  }),
  "long-bow": item({
    id: "long-bow",
    name: "Long Meadow Bow",
    slot: "weapon",
    icon: "bow",
    tint: "#8c6a32",
    desc: "Pulls clean past the pond.",
    price: 1020,
    atk: 27,
    weapon: "bow",
    range: 196,
    dex: 2,
    jobs: ["archer"],
  }),
  needle: item({
    id: "needle",
    name: "Needle",
    slot: "weapon",
    icon: "knife",
    tint: "#9aa0aa",
    desc: "A thin blade for close work.",
    price: 420,
    atk: 18,
    agi: 1,
    weapon: "dagger",
    range: 44,
    jobs: ["novice"],
  }),
  "cotton-shirt": item({
    id: "cotton-shirt",
    name: "Cotton Shirt",
    slot: "armor",
    icon: "armor",
    tint: "#efe6d2",
    desc: "Plain, clean, and better than nothing.",
    price: 40,
    def: 3,
  }),
  "leather-vest": item({
    id: "leather-vest",
    name: "Leather Vest",
    slot: "armor",
    icon: "armor",
    tint: "#8a5a32",
    desc: "Stitched for the south road.",
    price: 280,
    def: 9,
  }),
  "plate-coat": item({
    id: "plate-coat",
    name: "Plate Coat",
    slot: "armor",
    icon: "armor",
    tint: "#b7c0cc",
    desc: "Overlapping plates. Blades swear by it.",
    price: 860,
    def: 18,
    vit: 1,
    jobs: ["swordman"],
  }),
  "linen-robe": item({
    id: "linen-robe",
    name: "Linen Robe",
    slot: "armor",
    icon: "armor",
    tint: "#d7d2ea",
    desc: "Light cloth with a warded hem.",
    price: 340,
    def: 5,
    mdef: 8,
    jobs: ["mage"],
  }),
  "shade-wrap": item({
    id: "shade-wrap",
    name: "Shade Wrap",
    slot: "armor",
    icon: "armor",
    tint: "#3a4258",
    desc: "Light cloth. A Novice can wear it; a Mage likes the hem.",
    price: 220,
    def: 4,
    agi: 1,
  }),
  buckler: item({
    id: "buckler",
    name: "Round Buckler",
    slot: "shield",
    icon: "shield",
    tint: "#c4a15a",
    desc: "A small sun-stamped shield.",
    price: 200,
    def: 5,
    jobs: ["novice", "swordman"],
  }),
  "sun-shield": item({
    id: "sun-shield",
    name: "Sun Shield",
    slot: "shield",
    icon: "shield",
    tint: "#e4b15a",
    desc: "Tall enough to hide a shoulder.",
    price: 720,
    def: 11,
    vit: 1,
    jobs: ["swordman"],
  }),
  "travel-cape": item({
    id: "travel-cape",
    name: "Travel Cape",
    slot: "garment",
    icon: "cape",
    tint: "#2f8f86",
    desc: "Teal wool for the plaza wind.",
    price: 180,
    def: 2,
    hat: undefined,
  }),
  "mage-mantle": item({
    id: "mage-mantle",
    name: "Dusk Mantle",
    slot: "garment",
    icon: "cape",
    tint: "#3a4a86",
    desc: "A short mantle that likes spells.",
    price: 420,
    mdef: 6,
    int: 1,
    jobs: ["mage"],
  }),
  "ranger-cloak": item({
    id: "ranger-cloak",
    name: "Meadow Cloak",
    slot: "garment",
    icon: "cape",
    tint: "#3e6b3a",
    desc: "Green as the south fields.",
    price: 400,
    agi: 1,
    def: 2,
    jobs: ["archer"],
  }),
  "holy-shawl": item({
    id: "holy-shawl",
    name: "Sanctum Shawl",
    slot: "garment",
    icon: "cape",
    tint: "#f2efe4",
    desc: "Woven for the chapel steps.",
    price: 400,
    vit: 1,
    mdef: 3,
  }),
  "worn-shoes": item({
    id: "worn-shoes",
    name: "Worn Shoes",
    slot: "shoes",
    icon: "boots",
    tint: "#6b442c",
    desc: "Scuffed, but they still walk.",
    price: 15,
    def: 1,
  }),
  "quick-boots": item({
    id: "quick-boots",
    name: "Quick Boots",
    slot: "shoes",
    icon: "boots",
    tint: "#c4a15a",
    desc: "Light soles. The road feels shorter.",
    price: 260,
    agi: 2,
    def: 2,
  }),
  "march-boots": item({
    id: "march-boots",
    name: "March Boots",
    slot: "shoes",
    icon: "boots",
    tint: "#5c3a2a",
    desc: "Heavy enough to stand your ground.",
    price: 240,
    vit: 1,
    def: 4,
  }),
  "sun-cap": item({
    id: "sun-cap",
    name: "Sun Cap",
    slot: "headUpper",
    icon: "cap",
    tint: "#c4493a",
    desc: "A red cap from Maela's trunk.",
    price: 150,
    def: 1,
    hat: "cap",
  }),
  laurel: item({
    id: "laurel",
    name: "Laurel Circlet",
    slot: "headUpper",
    icon: "circlet",
    tint: "#e4b15a",
    desc: "Gold leaves. Purely proud.",
    price: 240,
    luk: 1,
    hat: "circlet",
  }),
  "arc-brim": item({
    id: "arc-brim",
    name: "Arcanist Brim",
    slot: "headUpper",
    icon: "brim",
    tint: "#3a4a86",
    desc: "Wide enough to shade a chant.",
    price: 280,
    int: 1,
    hat: "brim",
  }),
  "finch-cap": item({
    id: "finch-cap",
    name: "Finch Cap",
    slot: "headUpper",
    icon: "feather",
    tint: "#8a5a32",
    desc: "A feather that never quite molts.",
    price: 260,
    dex: 1,
    hat: "feather",
  }),
  spectacles: item({
    id: "spectacles",
    name: "Round Spectacles",
    slot: "headMid",
    icon: "glasses",
    tint: "#e4b15a",
    desc: "They make the meadow look nearer.",
    price: 200,
    dex: 1,
    hat: "glasses",
  }),
  "eye-mask": item({
    id: "eye-mask",
    name: "Dusk Mask",
    slot: "headMid",
    icon: "mask",
    tint: "#2a2a32",
    desc: "A narrow mask. Luck likes a secret.",
    price: 180,
    luk: 2,
    hat: "mask",
  }),
  "soft-scarf": item({
    id: "soft-scarf",
    name: "Soft Scarf",
    slot: "headLower",
    icon: "scarf",
    tint: "#8c4a6a",
    desc: "Sits at the throat. Warm, and a little vain.",
    price: 150,
    vit: 1,
    hat: "scarf",
  }),
  "cheek-ribbon": item({
    id: "cheek-ribbon",
    name: "Cheek Ribbon",
    slot: "headLower",
    icon: "ribbon",
    tint: "#d4687a",
    desc: "Tied just under the smile.",
    price: 160,
    luk: 1,
    hat: "ribbon",
  }),
  "ring-might": item({
    id: "ring-might",
    name: "Ring of Might",
    slot: "acc",
    icon: "ring",
    tint: "#d4534a",
    desc: "A heavy band. One of two accessory slots.",
    price: 340,
    str: 2,
  }),
  "ring-focus": item({
    id: "ring-focus",
    name: "Ring of Focus",
    slot: "acc",
    icon: "ring",
    tint: "#6aa8d8",
    desc: "Cool metal. Fits either accessory slot.",
    price: 340,
    dex: 2,
  }),
  "earring-wit": item({
    id: "earring-wit",
    name: "Earring of Wit",
    slot: "acc",
    icon: "charm",
    tint: "#7a5ea7",
    desc: "A drop of glass. Left or right, it listens.",
    price: 340,
    int: 2,
  }),
  "clip-wind": item({
    id: "clip-wind",
    name: "Clip of Wind",
    slot: "acc",
    icon: "charm",
    tint: "#7dcea0",
    desc: "A tiny vane. Either accessory slot.",
    price: 340,
    agi: 2,
  }),
  "brooch-life": item({
    id: "brooch-life",
    name: "Brooch of Life",
    slot: "acc",
    icon: "charm",
    tint: "#e4b15a",
    desc: "Pinned at the collar. Either slot.",
    price: 340,
    vit: 2,
  }),
  "lucky-charm": item({
    id: "lucky-charm",
    name: "Lucky Charm",
    slot: "acc",
    icon: "charm",
    tint: "#7dba6a",
    desc: "Four leaves and a hope. Either slot.",
    price: 380,
    luk: 3,
  }),
  salve: item({
    id: "salve",
    name: "Minor Salve",
    slot: "use",
    icon: "potion",
    tint: "#d4534a",
    desc: "A mouthful of red. Restores HP.",
    price: 32,
    stack: true,
    heal: 70,
  }),
  ether: item({
    id: "ether",
    name: "Ether Drop",
    slot: "use",
    icon: "ether",
    tint: "#3d8fd1",
    desc: "Bitter blue. Restores SP.",
    price: 40,
    stack: true,
    spRestore: 36,
  }),
  "amber-jelly": item({
    id: "amber-jelly",
    name: "Amber Jelly",
    slot: "etc",
    icon: "jelly",
    tint: "#e0b15a",
    desc: "Warm, and slightly alive. Sells well.",
    price: 12,
    stack: true,
  }),
  fluff: item({
    id: "fluff",
    name: "Hare Fluff",
    slot: "etc",
    icon: "fluff",
    tint: "#f2d7a2",
    desc: "Soft evidence of a meadow hare.",
    price: 16,
    stack: true,
  }),
  wing: item({
    id: "wing",
    name: "Wasp Wing",
    slot: "etc",
    icon: "wing",
    tint: "#c9b6e8",
    desc: "Still hums if you hold it to the light.",
    price: 22,
    stack: true,
  }),
  heartwood: item({
    id: "heartwood",
    name: "Heartwood Chip",
    slot: "etc",
    icon: "wood",
    tint: "#8a5a32",
    desc: "A knot of thorn-stump, still green inside.",
    price: 30,
    stack: true,
  }),
};

export const SMITH_STOCK = [
  "worn-knife",
  "short-sword",
  "sun-blade",
  "oak-staff",
  "crystal-rod",
  "hunter-bow",
  "long-bow",
  "needle",
  "buckler",
  "sun-shield",
];
export const OUTFIT_STOCK = [
  "cotton-shirt",
  "leather-vest",
  "plate-coat",
  "linen-robe",
  "shade-wrap",
  "travel-cape",
  "mage-mantle",
  "ranger-cloak",
  "holy-shawl",
  "worn-shoes",
  "quick-boots",
  "march-boots",
  "sun-cap",
  "laurel",
  "arc-brim",
  "finch-cap",
  "spectacles",
  "eye-mask",
  "soft-scarf",
  "cheek-ribbon",
  "ring-might",
  "ring-focus",
  "earring-wit",
  "clip-wind",
  "brooch-life",
  "lucky-charm",
];
export const SUPPLY_STOCK = ["salve", "ether"];

export type SkillDef = {
  id: SkillId;
  name: string;
  job: JobId;
  sp: number;
  max: number;
  blurb: string;
  target: "self" | "enemy" | "area" | "passive";
};

export const SKILLS: Record<SkillId, SkillDef> = {
  firstAid: {
    id: "firstAid",
    name: "First Aid",
    job: "novice",
    sp: 3,
    max: 1,
    blurb: "A Novice bandage. Restores a little HP. One rank.",
    target: "self",
  },
  playDead: {
    id: "playDead",
    name: "Play Dead",
    job: "novice",
    sp: 5,
    max: 1,
    blurb: "Fall still. Meadow creatures lose interest until you move.",
    target: "self",
  },
  arcCut: {
    id: "arcCut",
    name: "Bash",
    job: "swordman",
    sp: 8,
    max: 5,
    blurb: "A Swordman's heavy blow. Damage and hit chance climb with rank.",
    target: "enemy",
  },
  guard: {
    id: "guard",
    name: "Endure",
    job: "swordman",
    sp: 10,
    max: 5,
    blurb: "Plant your feet. DEF rises and the next flinch is shorter.",
    target: "self",
  },
  ringCut: {
    id: "ringCut",
    name: "Magnum Break",
    job: "swordman",
    sp: 14,
    max: 5,
    blurb: "A burning sweep that knocks anything nearby back.",
    target: "area",
  },
  spark: {
    id: "spark",
    name: "Fire Bolt",
    job: "mage",
    sp: 12,
    max: 5,
    blurb: "One fire bolt per rank. Each bolt is a full MATK hit.",
    target: "enemy",
  },
  ember: {
    id: "ember",
    name: "Fire Ball",
    job: "mage",
    sp: 18,
    max: 5,
    blurb: "A fire burst on your target and anyone standing with them.",
    target: "area",
  },
  twin: {
    id: "twin",
    name: "Double Strafe",
    job: "archer",
    sp: 12,
    max: 5,
    blurb: "Two arrows in one draw. Each hit grows with rank.",
    target: "enemy",
  },
  focus: {
    id: "focus",
    name: "Improve Concentration",
    job: "archer",
    sp: 12,
    max: 5,
    blurb: "AGI and DEX surge. HIT and FLEE both rise while it holds.",
    target: "self",
  },
};

export const JOBS: Record<JobId, { name: string; blurb: string; skills: SkillId[] }> = {
  novice: {
    name: "Novice",
    blurb: "Everyone starts here. A knife, First Aid, and the south road.",
    skills: ["firstAid", "playDead"],
  },
  swordman: {
    name: "Swordman",
    blurb: "Swords and shields. Bash, Magnum Break, and Endure.",
    skills: ["arcCut", "ringCut", "guard"],
  },
  mage: {
    name: "Mage",
    blurb: "Rods and staves. Fire Bolt, then Fire Ball.",
    skills: ["spark", "ember"],
  },
  archer: {
    name: "Archer",
    blurb: "Bows. Double Strafe, and Improve Concentration.",
    skills: ["twin", "focus"],
  },
};

export function expNeed(level: number) {
  return 12 * level + 10;
}

export function jobBonus(job: JobId): Partial<Record<"str" | "agi" | "vit" | "int" | "dex" | "luk", number>> {
  switch (job) {
    case "swordman":
      return { str: 2, vit: 1, dex: 1 };
    case "mage":
      return { int: 2, dex: 1 };
    case "archer":
      return { dex: 2, agi: 1 };
    default:
      return {};
  }
}

export function canEquip(job: JobId, it: ItemDef) {
  if (it.slot === "use" || it.slot === "etc") return false;
  if (!it.jobs) return true;
  return it.jobs.includes(job);
}

export function itemStats(it: ItemDef) {
  const bits: string[] = [];
  if (it.atk) bits.push(`ATK +${it.atk}`);
  if (it.matk) bits.push(`MATK +${it.matk}`);
  if (it.def) bits.push(`DEF +${it.def}`);
  if (it.mdef) bits.push(`MDEF +${it.mdef}`);
  if (it.str) bits.push(`STR +${it.str}`);
  if (it.agi) bits.push(`AGI +${it.agi}`);
  if (it.vit) bits.push(`VIT +${it.vit}`);
  if (it.int) bits.push(`INT +${it.int}`);
  if (it.dex) bits.push(`DEX +${it.dex}`);
  if (it.luk) bits.push(`LUK +${it.luk}`);
  if (it.heal) bits.push(`Heal ${it.heal}`);
  if (it.spRestore) bits.push(`SP ${it.spRestore}`);
  if (it.jobs) bits.push(it.jobs.map((j) => JOBS[j].name).join(", "));
  return bits.join(" · ");
}

export const MONSTERS: Record<
  MonsterKind,
  {
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
  }
> = {
  dew: {
    name: "Dewdrop",
    hp: 52,
    atk: 7,
    def: 1,
    mdef: 0,
    exp: 24,
    jexp: 16,
    level: 2,
    behavior: "passive",
    speed: 42,
    aggro: 0,
    draw: 78,
  },
  hare: {
    name: "Meadow Hare",
    hp: 90,
    atk: 12,
    def: 2,
    mdef: 1,
    exp: 38,
    jexp: 24,
    level: 4,
    behavior: "skittish",
    speed: 86,
    aggro: 96,
    draw: 90,
  },
  wasp: {
    name: "Gale Wasp",
    hp: 78,
    atk: 16,
    def: 2,
    mdef: 2,
    exp: 52,
    jexp: 32,
    level: 6,
    behavior: "aggressive",
    speed: 100,
    aggro: 180,
    draw: 86,
  },
  thorn: {
    name: "Thorn Stump",
    hp: 210,
    atk: 22,
    def: 8,
    mdef: 4,
    exp: 80,
    jexp: 48,
    level: 9,
    behavior: "aggressive",
    speed: 38,
    aggro: 150,
    draw: 108,
  },
};

export function rollLoot(kind: MonsterKind): { items: { id: string; qty: number }[]; marks: number; rare: boolean } {
  const items: { id: string; qty: number }[] = [];
  let rare = false;
  const r = Math.random();
  if (kind === "dew") {
    if (r < 0.75) items.push({ id: "amber-jelly", qty: 1 });
    if (Math.random() < 0.12) items.push({ id: "salve", qty: 1 });
    if (Math.random() < 0.045) {
      items.push({ id: "sun-cap", qty: 1 });
      rare = true;
    }
    return { items, marks: 6 + Math.floor(Math.random() * 10), rare };
  }
  if (kind === "hare") {
    if (r < 0.7) items.push({ id: "fluff", qty: 1 });
    if (Math.random() < 0.04) {
      items.push({ id: "spectacles", qty: 1 });
      rare = true;
    }
    return { items, marks: 10 + Math.floor(Math.random() * 14), rare };
  }
  if (kind === "wasp") {
    if (r < 0.68) items.push({ id: "wing", qty: 1 });
    if (Math.random() < 0.14) items.push({ id: "ether", qty: 1 });
    if (Math.random() < 0.04) {
      items.push({ id: "clip-wind", qty: 1 });
      rare = true;
    }
    return { items, marks: 14 + Math.floor(Math.random() * 16), rare };
  }
  if (r < 0.65) items.push({ id: "heartwood", qty: 1 });
  if (Math.random() < 0.05) {
    items.push({ id: "laurel", qty: 1 });
    rare = true;
  }
  return { items, marks: 18 + Math.floor(Math.random() * 20), rare };
}

export type Prop = {
  kind: "tree" | "fountain" | "sanctum" | "shop" | "shopb" | "stall" | "arch" | "lamp" | "flower" | "sign" | "rock";
  x: number;
  y: number;
  w?: number;
  h?: number;
  label?: string;
  hue?: string;
};

export type NpcDef = {
  id: string;
  name: string;
  title: string;
  x: number;
  y: number;
  role: "waykeeper" | "smith" | "outfit" | "priest" | "job" | "citizen";
  hair: string;
  style: "bob" | "short" | "swept";
  trim: string;
  hat: HatKind | null;
  cape: string | null;
  line: string;
};

export type Portal = {
  x: number;
  y: number;
  w: number;
  h: number;
  to: MapId;
  tx: number;
  ty: number;
};

export type MapDef = {
  id: MapId;
  name: string;
  subtitle: string;
  music: "town" | "field";
  cols: number;
  rows: number;
  ground: Uint8Array;
  block: Uint8Array;
  props: Prop[];
  npcs: NpcDef[];
  plaza: { x: number; y: number };
  start: { x: number; y: number };
  pxW: number;
  pxH: number;
  portals: Portal[];
  spawns: { kind: MonsterKind; x: number; y: number }[];
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paint(
  grid: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
  w: number,
  h: number,
  v: number,
) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue;
      grid[yy * cols + xx] = v;
    }
  }
}

function buildCity(): MapDef {
  const cols = 32;
  const rows = 26;
  const ground = new Uint8Array(cols * rows);
  const block = new Uint8Array(cols * rows);
  paint(ground, cols, rows, 0, 0, cols, rows, 0);
  paint(ground, cols, rows, 8, 9, 16, 8, 1);
  paint(ground, cols, rows, 14, 4, 4, 18, 1);
  paint(ground, cols, rows, 1, 12, 10, 4, 1);
  paint(ground, cols, rows, 21, 12, 10, 4, 1);
  paint(ground, cols, rows, 4, 18, 6, 4, 1);
  paint(ground, cols, rows, 22, 18, 6, 4, 1);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const edge = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
      const gate = y >= rows - 1 && x >= 14 && x <= 17;
      if (edge && !gate) block[y * cols + x] = 1;
    }
  }
  paint(block, cols, rows, 12, 1, 8, 5, 1);
  paint(block, cols, rows, 1, 10, 6, 5, 1);
  paint(block, cols, rows, 25, 10, 6, 5, 1);
  paint(block, cols, rows, 14, 11, 4, 3, 1);
  paint(block, cols, rows, 5, 18, 3, 2, 1);
  paint(block, cols, rows, 23, 18, 3, 2, 1);

  const props: Prop[] = [];
  const T = TILE;
  props.push({ kind: "sanctum", x: 16 * T, y: 6 * T, w: 8 * T, h: 5.1 * T });
  props.push({ kind: "shop", x: 4 * T, y: 15 * T, w: 5.2 * T, h: 4.2 * T, hue: "#2f8f6a" });
  props.push({ kind: "shopb", x: 28 * T, y: 15 * T, w: 5.2 * T, h: 4.2 * T, hue: "#3a6ea5" });
  props.push({ kind: "fountain", x: 16 * T, y: 14.15 * T, w: 3.6 * T, h: 3.4 * T });
  props.push({ kind: "stall", x: 6.5 * T, y: 20 * T, w: 3 * T, h: 2.3 * T, hue: "#2f8f86" });
  props.push({ kind: "stall", x: 24.5 * T, y: 20 * T, w: 3 * T, h: 2.3 * T, hue: "#7a5ea7" });
  props.push({ kind: "arch", x: 16 * T, y: (rows - 0.15) * T, w: 5.4 * T, h: 3.3 * T });
  props.push({ kind: "sign", x: 13.2 * T, y: 22.4 * T, label: "Southmead" });
  props.push({ kind: "lamp", x: 10.5 * T, y: 10.2 * T });
  props.push({ kind: "lamp", x: 21.5 * T, y: 10.2 * T });
  props.push({ kind: "lamp", x: 10.5 * T, y: 17.2 * T });
  props.push({ kind: "lamp", x: 21.5 * T, y: 17.2 * T });

  const rand = rng(11);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const edge = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
      const gate = y >= rows - 1 && x >= 14 && x <= 17;
      if (edge && !gate && (x + y) % 2 === 0) {
        props.push({ kind: "tree", x: (x + 0.5) * T, y: (y + 0.85) * T });
      } else if (!block[y * cols + x] && ground[y * cols + x] === 0 && rand() < 0.05) {
        props.push({ kind: "tree", x: (x + 0.5) * T, y: (y + 0.8) * T });
        block[y * cols + x] = 1;
      } else if (!block[y * cols + x] && ground[y * cols + x] === 0 && rand() < 0.18) {
        props.push({
          kind: "flower",
          x: (x + 0.5) * T,
          y: (y + 0.7) * T,
          hue: rand() < 0.5 ? "#d4687a" : "#e4b15a",
        });
      }
    }
  }

  const npcs: NpcDef[] = [
    {
      id: "oren",
      name: "Oren",
      title: "Sanctum",
      x: 16 * T,
      y: 6.55 * T,
      role: "priest",
      hair: "wheat",
      style: "short",
      trim: "ivory",
      hat: "circlet",
      cape: "#f4efe4",
      line: "The sanctum is open. Heal, or unwind a build you regret.",
    },
    {
      id: "calder",
      name: "Calder",
      title: "Smith",
      x: 7.6 * T,
      y: 13.2 * T,
      role: "smith",
      hair: "ink",
      style: "short",
      trim: "ink",
      hat: "cap",
      cape: "#6b442c",
      line: "Swords for a Swordman, rods for a Mage, bows for an Archer.",
    },
    {
      id: "nia",
      name: "Nia",
      title: "Outfitter",
      x: 24.3 * T,
      y: 13.2 * T,
      role: "outfit",
      hair: "rose",
      style: "bob",
      trim: "wine",
      hat: "ribbon",
      cape: "#8c3a4a",
      line: "Upper, mid, and lower head. Two accessories. I keep them all straight.",
    },
    {
      id: "maela",
      name: "Maela",
      title: "Waykeeper",
      x: 6.6 * T,
      y: 21.15 * T,
      role: "waykeeper",
      hair: "sky",
      style: "bob",
      trim: "pine",
      hat: null,
      cape: "#2f8f86",
      line: "I keep records, a bunk, and one sun cap with a string on it.",
    },
    {
      id: "seren",
      name: "Seren",
      title: "Job Master",
      x: 24.6 * T,
      y: 21.15 * T,
      role: "job",
      hair: "violet",
      style: "swept",
      trim: "indigo",
      hat: "brim",
      cape: "#3a4a86",
      line: "Novice, then Swordman, Mage, or Archer. I witness the change at base level 4 and job level 4.",
    },
    {
      id: "pim",
      name: "Pim",
      title: "Local",
      x: 11.2 * T,
      y: 10.6 * T,
      role: "citizen",
      hair: "honey",
      style: "short",
      trim: "brass",
      hat: "feather",
      cape: null,
      line: "The sun-disc in the fountain is older than the gate.",
    },
    {
      id: "joss",
      name: "Joss",
      title: "Local",
      x: 20.4 * T,
      y: 16.6 * T,
      role: "citizen",
      hair: "mint",
      style: "swept",
      trim: "pine",
      hat: "glasses",
      cape: null,
      line: "Wasps keep the pond in Southmead. Don't wear your best hat first.",
    },
  ];

  const start = { x: 16 * T, y: 17.6 * T };
  return {
    id: "ambercross",
    name: "Ambercross",
    subtitle: "Capital plaza",
    music: "town",
    cols,
    rows,
    ground,
    block,
    props,
    npcs,
    plaza: { x: 16 * T, y: 13.2 * T },
    start,
    pxW: cols * T,
    pxH: rows * T,
    portals: [
      {
        x: 14 * T,
        y: 24.15 * T,
        w: 4 * T,
        h: 1.9 * T,
        to: "southmead",
        tx: 16 * T,
        ty: 2.7 * T,
      },
    ],
    spawns: [],
  };
}

function buildField(backX: number, backY: number): MapDef {
  const cols = 32;
  const rows = 30;
  const ground = new Uint8Array(cols * rows);
  const block = new Uint8Array(cols * rows);
  const T = TILE;
  paint(ground, cols, rows, 0, 0, cols, rows, 0);
  paint(ground, cols, rows, 14, 0, 4, rows, 2);
  paint(ground, cols, rows, 17, 12, 8, 3, 2);
  paint(ground, cols, rows, 22, 8, 8, 7, 3);
  paint(block, cols, rows, 22, 8, 8, 7, 1);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const edge = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
      const gate = y === 0 && x >= 14 && x <= 17;
      if (edge && !gate) block[y * cols + x] = 1;
      if (ground[y * cols + x] === 3) block[y * cols + x] = 1;
    }
  }

  const props: Prop[] = [];
  props.push({ kind: "arch", x: 16 * T, y: 1.15 * T, w: 5.2 * T, h: 3 * T });
  props.push({ kind: "sign", x: 12.4 * T, y: 2.5 * T, label: "Ambercross" });
  props.push({ kind: "rock", x: 21.3 * T, y: 10.2 * T });
  props.push({ kind: "rock", x: 29.2 * T, y: 14.4 * T });

  const rand = rng(29);
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (block[y * cols + x]) continue;
      if (ground[y * cols + x] !== 0) continue;
      if (x >= 13 && x <= 18) continue;
      if (rand() < 0.07) {
        props.push({ kind: "tree", x: (x + 0.5) * T, y: (y + 0.85) * T });
        block[y * cols + x] = 1;
      } else if (rand() < 0.12) {
        props.push({
          kind: "flower",
          x: (x + 0.5) * T,
          y: (y + 0.75) * T,
          hue: rand() < 0.5 ? "#f2d7a2" : "#d4687a",
        });
      }
    }
  }
  for (let x = 0; x < cols; x += 2) {
    if (x >= 14 && x <= 17) continue;
    props.push({ kind: "tree", x: (x + 0.5) * T, y: 0.8 * T });
    props.push({ kind: "tree", x: (x + 0.5) * T, y: (rows - 0.2) * T });
  }

  const spawns: { kind: MonsterKind; x: number; y: number }[] = [
    { kind: "dew", x: 5.5 * T, y: 6 * T },
    { kind: "dew", x: 8 * T, y: 10 * T },
    { kind: "dew", x: 6 * T, y: 16 * T },
    { kind: "dew", x: 9.5 * T, y: 22 * T },
    { kind: "dew", x: 7 * T, y: 26 * T },
    { kind: "hare", x: 20 * T, y: 18 * T },
    { kind: "hare", x: 19 * T, y: 23 * T },
    { kind: "hare", x: 12 * T, y: 14 * T },
    { kind: "wasp", x: 20.5 * T, y: 11 * T },
    { kind: "wasp", x: 26 * T, y: 16.5 * T },
    { kind: "wasp", x: 24 * T, y: 20 * T },
    { kind: "thorn", x: 11 * T, y: 25 * T },
    { kind: "thorn", x: 20 * T, y: 27 * T },
  ];

  for (const s of spawns) {
    const tx = Math.floor(s.x / T);
    const ty = Math.floor(s.y / T);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = tx + dx;
        const y = ty + dy;
        if (x <= 0 || y <= 0 || x >= cols - 1 || y >= rows - 1) continue;
        if (ground[y * cols + x] === 3) continue;
        block[y * cols + x] = 0;
      }
    }
  }
  const kept = props.filter((p) => {
    if (p.kind !== "tree") return true;
    const tx = Math.floor(p.x / T);
    const ty = Math.floor((p.y - 4) / T);
    if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return true;
    return block[ty * cols + tx] === 1;
  });

  return {
    id: "southmead",
    name: "Southmead",
    subtitle: "Fields beyond the south gate",
    music: "field",
    cols,
    rows,
    ground,
    block,
    props: kept,
    npcs: [],
    plaza: { x: 16 * T, y: 8 * T },
    start: { x: 16 * T, y: 3.2 * T },
    pxW: cols * T,
    pxH: rows * T,
    portals: [{ x: 14 * T, y: 0, w: 4 * T, h: 1.15 * T, to: "ambercross", tx: backX, ty: backY }],
    spawns,
  };
}

const city = buildCity();
const field = buildField(16 * TILE, 22.4 * TILE);
const MAPS: Record<MapId, MapDef> = { ambercross: city, southmead: field };

export function getMap(id: MapId) {
  return MAPS[id];
}

export function isBlocked(map: MapDef, x: number, y: number) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= map.cols || ty >= map.rows) return true;
  return map.block[ty * map.cols + tx] === 1;
}

export function hairHex(id: string) {
  return HAIR_COLORS.find((c) => c.id === id)?.hex ?? "#a24b32";
}

export function trimHex(id: string) {
  return TRIMS.find((c) => c.id === id)?.hex ?? "#c4a15a";
}
