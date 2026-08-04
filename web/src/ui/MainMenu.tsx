import { useState } from "react";
import { Clapperboard, Crown, Swords, Settings as SettingsIcon, Users } from "lucide-react";

import type { DemoOptions, Difficulty, Faction, GameVariant } from "../core/types";
import { useI18n } from "../i18n/I18nProvider";
import { Crest } from "./Heraldry";

export interface MatchConfig {
  variant: GameVariant;
  mode: "ai" | "hotseat" | "demo";
  difficulty: Difficulty;
  playerColor: Faction;
  clockMinutes: number | null;
  demo?: DemoOptions;
}

interface MainMenuProps {
  variant: GameVariant;
  onVariantChange: (variant: GameVariant) => void;
  onStart: (config: MatchConfig) => void;
  onOpenSettings: () => void;
  attract: boolean;
  onInteract: () => void;
}

const DEMO_SPEEDS: { label: string; value: number }[] = [
  { label: "0.5×", value: 0.5 },
  { label: "1×", value: 1 },
  { label: "2×", value: 2 },
  { label: "4×", value: 4 },
];

export function MainMenu({
  variant,
  onVariantChange,
  onStart,
  onOpenSettings,
  attract,
  onInteract,
}: MainMenuProps) {
  const { t, locale, setLocale } = useI18n();
  const [tab, setTab] = useState<"ai" | "hotseat" | "demo">("ai");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [playerColor, setPlayerColor] = useState<Faction>("w");
  const [clock, setClock] = useState<number | null>(null);
  const [demoWhite, setDemoWhite] = useState<Difficulty>("medium");
  const [demoBlack, setDemoBlack] = useState<Difficulty>("hard");
  const [demoSpeed, setDemoSpeed] = useState(1);
  const [demoLoop, setDemoLoop] = useState(true);

  const start = (): void =>
    onStart({
      variant,
      mode: tab,
      difficulty,
      playerColor,
      clockMinutes: tab === "demo" ? null : clock,
      demo: tab === "demo" ? { white: demoWhite, black: demoBlack, speed: demoSpeed, autoRematch: demoLoop } : undefined,
    });

  const brand = variant === "xiangqi" ? t.brand.xiangqi : t.brand.chess;
  const tag = attract
    ? variant === "xiangqi"
      ? t.menu.attractXiangqi
      : t.menu.attractChess
    : variant === "xiangqi"
      ? t.brand.xiangqiTag
      : t.brand.chessTag;

  const clocks = [
    { label: t.menu.none, value: null as number | null },
    { label: t.menu.minutes(5), value: 5 },
    { label: t.menu.minutes(10), value: 10 },
    { label: t.menu.minutes(15), value: 15 },
  ];

  return (
    <div
      className="mc-menu pointer-events-auto absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-5 py-6"
      onPointerDown={onInteract}
      onPointerMove={onInteract}
    >
      <div className="absolute right-4 top-4 z-10 flex gap-1">
        <button
          type="button"
          className="mc-chip px-3 py-1.5 text-[0.7rem]"
          data-active={locale === "en"}
          onClick={() => setLocale("en")}
        >
          EN
        </button>
        <button
          type="button"
          className="mc-chip px-3 py-1.5 text-[0.7rem]"
          data-active={locale === "zh"}
          onClick={() => setLocale("zh")}
        >
          中文
        </button>
      </div>

      <div className="mc-unfurl mc-menu-hero mb-5 shrink-0 text-center">
        <p className="mc-display text-[0.68rem] tracking-[0.55em] text-[#c8ab74]">{t.brand.pickGame}</p>
        <h1 className="mc-display mc-title-glow mt-2 text-4xl font-bold text-[#f4e3bd] sm:text-5xl md:text-6xl">
          {brand}
        </h1>
        <div className="mc-rule mx-auto mt-3 w-64" />
        <p className="mt-3 text-sm italic text-[#c5b28d]">{tag}</p>
      </div>

      <div className="mb-4 grid w-full max-w-md shrink-0 grid-cols-2 gap-2">
        <button
          type="button"
          className="mc-chip flex flex-col items-center gap-1 px-2 py-3"
          data-active={variant === "chess"}
          onClick={() => onVariantChange("chess")}
        >
          <span className="mc-display text-[0.72rem] tracking-[0.2em]">{t.brand.chess}</span>
          <span className="text-[0.65rem] text-[#9c8b6c]">Chess</span>
        </button>
        <button
          type="button"
          className="mc-chip flex flex-col items-center gap-1 px-2 py-3"
          data-active={variant === "xiangqi"}
          onClick={() => onVariantChange("xiangqi")}
        >
          <span className="mc-display text-[0.72rem] tracking-[0.2em]">{t.brand.xiangqi}</span>
          <span className="text-[0.65rem] text-[#9c8b6c]">Xiangqi</span>
        </button>
      </div>

      <div className="mc-slate mc-goldleaf mc-rise flex w-full min-h-0 max-w-md flex-col p-5 sm:p-6">
        <div className="mb-5 grid shrink-0 grid-cols-3 gap-2">
          <button
            type="button"
            className="mc-chip flex items-center justify-center gap-1.5 px-1 py-3"
            data-active={tab === "ai"}
            onClick={() => setTab("ai")}
          >
            <Swords size={14} /> {t.menu.computer}
          </button>
          <button
            type="button"
            className="mc-chip flex items-center justify-center gap-1.5 px-1 py-3"
            data-active={tab === "hotseat"}
            onClick={() => setTab("hotseat")}
          >
            <Users size={14} /> {t.menu.twoPlayers}
          </button>
          <button
            type="button"
            className="mc-chip flex items-center justify-center gap-1.5 px-1 py-3"
            data-active={tab === "demo"}
            onClick={() => setTab("demo")}
          >
            <Clapperboard size={14} /> {t.menu.showcase}
          </button>
        </div>

        <div className="mc-scroll -mr-2 min-h-0 flex-auto overflow-y-auto pr-2">
          {tab === "ai" ? (
            <div className="mc-fade space-y-5">
              <div>
                <p className="mc-display mb-2 text-[0.62rem] tracking-[0.3em] text-[#a89268]">{t.menu.opponent}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      className="mc-chip py-2.5"
                      data-active={difficulty === level}
                      onClick={() => setDifficulty(level)}
                    >
                      {t.menu.difficulty[level]}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs italic text-[#9c8b6c]">{t.menu.difficultyHint[difficulty]}</p>
              </div>

              <div>
                <p className="mc-display mb-2 text-[0.62rem] tracking-[0.3em] text-[#a89268]">{t.menu.yourBanner}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["w", "b"] as Faction[]).map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="mc-chip flex items-center justify-center gap-2 py-2.5"
                      data-active={playerColor === color}
                      onClick={() => setPlayerColor(color)}
                    >
                      <Crest faction={color} size={18} active={playerColor === color} />
                      {color === "w"
                        ? variant === "xiangqi"
                          ? t.menu.red
                          : t.menu.ivory
                        : variant === "xiangqi"
                          ? t.menu.black
                          : t.menu.obsidian}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : tab === "hotseat" ? (
            <p className="mc-fade text-sm italic leading-relaxed text-[#b7a88a]">
              {variant === "xiangqi" ? t.menu.hotseatXiangqi : t.menu.hotseatChess}
            </p>
          ) : (
            <div className="mc-fade space-y-5">
              <p className="text-sm italic leading-relaxed text-[#b7a88a]">{t.menu.showcaseHint}</p>

              <div>
                <p className="mc-display mb-2 text-[0.62rem] tracking-[0.3em] text-[#a89268]">{t.menu.whiteEngine}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      className="mc-chip py-2.5"
                      data-active={demoWhite === level}
                      onClick={() => setDemoWhite(level)}
                    >
                      {t.menu.difficulty[level]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mc-display mb-2 text-[0.62rem] tracking-[0.3em] text-[#a89268]">{t.menu.blackEngine}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      className="mc-chip py-2.5"
                      data-active={demoBlack === level}
                      onClick={() => setDemoBlack(level)}
                    >
                      {t.menu.difficulty[level]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mc-display mb-2 text-[0.62rem] tracking-[0.3em] text-[#a89268]">{t.menu.pace}</p>
                <div className="grid grid-cols-4 gap-2">
                  {DEMO_SPEEDS.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      className="mc-chip py-2.5"
                      data-active={demoSpeed === option.value}
                      onClick={() => setDemoSpeed(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="mc-chip flex w-full items-center justify-between px-3 py-2.5"
                data-active={demoLoop}
                onClick={() => setDemoLoop((loop) => !loop)}
                aria-pressed={demoLoop}
              >
                <span>{t.menu.autoRematch}</span>
                <span className="mc-display text-[0.62rem] tracking-[0.24em]">{demoLoop ? "ON" : "OFF"}</span>
              </button>
            </div>
          )}

          {tab === "demo" ? null : (
            <div className="mt-5">
              <p className="mc-display mb-2 text-[0.62rem] tracking-[0.3em] text-[#a89268]">{t.menu.clock}</p>
              <div className="grid grid-cols-4 gap-2">
                {clocks.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    className="mc-chip py-2.5"
                    data-active={clock === option.value}
                    onClick={() => setClock(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mc-panel-foot shrink-0">
          <button
            type="button"
            className="mc-btn mc-btn-primary mt-5 flex w-full items-center justify-center gap-2 py-3.5 text-sm"
            onClick={start}
          >
            {tab === "demo" ? (
              <>
                <Clapperboard size={16} /> {t.menu.beginShowcase}
              </>
            ) : (
              <>
                <Crown size={16} /> {t.menu.beginDuel}
              </>
            )}
          </button>

          <button
            type="button"
            className="mc-btn mt-2 flex w-full items-center justify-center gap-2"
            onClick={onOpenSettings}
          >
            <SettingsIcon size={15} /> {t.menu.settings}
          </button>
        </div>
      </div>
    </div>
  );
}
