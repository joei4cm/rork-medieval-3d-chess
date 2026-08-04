import * as THREE from "three";

import type { Faction, PieceKind } from "../core/types";
import { xiangqiGlyph } from "../xiangqi/identity";

const cache = new Map<string, THREE.CanvasTexture>();

/** Lacquered wooden Xiangqi disc with the faction character. */
export function xiangqiDiscTexture(kind: PieceKind, faction: Faction): THREE.CanvasTexture {
  const key = `${faction}${kind}`;
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

  // Wood face
  const wood = ctx.createRadialGradient(cx - 20, cy - 24, 10, cx, cy, r);
  if (faction === "w") {
    wood.addColorStop(0, "#f2d7a8");
    wood.addColorStop(0.55, "#e0b56a");
    wood.addColorStop(1, "#b07838");
  } else {
    wood.addColorStop(0, "#3a322c");
    wood.addColorStop(0.55, "#241e1a");
    wood.addColorStop(1, "#100e0c");
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = wood;
  ctx.fill();

  // Rim
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.strokeStyle = faction === "w" ? "#8b1e1e" : "#c9a45a";
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r - 14, 0, Math.PI * 2);
  ctx.strokeStyle = faction === "w" ? "rgba(139,30,30,0.55)" : "rgba(201,164,90,0.45)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Character
  const glyph = xiangqiGlyph(kind, faction);
  ctx.fillStyle = faction === "w" ? "#8b1515" : "#e8d5a0";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 148px 'Noto Serif SC','Songti SC','SimSun',serif";
  ctx.fillText(glyph, cx, cy + 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

/** Wood grain for the Xiangqi board slab. */
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

  // Pore noise
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

/** Soft water normal-ish pattern for the river. */
export function xiangqiRiverTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, "#3d6f8c");
  g.addColorStop(0.5, "#5a9bb8");
  g.addColorStop(1, "#2a5570");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = `rgba(220,240,255,${0.08 + (i % 4) * 0.03})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const y = (i / 18) * size;
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 8) {
      ctx.lineTo(x, y + Math.sin(x * 0.08 + i) * 5);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}
