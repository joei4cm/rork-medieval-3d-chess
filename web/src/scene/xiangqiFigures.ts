import * as THREE from "three";

import type { Faction, PieceKind } from "../core/types";
import { xiangqiGlyph } from "../xiangqi/identity";

/**
 * Qin terracotta-warrior style Xiangqi figures.
 * Each rank is a distinct armored silhouette on a lacquer identity disc.
 */

type WarriorRank = "general" | "officer" | "scholar" | "cavalry" | "infantry" | "gunner";

function mat(
  color: number,
  roughness = 0.72,
  metalness = 0.06,
  emissive = 0x000000,
  emissiveIntensity = 0,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
}

/** Terracotta clay palette — 秦俑灰陶 + faction paint accents. */
function clayPalette(faction: Faction) {
  if (faction === "w") {
    return {
      clay: 0xb8a090,
      clayDark: 0x8a7060,
      armor: 0x6a5848,
      scale: 0x5a4a3c,
      lacquer: 0xa01818,
      trim: 0xc9a050,
      wood: 0xe8c078,
      ink: 0x6a1010,
      bronze: 0xb08a40,
      boot: 0x3a2a20,
    };
  }
  return {
    clay: 0x7a7068,
    clayDark: 0x4a4440,
    armor: 0x3a3834,
    scale: 0x2e2c28,
    lacquer: 0x1a1512,
    trim: 0xc9a45a,
    wood: 0x2a221c,
    ink: 0xe8d5a0,
    bronze: 0x8a7040,
    boot: 0x1a1612,
  };
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
  segments = 12,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segments), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}

/** Compact lacquer identity disc under the warrior. */
function lacquerDisc(faction: Faction, kind: PieceKind, radius = 0.34): THREE.Group {
  const p = clayPalette(faction);
  const group = new THREE.Group();
  group.name = "lacquer_disc";

  addCyl(group, radius, radius * 1.05, 0.1, mat(p.wood, 0.55, 0.08), 0, 0.05, 0, 0, 0, 0, 36);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.9, 0.022, 8, 36),
    mat(faction === "w" ? p.lacquer : p.trim, 0.4, 0.4),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.105;
  group.add(rim);

  const glyph = xiangqiGlyph(kind, faction);
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
      ctx.font = `bold ${Math.round(size * 0.55)}px "Noto Serif SC","Songti SC","SimSun",serif`;
      ctx.fillText(glyph, size / 2, size / 2 + 4);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const glyphMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
      const glyphPlane = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.62, 28), glyphMat);
      glyphPlane.rotation.x = -Math.PI / 2;
      glyphPlane.position.y = 0.112;
      group.add(glyphPlane);
    }
  }

  return group;
}

interface WarriorOpts {
  faction: Faction;
  rank: WarriorRank;
  /** Overall height of the standing figure (not including disc). */
  height?: number;
  holdSpear?: boolean;
  holdSword?: boolean;
  holdStaff?: boolean;
  holdTablet?: boolean;
  holdShield?: boolean;
}

/**
 * Standing Qin terracotta warrior — armored torso, articulated limbs,
 * facial planes, and rank-specific headgear (兵马俑 style).
 */
