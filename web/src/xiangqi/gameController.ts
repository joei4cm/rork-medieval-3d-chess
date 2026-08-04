import { Emitter } from "../core/emitter";
import {
  type Animator,
  type CapturedPiece,
  type ClockState,
  type DemoOptions,
  type Difficulty,
  type Faction,
  type GameMode,
  type GameResult,
  type GameSnapshot,
  type HistoryRow,
  type LedgerMove,
  type MoveEvent,
  type PieceKind,
  type SquareId,
  PIECE_VALUE,
} from "../core/types";
import { XiangqiAiClient } from "./aiClient";
import {
  Xiangqi,
  fileOf,
  rankOf,
  type XMove,
  type XPiece,
  XPIECE_VALUE,
} from "./rules";

export interface StartOptions {
  mode: GameMode;
  difficulty: Difficulty;
  playerColor: Faction;
  clockMinutes: number | null;
  demo?: DemoOptions;
}

export const DEFAULT_DEMO: DemoOptions = {
  white: "medium",
  black: "medium",
  speed: 1,
  autoRematch: true,
};

const DEMO_REMATCH_DELAY_MS = 6500;
const CLOCK_TICK_MS = 100;

interface ControllerEvents {
  state: GameSnapshot;
  move: MoveEvent;
  check: Faction;
  gameover: GameResult;
  reset: StartOptions;
  illegal: { from: SquareId; to: SquareId };
}

/**
 * Owns all Xiangqi state. Rendering, audio and UI subscribe to it.
 */
export class XiangqiGameController extends Emitter<ControllerEvents> {
  private game = new Xiangqi();
  private ai = new XiangqiAiClient();
  private animator: Animator | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private rematchTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTickAt = 0;
  private generation = 0;
  private paused = false;
  private demoRound = 1;
  private resumeWaiters: (() => void)[] = [];

  private status: GameSnapshot["status"] = "idle";
  private options: StartOptions = {
    mode: "ai",
    difficulty: "medium",
    playerColor: "w",
    clockMinutes: null,
  };
  private clock: ClockState = { enabled: false, initialMs: 0, whiteMs: 0, blackMs: 0 };
  private result: GameResult | null = null;
  private thinking = false;
  private busy = false;
  private snapshot: GameSnapshot = this.buildSnapshot();

  setAnimator(animator: Animator | null): void {
    this.animator = animator;
  }

  getSnapshot(): GameSnapshot {
    return this.snapshot;
  }

  getBoard(): { square: SquareId; kind: PieceKind; color: Faction }[] {
    return this.game.pieces().map((p) => ({
      square: p.square,
      kind: p.kind as PieceKind,
      color: p.color,
    }));
  }

  legalTargets(from: SquareId): { to: SquareId; capture: boolean; castle: boolean; promotion: boolean }[] {
    return this.game.moves({ square: from }).map((move) => ({
      to: move.to,
      capture: Boolean(move.captured),
      castle: false,
      promotion: false,
    }));
  }

  isPromotion(_from: SquareId, _to: SquareId): boolean {
    return false;
  }

  pieceAt(square: SquareId): { kind: PieceKind; color: Faction } | null {
    const piece = this.game.get(square);
    if (!piece) return null;
    return { kind: piece.kind as PieceKind, color: piece.color };
  }

  isHumanTurn(): boolean {
    if (this.status !== "playing" || this.busy) return false;
    if (this.options.mode === "attract" || this.options.mode === "demo") return false;
    if (this.options.mode === "hotseat") return true;
    return this.game.turn() === this.options.playerColor;
  }

