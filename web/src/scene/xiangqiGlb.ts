import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

import {
  XIANGQI_FIGURE_HEIGHT,
  XIANGQI_HORSE_URL,
  XIANGQI_WARRIOR_URLS,
  xiangqiWarriorAsset,
} from "../assets/xiangqiModels";
import type { Faction, PieceKind } from "../core/types";
import { buildXiangqiPiece } from "./xiangqiFigures";

type WarriorKey = keyof typeof XIANGQI_WARRIOR_URLS;

interface NormalizedTemplate {
  root: THREE.Object3D;
  /** Uniform scale applied so standing height ≈ target. */
  scale: number;
}

let sharedLoader: GLTFLoader | null = null;

function getLoader(): GLTFLoader {
  if (sharedLoader) return sharedLoader;
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  // Official Google-hosted Draco WASM — required for our compressed scans.
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  loader.setDRACOLoader(draco);
  sharedLoader = loader;
  return loader;
}

function measureHeight(root: THREE.Object3D): { height: number; minY: number; center: THREE.Vector3 } {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  return { height: Math.max(0.001, size.y), minY: box.min.y, center };
}

/** Faction tint — warm vermilion clay vs cool iron clay over the scan albedo. */
function applyTerracottaLook(root: THREE.Object3D, faction: Faction): THREE.MeshStandardMaterial[] {
  const materials: THREE.MeshStandardMaterial[] = [];
  const tint = faction === "w" ? 0xc49a78 : 0x6a6460;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const source = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
    const list = Array.isArray(source) ? source : [source];
    const cloned = list.map((mat) => {
      const next = (mat as THREE.MeshStandardMaterial).clone();
      if (next.color) next.color.lerp(new THREE.Color(tint), faction === "w" ? 0.35 : 0.45);
      next.roughness = Math.min(0.92, (next.roughness ?? 0.7) * 1.05 + 0.05);
      next.metalness = Math.min(0.25, next.metalness ?? 0.05);
      next.envMapIntensity = 0.65;
      materials.push(next);
      return next;
    });
    mesh.material = Array.isArray(source) ? cloned : cloned[0];
  });
  return materials;
}

/**
 * Loads CC-BY Qin terracotta scans once, then clones them for each piece.
 * Falls back to procedural Han miniatures if a download fails.
 */
export class XiangqiGlbFactory {
  private warriors = new Map<WarriorKey, NormalizedTemplate>();
  private horse: NormalizedTemplate | null = null;
  private ready = false;

  get isReady(): boolean {
    return this.ready;
  }

  async load(onProgress?: (loaded: number, total: number) => void): Promise<void> {
    const loader = getLoader();
    const keys = Object.keys(XIANGQI_WARRIOR_URLS) as WarriorKey[];
    const total = keys.length + 1;
    let done = 0;

    await Promise.all([
      ...keys.map(async (key) => {
        try {
          const gltf = await loader.loadAsync(XIANGQI_WARRIOR_URLS[key]);
          const root = gltf.scene;
          const { height, minY, center } = measureHeight(root);
          // Recenter soles on y=0 and XZ mid.
          root.position.x -= center.x;
          root.position.z -= center.z;
          root.position.y -= minY;
          this.warriors.set(key, { root, scale: 1 / height });
        } catch (error) {
          console.warn(`[xiangqi-glb] warrior ${key} failed`, error);
        } finally {
          done += 1;
          onProgress?.(done, total);
        }
      }),
      (async () => {
        try {
          const gltf = await loader.loadAsync(XIANGQI_HORSE_URL);
          const root = gltf.scene;
          const { height, minY, center } = measureHeight(root);
          root.position.x -= center.x;
          root.position.z -= center.z;
          root.position.y -= minY;
          this.horse = { root, scale: 1 / height };
        } catch (error) {
          console.warn("[xiangqi-glb] horse failed", error);
        } finally {
          done += 1;
          onProgress?.(done, total);
        }
      })(),
    ]);

    this.ready = true;
  }

  /** Clone a standing warrior normalized to the rank's board height. */
  cloneWarrior(kind: PieceKind, faction: Faction): THREE.Object3D | null {
    const key = xiangqiWarriorAsset(kind, faction);
    const template = this.warriors.get(key);
    if (!template) return null;
    const clone = template.root.clone(true);
    const target = XIANGQI_FIGURE_HEIGHT[kind] ?? 0.8;
    clone.scale.setScalar(template.scale * target);
    applyTerracottaLook(clone, faction);
    return clone;
  }

  cloneHorse(faction: Faction, height = 0.55): THREE.Object3D | null {
    if (!this.horse) return null;
    const clone = this.horse.root.clone(true);
    clone.scale.setScalar(this.horse.scale * height);
    applyTerracottaLook(clone, faction);
    return clone;
  }

  /**
   * Full piece visual: terracotta GLB when available, else procedural Han miniature.
   * Mounted ranks compose GLB rider / horse with procedural chariot/elephant/cannon.
   */
  create(kind: PieceKind, faction: Faction): THREE.Object3D {
    const warrior = this.cloneWarrior(kind, faction);

    // Standing ranks — pure terracotta figure on its own feet (lacquer disc added by PieceView).
    if (kind === "k" || kind === "a" || kind === "p" || (kind === "b" && faction === "w")) {
      if (warrior) {
        const root = new THREE.Group();
        root.name = `xq_glb_${kind}`;
        warrior.position.y = 0.05;
        root.add(warrior);
        return root;
      }
      return buildXiangqiPiece(kind, faction);
    }

    if (kind === "n") {
      const root = new THREE.Group();
      root.name = "xq_glb_horse";
      const horse = this.cloneHorse(faction, 0.62);
      if (horse) {
        horse.position.y = 0.02;
        root.add(horse);
      }
      if (warrior) {
        warrior.position.set(0, horse ? 0.48 : 0.05, -0.02);
        root.add(warrior);
      }
      if (root.children.length === 0) return buildXiangqiPiece(kind, faction);
      return root;
    }

    // 象 / 车 / 炮 — keep inventive procedural mounts, drop a terracotta rider/crew on top.
    const assembled = buildXiangqiPiece(kind, faction);
    if (!warrior) return assembled;

    // Remove procedural humanoid (han_*) so the scan is the character.
    const toRemove: THREE.Object3D[] = [];
    assembled.traverse((node) => {
      if (node.name.startsWith("han_")) toRemove.push(node);
    });
    for (const node of toRemove) node.parent?.remove(node);

    if (kind === "b" && faction === "b") {
      warrior.position.set(0, 0.62, -0.02);
      warrior.scale.multiplyScalar(0.55);
    } else if (kind === "r") {
      warrior.position.set(0, 0.32, -0.02);
      warrior.scale.multiplyScalar(0.7);
    } else if (kind === "c") {
      warrior.position.set(0.14, 0.08, -0.18);
      warrior.scale.multiplyScalar(0.85);
    }
    assembled.add(warrior);
    return assembled;
  }
}

/** Shared singleton — loaded once with the piece factory. */
export const xiangqiGlbFactory = new XiangqiGlbFactory();