function buildTerracottaWarrior(opts: WarriorOpts): THREE.Group {
  const {
    faction,
    rank,
    height = 0.78,
    holdSpear = false,
    holdSword = false,
    holdStaff = false,
    holdTablet = false,
    holdShield = false,
  } = opts;
  const p = clayPalette(faction);
  const g = new THREE.Group();
  g.name = `qin_${rank}`;

  const clay = mat(p.clay, 0.88, 0.02);
  const clayDark = mat(p.clayDark, 0.9, 0.02);
  const armor = mat(p.armor, 0.7, 0.15);
  const scale = mat(p.scale, 0.65, 0.2);
  const bronze = mat(p.bronze, 0.35, 0.65, p.bronze, 0.08);
  const boot = mat(p.boot, 0.85, 0.04);
  const lacquer = mat(p.lacquer, 0.55, 0.15);

  const s = height / 0.78; // scale relative to default

  // —— Boots ——
  for (const side of [-1, 1]) {
    addBox(g, 0.09 * s, 0.05 * s, 0.14 * s, boot, side * 0.07 * s, 0.04 * s, 0.02 * s);
    addCyl(g, 0.045 * s, 0.05 * s, 0.12 * s, clayDark, side * 0.07 * s, 0.12 * s, 0, 0, 0, 0, 10);
  }

  // —— Legs ——
  for (const side of [-1, 1]) {
    addCyl(g, 0.05 * s, 0.055 * s, 0.22 * s, clay, side * 0.07 * s, 0.28 * s, 0, 0, 0, 0, 10);
  }

  // —— Armored skirt (甲裙) — overlapping panels ——
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addBox(
      g,
      0.07 * s,
      0.14 * s,
      0.03 * s,
      armor,
      Math.sin(a) * 0.11 * s,
      0.42 * s,
      Math.cos(a) * 0.11 * s,
      0,
      a,
      0,
    );
  }
  addCyl(g, 0.1 * s, 0.12 * s, 0.08 * s, clayDark, 0, 0.4 * s, 0, 0, 0, 0, 12);

  // —— Torso ——
  addCyl(g, 0.1 * s, 0.12 * s, 0.22 * s, clay, 0, 0.55 * s, 0, 0, 0, 0, 14);

  // Chest plate
  addBox(g, 0.18 * s, 0.16 * s, 0.06 * s, armor, 0, 0.56 * s, 0.08 * s);

  // Scale rows on chest
  for (let row = 0; row < 3; row++) {
    for (let col = -1; col <= 1; col++) {
      addBox(
        g,
        0.045 * s,
        0.035 * s,
        0.02 * s,
        scale,
        col * 0.05 * s,
        0.52 * s + row * 0.04 * s,
        0.115 * s,
      );
    }
  }

  // Belt + buckle
  addCyl(g, 0.115 * s, 0.115 * s, 0.035 * s, bronze, 0, 0.46 * s, 0, 0, 0, 0, 14);
  addBox(g, 0.05 * s, 0.04 * s, 0.03 * s, bronze, 0, 0.46 * s, 0.12 * s);

  // —— Shoulders / pauldrons ——
  for (const side of [-1, 1]) {
    addBox(g, 0.08 * s, 0.06 * s, 0.1 * s, armor, side * 0.14 * s, 0.64 * s, 0);
    // Upper arm
    const upper = addCyl(g, 0.04 * s, 0.045 * s, 0.16 * s, clay, side * 0.16 * s, 0.54 * s, 0, 0, 0, side * 0.15, 8);
    upper.rotation.z = side * 0.2;
    // Forearm
    addCyl(g, 0.035 * s, 0.04 * s, 0.14 * s, clay, side * 0.2 * s, 0.4 * s, 0.02 * s, 0.3, 0, side * 0.1, 8);
    // Fist
    addCyl(g, 0.03 * s, 0.03 * s, 0.05 * s, clayDark, side * 0.21 * s, 0.32 * s, 0.04 * s, 0, 0, 0, 8);
  }

  // —— Neck + head ——
  addCyl(g, 0.04 * s, 0.045 * s, 0.06 * s, clay, 0, 0.7 * s, 0, 0, 0, 0, 10);

  // Head — blocky terracotta 俑头 (angular, not a potato sphere)
  addBox(g, 0.12 * s, 0.14 * s, 0.11 * s, clay, 0, 0.78 * s, 0.01 * s);
  // Soften crown with a shallow cap
  addCyl(g, 0.055 * s, 0.06 * s, 0.04 * s, clay, 0, 0.86 * s, 0.01 * s, 0, 0, 0, 12);

  // Face planes — brow, nose, jaw, eyes
  addBox(g, 0.09 * s, 0.015 * s, 0.02 * s, clayDark, 0, 0.82 * s, 0.07 * s); // brow
  for (const side of [-1, 1]) {
    addBox(g, 0.025 * s, 0.012 * s, 0.01 * s, clayDark, side * 0.03 * s, 0.79 * s, 0.07 * s); // eyes
  }
  addBox(g, 0.025 * s, 0.04 * s, 0.035 * s, clayDark, 0, 0.77 * s, 0.075 * s); // nose
  addBox(g, 0.05 * s, 0.015 * s, 0.02 * s, clayDark, 0, 0.73 * s, 0.07 * s); // mouth ridge
  addBox(g, 0.1 * s, 0.03 * s, 0.04 * s, clayDark, 0, 0.7 * s, 0.04 * s); // jaw
  // Ears
  for (const side of [-1, 1]) {
    addBox(g, 0.02 * s, 0.035 * s, 0.025 * s, clay, side * 0.07 * s, 0.78 * s, 0);
  }

  // —— Rank headgear ——
  if (rank === "general") {
    // Tall general crown with plume
    addCyl(g, 0.08 * s, 0.09 * s, 0.08 * s, bronze, 0, 0.88 * s, 0, 0, 0, 0, 12);
    addBox(g, 0.16 * s, 0.03 * s, 0.1 * s, bronze, 0, 0.9 * s, 0);
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.035 * s, 0.18 * s, 8), lacquer);
    plume.position.set(0, 1.02 * s, 0);
    g.add(plume);
    // Shoulder tassels
    for (const side of [-1, 1]) {
      addCyl(g, 0.02 * s, 0.01 * s, 0.1 * s, lacquer, side * 0.16 * s, 0.58 * s, 0.02 * s);
    }
  } else if (rank === "officer") {
    // Flat officer hat with side wings (進贤冠-ish)
    addBox(g, 0.22 * s, 0.04 * s, 0.12 * s, clayDark, 0, 0.88 * s, 0);
    addBox(g, 0.1 * s, 0.06 * s, 0.1 * s, clayDark, 0, 0.92 * s, 0);
    addBox(g, 0.04 * s, 0.03 * s, 0.08 * s, bronze, 0, 0.9 * s, 0.06 * s);
  } else if (rank === "scholar") {
    // Putou with long wings
    addBox(g, 0.32 * s, 0.035 * s, 0.1 * s, clayDark, 0, 0.88 * s, 0);
    addBox(g, 0.09 * s, 0.05 * s, 0.09 * s, clayDark, 0, 0.91 * s, 0);
  } else if (rank === "cavalry") {
    // Soft warrior topknot
    addCyl(g, 0.04 * s, 0.05 * s, 0.07 * s, clayDark, 0, 0.9 * s, -0.01 * s, 0, 0, 0, 10);
    addCyl(g, 0.025 * s, 0.03 * s, 0.05 * s, clayDark, 0, 0.96 * s, -0.01 * s);
  } else {
    // Infantry / gunner — simple topknot + forehead plate
    addCyl(g, 0.035 * s, 0.045 * s, 0.06 * s, clayDark, 0, 0.89 * s, -0.01 * s);
    addBox(g, 0.1 * s, 0.03 * s, 0.04 * s, armor, 0, 0.84 * s, 0.05 * s);
  }

  // —— Props ——
  if (holdSpear) {
    addCyl(g, 0.012 * s, 0.012 * s, 0.7 * s, mat(0x5a4030, 0.8, 0.05), 0.22 * s, 0.5 * s, 0.05 * s);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.028 * s, 0.1 * s, 6), bronze);
    tip.position.set(0.22 * s, 0.88 * s, 0.05 * s);
    g.add(tip);
  }
  if (holdSword) {
    addBox(g, 0.03 * s, 0.32 * s, 0.015 * s, bronze, 0.22 * s, 0.45 * s, 0.04 * s, 0, 0, -0.25);
    addBox(g, 0.05 * s, 0.03 * s, 0.03 * s, bronze, 0.2 * s, 0.3 * s, 0.04 * s);
  }
  if (holdStaff) {
    addCyl(g, 0.015 * s, 0.015 * s, 0.55 * s, bronze, 0.2 * s, 0.45 * s, 0.02 * s);
    addCyl(g, 0.03 * s, 0.02 * s, 0.06 * s, lacquer, 0.2 * s, 0.75 * s, 0.02 * s);
  }
  if (holdTablet) {
    addBox(g, 0.06 * s, 0.14 * s, 0.015 * s, bronze, 0.18 * s, 0.42 * s, 0.08 * s);
  }
  if (holdShield) {
    const shield = addCyl(g, 0.09 * s, 0.09 * s, 0.025 * s, bronze, -0.2 * s, 0.4 * s, 0.06 * s, Math.PI / 2);
    shield.rotation.y = 0.3;
  }

  return g;
}