  start(options: StartOptions): void {
    this.generation += 1;
    this.ai.cancel();
    this.clearRematchTimer();
    this.releasePause();
    this.paused = false;
    if (options.mode !== "demo" || this.options.mode !== "demo") this.demoRound = 1;
    this.options = options.mode === "demo" ? { ...options, demo: options.demo ?? DEFAULT_DEMO } : options;
    this.game = new Xiangqi();
    this.status = "playing";
    this.result = null;
    this.thinking = false;
    this.busy = false;
    const ms = options.clockMinutes ? options.clockMinutes * 60_000 : 0;
    this.clock = {
      enabled: options.clockMinutes !== null,
      initialMs: ms,
      whiteMs: ms,
      blackMs: ms,
    };
    this.emit("reset", options);
    this.publish();
    this.startClock();
    void this.maybeRunEngine();
  }

  stop(): void {
    this.generation += 1;
    this.ai.cancel();
    this.clearRematchTimer();
    this.stopClock();
    this.status = "idle";
    this.thinking = false;
    this.busy = false;
    this.paused = false;
    this.releasePause();
    this.publish();
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    if (paused) this.stopClock();
    else {
      this.releasePause();
      this.startClock();
    }
    this.publish();
    if (!paused) void this.maybeRunEngine();
  }

  togglePaused(): void {
    this.setPaused(!this.paused);
  }

  isPaused(): boolean {
    return this.paused;
  }

  setDemoSpeed(speed: number): void {
    if (!this.options.demo) return;
    this.options = { ...this.options, demo: { ...this.options.demo, speed: clamp(speed, 0.25, 4) } };
    this.publish();
  }

  setDemoAutoRematch(autoRematch: boolean): void {
    if (!this.options.demo) return;
    this.options = { ...this.options, demo: { ...this.options.demo, autoRematch } };
    if (!autoRematch) this.clearRematchTimer();
    this.publish();
  }

  restartDemo(): void {
    if (this.options.mode !== "demo") return;
    this.demoRound += 1;
    this.start({ ...this.options });
  }

  async tryMove(from: SquareId, to: SquareId, _promotion?: PieceKind): Promise<boolean> {
    if (!this.isHumanTurn()) return false;
    return this.play(from, to);
  }

  resign(): void {
    if (this.status !== "playing") return;
    const loser = this.options.mode === "ai" ? this.options.playerColor : this.game.turn();
    this.finish({ winner: loser === "w" ? "b" : "w", reason: "resignation" });
  }

  undo(): boolean {
    if (this.status === "over") {
      this.status = "playing";
      this.result = null;
    }
    if (this.status !== "playing" || this.busy || this.thinking) return false;
    if (this.game.history().length === 0) return false;
    this.generation += 1;
    this.ai.cancel();
    this.game.undo();
    if (this.options.mode === "ai" && this.game.turn() !== this.options.playerColor) {
      this.game.undo();
    }
    this.thinking = false;
    this.busy = false;
    this.publish();
    return true;
  }

  dispose(): void {
    this.stopClock();
    this.clearRematchTimer();
    this.releasePause();
    this.ai.dispose();
    this.clear();
  }

  private async play(from: SquareId, to: SquareId): Promise<boolean> {
    const move = this.game.move({ from, to });
    if (!move) {
      this.emit("illegal", { from, to });
      return false;
    }
    await this.commit(move);
    return true;
  }

  private async commit(move: XMove): Promise<void> {
    const generation = this.generation;
    this.busy = true;

    const event: MoveEvent = {
      color: move.color,
      kind: move.piece as PieceKind,
      from: move.from,
      to: move.to,
      san: move.san,
      capture: move.captured
        ? { square: move.to, kind: move.captured as PieceKind, color: move.color === "w" ? "b" : "w" }
        : null,
      rook: null,
      promotion: null,
      isCheck: move.check,
      isGameOver: move.mate || this.game.isGameOver(),
      cannonScreen: move.piece === "c" && move.captured ? findCannonScreen(this.game, move.from, move.to) : null,
    };

    // Screen square must be found on the board *after* the move — the screen is still there.
    // Actually after move the cannon is on `to` and screen is between from and... wait, from is empty now.
    // Screen is between original from and to — still on board. findCannonScreen uses from/to geometry + current board.

    this.publish();
    this.emit("move", event);
    if (move.check) this.emit("check", this.game.turn());

    if (this.animator) {
      try {
        await this.animator(event);
      } catch (error) {
        console.error("[xiangqi] animator failed", error);
      }
    }
    if (generation !== this.generation) return;

    this.busy = false;
    this.publish();

    if (this.checkEnd()) return;
    void this.maybeRunEngine();
  }

