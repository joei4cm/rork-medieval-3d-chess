/**
 * Xiangqi (中国象棋) rules engine.
 * Board: files a–i, ranks 0–9. Red ("w") sits on ranks 0–4, Black ("b") on 5–9.
 * FEN lists ranks from 9 → 0 (Black's back rank first), matching common computer Xiangqi.
 */

import { XIANGQI_GLYPH } from "./identity";

export type Side = "w" | "b";
export type XPiece = "k" | "a" | "b" | "n" | "r" | "c" | "p";
export type XSquare = string;

export interface XPieceOnBoard {
  kind: XPiece;
  color: Side;
  square: XSquare;
}

export interface XMove {
  from: XSquare;
  to: XSquare;
  piece: XPiece;
  color: Side;
  captured: XPiece | null;
  san: string;
  check: boolean;
  mate: boolean;
}

const FILES = "abcdefghi";
const FILE_COUNT = 9;
const RANK_COUNT = 10;

const START_FEN = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w";

const PIECE_CHAR: Record<XPiece, string> = {
  k: "k",
  a: "a",
  b: "b",
  n: "n",
  r: "r",
  c: "c",
  p: "p",
};

const CHAR_PIECE: Record<string, XPiece> = {
  k: "k",
  a: "a",
  b: "b",
  n: "n",
  r: "r",
  c: "c",
  p: "p",
};

export const XPIECE_VALUE: Record<XPiece, number> = {
  p: 1,
  a: 2,
  b: 2,
  n: 4,
  c: 4.5,
  r: 9,
  k: 0,
};

export const XPIECE_GLYPH = XIANGQI_GLYPH;

export function fileOf(square: XSquare): number {
  return FILES.indexOf(square[0]);
}

export function rankOf(square: XSquare): number {
  return Number(square.slice(1));
}

export function makeSquare(file: number, rank: number): XSquare | null {
  if (file < 0 || file >= FILE_COUNT || rank < 0 || rank >= RANK_COUNT) return null;
  return `${FILES[file]}${rank}`;
}

export function allSquares(): XSquare[] {
  const out: XSquare[] = [];
  for (let r = 0; r < RANK_COUNT; r++) {
    for (let f = 0; f < FILE_COUNT; f++) out.push(`${FILES[f]}${r}`);
  }
  return out;
}

function inPalace(side: Side, file: number, rank: number): boolean {
  if (file < 3 || file > 5) return false;
  return side === "w" ? rank >= 0 && rank <= 2 : rank >= 7 && rank <= 9;
}

function crossedRiver(side: Side, rank: number): boolean {
  return side === "w" ? rank >= 5 : rank <= 4;
}

function sameSideRiver(side: Side, rank: number): boolean {
  return side === "w" ? rank <= 4 : rank >= 5;
}

export class Xiangqi {
  private board: (XPieceOnBoard | null)[][];
  private turnColor: Side;
  private historyStack: {
    move: XMove;
    board: (XPieceOnBoard | null)[][];
    turn: Side;
  }[] = [];
  private positionCounts = new Map<string, number>();

  constructor(fen: string = START_FEN) {
    this.board = Array.from({ length: RANK_COUNT }, () => Array<XPieceOnBoard | null>(FILE_COUNT).fill(null));
    this.turnColor = "w";
    this.loadFen(fen);
    this.bumpRepetition();
  }

  reset(fen: string = START_FEN): void {
    this.historyStack = [];
    this.positionCounts.clear();
    this.loadFen(fen);
    this.bumpRepetition();
  }

  turn(): Side {
    return this.turnColor;
  }

  fen(): string {
    const ranks: string[] = [];
    for (let r = RANK_COUNT - 1; r >= 0; r--) {
      let empty = 0;
      let line = "";
      for (let f = 0; f < FILE_COUNT; f++) {
        const cell = this.board[r][f];
        if (!cell) {
          empty += 1;
          continue;
        }
        if (empty) {
          line += String(empty);
          empty = 0;
        }
        const ch = PIECE_CHAR[cell.kind];
        line += cell.color === "w" ? ch.toUpperCase() : ch;
      }
      if (empty) line += String(empty);
      ranks.push(line);
    }
    return `${ranks.join("/")} ${this.turnColor}`;
  }

  pieces(): XPieceOnBoard[] {
    const out: XPieceOnBoard[] = [];
    for (let r = 0; r < RANK_COUNT; r++) {
      for (let f = 0; f < FILE_COUNT; f++) {
        const cell = this.board[r][f];
        if (cell) out.push({ ...cell });
      }
    }
    return out;
  }

  get(square: XSquare): XPieceOnBoard | null {
    const f = fileOf(square);
    const r = rankOf(square);
    if (f < 0 || r < 0 || r >= RANK_COUNT) return null;
    const cell = this.board[r][f];
    return cell ? { ...cell } : null;
  }

  history(): XMove[] {
    return this.historyStack.map((entry) => ({ ...entry.move }));
  }

