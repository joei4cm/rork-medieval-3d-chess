import * as THREE from "three";

import type { Faction, PieceKind } from "../core/types";
import { xiangqiGlyph } from "../xiangqi/identity";
import {
  armorMaterial,
  bronzeMaterial,
  clayMaterial,
  glyphMaterial,
  lacquerMaterial,
  leatherMaterial,
  woodMaterial,
} from "./xiangqiMaterials";
import { xiangqiWoodTexture } from "./xiangqiTextures";

/**
 * Original Han–Qin battlefield miniatures for Xiangqi.
 * NOT western Meshy knights — lamellar 札甲, 鹖冠 / 进贤冠, ge/ji/spear,
 * vermilion vs iron lacquer. Each rank has a distinct Chinese silhouette.
 * Materials come from xiangqiMaterials (western-parity clearcoat / env response).
 */

type Rank =
  | "marshal"
  | "guard"
  | "minister"
  | "cavalry"
  | "infantry"
  | "gunner"
  | "driver"
  | "mahout";

/** Flat / one-off props that do not need clay maps. */
function std(
  color: number,
  roughness: number,
  metalness: number,
  env = 0.7,
  emissive = 0x000000,
  emissiveIntensity = 0,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    envMapIntensity: env,
    emissive,
    emissiveIntensity,
  });
}

/** Faction livery — vermilion Han vs iron Chu, not ivory/obsidian western. */
function palette(faction: Faction) {
  if (faction === "w") {
    return {
      skin: 0xb89878,
      hair: 0x1a1210,
      cloth: 0x5a0c10,
      armor: 0x8b1515,
      armorDark: 0x5a0c0c,
      scale: 0x6e1010,
      trim: 0xc9a050,
      wood: 0x7a5530,
      boot: 0x2a1a12,
      lacquerRim: 0xa01818,
      ink: 0x6a1010,
    };
  }
  return {
    skin: 0x8a8078,
    hair: 0x0c0a08,
    cloth: 0x1a1814,
    armor: 0x2a2824,
    armorDark: 0x141210,
    scale: 0x3a3834,
    trim: 0xc9a45a,
    wood: 0x3a2a1c,
    boot: 0x12100e,
    lacquerRim: 0xc9a45a,
    ink: 0xe8d5a0,
  };
}

function addBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}

function addCyl(
  parent: THREE.Object3D,
  rTop: number,
  rBot: number,
  h: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  segments = 14,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segments), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}

function enableShadows(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
}