  private checkEnd(): boolean {
    if (!this.game.isGameOver()) return false;
    const loser = this.game.turn();
    if (this.game.isCheckmate()) {
      this.finish({ winner: loser === "w" ? "b" : "w", reason: "checkmate" });
      return true;
    }
    if (this.game.isStalemate()) {
      this.finish({ winner: null, reason: "stalemate" });
      return true;
    }
    if (this.game.isThreefold()) {
      this.finish({ winner: null, reason: "threefold" });
      return true;
    }
    this.finish({ winner: null, reason: "draw" });
    return true;
  }

  private finish(result: GameResult): void {
    this.generation += 1;
    this.ai.cancel();
    this.stopClock();
    this.releasePause();
    this.status = "over";
    this.thinking = false;
    this.busy = false;
    this.result = result;
    this.publish();
    this.emit("gameover", result);
    this.scheduleDemoRematch();
  }

  private scheduleDemoRematch(): void {
    if (this.options.mode !== "demo" || !this.options.demo?.autoRematch) return;
    this.clearRematchTimer();
    this.rematchTimer = setTimeout(() => {
      this.rematchTimer = null;
      if (this.status !== "over" || this.options.mode !== "demo") return;
      this.demoRound += 1;
      this.start({ ...this.options });
    }, DEMO_REMATCH_DELAY_MS);
  }

  private async maybeRunEngine(): Promise<void> {
    if (this.status !== "playing" || this.paused) return;
    const mode = this.options.mode;
    if (mode === "hotseat") return;
    const turn = this.game.turn();
    if (mode === "ai" && turn === this.options.playerColor) return;
    if (this.thinking) return;

    const generation = this.generation;
    this.thinking = true;
    this.publish();

    const demo = mode === "demo" ? (this.options.demo ?? DEFAULT_DEMO) : null;
    const difficulty: Difficulty =
      mode === "attract" ? "medium" : demo ? (turn === "w" ? demo.white : demo.black) : this.options.difficulty;
    const started = performance.now();
    const best = await this.ai.bestMove(this.game.fen(), difficulty);
    if (generation !== this.generation || this.status !== "playing") {
      this.thinking = false;
      return;
    }

    const elapsed = performance.now() - started;
    const base = mode === "attract" ? 900 : demo ? 1150 : 420;
    const floor = demo ? clamp(base / demo.speed, 120, 6000) : base;
    if (elapsed < floor) await wait(floor - elapsed);
    if (generation !== this.generation || this.status !== "playing") {
      this.thinking = false;
      return;
    }

    if (this.paused) {
      this.thinking = false;
      this.publish();
      await this.waitWhilePaused();
      if (generation !== this.generation || this.status !== "playing") return;
    }

    this.thinking = false;
    if (!best) {
      this.checkEnd();
      this.publish();
      return;
    }
    await this.play(best.from, best.to);
  }

  private startClock(): void {
    this.stopClock();
    if (!this.clock.enabled || this.paused || this.status !== "playing") return;
    this.lastTickAt = performance.now();
    this.clockTimer = setInterval(() => this.tickClock(), CLOCK_TICK_MS);
  }

  private stopClock(): void {
    if (this.clockTimer !== null) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
  }

  private tickClock(): void {
    if (this.status !== "playing" || this.paused) return;
    const now = performance.now();
    const delta = now - this.lastTickAt;
    this.lastTickAt = now;
    const turn = this.game.turn();
    if (turn === "w") this.clock.whiteMs = Math.max(0, this.clock.whiteMs - delta);
    else this.clock.blackMs = Math.max(0, this.clock.blackMs - delta);

    if (this.clock.whiteMs === 0 || this.clock.blackMs === 0) {
      const loser: Faction = this.clock.whiteMs === 0 ? "w" : "b";
      this.finish({ winner: loser === "w" ? "b" : "w", reason: "timeout" });
      return;
    }
    this.publish();
  }