// --------------------------------------------------------------------------- ranks

function buildGeneral(faction: Faction): THREE.Object3D {
  const root = new THREE.Group();
  root.name = "xq_general";
  root.add(lacquerDisc(faction, "k", 0.36));
  const warrior = buildTerracottaWarrior({
    faction,
    rank: "general",
    height: 0.85,
    holdSword: true,
  });
  warrior.position.y = 0.1;
  root.add(warrior);
  enableShadows(root);
  return root;
}

function buildAdvisor(faction: Faction): THREE.Object3D {
  const root = new THREE.Group();
  root.name = "xq_advisor";
  root.add(lacquerDisc(faction, "a", 0.34));
  const warrior = buildTerracottaWarrior({
    faction,
    rank: "scholar",
    height: 0.78,
    holdTablet: true,
  });
  warrior.position.y = 0.1;
  root.add(warrior);
  enableShadows(root);
  return root;
}

function buildChancellor(faction: Faction): THREE.Object3D {
  const root = new THREE.Group();
  root.name = "xq_chancellor";
  root.add(lacquerDisc(faction, "b", 0.35));
  const warrior = buildTerracottaWarrior({
    faction,
    rank: "officer",
    height: 0.82,
    holdStaff: true,
  });
  warrior.position.y = 0.1;
  root.add(warrior);
  enableShadows(root);
  return root;
}

