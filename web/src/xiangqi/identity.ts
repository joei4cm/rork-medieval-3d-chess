/**
 * Xiangqi presentation identity — glyphs, role names, and which animated sculpt
 * stands in for each rank. Rules use one kind for both sides (e.g. `b` for both
 * 相 and 象); visuals and copy are faction-aware.
 */

import type { Faction, PieceKind } from "../core/types";

export type ChessSculpt = "p" | "n" | "b" | "r" | "q" | "k";

/** Traditional characters printed on the piece (and used in SAN). */
export const XIANGQI_GLYPH: Record<Faction, Record<"k" | "a" | "b" | "n" | "r" | "c" | "p", string>> = {
  w: { k: "帅", a: "仕", b: "相", n: "傌", r: "俥", c: "炮", p: "兵" },
  b: { k: "将", a: "士", b: "象", n: "馬", r: "車", c: "砲", p: "卒" },
};

/** Short role label shown in UI (EN). */
export const XIANGQI_ROLE_EN: Record<Faction, Record<"k" | "a" | "b" | "n" | "r" | "c" | "p", string>> = {
  w: {
    k: "Marshal",
    a: "Advisor",
    b: "Chancellor",
    n: "Horse",
    r: "Chariot",
    c: "Cannon",
    p: "Soldier",
  },
  b: {
    k: "General",
    a: "Guard",
    b: "Elephant",
    n: "Horse",
    r: "Chariot",
    c: "Cannon",
    p: "Soldier",
  },
};

/** Short role label shown in UI (中文) — matches the character people expect. */
export const XIANGQI_ROLE_ZH: Record<Faction, Record<"k" | "a" | "b" | "n" | "r" | "c" | "p", string>> = {
  w: {
    k: "帅",
    a: "仕",
    b: "丞相",
    n: "马",
    r: "车",
    c: "大炮",
    p: "兵",
  },
  b: {
    k: "将",
    a: "士",
    b: "大象",
    n: "马",
    r: "车",
    c: "大炮",
    p: "卒",
  },
};

/**
 * Which western Meshy sculpt stands in for a Xiangqi rank.
 * 相 (red) → court mage; 象 (black) → elephant mount (sculpt key unused at render);
 * 炮 → ranged caster; 車 → chariot + scaled rider; others map 1:1.
 */
export function xiangqiSculpt(kind: PieceKind, color: Faction): ChessSculpt {
  switch (kind) {
    case "k":
      return "k";
    case "a":
      return "b";
    case "b":
      // 相 = court; 象 uses procedural elephant but needs a template for factory.
      return color === "w" ? "b" : "n";
    case "n":
      return "n";
    case "r":
      return "r";
    case "c":
      return "q";
    case "p":
      return "p";
    default:
      return "p";
  }
}

export function isXiangqiKind(kind: PieceKind): kind is "k" | "a" | "b" | "n" | "r" | "c" | "p" {
  return kind === "k" || kind === "a" || kind === "b" || kind === "n" || kind === "r" || kind === "c" || kind === "p";
}

export function xiangqiGlyph(kind: PieceKind, color: Faction): string {
  if (!isXiangqiKind(kind)) return "?";
  return XIANGQI_GLYPH[color][kind];
}

export function xiangqiRoleEn(kind: PieceKind, color: Faction): string {
  if (!isXiangqiKind(kind)) return kind;
  return XIANGQI_ROLE_EN[color][kind];
}

export function xiangqiRoleZh(kind: PieceKind, color: Faction): string {
  if (!isXiangqiKind(kind)) return kind;
  return XIANGQI_ROLE_ZH[color][kind];
}
