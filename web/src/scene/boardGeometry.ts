import * as THREE from "three";

import type { GameVariant, SquareId } from "../core/types";
import { TILE } from "./boardConstants";

export interface BoardGeometry {
  variant: GameVariant;
  files: string;
  minRank: number;
  maxRank: number;
  fileCount: number;
  rankCount: number;
  /** Half-width in tiles from centre to outer file centre. */
  halfFiles: number;
  /** Half-depth in tiles from centre to outer rank centre. */
  halfRanks: number;
  squareToWorld(square: SquareId, y?: number): THREE.Vector3;
  worldToSquare(x: number, z: number): SquareId | null;
  allSquares(): SquareId[];
}

const chessGeom: BoardGeometry = {
  variant: "chess",
  files: "abcdefgh",
  minRank: 1,
  maxRank: 8,
  fileCount: 8,
  rankCount: 8,
  halfFiles: 3.5,
  halfRanks: 3.5,
  squareToWorld(square, y = 0) {
    const file = this.files.indexOf(square[0]);
    const rank = Number(square.slice(1));
    return new THREE.Vector3((file - this.halfFiles) * TILE, y, (this.halfRanks - (rank - 1)) * TILE);
  },
  worldToSquare(x, z) {
    const file = Math.round(x / TILE + this.halfFiles);
    const rank = Math.round(this.halfRanks - z / TILE) + 1;
    if (file < 0 || file >= this.fileCount || rank < this.minRank || rank > this.maxRank) return null;
    return `${this.files[file]}${rank}`;
  },
  allSquares() {
    const out: SquareId[] = [];
    for (let r = this.minRank; r <= this.maxRank; r++) {
      for (let f = 0; f < this.fileCount; f++) out.push(`${this.files[f]}${r}`);
    }
    return out;
  },
};

const xiangqiGeom: BoardGeometry = {
  variant: "xiangqi",
  files: "abcdefghi",
  minRank: 0,
  maxRank: 9,
  fileCount: 9,
  rankCount: 10,
  halfFiles: 4,
  halfRanks: 4.5,
  squareToWorld(square, y = 0) {
    const file = this.files.indexOf(square[0]);
    const rank = Number(square.slice(1));
    return new THREE.Vector3((file - this.halfFiles) * TILE, y, (this.halfRanks - rank) * TILE);
  },
  worldToSquare(x, z) {
    const file = Math.round(x / TILE + this.halfFiles);
    const rank = Math.round(this.halfRanks - z / TILE);
    if (file < 0 || file >= this.fileCount || rank < this.minRank || rank > this.maxRank) return null;
    return `${this.files[file]}${rank}`;
  },
  allSquares() {
    const out: SquareId[] = [];
    for (let r = this.minRank; r <= this.maxRank; r++) {
      for (let f = 0; f < this.fileCount; f++) out.push(`${this.files[f]}${r}`);
    }
    return out;
  },
};

let active: BoardGeometry = chessGeom;

export function getBoardGeometry(): BoardGeometry {
  return active;
}

export function setBoardVariant(variant: GameVariant): BoardGeometry {
  active = variant === "xiangqi" ? xiangqiGeom : chessGeom;
  return active;
}

export function squareToWorld(square: SquareId, y = 0): THREE.Vector3 {
  return active.squareToWorld(square, y);
}

export function worldToSquare(x: number, z: number): SquareId | null {
  return active.worldToSquare(x, z);
}
