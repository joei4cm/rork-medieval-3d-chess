import * as THREE from "three";

import type { Faction, PieceKind } from "../core/types";
import { xiangqiGlyph } from "../xiangqi/identity";

const cache = new Map<string, THREE.Texture>();

function createCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return { canvas, ctx };
}

function toTexture(canvas: HTMLCanvasElement, repeat = 1, srgb = true): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 8;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** 1×1 stand-in when DOM canvas is unavailable (unit tests / SSR). */
function solidTexture(hex: number, srgb = true): THREE.DataTexture {
  const data = new Uint8Array([(hex >> 16) & 255, (hex >> 8) & 255, hex & 255, 255]);
  const texture = new THREE.DataTexture(data, 1, 1);
  texture.needsUpdate = true;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function grain(ctx: CanvasRenderingContext2D, size: number, amount: number): void {
  const image = ctx.getImageData(0, 0, size, size);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * amount;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(image, 0, 0);
}

/**
 * Quiet lacquer pedestal — wood face + thin rim only.
 * Rank identity lives on the floating crest, not here.
 */
export function xiangqiDiscTexture(kind: PieceKind, faction: Faction): THREE.CanvasTexture {
  const key = `quiet_${faction}${kind}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 256;
  const created = createCanvas(size);
  if (!created) return solidTexture(faction === "w" ? 0xc99558 : 0x1a1612) as unknown as THREE.CanvasTexture;
  const { canvas, ctx } = created;

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46;

  const wood = ctx.createRadialGradient(cx - 16, cy - 18, 8, cx, cy, r);
  if (faction === "w") {
    wood.addColorStop(0, "#e8c898");
    wood.addColorStop(0.6, "#c99558");
    wood.addColorStop(1, "#8a5a30");
  } else {
    wood.addColorStop(0, "#2e2824");
    wood.addColorStop(0.6, "#1a1612");
    wood.addColorStop(1, "#0c0a08");
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = wood;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
  ctx.strokeStyle = faction === "w" ? "rgba(139,30,30,0.7)" : "rgba(201,164,90,0.55)";
  ctx.lineWidth = 5;
  ctx.stroke();

  const glyph = xiangqiGlyph(kind, faction);
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = faction === "w" ? "#6a1010" : "#c9b070";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(size * 0.22)}px "Noto Serif SC","Songti SC","SimSun",serif`;
  ctx.fillText(glyph, cx, cy + 2);
  ctx.globalAlpha = 1;

  const tex = toTexture(canvas, 1, true);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, tex);
  return tex;
}

/** Lacquered wood with deep grain, blotches, and anisotropy — western marble parity. */
export function xiangqiWoodTexture(dark = false): THREE.CanvasTexture {
  const key = `wood_${dark ? "d" : "l"}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 512;
  const created = createCanvas(size);
  if (!created) return solidTexture(dark ? 0x5a3a1c : 0xd4b078) as unknown as THREE.CanvasTexture;
  const { canvas, ctx } = created;

  ctx.fillStyle = dark ? "#5a3a1c" : "#d4b078";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 22; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 50 + Math.random() * 140;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = dark ? 70 + Math.random() * 30 : 190 + Math.random() * 40;
    gradient.addColorStop(0, `rgba(${tone},${tone - 30},${tone - 60},0.28)`);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 56; i++) {
    const y = (i / 56) * size + Math.sin(i * 1.7) * 6;
    ctx.strokeStyle = dark
      ? `rgba(20,10,4,${0.1 + (i % 5) * 0.03})`
      : `rgba(90,50,18,${0.07 + (i % 5) * 0.02})`;
    ctx.lineWidth = 1.5 + (i % 4);
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 12) {
      ctx.lineTo(x, y + Math.sin(x * 0.035 + i) * 4 + Math.sin(x * 0.01 + i * 0.3) * 2);
    }
    ctx.stroke();
  }

  if (!dark) {
    for (const band of [
      { y: size * 0.18, ink: "rgba(55,70,50,0.1)" },
      { y: size * 0.78, ink: "rgba(40,55,70,0.09)" },
    ]) {
      ctx.fillStyle = band.ink;
      ctx.beginPath();
      ctx.moveTo(0, band.y + 40);
      for (let x = 0; x <= size; x += 8) {
        const h =
          Math.sin(x * 0.02) * 28 + Math.sin(x * 0.055 + 1.2) * 16 + Math.sin(x * 0.11) * 8;
        ctx.lineTo(x, band.y - h);
      }
      ctx.lineTo(size, band.y + 50);
      ctx.closePath();
      ctx.fill();
    }
  }

  grain(ctx, size, dark ? 18 : 14);
  const tex = toTexture(canvas, 2, true);
  cache.set(key, tex);
  return tex;
}

/** Roughness companion for lacquered wood — pores in valleys, polish on peaks. */
export function xiangqiWoodRoughnessMap(dark = false): THREE.CanvasTexture {
  const key = `wood_rough_${dark ? "d" : "l"}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 512;
  const created = createCanvas(size);
  if (!created) return solidTexture(dark ? 0x9a9a9a : 0x787878, false) as unknown as THREE.CanvasTexture;
  const { canvas, ctx } = created;
  ctx.fillStyle = dark ? "#9a9a9a" : "#787878";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 48; i++) {
    const y = (i / 48) * size + Math.sin(i * 1.7) * 6;
    ctx.strokeStyle = `rgba(255,255,255,${0.04 + (i % 4) * 0.02})`;
    ctx.lineWidth = 2 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 12) {
      ctx.lineTo(x, y + Math.sin(x * 0.035 + i) * 4);
    }
    ctx.stroke();
  }
  grain(ctx, size, 22);
  const tex = toTexture(canvas, 2, false);
  cache.set(key, tex);
  return tex;
}

