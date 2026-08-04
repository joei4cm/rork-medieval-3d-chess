import type { Locale } from "./types";

export interface Dictionary {
  brand: {
    chess: string;
    chessTag: string;
    xiangqi: string;
    xiangqiTag: string;
    pickGame: string;
  };
  menu: {
    computer: string;
    twoPlayers: string;
    showcase: string;
    opponent: string;
    yourBanner: string;
    ivory: string;
    obsidian: string;
    red: string;
    black: string;
    clock: string;
    none: string;
    minutes: (n: number) => string;
    beginDuel: string;
    beginShowcase: string;
    openField: string;
    settings: string;
    difficulty: Record<"easy" | "medium" | "hard", string>;
    difficultyHint: Record<"easy" | "medium" | "hard", string>;
    hotseatChess: string;
    hotseatXiangqi: string;
    attractChess: string;
    attractXiangqi: string;
    showcaseHint: string;
    whiteEngine: string;
    blackEngine: string;
    pace: string;
    autoRematch: string;
    back: string;
  };
  hud: {
    yourMove: string;
    theirMove: string;
    redToMove: string;
    blackToMove: string;
    ivoryToMove: string;
    obsidianToMove: string;
    thinking: string;
    check: string;
    checkXiangqi: string;
    undo: string;
    resign: string;
    newGame: string;
    sound: string;
    mute: string;
    fullscreen: string;
    flip: string;
    tactical: string;
    camera: string;
    settings: string;
    chronicle: string;
    spoils: string;
    material: string;
    pause: string;
    resume: string;
    cinema: string;
    round: (n: number) => string;
  };
  end: {
    victory: string;
    defeat: string;
    draw: string;
    ivoryTriumphs: string;
    obsidianTriumphs: string;
    redTriumphs: string;
    blackTriumphs: string;
    rematch: string;
    hall: string;
    copyRecord: string;
    copied: string;
    reasons: Record<
      | "checkmate"
      | "stalemate"
      | "resignation"
      | "timeout"
      | "threefold"
      | "insufficient"
      | "fiftymove"
      | "draw"
      | "perpetual",
      string
    >;
  };
  settings: {
    title: string;
    graphics: string;
    battleground: string;
    cinematics: string;
    rotateBoard: string;
    rankBadges: string;
    safeMode: string;
    brightness: string;
    language: string;
    english: string;
    chinese: string;
  };
  pieces: {
    chess: Record<"p" | "n" | "b" | "r" | "q" | "k", string>;
    xiangqi: Record<"p" | "n" | "b" | "r" | "c" | "a" | "k", string>;
  };
  loading: string;
  unsupported: string;
  graphicsStepDown: (preset: string) => string;
}

const en: Dictionary = {
  brand: {
    chess: "KING'S GAMBIT",
    chessTag: "Chess in the great hall of Aldermoor",
    xiangqi: "楚河汉界",
    xiangqiTag: "Chinese chess across the river of war",
    pickGame: "Choose your battlefield",
  },
  menu: {
    computer: "Computer",
    twoPlayers: "2 Players",
    showcase: "Showcase",
    opponent: "Opponent",
    yourBanner: "Your banner",
    ivory: "Ivory",
    obsidian: "Obsidian",
    red: "Red",
    black: "Black",
    clock: "Clock",
    none: "None",
    minutes: (n) => `${n} min`,
    beginDuel: "Begin the duel",
    beginShowcase: "Begin showcase",
    openField: "Open the field",
    settings: "Settings",
    difficulty: { easy: "Easy", medium: "Medium", hard: "Hard" },
    difficultyHint: {
      easy: "Squire — plays fast and loose",
      medium: "Knight — thinks three moves deep",
      hard: "Warlord — full search, no mercy",
    },
    hotseatChess: "Two commanders, one board. The camera swings to the player on move — you can disable that in settings.",
    hotseatXiangqi: "Two generals across the river. The camera follows the side to move — toggle that in settings.",
    attractChess: "A showcase duel is under way — move to take the hall",
    attractXiangqi: "A river duel is under way — move to claim the board",
    showcaseHint: "Two engines duel on their own — pace, camera and auto-rematch included.",
    whiteEngine: "Ivory / Red strength",
    blackEngine: "Obsidian / Black strength",
    pace: "Pace",
    autoRematch: "Auto-rematch",
    back: "Back",
  },
  hud: {
    yourMove: "Your move",
    theirMove: "Opponent",
    redToMove: "Red to move",
    blackToMove: "Black to move",
    ivoryToMove: "Ivory to move",
    obsidianToMove: "Obsidian to move",
    thinking: "Thinking…",
    check: "Check!",
    checkXiangqi: "General in check!",
    undo: "Take back",
    resign: "Resign",
    newGame: "New duel",
    sound: "Sound",
    mute: "Mute",
    fullscreen: "Fullscreen",
    flip: "Flip board",
    tactical: "Tactical view",
    camera: "Camera",
    settings: "Settings",
    chronicle: "Chronicle",
    spoils: "Spoils",
    material: "Material",
    pause: "Pause",
    resume: "Resume",
    cinema: "Cinema mode",
    round: (n) => `Round ${n}`,
  },
  end: {
    victory: "VICTORY",
    defeat: "DEFEAT",
    draw: "A DRAW",
    ivoryTriumphs: "IVORY TRIUMPHS",
    obsidianTriumphs: "OBSIDIAN TRIUMPHS",
    redTriumphs: "RED TRIUMPHS",
    blackTriumphs: "BLACK TRIUMPHS",
    rematch: "Rematch",
    hall: "Great hall",
    copyRecord: "Copy record",
    copied: "Copied",
    reasons: {
      checkmate: "Checkmate",
      stalemate: "Stalemate — no legal move",
      resignation: "The banner was lowered",
      timeout: "The hourglass ran dry",
      threefold: "Threefold repetition",
      insufficient: "Insufficient material",
      fiftymove: "Fifty-move rule",
      draw: "Drawn position",
      perpetual: "Perpetual check",
    },
  },
  settings: {
    title: "Settings",
    graphics: "Graphics",
    battleground: "Battleground",
    cinematics: "Capture cinematics",
    rotateBoard: "Rotate board on turn",
    rankBadges: "Rank crests",
    safeMode: "Safe rendering",
    brightness: "Brightness",
    language: "Language",
    english: "English",
    chinese: "中文",
  },
  pieces: {
    chess: { p: "Pawn", n: "Knight", b: "Bishop", r: "Rook", q: "Queen", k: "King" },
    xiangqi: {
      p: "Soldier",
      n: "Horse",
      b: "Chancellor / Elephant",
      r: "Chariot",
      c: "Cannon",
      a: "Advisor",
      k: "General",
    },
  },
  loading: "Forging the hall…",
  unsupported: "This browser cannot open a WebGL canvas. Try a recent Chrome, Edge, Firefox or Safari.",
  graphicsStepDown: (preset) => `Graphics stepped down to ${preset} to hold a smooth frame rate.`,
};

