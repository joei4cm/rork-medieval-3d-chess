import * as THREE from "three";

import type { Faction, PieceKind } from "../core/types";
import { xiangqiGlyph } from "../xiangqi/identity";

/**
 * Full procedural Xiangqi roster — each rank is a distinct silhouette so the
 * board reads at a glance without western chess GLBs.
 */

function mat(
  color: number,
  roughness = 0.65,
  metalness = 0.08,
  emissive = 0x000000,
  emissiveIntensity = 0,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
}

function factionPalette(faction: Faction) {
  if (faction === "w") {
    return {
      lacquer: 0xc62828,
      wood: 0xe8c078,
      ink: 0x6a1010,
      trim: 0xd4a84a,
      cloth: 0x8b1e1e,
      dark: 0x5a2018,
      skin: 0xe0b898,
    };
  }
  return {
    lacquer: 0x1a1512,
    wood: 0x2a221c,
    ink: 0xe8d5a0,
    trim: 0xc9a45a,
    cloth: 0x2a2420,
    dark: 0x0e0c0a,
    skin: 0xc4a888,
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

/** Thick lacquer disc with a large carved character — the traditional piece body. */
function lacquerDisc(faction: Faction, kind: PieceKind, radius = 0.38): THREE.Group {
  const p = factionPalette(faction);
  const group = new THREE.Group();
  group.name = "lacquer_disc";

  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.04, 0.14, 40), mat(p.wood, 0.55, 0.08));
  body.position.y = 0.07;
  group.add(body);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.92, 0.028, 8, 40),
    mat(faction === "w" ? p.lacquer : p.trim, 0.4, 0.35),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.145;
  group.add(rim);

  // Face plate
  const face = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.82, radius * 0.82, 0.02, 40),
    mat(faction === "w" ? 0xf0d8a8 : 0x1c1814, 0.5, 0.05),
  );
  face.position.y = 0.15;
  group.add(face);

  // Character as a canvas decal on the face
  const glyph = xiangqiGlyph(kind, faction);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = faction === "w" ? "#7a1212" : "#e8d5a0";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(size * 0.62)}px "Noto Serif SC","Songti SC","SimSun",serif`;
  ctx.fillText(glyph, size / 2, size / 2 + 6);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const glyphMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const glyphPlane = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.72, 32), glyphMat);
  glyphPlane.rotation.x = -Math.PI / 2;
  glyphPlane.position.y = 0.162;
  group.add(glyphPlane);

  return group;
}

function hanFigure(faction: Faction, height = 0.55): THREE.Group {
  const p = factionPalette(faction);
  const g = new THREE.Group();
  const robe = mat(p.cloth, 0.78, 0.04);
  const trim = mat(p.trim, 0.4, 0.5);
  const skin = mat(p.skin, 0.7, 0.02);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, height * 0.45, 12), robe);
  torso.position.y = height * 0.35;
  g.add(torso);

  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, height * 0.22, 12), robe);
  skirt.position.y = height * 0.14;
  g.add(skirt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), skin);
  head.position.y = height * 0.58;
  g.add(head);

  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 6, 16), trim);
  sash.rotation.x = Math.PI / 2;
  sash.position.y = height * 0.32;
  g.add(sash);

  return g;
}

/** 帅 / 将 — crowned commander. */
function buildGeneral(faction: Faction): THREE.Object3D {
  const p = factionPalette(faction);
  const root = new THREE.Group();
  root.name = "xq_general";
  root.add(lacquerDisc(faction, "k", 0.4));

  const fig = hanFigure(faction, 0.7);
  fig.position.y = 0.16;
  root.add(fig);

  const armor = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 12), mat(p.trim, 0.35, 0.6));
  armor.position.y = 0.42;
  root.add(armor);

  // Mian / crown
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.08, 10), mat(p.trim, 0.35, 0.65, p.trim, 0.15));
  crown.position.y = 0.62;
  root.add(crown);
  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 8), mat(faction === "w" ? 0xffe080 : 0xc9a45a, 0.4, 0.4));
  plume.position.y = 0.74;
  root.add(plume);

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.02), mat(0xd0d4dc, 0.25, 0.9));
  blade.position.set(0.16, 0.4, 0);
  blade.rotation.z = -0.35;
  root.add(blade);

  enableShadows(root);
  return root;
}

/** 仕 / 士 — scholar-official with putou hat. */
function buildAdvisor(faction: Faction): THREE.Object3D {
  const p = factionPalette(faction);
  const root = new THREE.Group();
  root.name = "xq_advisor";
  root.add(lacquerDisc(faction, "a", 0.36));

  const fig = hanFigure(faction, 0.58);
  fig.position.y = 0.16;
  root.add(fig);

  // Wide putou wings
  const hat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.12), mat(p.dark, 0.7, 0.05));
  hat.position.y = 0.52;
  root.add(hat);
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.1), mat(p.dark, 0.7, 0.05));
  crown.position.y = 0.56;
  root.add(crown);

  const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.02), mat(p.trim, 0.45, 0.3));
  tablet.position.set(0.12, 0.36, 0.06);
  root.add(tablet);

  enableShadows(root);
  return root;
}

/** 相 — court chancellor (red). */
function buildChancellor(faction: Faction): THREE.Object3D {
  const p = factionPalette(faction);
  const root = new THREE.Group();
  root.name = "xq_chancellor";
  root.add(lacquerDisc(faction, "b", 0.37));

  const fig = hanFigure(faction, 0.62);
  fig.position.y = 0.16;
  root.add(fig);

  // Tall court hat
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.2, 10), mat(p.dark, 0.65, 0.08));
  hat.position.y = 0.6;
  root.add(hat);
  const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat(p.trim, 0.3, 0.7, p.trim, 0.25));
  jewel.position.y = 0.72;
  root.add(jewel);

  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8), mat(p.trim, 0.4, 0.55));
  staff.position.set(0.14, 0.38, 0);
  root.add(staff);

  enableShadows(root);
  return root;
}

/** 象 — war elephant (black). */
function buildElephant(faction: Faction): THREE.Object3D {
  const p = factionPalette(faction);
  const root = new THREE.Group();
  root.name = "xq_elephant";
  root.add(lacquerDisc(faction, "b", 0.42));

  const hide = mat(faction === "w" ? 0xb8a090 : 0x4a4540, 0.85, 0.04);
  const ivory = mat(0xe8dcc0, 0.45, 0.15);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), hide);
  body.scale.set(1.15, 0.85, 1.4);
  body.position.set(0, 0.42, 0);
  root.add(body);

  const howdah = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.28), mat(p.cloth, 0.75, 0.05));
  howdah.position.set(0, 0.58, -0.02);
  root.add(howdah);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), hide);
  head.position.set(0, 0.46, 0.36);
  root.add(head);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), hide);
    ear.position.set(side * 0.17, 0.5, 0.32);
    ear.rotation.y = side * Math.PI / 2;
    ear.rotation.z = side * 0.3;
    root.add(ear);
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.18, 8), ivory);
    tusk.position.set(side * 0.07, 0.34, 0.46);
    tusk.rotation.x = 1.1;
    tusk.rotation.z = side * -0.2;
    root.add(tusk);
  }

  const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.28, 4, 8), hide);
  trunk.position.set(0, 0.3, 0.5);
  trunk.rotation.x = 0.9;
  root.add(trunk);

  const legGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.26, 10);
  for (const [x, z] of [
    [-0.13, 0.14],
    [0.13, 0.14],
    [-0.13, -0.18],
    [0.13, -0.18],
  ] as const) {
    const leg = new THREE.Mesh(legGeo, hide);
    leg.position.set(x, 0.28, z);
    root.add(leg);
  }

  enableShadows(root);
  return root;
}

/** 马 / 傌 — war horse with rider. */
function buildHorse(faction: Faction): THREE.Object3D {
  const p = factionPalette(faction);
  const root = new THREE.Group();
  root.name = "xq_horse";
  root.add(lacquerDisc(faction, "n", 0.38));

  const hide = mat(faction === "w" ? 0x8a7060 : 0x3a3028, 0.8, 0.04);
  const mane = mat(p.dark, 0.75, 0.02);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.28, 6, 10), hide);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0.38, 0);
  root.add(body);

  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.14, 4, 8), hide);
  neck.position.set(0, 0.48, 0.18);
  neck.rotation.x = -0.6;
  root.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), hide);
  head.scale.set(0.85, 0.75, 1.25);
  head.position.set(0, 0.54, 0.3);
  root.add(head);

  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.1, 8), hide);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0.5, 0.4);
  root.add(snout);

  const maneMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.12), mane);
  maneMesh.position.set(0, 0.56, 0.12);
  maneMesh.rotation.x = -0.4;
  root.add(maneMesh);

  const legGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.22, 8);
  for (const [x, z] of [
    [-0.08, 0.1],
    [0.08, 0.1],
    [-0.08, -0.12],
    [0.08, -0.12],
  ] as const) {
    const leg = new THREE.Mesh(legGeo, hide);
    leg.position.set(x, 0.26, z);
    root.add(leg);
  }

  const rider = hanFigure(faction, 0.4);
  rider.position.set(0, 0.42, -0.02);
  rider.scale.setScalar(0.75);
  root.add(rider);

  enableShadows(root);
  return root;
}

/** 车 / 俥 — chariot with driver. */
function buildChariot(faction: Faction): THREE.Object3D {
  const p = factionPalette(faction);
  const root = new THREE.Group();
  root.name = "xq_chariot";
  root.add(lacquerDisc(faction, "r", 0.4));

  const wood = mat(faction === "w" ? 0x8a6238 : 0x3a2a1c, 0.82, 0.05);
  const bronze = mat(p.trim, 0.35, 0.7);
  const lacquer = mat(p.lacquer, 0.55, 0.2);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.5), wood);
  deck.position.set(0, 0.28, 0);
  root.add(deck);

  for (const x of [-0.18, 0.18]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.46), lacquer);
    wall.position.set(x, 0.4, 0);
    root.add(wall);
  }
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.04), lacquer);
  front.position.set(0, 0.38, 0.24);
  root.add(front);

  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), bronze);
  axle.rotation.z = Math.PI / 2;
  axle.position.set(0, 0.22, -0.02);
  root.add(axle);

  for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 8, 18), wood);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(side * 0.26, 0.22, -0.02);
    root.add(wheel);
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.24, 0.015), bronze);
      spoke.position.copy(wheel.position);
      spoke.rotation.z = (i / 6) * Math.PI;
      spoke.rotation.y = Math.PI / 2;
      root.add(spoke);
    }
  }

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8), wood);
  pole.rotation.x = Math.PI / 2;
  pole.position.set(0, 0.26, 0.48);
  root.add(pole);

  const banner = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6), wood);
  banner.position.set(-0.12, 0.55, -0.15);
  root.add(banner);
  const pennant = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), lacquer);
  pennant.position.set(-0.04, 0.7, -0.15);
  pennant.rotation.y = 0.35;
  root.add(pennant);

  const driver = hanFigure(faction, 0.48);
  driver.position.set(0, 0.32, -0.02);
  driver.scale.setScalar(0.85);
  root.add(driver);

  enableShadows(root);
  return root;
}

/** 炮 / 砲 — wheeled cannon. */
function buildCannon(faction: Faction): THREE.Object3D {
  const p = factionPalette(faction);
  const root = new THREE.Group();
  root.name = "xq_cannon";
  root.add(lacquerDisc(faction, "c", 0.38));

  const iron = mat(0x3a3e44, 0.4, 0.85);
  const bronze = mat(p.trim, 0.35, 0.7);
  const wood = mat(faction === "w" ? 0x8a6238 : 0x3a2a1c, 0.8, 0.05);

  const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.36), wood);
  carriage.position.set(0, 0.28, 0);
  root.add(carriage);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.48, 14), iron);
  barrel.rotation.x = Math.PI / 2 + 0.12;
  barrel.position.set(0, 0.4, 0.06);
  root.add(barrel);

  const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.02, 8, 16), bronze);
  muzzle.rotation.y = Math.PI / 2;
  muzzle.position.set(0, 0.43, 0.3);
  root.add(muzzle);

  const breech = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), iron);
  breech.position.set(0, 0.38, -0.18);
  root.add(breech);

  for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16), wood);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 0.18, 0.2, 0);
    root.add(wheel);
  }

  // Gunner
  const gunner = hanFigure(faction, 0.42);
  gunner.position.set(0.02, 0.3, -0.2);
  gunner.scale.setScalar(0.7);
  root.add(gunner);

  enableShadows(root);
  return root;
}

/** 兵 / 卒 — foot soldier with spear and shield. */
function buildSoldier(faction: Faction): THREE.Object3D {
  const p = factionPalette(faction);
  const root = new THREE.Group();
  root.name = "xq_soldier";
  root.add(lacquerDisc(faction, "p", 0.34));

  const fig = hanFigure(faction, 0.5);
  fig.position.y = 0.16;
  root.add(fig);

  // Cap
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.06, 10), mat(p.dark, 0.7, 0.05));
  cap.position.y = 0.48;
  root.add(cap);

  const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 6), mat(0x6a4a28, 0.8, 0.05));
  spear.position.set(0.14, 0.4, 0);
  root.add(spear);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 6), mat(0xc0c4cc, 0.3, 0.85));
  tip.position.set(0.14, 0.7, 0);
  root.add(tip);

  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12), mat(p.trim, 0.45, 0.4));
  shield.rotation.x = Math.PI / 2;
  shield.position.set(-0.12, 0.34, 0.06);
  root.add(shield);

  enableShadows(root);
  return root;
}

/**
 * Build the full visual for one Xiangqi rank — replaces western GLB sculpts.
 */
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

/** @deprecated use buildXiangqiPiece — kept for any leftover imports */
export function buildXiangqiElephant(faction: Faction): THREE.Object3D {
  return buildElephant(faction);
}

/** @deprecated */
export function buildXiangqiChariot(faction: Faction): THREE.Object3D {
  return buildChariot(faction);
}

/** @deprecated */
export function buildHanSash(_faction: Faction): THREE.Object3D {
  return new THREE.Group();
}

export const CHARIOT_RIDER_LIFT = 0;
export const CHARIOT_RIDER_SCALE = 1;