/** Fired terracotta albedo — pit marks and kiln blotches. */
export function xiangqiClayAlbedo(faction: Faction): THREE.CanvasTexture {
  const key = `clay_${faction}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 256;
  const created = createCanvas(size);
  if (!created) return solidTexture(faction === "w" ? 0xc4a890 : 0x7a7268) as unknown as THREE.CanvasTexture;
  const { canvas, ctx } = created;
  const base = faction === "w" ? "#c4a890" : "#7a7268";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 30; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 20 + Math.random() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, faction === "w" ? "rgba(160,120,90,0.35)" : "rgba(40,36,32,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = faction === "w" ? "rgba(90,60,40,0.12)" : "rgba(20,18,16,0.18)";
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  grain(ctx, size, 16);
  const tex = toTexture(canvas, 1, true);
  cache.set(key, tex);
  return tex;
}

/** Clay roughness — mostly matte with a few smoother fired patches. */
export function xiangqiClayRoughness(dark = false): THREE.CanvasTexture {
  const key = `clay_rough_${dark ? "d" : "l"}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 256;
  const created = createCanvas(size);
  if (!created) return solidTexture(dark ? 0xc8c8c8 : 0xb0b0b0, false) as unknown as THREE.CanvasTexture;
  const { canvas, ctx } = created;
  ctx.fillStyle = dark ? "#c8c8c8" : "#b0b0b0";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 15 + Math.random() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(60,60,60,0.45)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  grain(ctx, size, 20);
  const tex = toTexture(canvas, 1, false);
  cache.set(key, tex);
  return tex;
}