/** Lacquer identity disc — Chinese seal foot, not western glow ring. */
export function buildXiangqiDisc(faction: Faction, kind: PieceKind, radius = 0.3): THREE.Group {
  const p = palette(faction);
  const g = new THREE.Group();
  g.name = "seal_disc";

  addCyl(
    g,
    radius,
    radius * 1.04,
    0.08,
    woodMaterial(p.wood, xiangqiWoodTexture(faction === "b")),
    0,
    0.04,
    0,
    0,
    0,
    0,
    32,
  );
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.88, 0.02, 8, 32),
    lacquerMaterial(faction, p.lacquerRim, {
      emissive: faction === "w" ? 0x3a0808 : 0x2a1a06,
      emissiveIntensity: 0.18,
    }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.085;
  g.add(rim);

  if (typeof document !== "undefined") {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = faction === "w" ? "#7a1212" : "#e8d5a0";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${Math.round(size * 0.5)}px "Noto Serif SC","Songti SC","SimSun",serif`;
      ctx.fillText(xiangqiGlyph(kind, faction), size / 2, size / 2 + 4);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      const plane = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.55, 24), glyphMaterial(tex));
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = 0.09;
      g.add(plane);
    }
  }
  return g;
}

/** Overlapping lamellar 札甲 — fine scales, not chunky Lego bricks. */
function addLamellar(
  g: THREE.Group,
  armor: THREE.Material,
  scale: THREE.Material,
  s: number,
  y0: number,
  rows: number,
): void {
  for (let row = 0; row < rows; row++) {
    const y = y0 + row * 0.032 * s;
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (row % 2) * (Math.PI / n);
      addBox(
        g,
        0.038 * s,
        0.028 * s,
        0.012 * s,
        i % 2 === 0 ? armor : scale,
        Math.sin(a) * 0.115 * s,
        y,
        Math.cos(a) * 0.115 * s,
        0.15,
        a,
        0,
      );
    }
  }
}

interface SoldierOpts {
  faction: Faction;
  rank: Rank;
  height?: number;
  weapon?: "jian" | "ge" | "ji" | "mao" | "hu" | "staff" | "none";
  shield?: boolean;
}

/**
 * Standing Chinese ancient soldier — invented miniature language:
 * topknot + Chinese headgear, lamellar, mirror plate, silk sash.
 */
function buildHanSoldier(opts: SoldierOpts): THREE.Group {
  const { faction, rank, height = 0.78, weapon = "mao", shield = false } = opts;
  const p = palette(faction);
  const g = new THREE.Group();
  g.name = `han_${rank}`;

  const skin = clayMaterial(faction, p.skin);
  const hair = leatherMaterial(p.hair);
  const cloth = leatherMaterial(p.cloth);
  const armor = lacquerMaterial(faction, p.armor, {
    emissive: faction === "w" ? 0x2a0808 : 0x080808,
    emissiveIntensity: 0.12,
  });
  const armorDark = lacquerMaterial(faction, p.armorDark);
  const scaleMat = armorMaterial(faction, p.scale);
  const trim = bronzeMaterial(p.trim);
  const boot = leatherMaterial(p.boot);
  const wood = woodMaterial(p.wood, xiangqiWoodTexture(faction === "b"));

  const s = height / 0.78;

  // Boots + wrapped calves (行縢)
  for (const side of [-1, 1]) {
    addBox(g, 0.085 * s, 0.045 * s, 0.13 * s, boot, side * 0.065 * s, 0.035 * s, 0.015 * s);
    addCyl(g, 0.042 * s, 0.048 * s, 0.14 * s, cloth, side * 0.065 * s, 0.13 * s, 0, 0, 0, 0, 10);
  }

  // Legs
  for (const side of [-1, 1]) {
    addCyl(g, 0.048 * s, 0.052 * s, 0.2 * s, skin, side * 0.065 * s, 0.28 * s, 0, 0, 0, 0, 10);
  }

  // Armored skirt (甲裙) — hanging lamellar panels
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    addBox(
      g,
      0.06 * s,
      0.13 * s,
      0.022 * s,
      i % 2 ? armor : armorDark,
      Math.sin(a) * 0.105 * s,
      0.4 * s,
      Math.cos(a) * 0.105 * s,
      0,
      a,
      0.08,
    );
  }

  // Torso + 护心镜
  addCyl(g, 0.1 * s, 0.118 * s, 0.24 * s, skin, 0, 0.54 * s, 0, 0, 0, 0, 16);
  addLamellar(g, armor, scaleMat, s, 0.46 * s, 6);
  addCyl(g, 0.055 * s, 0.055 * s, 0.02 * s, trim, 0, 0.56 * s, 0.12 * s, Math.PI / 2, 0, 0, 16); // mirror plate

  // Belt + sash knot
  addCyl(g, 0.12 * s, 0.12 * s, 0.03 * s, trim, 0, 0.44 * s, 0, 0, 0, 0, 14);
  addBox(g, 0.08 * s, 0.1 * s, 0.02 * s, cloth, 0, 0.42 * s, 0.13 * s);

  // Shoulders — Chinese 披膊 (lamellar flaps), not western pauldrons
  for (const side of [-1, 1]) {
    addBox(g, 0.07 * s, 0.05 * s, 0.12 * s, armor, side * 0.14 * s, 0.64 * s, 0, 0, 0, side * 0.25);
    addCyl(g, 0.038 * s, 0.042 * s, 0.15 * s, skin, side * 0.17 * s, 0.54 * s, 0.01 * s, 0, 0, side * 0.25, 8);
    addCyl(g, 0.032 * s, 0.036 * s, 0.13 * s, skin, side * 0.2 * s, 0.4 * s, 0.03 * s, 0.25, 0, side * 0.15, 8);
    addCyl(g, 0.028 * s, 0.028 * s, 0.045 * s, skin, side * 0.21 * s, 0.32 * s, 0.05 * s, 0, 0, 0, 8);
  }

  // Neck + head (elongated, not potato sphere)
  addCyl(g, 0.038 * s, 0.042 * s, 0.055 * s, skin, 0, 0.69 * s, 0, 0, 0, 0, 10);
  addBox(g, 0.11 * s, 0.13 * s, 0.1 * s, skin, 0, 0.78 * s, 0.01 * s);
  addCyl(g, 0.05 * s, 0.055 * s, 0.035 * s, skin, 0, 0.86 * s, 0.01 * s, 0, 0, 0, 12);

  // Face planes — brow / eyes / nose / jaw (俑相)
  const brow = std(faction === "w" ? 0xa89078 : 0x6a6460, 0.75, 0.04, 0.35);
  addBox(g, 0.085 * s, 0.014 * s, 0.018 * s, brow, 0, 0.82 * s, 0.06 * s);
  for (const side of [-1, 1]) {
    addBox(g, 0.022 * s, 0.01 * s, 0.01 * s, hair, side * 0.028 * s, 0.795 * s, 0.065 * s);
  }
  addBox(g, 0.022 * s, 0.035 * s, 0.03 * s, skin, 0, 0.77 * s, 0.07 * s);
  addBox(g, 0.09 * s, 0.028 * s, 0.035 * s, skin, 0, 0.71 * s, 0.04 * s);

  // Topknot base (everyone except some hats covers it)
  addCyl(g, 0.03 * s, 0.04 * s, 0.05 * s, hair, 0, 0.9 * s, -0.01 * s, 0, 0, 0, 10);

  // —— Rank headgear (Chinese, innovative silhouettes) ——
  if (rank === "marshal") {
    // 鹖冠 — tall dual pheasant plumes (very readable Chinese silhouette)
    addCyl(g, 0.085 * s, 0.095 * s, 0.08 * s, trim, 0, 0.92 * s, 0, 0, 0, 0, 12);
    addBox(g, 0.2 * s, 0.035 * s, 0.11 * s, trim, 0, 0.96 * s, 0);
    for (const side of [-1, 1]) {
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.032 * s, 0.32 * s, 8), armor);
      plume.position.set(side * 0.08 * s, 1.14 * s, -0.02 * s);
      plume.rotation.z = side * 0.45;
      g.add(plume);
      // Secondary soft feather
      const soft = new THREE.Mesh(new THREE.ConeGeometry(0.02 * s, 0.2 * s, 6), cloth);
      soft.position.set(side * 0.1 * s, 1.05 * s, -0.04 * s);
      soft.rotation.z = side * 0.55;
      g.add(soft);
    }
    // Cloud cape — hangs behind, not a throne
    addBox(g, 0.36 * s, 0.48 * s, 0.035 * s, cloth, 0, 0.42 * s, -0.18 * s, 0.2);
    addBox(g, 0.34 * s, 0.06 * s, 0.02 * s, trim, 0, 0.64 * s, -0.2 * s);
    // Shoulder tassels
    for (const side of [-1, 1]) {
      addCyl(g, 0.02 * s, 0.01 * s, 0.12 * s, armor, side * 0.16 * s, 0.55 * s, 0.02 * s);
    }
  } else if (rank === "guard") {
    // 进贤冠 — wide winged scholar-guard hat
    addBox(g, 0.34 * s, 0.03 * s, 0.1 * s, hair, 0, 0.9 * s, 0);
    addBox(g, 0.1 * s, 0.06 * s, 0.1 * s, hair, 0, 0.94 * s, 0);
    addBox(g, 0.04 * s, 0.025 * s, 0.06 * s, trim, 0, 0.92 * s, 0.05 * s);
  } else if (rank === "minister") {
    // Wide ceremonial 梁冠
    addBox(g, 0.28 * s, 0.04 * s, 0.14 * s, armorDark, 0, 0.9 * s, 0);
    addBox(g, 0.12 * s, 0.08 * s, 0.12 * s, armorDark, 0, 0.96 * s, 0);
    addCyl(g, 0.02 * s, 0.02 * s, 0.1 * s, trim, 0, 1.02 * s, 0);
  } else if (rank === "cavalry" || rank === "driver") {
    // 武弁 — compact warrior cap with cheek guards
    addCyl(g, 0.07 * s, 0.08 * s, 0.06 * s, armorDark, 0, 0.9 * s, 0, 0, 0, 0, 12);
    for (const side of [-1, 1]) {
      addBox(g, 0.025 * s, 0.06 * s, 0.05 * s, armorDark, side * 0.075 * s, 0.78 * s, 0.01 * s);
    }
    addBox(g, 0.1 * s, 0.025 * s, 0.04 * s, trim, 0, 0.86 * s, 0.05 * s);
  } else if (rank === "mahout") {
    // 斗笠 bamboo hat
    addCyl(g, 0.14 * s, 0.04 * s, 0.04 * s, wood, 0, 0.9 * s, 0, 0, 0, 0, 16);
    addCyl(g, 0.04 * s, 0.045 * s, 0.05 * s, hair, 0, 0.88 * s, 0);
  } else if (rank === "gunner") {
    // Soft 巾帻 + forehead plate
    addBox(g, 0.14 * s, 0.05 * s, 0.12 * s, cloth, 0, 0.9 * s, 0);
    addBox(g, 0.1 * s, 0.03 * s, 0.04 * s, armor, 0, 0.85 * s, 0.055 * s);
  } else {
    // Infantry 武弁 simple
    addCyl(g, 0.06 * s, 0.07 * s, 0.055 * s, armorDark, 0, 0.9 * s, 0, 0, 0, 0, 12);
    addBox(g, 0.09 * s, 0.025 * s, 0.035 * s, armor, 0, 0.85 * s, 0.05 * s);
  }

  // —— Weapons (戈 / 戟 / 矛 / 环首刀 / 笏) ——
  if (weapon === "mao") {
    addCyl(g, 0.01 * s, 0.01 * s, 0.72 * s, wood, 0.22 * s, 0.48 * s, 0.04 * s);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.025 * s, 0.1 * s, 6), trim);
    tip.position.set(0.22 * s, 0.88 * s, 0.04 * s);
    g.add(tip);
  } else if (weapon === "ge") {
    // Dagger-axe 戈 — shaft + transverse blade
    addCyl(g, 0.012 * s, 0.012 * s, 0.65 * s, wood, 0.22 * s, 0.48 * s, 0.04 * s);
    addBox(g, 0.12 * s, 0.035 * s, 0.02 * s, trim, 0.28 * s, 0.78 * s, 0.04 * s);
    addBox(g, 0.04 * s, 0.08 * s, 0.02 * s, trim, 0.22 * s, 0.78 * s, 0.04 * s);
  } else if (weapon === "ji") {
    // Halberd 戟
    addCyl(g, 0.012 * s, 0.012 * s, 0.7 * s, wood, 0.22 * s, 0.5 * s, 0.04 * s);
    addBox(g, 0.1 * s, 0.03 * s, 0.02 * s, trim, 0.28 * s, 0.82 * s, 0.04 * s);
    const spear = new THREE.Mesh(new THREE.ConeGeometry(0.022 * s, 0.09 * s, 6), trim);
    spear.position.set(0.22 * s, 0.9 * s, 0.04 * s);
    g.add(spear);
  } else if (weapon === "jian") {
    // 环首刀 / jian
    addBox(g, 0.028 * s, 0.34 * s, 0.012 * s, trim, 0.22 * s, 0.48 * s, 0.04 * s, 0, 0, -0.2);
    addCyl(g, 0.025 * s, 0.025 * s, 0.02 * s, trim, 0.2 * s, 0.3 * s, 0.04 * s, 0, 0, Math.PI / 2, 10);
    addBox(g, 0.05 * s, 0.025 * s, 0.025 * s, trim, 0.2 * s, 0.32 * s, 0.04 * s);
  } else if (weapon === "hu") {
    // Ceremonial tablet 笏
    addBox(g, 0.055 * s, 0.16 * s, 0.012 * s, trim, 0.18 * s, 0.45 * s, 0.08 * s);
  } else if (weapon === "staff") {
    addCyl(g, 0.014 * s, 0.014 * s, 0.58 * s, trim, 0.2 * s, 0.48 * s, 0.02 * s);
    addCyl(g, 0.03 * s, 0.02 * s, 0.05 * s, armor, 0.2 * s, 0.8 * s, 0.02 * s);
  }

  if (shield) {
    // Round lacquer shield with bronze boss — Chinese 圆盾
    const sh = addCyl(g, 0.1 * s, 0.1 * s, 0.03 * s, armor, -0.2 * s, 0.42 * s, 0.06 * s, Math.PI / 2);
    sh.rotation.y = 0.35;
    addCyl(g, 0.03 * s, 0.03 * s, 0.035 * s, trim, -0.2 * s, 0.42 * s, 0.08 * s, Math.PI / 2);
  }

  return g;
}

// --------------------------------------------------------------------------- ranks

function buildMarshal(faction: Faction): THREE.Object3D {
  const root = new THREE.Group();
  root.name = "xq_marshal";
  root.add(buildXiangqiDisc(faction, "k", 0.34));
  const fig = buildHanSoldier({ faction, rank: "marshal", height: 0.88, weapon: "jian" });
  fig.position.y = 0.08;
  root.add(fig);
  enableShadows(root);
  return root;
}

function buildGuard(faction: Faction): THREE.Object3D {
  const root = new THREE.Group();
  root.name = "xq_guard";
  root.add(buildXiangqiDisc(faction, "a", 0.32));
  const fig = buildHanSoldier({ faction, rank: "guard", height: 0.8, weapon: "hu" });
  fig.position.y = 0.08;
  root.add(fig);
  enableShadows(root);
  return root;
}

function buildMinister(faction: Faction): THREE.Object3D {
  const root = new THREE.Group();
  root.name = "xq_minister";
  root.add(buildXiangqiDisc(faction, "b", 0.33));
  const fig = buildHanSoldier({ faction, rank: "minister", height: 0.84, weapon: "staff" });
  fig.position.y = 0.08;
  root.add(fig);
  enableShadows(root);
  return root;
}

function buildElephant(faction: Faction): THREE.Object3D {
  const p = palette(faction);
  const root = new THREE.Group();
  root.name = "xq_elephant";
  root.add(buildXiangqiDisc(faction, "b", 0.38));

  const hide = std(faction === "w" ? 0xa89078 : 0x4a4440, 0.78, 0.04, 0.4);
  const ivory = std(0xe0d4b8, 0.4, 0.15, 0.7);
  const cloth = lacquerMaterial(faction, p.armor);
  const trim = bronzeMaterial(p.trim);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), hide);
  body.scale.set(1.2, 0.9, 1.5);
  body.position.set(0, 0.42, 0);
  root.add(body);

  // Howdah canopy (Chinese pavilion tip)
  addBox(root, 0.28, 0.06, 0.32, cloth, 0, 0.58, -0.02);
  addBox(root, 0.3, 0.04, 0.34, trim, 0, 0.64, -0.02);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.14, 4), lacquerMaterial(faction, p.armorDark));
  roof.position.set(0, 0.74, -0.02);
  roof.rotation.y = Math.PI / 4;
  root.add(roof);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 14), hide);
  head.position.set(0, 0.46, 0.36);
  root.add(head);

  for (const side of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.CircleGeometry(0.13, 14), hide);
    ear.position.set(side * 0.16, 0.5, 0.32);
    ear.rotation.y = (side * Math.PI) / 2;
    ear.rotation.z = side * 0.28;
    root.add(ear);
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.18, 8), ivory);
    tusk.position.set(side * 0.07, 0.34, 0.46);
    tusk.rotation.x = 1.1;
    tusk.rotation.z = side * -0.2;
    root.add(tusk);
  }

  const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.28, 4, 10), hide);
  trunk.position.set(0, 0.3, 0.5);
  trunk.rotation.x = 0.9;
  root.add(trunk);

  const legGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.26, 10);
  for (const [x, z] of [
    [-0.13, 0.15],
    [0.13, 0.15],
    [-0.13, -0.17],
    [0.13, -0.17],
  ] as const) {
    const leg = new THREE.Mesh(legGeo, hide);
    leg.position.set(x, 0.18, z);
    root.add(leg);
  }

  // Forehead bronze plaque (Chinese war-elephant cue)
  addBox(root, 0.1, 0.08, 0.02, trim, 0, 0.52, 0.5);

  const mahout = buildHanSoldier({ faction, rank: "mahout", height: 0.5, weapon: "mao" });
  mahout.position.set(0, 0.62, -0.02);
  root.add(mahout);

  enableShadows(root);
  return root;
}

function buildHorse(faction: Faction): THREE.Object3D {
  const p = palette(faction);
  const root = new THREE.Group();
  root.name = "xq_horse";
  root.add(buildXiangqiDisc(faction, "n", 0.34));

  const hide = std(faction === "w" ? 0x9a8070 : 0x3a3834, 0.75, 0.04, 0.45);
  const mane = std(p.hair, 0.85, 0.02, 0.3);
  const trim = bronzeMaterial(p.trim);
  const cloth = lacquerMaterial(faction, p.armor);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.28, 6, 12), hide);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0.38, 0);
  root.add(body);

  // 障泥 saddle cloth
  addBox(root, 0.22, 0.04, 0.28, cloth, 0, 0.44, 0);

  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.14, 4, 8), hide);
  neck.position.set(0, 0.48, 0.16);
  neck.rotation.x = -0.55;
  root.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), hide);
  head.scale.set(0.75, 0.7, 1.35);
  head.position.set(0, 0.54, 0.28);
  root.add(head);

  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.042, 0.09, 8), hide);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0.5, 0.38);
  root.add(snout);

  addBox(root, 0.03, 0.14, 0.1, mane, 0, 0.56, 0.1, -0.35);
  addCyl(root, 0.085, 0.085, 0.02, trim, 0, 0.4, 0, Math.PI / 2);

  const legGeo = new THREE.CylinderGeometry(0.028, 0.032, 0.22, 8);
  for (const [x, z] of [
    [-0.07, 0.1],
    [0.07, 0.1],
    [-0.07, -0.11],
    [0.07, -0.11],
  ] as const) {
    const leg = new THREE.Mesh(legGeo, hide);
    leg.position.set(x, 0.22, z);
    root.add(leg);
  }

  const rider = buildHanSoldier({ faction, rank: "cavalry", height: 0.58, weapon: "ji" });
  rider.position.set(0, 0.42, -0.02);
  root.add(rider);

  enableShadows(root);
  return root;
}

function buildChariot(faction: Faction): THREE.Object3D {
  const p = palette(faction);
  const root = new THREE.Group();
  root.name = "xq_chariot";
  root.add(buildXiangqiDisc(faction, "r", 0.36));

  const wood = std(p.wood, 0.7, 0.06, 0.55);
  const trim = bronzeMaterial(p.trim);
  const lacq = lacquerMaterial(faction, p.armor);

  addBox(root, 0.4, 0.06, 0.5, wood, 0, 0.26, 0);
  for (const x of [-0.18, 0.18]) addBox(root, 0.035, 0.2, 0.46, lacq, x, 0.38, 0);
  addBox(root, 0.4, 0.16, 0.035, lacq, 0, 0.36, 0.23);

  addCyl(root, 0.022, 0.022, 0.54, trim, 0, 0.2, -0.02, 0, 0, Math.PI / 2);

  for (const side of [-1, 1] as const) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 8, 20), wood);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(side * 0.26, 0.2, -0.02);
    root.add(wheel);
    for (let i = 0; i < 8; i++) {
      addBox(root, 0.012, 0.24, 0.012, trim, side * 0.26, 0.2, -0.02, 0, Math.PI / 2, (i / 8) * Math.PI);
    }
  }

  addCyl(root, 0.018, 0.018, 0.55, wood, 0, 0.24, 0.48, Math.PI / 2);
  addBox(root, 0.34, 0.04, 0.04, trim, 0, 0.24, 0.72);

  // Banner with faction lacquer
  addCyl(root, 0.01, 0.01, 0.45, wood, -0.12, 0.55, -0.14);
  const pennant = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), lacq);
  pennant.position.set(-0.04, 0.72, -0.14);
  pennant.rotation.y = 0.35;
  root.add(pennant);

  const driver = buildHanSoldier({ faction, rank: "driver", height: 0.6, weapon: "ge" });
  driver.position.set(0, 0.3, -0.02);
  root.add(driver);

  enableShadows(root);
  return root;
}

function buildCannon(faction: Faction): THREE.Object3D {
  const p = palette(faction);
  const root = new THREE.Group();
  root.name = "xq_cannon";
  root.add(buildXiangqiDisc(faction, "c", 0.34));

  const iron = std(0x3a3e44, 0.35, 0.9, 1.2, 0x101418, 0.1);
  const trim = bronzeMaterial(p.trim);
  const wood = std(p.wood, 0.72, 0.05, 0.5);

  addBox(root, 0.28, 0.09, 0.36, wood, 0, 0.26, 0);
  addCyl(root, 0.06, 0.08, 0.48, iron, 0, 0.38, 0.06, Math.PI / 2 + 0.12);

  const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.016, 8, 16), trim);
  muzzle.rotation.y = Math.PI / 2;
  muzzle.position.set(0, 0.42, 0.3);
  root.add(muzzle);

  addCyl(root, 0.075, 0.075, 0.1, iron, 0, 0.36, -0.16);
  for (const side of [-1, 1] as const) {
    addCyl(root, 0.11, 0.11, 0.045, wood, side * 0.17, 0.18, 0, 0, 0, Math.PI / 2, 14);
  }

  // Gunner stands beside — Chinese crew silhouette
  const gunner = buildHanSoldier({ faction, rank: "gunner", height: 0.72, weapon: "staff" });
  gunner.position.set(0.16, 0.08, -0.18);
  root.add(gunner);

  enableShadows(root);
  return root;
}

function buildSoldier(faction: Faction): THREE.Object3D {
  const root = new THREE.Group();
  root.name = "xq_soldier";
  root.add(buildXiangqiDisc(faction, "p", 0.3));
  const fig = buildHanSoldier({
    faction,
    rank: "infantry",
    height: 0.76,
    weapon: "mao",
    shield: true,
  });
  fig.position.y = 0.08;
  root.add(fig);
  enableShadows(root);
  return root;
}

/** Full visual for one Xiangqi rank — original Chinese soldiers, no western GLB. */
export function buildXiangqiPiece(kind: PieceKind, faction: Faction): THREE.Object3D {
  switch (kind) {
    case "k":
      return buildMarshal(faction);
    case "a":
      return buildGuard(faction);
    case "b":
      return faction === "w" ? buildMinister(faction) : buildElephant(faction);
    case "n":
      return buildHorse(faction);
    case "r":
      return buildChariot(faction);
    case "c":
      return buildCannon(faction);
    case "p":
    default:
      return buildSoldier(faction);
  }
}

export function buildXiangqiElephant(faction: Faction): THREE.Object3D {
  return buildElephant(faction);
}

export function buildXiangqiChariot(faction: Faction): THREE.Object3D {
  return buildChariot(faction);
}

export function buildHanSash(_faction: Faction): THREE.Object3D {
  return new THREE.Group();
}

export const CHARIOT_RIDER_LIFT = 0;
export const CHARIOT_RIDER_SCALE = 1;

/** Collect Han soldier group names (tests / QA). */
export function findHanSoldiers(root: THREE.Object3D): string[] {
  const names: string[] = [];
  root.traverse((node) => {
    if (node.name.startsWith("han_")) names.push(node.name);
  });
  return names;
}