const zh: Dictionary = {
  brand: {
    chess: "王翼弃兵",
    chessTag: "阿尔德莫尔大厅中的西洋棋",
    xiangqi: "楚河汉界",
    xiangqiTag: "隔河对峙的中国象棋",
    pickGame: "选择战场",
  },
  menu: {
    computer: "人机对战",
    twoPlayers: "双人对战",
    showcase: "观战演示",
    opponent: "对手强度",
    yourBanner: "你的阵营",
    ivory: "象牙王国",
    obsidian: "黑曜帝国",
    red: "红方",
    black: "黑方",
    clock: "计时",
    none: "不计时",
    minutes: (n) => `${n} 分钟`,
    beginDuel: "开始对局",
    beginShowcase: "开始演示",
    openField: "进入棋盘",
    settings: "设置",
    difficulty: { easy: "简单", medium: "中等", hard: "困难" },
    difficultyHint: {
      easy: "侍从 — 走子迅捷，偶尔失手",
      medium: "骑士 — 深算约三步",
      hard: "战神 — 全力搜索，毫不留情",
    },
    hotseatChess: "两位统帅，同一棋盘。镜头会转向行棋方 — 可在设置中关闭。",
    hotseatXiangqi: "两位将军隔河对峙。镜头跟随行棋方 — 可在设置中关闭。",
    attractChess: "演示对局进行中 — 移动即可接管大厅",
    attractXiangqi: "楚河对决进行中 — 移动即可接管棋盘",
    showcaseHint: "双引擎自行对弈 — 可调节奏、镜头与自动再战。",
    whiteEngine: "红方 / 象牙强度",
    blackEngine: "黑方 / 黑曜强度",
    pace: "节奏",
    autoRematch: "自动再战",
    back: "返回",
  },
  hud: {
    yourMove: "轮到你了",
    theirMove: "对方思考",
    redToMove: "红方行棋",
    blackToMove: "黑方行棋",
    ivoryToMove: "象牙行棋",
    obsidianToMove: "黑曜行棋",
    thinking: "思考中…",
    check: "将军！",
    checkXiangqi: "将军！",
    undo: "悔棋",
    resign: "认输",
    newGame: "新对局",
    sound: "音效",
    mute: "静音",
    fullscreen: "全屏",
    flip: "翻转棋盘",
    tactical: "俯视战术",
    camera: "镜头",
    settings: "设置",
    chronicle: "棋谱",
    spoils: "战利品",
    material: "子力",
    pause: "暂停",
    resume: "继续",
    cinema: "电影模式",
    round: (n) => `第 ${n} 局`,
  },
  end: {
    victory: "胜利",
    defeat: "战败",
    draw: "和棋",
    ivoryTriumphs: "象牙获胜",
    obsidianTriumphs: "黑曜获胜",
    redTriumphs: "红方获胜",
    blackTriumphs: "黑方获胜",
    rematch: "再战一局",
    hall: "返回大厅",
    copyRecord: "复制棋谱",
    copied: "已复制",
    reasons: {
      checkmate: "将死",
      stalemate: "困毙 — 无子可走",
      resignation: "认输",
      timeout: "超时",
      threefold: "三次重复局面",
      insufficient: "子力不足",
      fiftymove: "六十回合规则",
      draw: "和棋",
      perpetual: "长将作和",
    },
  },
  settings: {
    title: "设置",
    graphics: "画质",
    battleground: "战场",
    cinematics: "吃子电影镜头",
    rotateBoard: "换手转盘",
    rankBadges: "官阶徽记",
    safeMode: "安全渲染",
    brightness: "亮度",
    language: "语言",
    english: "English",
    chinese: "中文",
  },
  pieces: {
    chess: { p: "兵", n: "马", b: "象", r: "车", q: "后", k: "王" },
    xiangqi: {
      p: "兵/卒",
      n: "马",
      b: "丞相/大象",
      r: "车",
      c: "大炮",
      a: "仕/士",
      k: "帅/将",
    },
  },
  loading: "正在布置战场…",
  unsupported: "当前浏览器无法创建 WebGL 画布。请使用较新的 Chrome、Edge、Firefox 或 Safari。",
  graphicsStepDown: (preset) => `已将画质降至 ${preset}，以保持流畅帧率。`,
};

export const DICTIONARIES: Record<Locale, Dictionary> = { en, zh };

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language.toLowerCase();
  return lang.startsWith("zh") ? "zh" : "en";
}