  isCheck(side: Side = this.turnColor): boolean {
    const king = this.findKing(side);
    if (!king) return false;
    return this.isSquareAttacked(king.square, side === "w" ? "b" : "w");
  }

  isCheckmate(): boolean {
    return this.isCheck() && this.moves().length === 0;
  }

  isStalemate(): boolean {
    return !this.isCheck() && this.moves().length === 0;
  }

  isThreefold(): boolean {
    return (this.positionCounts.get(this.fen()) ?? 0) >= 3;
  }

  isGameOver(): boolean {
    return this.isCheckmate() || this.isStalemate() || this.isThreefold();
  }

  moves(options?: { square?: XSquare }): XMove[] {
    const side = this.turnColor;
    const origins = options?.square
      ? [options.square]
      : this.pieces()
          .filter((p) => p.color === side)
          .map((p) => p.square);

    const legal: XMove[] = [];
    for (const from of origins) {
      const piece = this.get(from);
      if (!piece || piece.color !== side) continue;
      for (const to of this.pseudoMoves(from, piece)) {
        const captured = this.get(to);
        const snapshot = this.cloneBoard();
        this.applyRaw(from, to);
        const ok = !this.isCheck(side) && !this.flyingGenerals();
        this.board = snapshot;
        if (!ok) continue;
        legal.push({
          from,
          to,
          piece: piece.kind,
          color: side,
          captured: captured?.kind ?? null,
          san: "",
          check: false,
          mate: false,
        });
      }
    }

    for (const move of legal) {
      const snapshot = this.cloneBoard();
      const turn = this.turnColor;
      this.applyRaw(move.from, move.to);
      this.turnColor = turn === "w" ? "b" : "w";
      move.check = this.isCheck();
      move.mate = move.check && this.generateLegalRaw().length === 0;
      this.board = snapshot;
      this.turnColor = turn;
      move.san = this.formatSan(move);
    }

    return legal;
  }

  /** Legal moves without check/mate SAN annotation (avoids recursion). */
  private generateLegalRaw(): { from: XSquare; to: XSquare }[] {
    const side = this.turnColor;
    const out: { from: XSquare; to: XSquare }[] = [];
    for (const piece of this.pieces()) {
      if (piece.color !== side) continue;
      for (const to of this.pseudoMoves(piece.square, piece)) {
        const snapshot = this.cloneBoard();
        this.applyRaw(piece.square, to);
        const ok = !this.isCheck(side) && !this.flyingGenerals();
        this.board = snapshot;
        if (ok) out.push({ from: piece.square, to });
      }
    }
    return out;
  }

  move(input: { from: XSquare; to: XSquare }): XMove | null {
    const legal = this.moves().find((m) => m.from === input.from && m.to === input.to);
    if (!legal) return null;

    const boardBefore = this.cloneBoard();
    const turnBefore = this.turnColor;
    this.applyRaw(input.from, input.to);
    this.turnColor = turnBefore === "w" ? "b" : "w";
    legal.check = this.isCheck();
    legal.mate = legal.check && this.generateLegalRaw().length === 0;
    legal.san = this.formatSan(legal);

    this.historyStack.push({ move: { ...legal }, board: boardBefore, turn: turnBefore });
    this.bumpRepetition();
    return { ...legal };
  }

  undo(): XMove | null {
    const entry = this.historyStack.pop();
    if (!entry) return null;
    const key = this.fen();
    const count = this.positionCounts.get(key) ?? 0;
    if (count <= 1) this.positionCounts.delete(key);
    else this.positionCounts.set(key, count - 1);
    this.board = entry.board;
    this.turnColor = entry.turn;
    return { ...entry.move };
  }

  private loadFen(fen: string): void {
    const [placement, turn] = fen.trim().split(/\s+/);
    this.board = Array.from({ length: RANK_COUNT }, () => Array<XPieceOnBoard | null>(FILE_COUNT).fill(null));
    const ranks = placement.split("/");
    for (let i = 0; i < ranks.length; i++) {
      const rank = RANK_COUNT - 1 - i;
      let file = 0;
      for (const ch of ranks[i]) {
        if (ch >= "1" && ch <= "9") {
          file += Number(ch);
          continue;
        }
        const lower = ch.toLowerCase();
        const kind = CHAR_PIECE[lower];
        if (!kind || file >= FILE_COUNT) continue;
        const color: Side = ch === lower ? "b" : "w";
        const square = makeSquare(file, rank)!;
        this.board[rank][file] = { kind, color, square };
        file += 1;
      }
    }
    this.turnColor = turn === "b" ? "b" : "w";
  }

  private bumpRepetition(): void {
    const key = this.fen();
    this.positionCounts.set(key, (this.positionCounts.get(key) ?? 0) + 1);
  }

  private cloneBoard(): (XPieceOnBoard | null)[][] {
    return this.board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  }

