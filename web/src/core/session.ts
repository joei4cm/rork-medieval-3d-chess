import type { Emitter } from "./emitter";
import type {
  Animator,
  DemoOptions,
  Difficulty,
  Faction,
  GameMode,
  GameResult,
  GameSnapshot,
  MoveEvent,
  PieceKind,
  SquareId,
} from "./types";

export interface StartOptions {
  mode: GameMode;
  difficulty: Difficulty;
  playerColor: Faction;
  clockMinutes: number | null;
  demo?: DemoOptions;
}

interface ControllerEvents {
  state: GameSnapshot;
  move: MoveEvent;
  check: Faction;
  gameover: GameResult;
  reset: StartOptions;
  illegal: { from: SquareId; to: SquareId };
}

/**
 * Shared surface of chess and Xiangqi controllers so the scene and UI can
 * bind either without caring which ruleset is live.
 */
export interface GameSession extends Emitter<ControllerEvents> {
  setAnimator(animator: Animator | null): void;
  getSnapshot(): GameSnapshot;
  getBoard(): { square: SquareId; kind: PieceKind; color: Faction }[];
  legalTargets(from: SquareId): { to: SquareId; capture: boolean; castle: boolean; promotion: boolean }[];
  isPromotion(from: SquareId, to: SquareId): boolean;
  pieceAt(square: SquareId): { kind: PieceKind; color: Faction } | null;
  isHumanTurn(): boolean;
  start(options: StartOptions): void;
  stop(): void;
  setPaused(paused: boolean): void;
  togglePaused(): void;
  isPaused(): boolean;
  setDemoSpeed(speed: number): void;
  setDemoAutoRematch(autoRematch: boolean): void;
  restartDemo(): void;
  tryMove(from: SquareId, to: SquareId, promotion?: PieceKind): Promise<boolean>;
  resign(): void;
  undo(): boolean;
  dispose(): void;
}
