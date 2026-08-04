import * as THREE from "three";

import type { Faction, PieceKind } from "../core/types";
import { xiangqiGlyph } from "../xiangqi/identity";

const cache = new Map<string, THREE.CanvasTexture>();

/**
 * Quiet lacquer pedestal — wood face + thin rim only.
 * Rank identity lives on the floating crest, not here.
 */
export function xiangqiDiscTexture(kind: PieceKind, faction: Faction): THREE.CanvasTexture {
  const key = `quiet_${faction}${kind}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

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

  // Tiny faded seal in the centre — readable up close, not competing with the figure.
  const glyph = xiangqiGlyph(kind, faction);
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = faction === "w" ? "#6a1010" : "#c9b070";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(size * 0.22)}px "Noto Serif SC","Songti SC","SimSun",serif`;
  ctx.fillText(glyph, cx, cy + 2);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

/** Lacquered wood with ink-wash mountain washes (山水) in the grain. */
export function xiangqiWoodTexture(dark = false): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const base = dark ? "#6a4a2a" : "#c4a06a";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 48; i++) {
    const y = (i / 48) * size + Math.sin(i * 1.7) * 6;
    ctx.strokeStyle = dark ? `rgba(30,18,8,${0.08 + (i % 5) * 0.02})` : `rgba(90,50,20,${0.06 + (i % 5) * 0.015})`;
    ctx.lineWidth = 2 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 16) {
      ctx.lineTo(x, y + Math.sin(x * 0.04 + i) * 3);
    }
    ctx.stroke();
  }

  // Soft ink mountain silhouettes across the board face.
  if (!dark) {
    for (const band of [
      { y: size * 0.18, ink: "rgba(55,70,50,0.14)" },
      { y: size * 0.78, ink: "rgba(40,55,70,0.12)" },
    ]) {
      ctx.fillStyle = band.ink;
      ctx.beginPath();
      ctx.moveTo(0, band.y + 40);
      for (let x = 0; x <= size; x += 8) {
        const h =
          Math.sin(x * 0.02) * 28 +
          Math.sin(x * 0.055 + 1.2) * 16 +
          Math.sin(x * 0.11) * 8;
        ctx.lineTo(x, band.y - h);
      }
      ctx.lineTo(size, band.y + 50);
      ctx.closePath();
      ctx.fill();
    }
  }

  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = dark ? "rgba(0,0,0,0.08)" : "rgba(80,40,10,0.05)";
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

/** Transparent ink-wash landscape overlay for the playing surface. */
export function xiangqiShanshuiOverlay(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  // Distant mist mountains — north (black) and south (red) shores.
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

  // Sparse pine/bamboo ticks near the shores.
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
  return tex;
}

/** Soft water with jade undertones for the river of Chu–Han. */
export function xiangqiRiverTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, "#2a5a58");
  g.addColorStop(0.35, "#3d7a78");
  g.addColorStop(0.5, "#5a9bb0");
  g.addColorStop(0.65, "#3d7a78");
  g.addColorStop(1, "#1e4850");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 22; i++) {
    ctx.strokeStyle = `rgba(220,245,240,${0.06 + (i % 4) * 0.03})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const y = (i / 22) * size;
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 6) {
      ctx.lineTo(x, y + Math.sin(x * 0.09 + i * 0.7) * 6);
    }
    ctx.stroke();
  }

  // Soft foam near banks.
  ctx.fillStyle = "rgba(200,230,220,0.12)";
  ctx.fillRect(0, 0, size, 18);
  ctx.fillRect(0, size - 18, size, 18);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}
