export type Dir = 0 | 1 | 2 | 3;
export type MapId = "ambercross" | "southmead" | "poring" | "woods" | "dunes" | "crypt" | "orc";
import type { NEW_SKILLS } from "@/game/skills2";

export type NewSkillId = keyof typeof NEW_SKILLS;
export type JobId =
  | "novice"
  | "swordman"
  | "mage"
  | "archer"
  | "acolyte"
  | "thief"
  | "merchant"
  | "knight"
  | "crusader"
  | "wizard"
  | "sage"
  | "hunter"
  | "bard"
  | "priest"
  | "monk"
  | "assassin"
  | "rogue"
  | "blacksmith"
  | "alchemist";
export type HairStyle = "bob" | "short" | "swept" | "spiky" | "undercut" | "pompadour" | "ponytail" | "twintail" | "long" | "bun" | "braid" | "curly" | "odango" | "wavy";
export type MonsterKind = string;
export type Behavior = "passive" | "skittish" | "aggressive";
export type GearSlot =
  | "headUpper"
  | "headMid"
  | "headLower"
  | "armor"
  | "weapon"
  | "shield"
  | "garment"
  | "shoes"
  | "acc1"
  | "acc2";
export type ItemSlot = GearSlot | "acc" | "use" | "etc";
export type SkillId =
  | "firstAid"
  | "playDead"
  | "arcCut"
  | "guard"
  | "ringCut"
  | "spark"
  | "ember"
  | "twin"
  | "focus"
  | "crush"
  | "frost"
  | "storm"
  | "shower"
  | NewSkillId;

export type SkillFx = {
  t: "hit" | "area" | "heal" | "buff" | "passive";
  /** damage multiplier = m + r * rank */
  m?: number;
  r?: number;
  /** hits = n + nr * rank */
  n?: number;
  nr?: number;
  mg?: boolean;
  rng?: boolean;
  rad?: number;
  rr?: number;
  col?: string;
  shot?: "bolt" | "arrow" | "strike" | "rain";
  stun?: number;
  sr?: number;
  kb?: boolean;
  psn?: number;
  pr?: number;
  ign?: boolean;
  zeny?: number;
  crit?: number;
  all?: boolean;
  self?: boolean;
  hide?: boolean;
  loot?: number;
  dexBonus?: number;
  heal?: number;
  hr?: number;
  buff?: { stat: BuffStat; a: number; ar: number; dur: number }[];
  pass?: Partial<Record<"atk" | "matk" | "def" | "hit" | "flee" | "crit" | "hp" | "sp" | "aspd" | "disc", number>>;
};

export type SkillDef = {
  id: SkillId;
  name: string;
  job: JobId;
  sp: number;
  max: number;
  blurb: string;
  target: "self" | "enemy" | "area" | "passive";
  fx?: SkillFx;
};
export type HatKind =
  | "cap"
  | "circlet"
  | "brim"
  | "feather"
  | "glasses"
  | "mask"
  | "scarf"
  | "ribbon"
  // top
  | "bunny"
  | "cat"
  | "poring"
  | "angel"
  | "devil"
  | "crown"
  | "santa"
  | "tophat"
  | "straw"
  | "beret"
  | "pirate"
  | "viking"
  | "flower"
  | "valk"
  | "hardhat"
  | "wizard"
  | "helm"
  | "headband"
  | "bandana"
  // middle
  | "monocle"
  | "eyepatch"
  | "goggles"
  | "starmask"
  | "clown"
  // bottom
  | "mustache"
  | "beard"
  | "lollipop"
  | "rose"
  | "fangs";
export type IconKind =
  | "cap"
  | "circlet"
  | "brim"
  | "feather"
  | "glasses"
  | "mask"
  | "scarf"
  | "ribbon"
  | "sword"
  | "staff"
  | "bow"
  | "mace"
  | "spear"
  | "axe"
  | "katar"
  | "knuckle"
  | "harp"
  | "shield"
  | "cape"
  | "armor"
  | "boots"
  | "ring"
  | "charm"
  | "knife"
  | "potion"
  | "ether"
  | "jelly"
  | "fluff"
  | "wing"
  | "wood"
  | "apple"
  | "herb"
  | "bone"
  | "claw"
  | "plume"
  | "gem"
  | "card"
  | "sting"
  | "cloth"
  | "wingfly"
  | "mucus";