/** Glossy lacquer albedo for discs / accents. */
export function xiangqiLacquerAlbedo(faction: Faction): THREE.CanvasTexture {
  const key = `lacquer_${faction}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 256;
  const created = createCanvas(size);
  if (!created) return solidTexture(faction === "w" ? 0x8a1414 : 0x1a1612) as unknown as THREE.CanvasTexture;
  const { canvas, ctx } = created;
  if (faction === "w") {
    const g = ctx.createRadialGradient(size * 0.35, size * 0.3, 10, size * 0.5, size * 0.5, size * 0.6);
    g.addColorStop(0, "#d03030");
    g.addColorStop(0.55, "#8a1414");
    g.addColorStop(1, "#4a0808");
    ctx.fillStyle = g;
  } else {
    const g = ctx.createRadialGradient(size * 0.35, size * 0.3, 10, size * 0.5, size * 0.5, size * 0.6);
    g.addColorStop(0, "#3a342e");
    g.addColorStop(0.55, "#1a1612");
    g.addColorStop(1, "#080604");
    ctx.fillStyle = g;
  }
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = faction === "w" ? "rgba(255,180,160,0.12)" : "rgba(200,180,140,0.1)";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(20, 40);
  ctx.quadraticCurveTo(size * 0.5, size * 0.35, size - 30, size * 0.55);
  ctx.stroke();

  grain(ctx, size, 10);
  const tex = toTexture(canvas, 1, true);
  cache.set(key, tex);
  return tex;
}

/**
 * Engraved grid overlay (transparent) — vermilion lines on lacquer,
 * matching western boardBorderTexture's engraved-line approach.
 */
export function xiangqiEngravedGridTexture(): THREE.CanvasTexture {
  const key = "engraved_grid";
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return solidTexture(0x000000) as unknown as THREE.CanvasTexture;

  const cols = 8;
  const rows = 9;
  const W = 1024;
  const H = Math.round((W * rows) / cols);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);

  const pad = 2;
  const cellW = (W - pad * 2) / cols;
  const cellH = (H - pad * 2) / rows;

  const strokeLine = (x0: number, y0: number, x1: number, y1: number, width: number, alpha: number) => {
    ctx.strokeStyle = `rgba(70,16,10,${alpha})`;
    ctx.lineWidth = width;
    ctx.lineCap = "square";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = `rgba(180,90,50,${alpha * 0.25})`;
    ctx.lineWidth = Math.max(1, width * 0.35);
    ctx.beginPath();
    ctx.moveTo(x0 + 0.8, y0 + 0.8);
    ctx.lineTo(x1 + 0.8, y1 + 0.8);
    ctx.stroke();
  };

  for (let r = 0; r <= rows; r++) {
    const y = pad + r * cellH;
    strokeLine(pad, y, W - pad, y, r === 0 || r === rows ? 3.2 : 2.2, 0.92);
  }

  const riverTop = pad + 4 * cellH;
  const riverBot = pad + 5 * cellH;

  for (let f = 0; f <= cols; f++) {
    const x = pad + f * cellW;
    if (f === 0 || f === cols) {
      strokeLine(x, pad, x, H - pad, 3.2, 0.92);
    } else {
      strokeLine(x, pad, x, riverTop, 2.2, 0.9);
      strokeLine(x, riverBot, x, H - pad, 2.2, 0.9);
    }
  }

  const x3 = pad + 3 * cellW;
  const x5 = pad + 5 * cellW;
  strokeLine(x3, pad, x5, pad + 2 * cellH, 2.4, 0.88);
  strokeLine(x5, pad, x3, pad + 2 * cellH, 2.4, 0.88);
  strokeLine(x3, H - pad, x5, H - pad - 2 * cellH, 2.4, 0.88);
  strokeLine(x5, H - pad, x3, H - pad - 2 * cellH, 2.4, 0.88);

  const marks: [number, number][] = [
    [1, 2],
    [7, 2],
    [0, 3],
    [2, 3],
    [4, 3],
    [6, 3],
    [8, 3],
    [1, 7],
    [7, 7],
    [0, 6],
    [2, 6],
    [4, 6],
    [6, 6],
    [8, 6],
  ];
  const mark = (fx: number, fy: number) => {
    const x = pad + fx * cellW;
    const y = pad + fy * cellH;
    const s = cellW * 0.08;
    strokeLine(x - s, y - s * 0.55, x - s * 0.3, y - s * 0.55, 1.6, 0.85);
    strokeLine(x - s, y - s * 0.55, x - s, y - s * 0.15, 1.6, 0.85);
    strokeLine(x + s, y - s * 0.55, x + s * 0.3, y - s * 0.55, 1.6, 0.85);
    strokeLine(x + s, y - s * 0.55, x + s, y - s * 0.15, 1.6, 0.85);
    strokeLine(x - s, y + s * 0.55, x - s * 0.3, y + s * 0.55, 1.6, 0.85);
    strokeLine(x - s, y + s * 0.55, x - s, y + s * 0.15, 1.6, 0.85);
    strokeLine(x + s, y + s * 0.55, x + s * 0.3, y + s * 0.55, 1.6, 0.85);
    strokeLine(x + s, y + s * 0.55, x + s, y + s * 0.15, 1.6, 0.85);
  };
  for (const [f, r] of marks) mark(f, r);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, tex);
  return tex;
}

/** Bronze-trimmed outer border with engraved file/rank hints. */
export function xiangqiBoardBorderTexture(): THREE.CanvasTexture {
  const key = "xq_border";
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 1024;
  const created = createCanvas(size);
  if (!created) return solidTexture(0x4a2c1c) as unknown as THREE.CanvasTexture;
  const { canvas, ctx } = created;

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#6a4030");
  gradient.addColorStop(0.5, "#4a2c1c");
  gradient.addColorStop(1, "#3a2010");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const border = size * 0.078;
  ctx.strokeStyle = "#b08a40";
  ctx.lineWidth = 7;
  ctx.strokeRect(border * 0.5, border * 0.5, size - border, size - border);
  ctx.strokeStyle = "rgba(220,180,100,0.5)";
  ctx.lineWidth = 2;
  ctx.strokeRect(border * 0.5 + 6, border * 0.5 + 6, size - border - 12, size - border - 12);

  ctx.fillStyle = "#1a1008";
  ctx.fillRect(border, border, size - border * 2, size - border * 2);

  ctx.font = `600 ${Math.floor(border * 0.45)}px "Noto Serif SC","Songti SC",serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const files = ["九", "八", "七", "六", "五", "四", "三", "二", "一"];
  const ranks = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  const inner = size - border * 2;
  for (let i = 0; i < 9; i++) {
    const x = border + (inner / 8) * i;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillText(files[i], x + 1, border * 0.52 + 1);
    ctx.fillStyle = "rgba(210,170,90,0.75)";
    ctx.fillText(files[i], x, border * 0.52);
  }
  for (let i = 0; i < 10; i++) {
    const y = border + (inner / 9) * i;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillText(ranks[i], border * 0.5 + 1, y + 1);
    ctx.fillStyle = "rgba(210,170,90,0.7)";
    ctx.fillText(ranks[i], border * 0.5, y);
  }

  grain(ctx, size, 12);
  const tex = toTexture(canvas, 1, true);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, tex);
  return tex;
}