  private applyRaw(from: XSquare, to: XSquare): void {
    const ff = fileOf(from);
    const fr = rankOf(from);
    const tf = fileOf(to);
    const tr = rankOf(to);
    const piece = this.board[fr][ff];
    if (!piece) return;
    this.board[fr][ff] = null;
    this.board[tr][tf] = { kind: piece.kind, color: piece.color, square: to };
  }

  private findKing(side: Side): XPieceOnBoard | null {
    for (const piece of this.pieces()) {
      if (piece.kind === "k" && piece.color === side) return piece;
    }
    return null;
  }

  private flyingGenerals(): boolean {
    const red = this.findKing("w");
    const black = this.findKing("b");
    if (!red || !black) return false;
    if (fileOf(red.square) !== fileOf(black.square)) return false;
    const file = fileOf(red.square);
    const lo = Math.min(rankOf(red.square), rankOf(black.square));
    const hi = Math.max(rankOf(red.square), rankOf(black.square));
    for (let r = lo + 1; r < hi; r++) {
      if (this.board[r][file]) return false;
    }
    return true;
  }

  private isSquareAttacked(square: XSquare, by: Side): boolean {
    for (const piece of this.pieces()) {
      if (piece.color !== by) continue;
      if (this.pseudoMoves(piece.square, piece).includes(square)) return true;
    }
    return false;
  }

  private pseudoMoves(from: XSquare, piece: XPieceOnBoard): XSquare[] {
    const f = fileOf(from);
    const r = rankOf(from);
    const out: XSquare[] = [];
    const tryAdd = (file: number, rank: number): void => {
      const sq = makeSquare(file, rank);
      if (!sq) return;
      const target = this.get(sq);
      if (target && target.color === piece.color) return;
      out.push(sq);
    };

    switch (piece.kind) {
      case "k": {
        for (const [df, dr] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nf = f + df;
          const nr = r + dr;
          if (!inPalace(piece.color, nf, nr)) continue;
          tryAdd(nf, nr);
        }
        break;
      }
      case "a": {
        for (const [df, dr] of [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ] as const) {
          const nf = f + df;
          const nr = r + dr;
          if (!inPalace(piece.color, nf, nr)) continue;
          tryAdd(nf, nr);
        }
        break;
      }
      case "b": {
        for (const [df, dr] of [
          [2, 2],
          [2, -2],
          [-2, 2],
          [-2, -2],
        ] as const) {
          const nf = f + df;
          const nr = r + dr;
          const eye = makeSquare(f + df / 2, r + dr / 2);
          if (!eye || this.get(eye)) continue;
          if (!sameSideRiver(piece.color, nr)) continue;
          tryAdd(nf, nr);
        }
        break;
      }
      case "n": {
        const horse: [number, number, number, number][] = [
          [0, 1, 1, 2],
          [0, 1, -1, 2],
          [0, -1, 1, -2],
          [0, -1, -1, -2],
          [1, 0, 2, 1],
          [1, 0, 2, -1],
          [-1, 0, -2, 1],
          [-1, 0, -2, -1],
        ];
        for (const [bf, br, df, dr] of horse) {
          const block = makeSquare(f + bf, r + br);
          if (!block || this.get(block)) continue;
          tryAdd(f + df, r + dr);
        }
        break;
      }
      case "r": {
        for (const [df, dr] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          for (let step = 1; step < 10; step++) {
            const sq = makeSquare(f + df * step, r + dr * step);
            if (!sq) break;
            const target = this.get(sq);
            if (!target) {
              out.push(sq);
              continue;
            }
            if (target.color !== piece.color) out.push(sq);
            break;
          }
        }
        break;
      }
      case "c": {
        for (const [df, dr] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          let jumped = false;
          for (let step = 1; step < 10; step++) {
            const sq = makeSquare(f + df * step, r + dr * step);
            if (!sq) break;
            const target = this.get(sq);
            if (!jumped) {
              if (!target) out.push(sq);
              else jumped = true;
              continue;
            }
            if (!target) continue;
            if (target.color !== piece.color) out.push(sq);
            break;
          }
        }
        break;
      }
      case "p": {
        const forward = piece.color === "w" ? 1 : -1;
        tryAdd(f, r + forward);
        if (crossedRiver(piece.color, r)) {
          tryAdd(f + 1, r);
          tryAdd(f - 1, r);
        }
        break;
      }
    }
    return out;
  }

  private formatSan(move: XMove): string {
    const glyph = XPIECE_GLYPH[move.color][move.piece];
    const mark = move.mate ? "#" : move.check ? "+" : "";
    const capture = move.captured ? "x" : "-";
    return `${glyph}${move.from}${capture}${move.to}${mark}`;
  }
}

export const XIANGQI_START_FEN = START_FEN;
export const XIANGQI_FILES = FILES;
export const XIANGQI_FILE_COUNT = FILE_COUNT;
export const XIANGQI_RANK_COUNT = RANK_COUNT;