export type WeaponKind = "dagger" | "sword" | "staff" | "bow" | "mace" | "spear" | "axe" | "katar" | "knuckle" | "harp";
export type BuffStat = "atk" | "def" | "flee" | "hit" | "aspd" | "crit" | "matk" | "str" | "agi" | "vit" | "int" | "dex" | "luk";

/** `cards` are the cards socketed into this piece of gear */
export type Stack = { itemId: string; qty: number; cards?: string[] };
export type HotSlot = { kind: "skill"; id: SkillId } | { kind: "item"; id: string };

export type Buff = { stat: BuffStat; amount: number; until: number };

export type Player = {
  /** item ids the hero has ever owned (hat book) */
  seen?: string[];
  /** cards socketed into worn gear, by slot */
  eqCards?: Partial<Record<GearSlot, string[]>>;
  /** item ids that auto-sell and Sell junk never touch */
  locked?: string[];
  name: string;
  x: number;
  y: number;
  dir: Dir;
  anim: number;
  hair: string;
  style: HairStyle;
  trim: string;
  job: JobId;
  baseLevel: number;
  baseExp: number;
  jobLevel: number;
  jobExp: number;
  statPoints: number;
  skillPoints: number;
  str: number;
  agi: number;
  vit: number;
  int: number;
  dex: number;
  luk: number;
  hp: number;
  sp: number;
  marks: number;
  skills: Partial<Record<SkillId, number>>;
  eq: Record<GearSlot, string | null>;
  inv: Stack[];
  storage: Stack[];
  hotbar: (HotSlot | null)[];
  buffs: Buff[];
  quest: "none" | "active" | "done" | "claimed";
  questCount: number;
  attackCd: number;
  itemCd: number;
  sit: boolean;
  flash: number;
  invuln: number;
  downFor: number;
  speedInstant: number;
  swing: number;
  feign: number;
  seenIntro: boolean;
};

export type Monster = {
  id: string;
  kind: MonsterKind;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  dir: Dir;
  anim: number;
  cd: number;
  hurt: number;
  aggro: boolean;
  alive: boolean;
  deadUntil: number;
  wanderX: number;
  wanderY: number;
  pause: number;
  moving: boolean;
  /** smoothed speed factor 0..1 so mobs ease into and out of motion */
  ease: number;
  /** seconds left in the death animation (monster is !alive while it plays) */
  dyingT: number;
  /** seconds left in the attack wind-up before the strike lands */
  windup: number;
  /** seconds left in the forward lunge after a strike */
  lunge: number;
  /** knockback velocity in px/s */
  kbx: number;
  kby: number;
  /** pop-in timer after respawn */
  spawnT: number;
  poison?: number;
  psnDps?: number;
  psnT?: number;
  /** seconds left stunned by a player skill */
  stunT?: number;
  enraged?: boolean;
  /** seconds until the next special skill may start */
  skCd?: number;
  /** skill being wound up: telegraph circle at (x,y) */
  cast?: { id: string; t: number; w: number; x: number; y: number } | null;
  /** hit-and-run: seconds spent backing off */
  retreat?: number;
  /** seconds since the monster last had a target (for the leash heal) */
  idle?: number;
  /** current target id (null = this hero) so mobs stay on one victim */
  tgt?: string | null;
  /** charging at this point (Rampage Charge) */
  dashTo?: { x: number; y: number; hit: boolean } | null;
};

export type Drop = {
  id: string;
  itemId: string;
  qty: number;
  x: number;
  y: number;
  mapId: MapId;
  /** world.time the drop appeared, for the pop animation */
  born?: number;
  /** horizontal scatter target offset */
  dx?: number;
  /** seconds until the drop vanishes */
  ttl?: number;
  rare?: boolean;
};

export type FloatText = { x: number; y: number; text: string; life: number; color: string; big?: boolean; crit?: boolean; rot?: number };
export type CritFx = { x: number; y: number; t: number };
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size?: number;
  grav?: number;
  max?: number;
  puff?: boolean;
};

export type Dialog = {
  speaker: string;
  lines: string[];
  index: number;
  choices?: { label: string; action: string }[];
};
