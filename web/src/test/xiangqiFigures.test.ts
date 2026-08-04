import { describe, expect, it } from "vitest";

import type { Faction, PieceKind } from "../core/types";
import { buildXiangqiPiece, findQinWarriors } from "../scene/xiangqiFigures";
import { XIANGQI_GLYPH } from "../xiangqi/identity";

const KINDS: PieceKind[] = ["k", "a", "b", "n", "r", "c", "p"];
const FACTIONS: Faction[] = ["w", "b"];

function countMeshes(root: { traverse: (fn: (n: { isMesh?: boolean }) => void) => void }): number {
  let c = 0;
  root.traverse((n) => {
    if ((n as { isMesh?: boolean }).isMesh) c++;
  });
  return c;
}

/** Expected terracotta warrior rank name per piece kind / faction. */
function expectedWarrior(kind: PieceKind, faction: Faction): string {
  switch (kind) {
    case "k":
      return "qin_general";
    case "a":
      return "qin_scholar";
    case "b":
      // 相 = standing officer; 象 = elephant mahout (cavalry)
      return faction === "w" ? "qin_officer" : "qin_cavalry";
    case "n":
      return "qin_cavalry";
    case "r":
      return "qin_officer";
    case "c":
      return "qin_gunner";
    case "p":
    default:
      return "qin_infantry";
  }
}

describe("Xiangqi terracotta figures", () => {
  for (const faction of FACTIONS) {
    for (const kind of KINDS) {
      const glyph = XIANGQI_GLYPH[faction][kind as keyof typeof XIANGQI_GLYPH.w];
      const label = `${faction}/${kind} (${glyph})`;

      it(`${label} has a humanoid Qin warrior`, () => {
        const piece = buildXiangqiPiece(kind, faction);
        const warriors = findQinWarriors(piece);
        expect(warriors, `${label} missing qin_* warrior`).toContain(expectedWarrior(kind, faction));
        expect(warriors.length).toBeGreaterThanOrEqual(1);
        // Humanoid armor kit must be more than a couple of blob meshes
        expect(countMeshes(piece)).toBeGreaterThan(20);
      });
    }
  }

  it("red 相 is a standing court officer, not an elephant", () => {
    const piece = buildXiangqiPiece("b", "w");
    expect(piece.name).toBe("xq_chancellor");
    expect(findQinWarriors(piece)).toEqual(["qin_officer"]);
  });

  it("black 象 is elephant with terracotta mahout", () => {
    const piece = buildXiangqiPiece("b", "b");
    expect(piece.name).toBe("xq_elephant");
    expect(findQinWarriors(piece)).toContain("qin_cavalry");
  });

  it("mounted ranks keep a full-size warrior (no crushed scale)", () => {
    for (const [kind, faction] of [
      ["n", "w"],
      ["n", "b"],
      ["r", "w"],
      ["c", "b"],
      ["b", "b"],
    ] as const) {
      const piece = buildXiangqiPiece(kind, faction);
      let warriorScale = 1;
      piece.traverse((node) => {
        if (node.name.startsWith("qin_")) {
          warriorScale = Math.min(warriorScale, node.scale.x, node.scale.y, node.scale.z);
        }
      });
      expect(warriorScale, `${faction}/${kind} warrior crushed`).toBeGreaterThanOrEqual(0.95);
    }
  });
});
