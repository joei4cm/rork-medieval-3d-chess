/**
 * Qin terracotta warrior / horse GLBs for Xiangqi.
 * Sources are CC BY 4.0 (commercial OK with attribution) — see ATTRIBUTION.md.
 * Prefer these over western Meshy knights and over coarse procedural boxes.
 */

import type { Faction, PieceKind } from "../core/types";

const base = () => {
  const raw = import.meta.env.BASE_URL || "/";
  return raw.endsWith("/") ? raw : `${raw}/`;
};

function url(file: string): string {
  return `${base()}models/xiangqi/${file}`;
}

/** Standing warrior scans — different poses / armour for rank variety. */
export const XIANGQI_WARRIOR_URLS = {
  a: url("warrior_a.glb"),
  b: url("warrior_b.glb"),
  c: url("warrior_c.glb"),
  /** Only scan with a real albedo map — preferred for on-board standing ranks. */
  d: url("warrior_d.glb"),
} as const;

export const XIANGQI_HORSE_URL = url("horse.glb");

/**
 * Which terracotta asset stands in for each Xiangqi rank.
 * Prefer `d` (textured) for figures the player stares at; untextured a/b/c
 * fill mounted / side roles where the silhouette matters more than skin.
 */
export function xiangqiWarriorAsset(
  kind: PieceKind,
  faction: Faction,
): keyof typeof XIANGQI_WARRIOR_URLS {
  switch (kind) {
    case "k":
      return "d";
    case "a":
      return "d";
    case "p":
      return "d";
    case "b":
      // 相 uses the textured standing scan; 象 mahout can be a silhouette.
      return faction === "w" ? "d" : "a";
    case "n":
      return "a";
    case "r":
      return "c";
    case "c":
      return "b";
    default:
      return "d";
  }
}

/** Target standing height on the Xiangqi board (world units). */
export const XIANGQI_FIGURE_HEIGHT: Record<PieceKind, number> = {
  k: 0.95,
  a: 0.82,
  b: 0.88,
  n: 0.5, // rider on horse
  r: 0.58, // rider on chariot
  c: 0.72, // gunner beside cannon
  p: 0.78,
  q: 0.9,
};
