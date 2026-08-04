import { memo } from "react";

import type { Faction, GameVariant, PieceKind } from "../core/types";
import { xiangqiGlyph } from "../xiangqi/identity";

interface CrestProps {
  faction: Faction;
  size?: number;
  active?: boolean;
  /** Xiangqi uses a round seal crest instead of the western shield. */
  variant?: GameVariant;
}

/** Faction crest: western heater shield, or a lacquer seal for Xiangqi. */
export const Crest = memo(function Crest({ faction, size = 34, active = false, variant = "chess" }: CrestProps) {
  if (variant === "xiangqi") {
    const field = faction === "w" ? "#c62828" : "#1a1a1a";
    const ink = faction === "w" ? "#ffe8c8" : "#f0e0b0";
    const trim = active ? "#f6dfa5" : "#8a6522";
    const mark = faction === "w" ? "红" : "黑";
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="17" fill={field} stroke={trim} strokeWidth="2.2" />
        <circle cx="20" cy="20" r="13.5" fill="none" stroke={ink} strokeWidth="1" opacity="0.55" />
        <text
          x="20"
          y="21"
          textAnchor="middle"
          dominantBaseline="central"
          fill={ink}
          fontSize="14"
          fontFamily="'Noto Serif SC','Songti SC',serif"
          fontWeight="700"
        >
          {mark}
        </text>
      </svg>
    );
  }

  const field = faction === "w" ? "#e9dfc8" : "#1d1e24";
  const charge = faction === "w" ? "#3c5fa8" : "#a8342a";
  const trim = active ? "#f6dfa5" : "#8a6522";

  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" aria-hidden="true">
      <defs>
        <linearGradient id={`crest-${faction}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={field} stopOpacity="1" />
          <stop offset="100%" stopColor={field} stopOpacity="0.72" />
        </linearGradient>
      </defs>
      <path
        d="M20 2 L37 7 V22 C37 32 29 40 20 44 C11 40 3 32 3 22 V7 Z"
        fill={`url(#crest-${faction})`}
        stroke={trim}
        strokeWidth="2"
      />
      <path
        d="M20 12 c-3 0-5 2-5 5 0 2 1 3 2 4 l-3 6 h4 l2-4 2 4 h4 l-3-6 c1-1 2-2 2-4 0-3-2-5-5-5z"
        fill={charge}
        opacity="0.92"
      />
      <path d="M14 8 h12" stroke={trim} strokeWidth="1.2" opacity="0.7" />
    </svg>
  );
});

interface HourglassProps {
  ratio: number;
  urgent: boolean;
}

/** Chess clock rendered as a draining hourglass. */
export const Hourglass = memo(function Hourglass({ ratio, urgent }: HourglassProps) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const topHeight = 9 * clamped;
  const bottomHeight = 9 * (1 - clamped);
  const sand = urgent ? "#d1553f" : "#d8b163";

  return (
    <svg width="20" height="30" viewBox="0 0 20 30" aria-hidden="true">
      <path d="M3 2 h14 M3 28 h14" stroke="#8a6522" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 3 L16 3 L11 15 L16 27 L4 27 L9 15 Z" fill="rgba(0,0,0,0.35)" stroke="#8a6522" strokeWidth="1.2" />
      <path d={`M5.4 ${4 + (9 - topHeight)} L14.6 ${4 + (9 - topHeight)} L10.6 14 L9.4 14 Z`} fill={sand} opacity="0.95" />
      <rect x="9.4" y="13" width="1.2" height="3" fill={sand} />
      <path d={`M6 26 L14 26 L14 ${26 - bottomHeight} L6 ${26 - bottomHeight} Z`} fill={sand} opacity="0.95" />
    </svg>
  );
});

const CHESS_GLYPHS: Record<PieceKind, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
  a: "士",
  c: "砲",
};

export function pieceGlyph(
  kind: PieceKind,
  variant: GameVariant = "chess",
  faction: Faction = "w",
): string {
  if (variant === "xiangqi") return xiangqiGlyph(kind, faction);
  return CHESS_GLYPHS[kind] ?? "?";
}