function buildElephant(faction: Faction): THREE.Object3D {
  const p = clayPalette(faction);
  const root = new THREE.Group();
  root.name = "xq_elephant";
  root.add(lacquerDisc(faction, "b", 0.4));

  const hide = mat(faction === "w" ? 0xa89080 : 0x5a544c, 0.88, 0.03);
  const ivory = mat(0xe0d4b8, 0.45, 0.12);
  const armor = mat(p.armor, 0.7, 0.15);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 14), hide);
  body.scale.set(1.2, 0.9, 1.45);
  body.position.set(0, 0.4, 0);
  root.add(body);

  // Armored howdah
  addBox(root, 0.26, 0.08, 0.3, armor, 0, 0.56, -0.02);
  addBox(root, 0.28, 0.05, 0.32, mat(p.bronze, 0.4, 0.55), 0, 0.62, -0.02);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), hide);
  head.position.set(0, 0.44, 0.34);
  root.add(head);

  for (const side of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), hide);
    ear.position.set(side * 0.15, 0.48, 0.3);
    ear.rotation.y = (side * Math.PI) / 2;
    ear.rotation.z = side * 0.25;
    root.add(ear);
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.16, 8), ivory);
    tusk.position.set(side * 0.06, 0.32, 0.44);
    tusk.rotation.x = 1.05;
    tusk.rotation.z = side * -0.18;
    root.add(tusk);
  }

  const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.26, 4, 8), hide);
  trunk.position.set(0, 0.28, 0.48);
  trunk.rotation.x = 0.85;
  root.add(trunk);

  const legGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.24, 10);
  for (const [x, z] of [
    [-0.12, 0.14],
    [0.12, 0.14],
    [-0.12, -0.16],
    [0.12, -0.16],
  ] as const) {
    const leg = new THREE.Mesh(legGeo, hide);
    leg.position.set(x, 0.26, z);
    root.add(leg);
  }

  // Mahout — full-readable terracotta rider (no extra scale crush)
  const rider = buildTerracottaWarrior({
    faction,
    rank: "cavalry",
    height: 0.58,
    holdSpear: true,
  });
  rider.position.set(0, 0.64, -0.02);
  root.add(rider);

  enableShadows(root);
  return root;
}

function buildHorse(faction: Faction): THREE.Object3D {
  const p = clayPalette(faction);
  const root = new THREE.Group();
  root.name = "xq_horse";
  root.add(lacquerDisc(faction, "n", 0.36));

  const hide = mat(faction === "w" ? 0x9a8070 : 0x4a443c, 0.85, 0.03);
  const mane = mat(p.clayDark, 0.8, 0.02);
  const bronze = mat(p.bronze, 0.35, 0.6);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.26, 6, 12), hide);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0.36, 0);
  root.add(body);

  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.14, 4, 8), hide);
  neck.position.set(0, 0.46, 0.16);
  neck.rotation.x = -0.55;
  root.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), hide);
  head.scale.set(0.8, 0.7, 1.3);
  head.position.set(0, 0.52, 0.28);
  root.add(head);

  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.09, 8), hide);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0.48, 0.38);
  root.add(snout);

  addBox(root, 0.035, 0.14, 0.1, mane, 0, 0.54, 0.1, -0.35);

  // Bridle / tack
  addCyl(root, 0.08, 0.08, 0.02, bronze, 0, 0.38, 0, Math.PI / 2);

  const legGeo = new THREE.CylinderGeometry(0.028, 0.032, 0.2, 8);
  for (const [x, z] of [
    [-0.07, 0.1],
    [0.07, 0.1],
    [-0.07, -0.11],
    [0.07, -0.11],
  ] as const) {
    const leg = new THREE.Mesh(legGeo, hide);
    leg.position.set(x, 0.24, z);
    root.add(leg);
  }

  const rider = buildTerracottaWarrior({
    faction,
    rank: "cavalry",
    height: 0.6,
    holdSpear: true,
  });
  rider.position.set(0, 0.44, -0.04);
  root.add(rider);

  enableShadows(root);
  return root;
}

