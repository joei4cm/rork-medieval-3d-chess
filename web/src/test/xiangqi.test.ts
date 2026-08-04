import { describe, expect, it } from "vitest";

import { Xiangqi } from "../xiangqi/rules";

describe("Xiangqi rules", () => {
  it("loads the starting position with 32 pieces", () => {
    const game = new Xiangqi();
    expect(game.pieces()).toHaveLength(32);
    expect(game.turn()).toBe("w");
    expect(game.isCheck()).toBe(false);
  });

  it("allows a red chariot to advance on an open file", () => {
    const game = new Xiangqi();
    const move = game.move({ from: "a0", to: "a1" });
    expect(move).not.toBeNull();
    expect(game.get("a1")?.kind).toBe("r");
    expect(game.turn()).toBe("b");
  });

  it("blocks an elephant from crossing the river", () => {
    const game = new Xiangqi();
    // Red elephant on c0 — trying to leap toward the river midfield illegally.
    const illegal = game.moves({ square: "c0" }).some((m) => m.to === "c4" || m.to === "e4" || Number(m.to.slice(1)) >= 5);
    expect(illegal).toBe(false);
  });

  it("requires a screen for cannon captures", () => {
    // Red cannon on b2, black soldier on b6, with a screen on b4.
    const game = new Xiangqi("9/9/9/1p7/1P7/9/1C7/9/9/4K4 w");
    const captures = game.moves({ square: "b3" }).filter((m) => m.captured);
    // Adjust fen ranks: b2 in 0-index... Let us use an explicit quiet board.
    void captures;
    const clear = new Xiangqi("9/9/9/1p7/9/9/1C7/9/9/4K4 w");
    // Cannon at b3 (rank 3 from bottom in fen rank indexing - verify via get)
    const cannonSquare = clear.pieces().find((p) => p.kind === "c" && p.color === "w")?.square;
    const pawnSquare = clear.pieces().find((p) => p.kind === "p" && p.color === "b")?.square;
    expect(cannonSquare).toBeTruthy();
    expect(pawnSquare).toBeTruthy();
    if (!cannonSquare || !pawnSquare) return;
    const withoutScreen = clear.moves({ square: cannonSquare }).some((m) => m.to === pawnSquare && m.captured);
    expect(withoutScreen).toBe(false);
  });

  it("detects flying general as illegal", () => {
    // Generals face each other on the e-file with nothing between — red moving the blocker away is illegal.
    const game = new Xiangqi("4k4/9/9/9/9/9/9/9/9/4K4 w");
    // Red general cannot move onto the open file confrontation... actually both already face — position is illegal to reach.
    // Instead: blocker on e4, moving it off must be rejected if it opens the file.
    const blocked = new Xiangqi("4k4/9/9/9/4P4/9/9/9/9/4K4 w");
    const moves = blocked.moves({ square: "e5" });
    // Pawn on e5 moving sideways off the file would expose flying generals.
    const expose = moves.filter((m) => m.to === "d5" || m.to === "f5");
    expect(expose).toHaveLength(0);
  });

  it("undo restores the prior position", () => {
    const game = new Xiangqi();
    const fen = game.fen();
    game.move({ from: "a0", to: "a1" });
    expect(game.fen()).not.toBe(fen);
    game.undo();
    expect(game.fen()).toBe(fen);
  });
});
