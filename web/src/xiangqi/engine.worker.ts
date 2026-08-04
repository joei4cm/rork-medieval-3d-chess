/// <reference lib="webworker" />
import { Xiangqi, type XMove, type XPiece } from "./rules";

type Difficulty = "easy" | "medium" | "hard";

interface SearchRequest {
  id: number;
  fen: string;
  difficulty: Difficulty;
}

interface SearchResponse {
  id: number;
  from: string;
  to: string;
  promotion: string | null;
  score: number;
  depth: number;
}

const VALUE: Record<XPiece, number> = {
  p: 100,
  a: 200,
  b: 200,
  n: 400,
  c: 450,
  r: 900,
  k: 20000,
};

/** Soft centre preference for horses and cannons; palace safety for the general. */
function pstBonus(kind: XPiece, file: number, rank: number, color: "w" | "b"): number {
  const r = color === "w" ? rank : 9 - rank;
  const f = file;
  if (kind === "k") {
    return (f === 4 ? 20 : 0) + (r <= 1 ? 15 : 0);
  }
  if (kind === "n" || kind === "c") {
    const centre = 4 - Math.abs(f - 4);
    return centre * 6 + r * 3;
  }
  if (kind === "r") return r * 4;
  if (kind === "p") return r * 12 + (r >= 5 ? 30 : 0);
  return 0;
}

function evaluate(game: Xiangqi): number {
  let score = 0;
  for (const piece of game.pieces()) {
    const file = "abcdefghi".indexOf(piece.square[0]);
    const rank = Number(piece.square.slice(1));
    const value = VALUE[piece.kind] + pstBonus(piece.kind, file, rank, piece.color);
    score += piece.color === "w" ? value : -value;
  }
  if (game.isCheck()) score += game.turn() === "w" ? -35 : 35;
  return score;
}

function moveScore(move: XMove): number {
  let score = 0;
  if (move.captured) score += 10 * VALUE[move.captured] - VALUE[move.piece];
  if (move.check) score += 40;
  return score;
}

class Search {
  private game: Xiangqi;
  private deadline: number;
  private nodes = 0;

  constructor(fen: string, deadline: number) {
    this.game = new Xiangqi(fen);
    this.deadline = deadline;
  }

  best(difficulty: Difficulty): SearchResponse | null {
    const moves = this.game.moves().sort((a, b) => moveScore(b) - moveScore(a));
    if (moves.length === 0) return null;

    if (difficulty === "easy") {
      const captures = moves.filter((m) => m.captured || m.mate);
      const pool = captures.length > 0 && Math.random() < 0.7 ? captures : moves;
      const pick = pool[Math.floor(Math.random() * pool.length)] ?? moves[0];
      return { id: 0, from: pick.from, to: pick.to, promotion: null, score: 0, depth: 1 };
    }

    const maxDepth = difficulty === "hard" ? 4 : 3;
    const budget = difficulty === "hard" ? 2800 : 700;
    this.deadline = performance.now() + budget;

    let best = moves[0];
    let bestScore = -Infinity;
    let reached = 1;

    for (let depth = 1; depth <= maxDepth; depth++) {
      if (performance.now() > this.deadline) break;
      let localBest = best;
      let localScore = -Infinity;
      const ordered = [...moves].sort((a, b) => moveScore(b) - moveScore(a));
      for (const move of ordered) {
        if (performance.now() > this.deadline) break;
        this.game.move({ from: move.from, to: move.to });
        const score = -this.negamax(depth - 1, -Infinity, Infinity);
        this.game.undo();
        if (score > localScore) {
          localScore = score;
          localBest = move;
        }
      }
      best = localBest;
      bestScore = localScore;
      reached = depth;
      if (Math.abs(bestScore) > 15000) break;
    }

    return {
      id: 0,
      from: best.from,
      to: best.to,
      promotion: null,
      score: bestScore,
      depth: reached,
    };
  }

  private negamax(depth: number, alpha: number, beta: number): number {
    this.nodes += 1;
    if (performance.now() > this.deadline) return evaluate(this.game);
    if (this.game.isCheckmate()) return -20000 + (4 - depth);
    if (this.game.isStalemate() || this.game.isThreefold()) return 0;
    if (depth <= 0) return this.quiesce(alpha, beta);

    const moves = this.game.moves().sort((a, b) => moveScore(b) - moveScore(a));
    if (moves.length === 0) return evaluate(this.game);

    let best = -Infinity;
    for (const move of moves) {
      this.game.move({ from: move.from, to: move.to });
      const score = -this.negamax(depth - 1, -beta, -alpha);
      this.game.undo();
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    return best;
  }

  private quiesce(alpha: number, beta: number): number {
    const stand = evaluate(this.game);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const captures = this.game
      .moves()
      .filter((m) => m.captured)
      .sort((a, b) => moveScore(b) - moveScore(a));
    for (const move of captures) {
      if (performance.now() > this.deadline) break;
      this.game.move({ from: move.from, to: move.to });
      const score = -this.quiesce(-beta, -alpha);
      this.game.undo();
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }
}

self.onmessage = (event: MessageEvent<SearchRequest>) => {
  const { id, fen, difficulty } = event.data;
  try {
    const search = new Search(fen, performance.now() + 3000);
    const result = search.best(difficulty);
    if (!result) {
      self.postMessage(null);
      return;
    }
    result.id = id;
    self.postMessage(result);
  } catch (error) {
    console.error("[xiangqi-engine]", error);
    self.postMessage(null);
  }
};