/** Transparent ink-wash landscape overlay for the playing surface. */
export function xiangqiShanshuiOverlay(): THREE.CanvasTexture {
  if (typeof document === "undefined") return solidTexture(0x000000) as unknown as THREE.CanvasTexture;
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  const paintRange = (cy: number, ink: string, mist: string) => {
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(0, cy + 80);
    for (let x = 0; x <= size; x += 6) {
      const h =
        36 +
        Math.sin(x * 0.012 + cy) * 42 +
        Math.sin(x * 0.035 + 2) * 22 +
        Math.sin(x * 0.08) * 10;
      ctx.lineTo(x, cy - h);
    }
    ctx.lineTo(size, cy + 90);
    ctx.closePath();
    ctx.fill();

    const g = ctx.createLinearGradient(0, cy - 100, 0, cy + 40);
    g.addColorStop(0, mist);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, cy - 120, size, 160);
  };

  paintRange(size * 0.2, "rgba(48,62,52,0.22)", "rgba(180,200,190,0.18)");
  paintRange(size * 0.8, "rgba(70,48,40,0.18)", "rgba(210,190,170,0.15)");

  ctx.strokeStyle = "rgba(30,50,35,0.25)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 24; i++) {
    const x = 40 + (i / 24) * (size - 80) + Math.sin(i) * 12;
    const y = i % 2 === 0 ? size * 0.22 : size * 0.76;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (i % 3) - 1, y - 18 - (i % 5) * 3);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Soft water with jade undertones and animated-looking current bands. */
export function xiangqiRiverTexture(): THREE.CanvasTexture {
  const size = 256;
  const created = createCanvas(size);
  if (!created) return solidTexture(0x2a6a68) as unknown as THREE.CanvasTexture;
  const { canvas, ctx } = created;

  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, "#163e48");
  g.addColorStop(0.25, "#2a6a68");
  g.addColorStop(0.5, "#4a9aaa");
  g.addColorStop(0.75, "#2a6a68");
  g.addColorStop(1, "#123840");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 28; i++) {
    ctx.strokeStyle = `rgba(210,245,240,${0.05 + (i % 5) * 0.035})`;
    ctx.lineWidth = 1.5 + (i % 3);
    ctx.beginPath();
    const y = (i / 28) * size;
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 4) {
      ctx.lineTo(x, y + Math.sin(x * 0.11 + i * 0.85) * 7 + Math.sin(x * 0.03 + i) * 3);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,240,${0.04 + (i % 4) * 0.02})`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      8 + Math.random() * 14,
      2 + Math.random() * 3,
      Math.random(),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  const foam = ctx.createLinearGradient(0, 0, 0, 28);
  foam.addColorStop(0, "rgba(220,245,240,0.35)");
  foam.addColorStop(1, "rgba(220,245,240,0)");
  ctx.fillStyle = foam;
  ctx.fillRect(0, 0, size, 28);
  const foam2 = ctx.createLinearGradient(0, size, 0, size - 28);
  foam2.addColorStop(0, "rgba(220,245,240,0.35)");
  foam2.addColorStop(1, "rgba(220,245,240,0)");
  ctx.fillStyle = foam2;
  ctx.fillRect(0, size - 28, size, 28);

  const tex = toTexture(canvas, 1, true);
  tex.repeat.set(3, 1);
  return tex;
}