  private releasePause(): void {
    const waiters = this.resumeWaiters;
    this.resumeWaiters = [];
    for (const resolve of waiters) resolve();
  }

  private async waitWhilePaused(): Promise<void> {
    while (this.paused && this.status === "playing") {
      await new Promise<void>((resolve) => this.resumeWaiters.push(resolve));
    }
  }

  private clearRematchTimer(): void {
    if (this.rematchTimer !== null) {
      clearTimeout(this.rematchTimer);
      this.rematchTimer = null;
    }
  }

  private buildSnapshot(): GameSnapshot {
    const verbose = this.game.history();
    const sanList = verbose.map((move) => move.san);
    const history: HistoryRow[] = [];
    for (let i = 0; i < sanList.length; i += 2) {
      history.push({
        number: i / 2 + 1,
        white: sanList[i] ?? null,
        black: sanList[i + 1] ?? null,
      });
    }

    const moves: LedgerMove[] = verbose.map((move, index) => ({
      ply: index,
      number: Math.floor(index / 2) + 1,
      color: move.color,
      kind: move.piece as PieceKind,
      san: move.san,
      from: move.from,
      to: move.to,
      capture: Boolean(move.captured),
      castle: false,
      promotion: null,
      check: move.check,
      mate: move.mate,
    }));

    const captured: CapturedPiece[] = [];
    let diff = 0;
    for (const move of verbose) {
      if (!move.captured) continue;
      const kind = move.captured as PieceKind;
      const color: Faction = move.color === "w" ? "b" : "w";
      captured.push({ kind, color });
      const value = XPIECE_VALUE[move.captured as XPiece] ?? PIECE_VALUE[kind] ?? 0;
      diff += color === "b" ? value : -value;
    }

    const last = verbose.length > 0 ? verbose[verbose.length - 1] : null;

    return {
      status: this.status,
      mode: this.options.mode,
      difficulty: this.options.difficulty,
      playerColor: this.options.playerColor,
      turn: this.game.turn(),
      fen: this.game.fen(),
      pgn: sanList.map((san, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${san}` : san)).join(" "),
      inCheck: this.game.isCheck(),
      thinking: this.thinking,
      busy: this.busy,
      result: this.result,
      history,
      sanList,
      moves,
      captured,
      materialDiff: diff,
      lastMove: last ? { from: last.from, to: last.to } : null,
      clock: { ...this.clock },
      canUndo:
        verbose.length > 0 &&
        !this.thinking &&
        !this.busy &&
        this.options.mode !== "attract" &&
        this.options.mode !== "demo",
      demo: this.options.mode === "demo" ? { ...(this.options.demo ?? DEFAULT_DEMO) } : null,
      paused: this.paused,
      demoRound: this.demoRound,
      variant: "xiangqi",
    };
  }

  private publish(): void {
    this.snapshot = this.buildSnapshot();
    this.emit("state", this.snapshot);
  }
}

/** Find the unique screen piece between a cannon's origin and capture square. */
function findCannonScreen(game: Xiangqi, from: SquareId, to: SquareId): SquareId | null {
  const ff = fileOf(from);
  const fr = rankOf(from);
  const tf = fileOf(to);
  const tr = rankOf(to);
  if (ff !== tf && fr !== tr) return null;
  const df = Math.sign(tf - ff);
  const dr = Math.sign(tr - fr);
  let f = ff + df;
  let r = fr + dr;
  while (f !== tf || r !== tr) {
    const sq = `${"abcdefghi"[f]}${r}`;
    if (game.get(sq)) return sq;
    f += df;
    r += dr;
  }
  return null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
