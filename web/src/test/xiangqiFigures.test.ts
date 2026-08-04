import { describe, expect, it } from "vitest";

import type { Faction, PieceKind } from "../core/types";
import { buildXiangqiPiece, findHanSoldiers } from "../scene/xiangqiFigures";
import { XIANGQI_GLYPH } from "../xiangqi/identity";

const KINDS: PieceKind[] = ["k", "a", "b", "n", "r", "c", "p"];
const FACTIONS: Faction[] = ["w", "b"];

function expectedSoldier(kind: PieceKind, faction: Faction): string {
  switch (kind) {
    case "k":
      return "han_marshal";
    case "a":
      return "han_guard";
    case "b":
      return faction === "w" ? "han_minister" : "han_mahout";
    case "n":
      return "han_cavalry";
    case "r":
      return "han_driver";
    case "c":
      return "han_gunner";
    case "p":
    default:
      return "han_infantry";
  }
}

function countMeshes(root: { traverse: (fn: (n: { isMesh?: boolean }) => void) => void }): number {
  let c = 0;
  root.traverse((n) => {
    if ((n as { isMesh?: boolean }).isMesh) c += 1;
  });
  return c;
}

describe("Xiangqi original Han soldiers", () => {
  for (const faction of FACTIONS) {
    for (const kind of KINDS) {
      const glyph = XIANGQI_GLYPH[faction][kind as keyof typeof XIANGQI_GLYPH.w];
      it(`${faction}/${kind} (${glyph}) is a Chinese soldier, not a western GLB remount`, () => {
        const piece = buildXiangqiPiece(kind, faction);
        const soldiers = findHanSoldiers(piece);
        expect(soldiers).toContain(expectedSoldier(kind, faction));
        expect(countMeshes(piece)).toBeGreaterThan(25);
      });
    }
  }

  it("red 相 is a minister, black 象 is elephant + mahout", () => {
    expect(buildXiangqiPiece("b", "w").name).toBe("xq_minister");
    expect(buildXiangqiPiece("b", "b").name).toBe("xq_elephant");
    expect(findHanSoldiers(buildXiangqiPiece("b", "b"))).toContain("han_mahout");
  });

  it("marshal uses dual-plume 鹖冠 silhouette group", () => {
    expect(findHanSoldiers(buildXiangqiPiece("k", "w"))).toEqual(["han_marshal"]);
  });
});
