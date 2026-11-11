// Abnormal states on the hero: stun, sleep, freeze, poison, slow, curse, silence.
import { world } from "@/game/world";

export type StatusKind = "stun" | "sleep" | "freeze" | "poison" | "slow" | "curse" | "silence";

export const STATUS_INFO: Record<StatusKind, { label: string; col: string; bit: number }> = {
  stun: { label: "Stun", col: "#f0e07a", bit: 1 },
  sleep: { label: "Sleep", col: "#9ab8ff", bit: 2 },
  poison: { label: "Poison", col: "#8ad04a", bit: 4 },
  slow: { label: "Slow", col: "#7ad0c8", bit: 8 },
  curse: { label: "Curse", col: "#b070e8", bit: 16 },
  freeze: { label: "Frozen", col: "#9ee4ff", bit: 32 },
  silence: { label: "Silence", col: "#c8c0b0", bit: 64 },
};

const CC: StatusKind[] = ["stun", "sleep", "freeze"];

export const isCC = () => world.status.stun > 0 || world.status.sleep > 0 || world.status.freeze > 0;
export const isSilenced = () => world.status.silence > 0 || isCC();

/** apply a state; hard crowd control grants a short immunity afterwards so it cannot chain-lock */
export function applyStatus(kind: StatusKind, secs: number, power = 1): boolean {
  const s = world.status;
  if (CC.includes(kind)) {
    if (s.immune > 0) return false;
    // a stronger Vit/Int-less hero is not special-cased; keep it simple
  }
  s[kind] = Math.max(s[kind], secs);
  if (kind === "poison") {
    s.psnDps = Math.max(s.psnDps, power);
    s.psnT = Math.min(s.psnT || 1, 1);
  }
  return true;
}

export function clearStatus(kinds?: StatusKind[]) {
  const s = world.status;
  for (const k of kinds ?? (Object.keys(STATUS_INFO) as StatusKind[])) s[k] = 0;
  if (!kinds || kinds.includes("poison")) {
    s.psnDps = 0;
    s.psnT = 0;
  }
}

export function statusFlags(): number {
  let f = 0;
  for (const k of Object.keys(STATUS_INFO) as StatusKind[]) if (world.status[k] > 0) f |= STATUS_INFO[k].bit;
  return f;
}

export function activeStatuses(): { kind: StatusKind; left: number }[] {
  return (Object.keys(STATUS_INFO) as StatusKind[]).filter((k) => world.status[k] > 0).map((k) => ({ kind: k, left: world.status[k] }));
}

/** count timers down; returns poison damage due this frame (0 if none) */
export function tickStatus(dt: number): number {
  const s = world.status;
  const hadCC = isCC();
  for (const k of Object.keys(STATUS_INFO) as StatusKind[]) if (s[k] > 0) s[k] = Math.max(0, s[k] - dt);
  if (hadCC && !isCC()) s.immune = 2.5;
  else s.immune = Math.max(0, s.immune - dt);
  let dmg = 0;
  if (s.poison > 0) {
    s.psnT -= dt;
    if (s.psnT <= 0) {
      s.psnT += 1;
      dmg = Math.max(1, s.psnDps);
    }
  } else s.psnDps = 0;
  return dmg;
}