function buildChariot(faction: Faction): THREE.Object3D {
  const p = clayPalette(faction);
  const root = new THREE.Group();
  root.name = "xq_chariot";
  root.add(lacquerDisc(faction, "r", 0.38));

  const wood = mat(faction === "w" ? 0x8a6238 : 0x3a2a1c, 0.82, 0.05);
  const bronze = mat(p.bronze, 0.35, 0.7);
  const lacquer = mat(p.lacquer, 0.55, 0.2);

  addBox(root, 0.38, 0.06, 0.48, wood, 0, 0.26, 0);
  for (const x of [-0.17, 0.17]) {
    addBox(root, 0.035, 0.2, 0.44, lacquer, x, 0.38, 0);
  }
  addBox(root, 0.38, 0.16, 0.035, lacquer, 0, 0.36, 0.22);

  const axle = addCyl(root, 0.022, 0.022, 0.52, bronze, 0, 0.2, -0.02, 0, 0, Math.PI / 2);
  void axle;

  for (const side of [-1, 1] as const) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.028, 8, 18), wood);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(side * 0.25, 0.2, -0.02);
    root.add(wheel);
    for (let i = 0; i < 6; i++) {
      const spoke = addBox(root, 0.014, 0.22, 0.014, bronze, side * 0.25, 0.2, -0.02, 0, Math.PI / 2, (i / 6) * Math.PI);
      void spoke;
    }
  }

  const pole = addCyl(root, 0.018, 0.018, 0.5, wood, 0, 0.24, 0.45, Math.PI / 2);
  void pole;

  addCyl(root, 0.01, 0.01, 0.42, wood, -0.12, 0.52, -0.14);
  const pennant = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.09), lacquer);
  pennant.position.set(-0.04, 0.66, -0.14);
  pennant.rotation.y = 0.35;
  root.add(pennant);

  const driver = buildTerracottaWarrior({
    faction,
    rank: "officer",
    height: 0.62,
    holdSpear: true,
  });
  driver.position.set(0, 0.32, -0.04);
  root.add(driver);

  enableShadows(root);
  return root;
}

function buildCannon(faction: Faction): THREE.Object3D {
  const p = clayPalette(faction);
  const root = new THREE.Group();
  root.name = "xq_cannon";
  root.add(lacquerDisc(faction, "c", 0.36));

  const iron = mat(0x3a3e44, 0.4, 0.85);
  const bronze = mat(p.bronze, 0.35, 0.7);
  const wood = mat(faction === "w" ? 0x8a6238 : 0x3a2a1c, 0.8, 0.05);

  addBox(root, 0.26, 0.09, 0.34, wood, 0, 0.26, 0);

  const barrel = addCyl(root, 0.065, 0.085, 0.46, iron, 0, 0.38, 0.05, Math.PI / 2 + 0.1);
  void barrel;

  const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 16), bronze);
  muzzle.rotation.y = Math.PI / 2;
  muzzle.position.set(0, 0.41, 0.28);
  root.add(muzzle);

  addCyl(root, 0.08, 0.08, 0.1, iron, 0, 0.36, -0.16);

  for (const side of [-1, 1] as const) {
    const wheel = addCyl(root, 0.11, 0.11, 0.045, wood, side * 0.17, 0.18, 0, 0, 0, Math.PI / 2, 14);
    void wheel;
  }

  // Gunner stands on the disc beside the carriage — clear humanoid silhouette
  const gunner = buildTerracottaWarrior({
    faction,
    rank: "gunner",
    height: 0.72,
    holdStaff: true,
  });
  gunner.position.set(0.14, 0.1, -0.2);
  root.add(gunner);

  enableShadows(root);
  return root;
}

function buildSoldier(faction: Faction): THREE.Object3D {
  const root = new THREE.Group();
  root.name = "xq_soldier";
  root.add(lacquerDisc(faction, "p", 0.32));
  const warrior = buildTerracottaWarrior({
    faction,
    rank: "infantry",
    height: 0.75,
    holdSpear: true,
    holdShield: true,
  });
  warrior.position.y = 0.1;
  root.add(warrior);
  enableShadows(root);
  return root;
}

/** Build the full visual for one Xiangqi rank. */
export function buildXiangqiPiece(kind: PieceKind, faction: Faction): THREE.Object3D {
  switch (kind) {
    case "k":
      return buildGeneral(faction);
    case "a":
      return buildAdvisor(faction);
    case "b":
      return faction === "w" ? buildChancellor(faction) : buildElephant(faction);
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

/** Collect terracotta warrior group names under a piece root (for tests / QA). */
export function findQinWarriors(root: THREE.Object3D): string[] {
  const names: string[] = [];
  root.traverse((node) => {
    if (node.name.startsWith("qin_")) names.push(node.name);
  });
  return names;
}

export const CHARIOT_RIDER_LIFT = 0;
export const CHARIOT_RIDER_SCALE = 1;
