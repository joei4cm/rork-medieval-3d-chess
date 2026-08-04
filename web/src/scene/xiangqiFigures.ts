import * as THREE from "three";

import type { Faction } from "../core/types";

/**
 * Procedural Xiangqi mounts — elephant for 象, two-wheel chariot for 车.
 * Used when remapped western sculpts cannot sell the rank.
 */

function mat(color: number, roughness = 0.72, metalness = 0.08): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

/** Grey war-elephant (黑象) — body, head, trunk, tusks, legs. */
export function buildXiangqiElephant(faction: Faction): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "xiangqi_elephant";
  const hide = mat(faction === "w" ? 0xb8a090 : 0x4a4540, 0.85, 0.04);
  const ivory = mat(0xe8dcc0, 0.45, 0.15);
  const cloth = mat(faction === "w" ? 0x8b1e1e : 0x1a1510, 0.78, 0.05);
  const trim = mat(faction === "w" ? 0xd4a84a : 0xc9a45a, 0.4, 0.55);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14), hide);
  body.scale.set(1.15, 0.85, 1.45);
  body.position.set(0, 0.42, 0);
  body.castShadow = true;
  group.add(body);

  const howdah = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.32), cloth);
  howdah.position.set(0, 0.62, -0.02);
  group.add(howdah);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.34), trim);
  rail.position.set(0, 0.68, -0.02);
  group.add(rail);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), hide);
  head.scale.set(1, 0.95, 1.1);
  head.position.set(0, 0.48, 0.42);
  head.castShadow = true;
  group.add(head);

  const earL = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), hide);
  earL.position.set(-0.2, 0.52, 0.38);
  earL.rotation.y = Math.PI / 2;
  earL.rotation.z = 0.35;
  group.add(earL);
  const earR = earL.clone();
  earR.position.x = 0.2;
  earR.rotation.y = -Math.PI / 2;
  earR.rotation.z = -0.35;
  group.add(earR);

  const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.34, 4, 8), hide);
  trunk.position.set(0, 0.28, 0.58);
  trunk.rotation.x = 0.85;
  group.add(trunk);

  for (const side of [-1, 1]) {
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.22, 8), ivory);
    tusk.position.set(side * 0.09, 0.34, 0.52);
    tusk.rotation.x = 1.15;
    tusk.rotation.z = side * -0.2;
    group.add(tusk);
  }

  const legGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.32, 10);
  for (const [x, z] of [
    [-0.16, 0.18],
    [0.16, 0.18],
    [-0.16, -0.22],
    [0.16, -0.22],
  ] as const) {
    const leg = new THREE.Mesh(legGeo, hide);
    leg.position.set(x, 0.16, z);
    leg.castShadow = true;
    group.add(leg);
  }

  // Han-style face plaque on the forehead.
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.02), trim);
  plaque.position.set(0, 0.58, 0.58);
  group.add(plaque);

  group.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) mesh.castShadow = true;
  });
  return group;
}

/**
 * Two-wheel chariot (車/俥) with a driver stand. The rider sculpt sits above
 * the chassis; call {@link chariotRiderLift} for the figure offset.
 */
export function buildXiangqiChariot(faction: Faction): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "xiangqi_chariot";
  const wood = mat(faction === "w" ? 0x8a6238 : 0x3a2a1c, 0.82, 0.05);
  const bronze = mat(faction === "w" ? 0xc9a45a : 0x8a7040, 0.35, 0.7);
  const lacquer = mat(faction === "w" ? 0x8b1e1e : 0x1a1510, 0.55, 0.2);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.55), wood);
  deck.position.set(0, 0.22, 0);
  deck.castShadow = true;
  group.add(deck);

  const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.5), lacquer);
  wallL.position.set(-0.2, 0.36, 0);
  group.add(wallL);
  const wallR = wallL.clone();
  wallR.position.x = 0.2;
  group.add(wallR);

  const front = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.04), lacquer);
  front.position.set(0, 0.34, 0.26);
  group.add(front);

  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.58, 8), bronze);
  axle.rotation.z = Math.PI / 2;
  axle.position.set(0, 0.16, -0.02);
  group.add(axle);

  const wheelGeo = new THREE.TorusGeometry(0.16, 0.035, 8, 20);
  const hubGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.05, 10);
  for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(wheelGeo, wood);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(side * 0.28, 0.16, -0.02);
    wheel.castShadow = true;
    group.add(wheel);
    const hub = new THREE.Mesh(hubGeo, bronze);
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(wheel.position);
    group.add(hub);
    // Spokes
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.02), bronze);
      spoke.position.copy(wheel.position);
      spoke.rotation.z = (i / 6) * Math.PI;
      spoke.rotation.y = Math.PI / 2;
      group.add(spoke);
    }
  }

  // Draft pole (辕)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), wood);
  pole.rotation.x = Math.PI / 2;
  pole.position.set(0, 0.2, 0.55);
  group.add(pole);
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.04), bronze);
  yoke.position.set(0, 0.2, 0.88);
  group.add(yoke);

  // Banner pole — Han pennant cue
  const bannerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 6), wood);
  bannerPole.position.set(-0.14, 0.55, -0.18);
  group.add(bannerPole);
  const pennant = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.12), lacquer);
  pennant.position.set(-0.05, 0.72, -0.18);
  pennant.rotation.y = 0.4;
  group.add(pennant);

  group.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  return group;
}

/** How high the rider sits above the chariot deck (world units after normalize). */
export const CHARIOT_RIDER_LIFT = 0.28;
export const CHARIOT_RIDER_SCALE = 0.62;

/** Simple Han sash / shoulder cape hung on the figure root (no bones required). */
export function buildHanSash(faction: Faction): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "han_sash";
  const silk = mat(faction === "w" ? 0xa01818 : 0x1c1814, 0.78, 0.04);
  const trim = mat(faction === "w" ? 0xd4a84a : 0xb89850, 0.4, 0.5);

  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 20, Math.PI), silk);
  sash.rotation.x = Math.PI / 2;
  sash.position.set(0, 0.55, 0.02);
  group.add(sash);

  const pendant = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.02), silk);
  pendant.position.set(0, 0.42, 0.16);
  group.add(pendant);

  const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), trim);
  clasp.position.set(0, 0.55, 0.18);
  group.add(clasp);

  return group;
}
