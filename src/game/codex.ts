// Hat book / fitting room data: what exists, what the player has collected, and where to get it.
import { ITEMS, MAP_IDS, OUTFIT_STOCK, SMITH_STOCK, getMap, type ItemDef } from "@/game/content";
import { MONSTER_DEFS } from "@/game/rodata";
import { world } from "@/game/world";
import type { MapId } from "@/game/types";

export type CodexSlot = "headUpper" | "headMid" | "headLower" | "armor" | "garment" | "shoes" | "weapon" | "shield";

export function itemsForSlot(slot: CodexSlot): ItemDef[] {
  return Object.values(ITEMS)
    .filter((i) => i.slot === slot)
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
}

export function isCollected(id: string): boolean {
  const p = world.player;
  if (!p) return false;
  if (p.seen?.includes(id)) return true;
  if (p.inv.some((s) => s.itemId === id)) return true;
  if (p.storage?.some((s) => s.itemId === id)) return true;
  return Object.values(p.eq).includes(id);
}

export function markSeen(id: string) {
  const p = world.player;
  if (!p) return;
  if (!p.seen) p.seen = [];
  if (!p.seen.includes(id)) p.seen.push(id);
}

export type DropSource = { monster: string; monsterId: string; rate: number; boss: boolean; mini: boolean; maps: { id: MapId; name: string }[] };

export function dropSources(itemId: string): DropSource[] {
  const out: DropSource[] = [];
  for (const [mid, m] of Object.entries(MONSTER_DEFS)) {
    const d = m.drops.find((x) => x.id === itemId);
    if (!d) continue;
    const maps = MAP_IDS.filter((id) => getMap(id).spawns.some((s) => s.kind === mid)).map((id) => ({ id, name: getMap(id).name }));
    if (!maps.length) continue;
    out.push({ monster: m.name, monsterId: mid, rate: d.rate, boss: !!m.boss, mini: !!m.mini, maps });
  }
  return out.sort((a, b) => b.rate - a.rate);
}

export function shopSource(itemId: string): string | null {
  if (OUTFIT_STOCK.includes(itemId)) return "Outfitter";
  if (SMITH_STOCK.includes(itemId)) return "Smith";
  return null;
}
