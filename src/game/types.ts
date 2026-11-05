export type Dir = 0 | 1 | 2 | 3;
export type MapId = "ambercross" | "southmead";
export type JobId = "novice" | "swordman" | "mage" | "archer";
export type HairStyle = "bob" | "short" | "swept";
export type MonsterKind = "dew" | "hare" | "wasp" | "thorn";
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
  | "focus";
export type HatKind = "cap" | "circlet" | "brim" | "feather" | "glasses" | "mask" | "scarf" | "ribbon";
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
  | "wood";
export type WeaponKind = "dagger" | "sword" | "staff" | "bow";
export type BuffStat = "atk" | "def" | "flee" | "hit";

export type Stack = { itemId: string; qty: number };
export type HotSlot = { kind: "skill"; id: SkillId } | { kind: "item"; id: string };

export type Buff = { stat: BuffStat; amount: number; until: number };

export type Player = {
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
};

export type Drop = {
  id: string;
  itemId: string;
  qty: number;
  x: number;
  y: number;
  mapId: MapId;
};

export type FloatText = { x: number; y: number; text: string; life: number; color: string };
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };

export type Dialog = {
  speaker: string;
  lines: string[];
  index: number;
  choices?: { label: string; action: string }[];
};
