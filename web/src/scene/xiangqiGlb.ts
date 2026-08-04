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

/**
 * Templates are unit-height (soles on y=0, XZ centred) — baked into the GLBs
 * and re-checked at load. Clones return an *outer* group you may reposition;
 * never write `position` onto the scaled inner figure or the sole offset is
 * wiped (that is what sent warrior_d / horse into the sky on Ultra rebuilds).
 */
interface NormalizedTemplate {
  root: THREE.Group;
  hasAlbedo: boolean;
}

let sharedLoader: GLTFLoader | null = null;
let clayAlbedo: THREE.CanvasTexture | null = null;

function getLoader(): GLTFLoader {
  if (sharedLoader) return sharedLoader;
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  loader.setDRACOLoader(draco);
  sharedLoader = loader;
  return loader;
}

/** Soft terracotta grain for scans that shipped without albedo maps. */
function clayTexture(): THREE.CanvasTexture {
  if (clayAlbedo) return clayAlbedo;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i += 1) {
    const n = Math.random() * 28;
    const warm = (Math.random() - 0.5) * 10;
    img.data[i * 4] = 168 + n + warm;
    img.data[i * 4 + 1] = 118 + n * 0.7;
    img.data[i * 4 + 2] = 82 + n * 0.45;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  for (let k = 0; k < 40; k += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 8 + Math.random() * 28;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(90,55,35,${0.08 + Math.random() * 0.1})`);
    g.addColorStop(1, "rgba(90,55,35,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.2, 2.2);
  texture.colorSpace = THREE.SRGBColorSpace;
  clayAlbedo = texture;
  return texture;
}

/**
 * Mesh AABB in `root` local space. Empty helpers / lights are skipped so a
 * zero box cannot explode scale to ~1000×.
 */
function measureLocalBox(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  const childBox = new THREE.Box3();
  const toRoot = new THREE.Matrix4();
  let found = false;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    childBox.copy(mesh.geometry.boundingBox ?? new THREE.Box3());
    if (childBox.isEmpty()) return;
    toRoot.multiplyMatrices(rootInverse, mesh.matrixWorld);
    box.union(childBox.clone().applyMatrix4(toRoot));
    found = true;
  });
  if (!found || box.isEmpty()) return new THREE.Box3().setFromObject(root);
  return box;
}

function meshHasAlbedo(root: THREE.Object3D): boolean {
  let found = false;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if ((mat as THREE.MeshStandardMaterial)?.map) found = true;
    }
  });
  return found;
}

/**
 * Ensure a loaded scene is unit-height with soles on y=0.
 * Assets are pre-baked; this is the safety net if a file regressed.
 */
function normalizeScene(scene: THREE.Object3D): NormalizedTemplate {
  const holder = new THREE.Group();
  const model = scene.clone(true);
  const prune: THREE.Object3D[] = [];
  model.traverse((node) => {
    if ((node as THREE.Light).isLight || (node as THREE.Camera).isCamera) prune.push(node);
  });
  for (const node of prune) node.parent?.remove(node);
  holder.add(model);

  const box = measureLocalBox(holder);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const height = Math.max(size.y, 1e-3);

  // Western-style: scale on the same node whose position already includes * scale
  // so feet stay planted (compose is T·R·S — position is not auto-scaled).
  const s = 1 / height;
  model.position.set(-center.x * s, -box.min.y * s, -center.z * s);
  model.scale.setScalar(s);
  holder.updateMatrixWorld(true);

  const check = measureLocalBox(holder);
  const checkHeight = check.max.y - check.min.y;
  if (checkHeight > 2.5 || checkHeight < 0.4 || check.min.y < -0.15 || check.min.y > 0.15) {
    console.warn(
      `[xiangqi-glb] unexpected unit bounds h=${checkHeight.toFixed(3)} minY=${check.min.y.toFixed(3)}`,
    );
  }

  return { root: holder, hasAlbedo: meshHasAlbedo(holder) };
}

function applyTerracottaLook(
  root: THREE.Object3D,
  faction: Faction,
  hasAlbedo: boolean,
  castShadows: boolean,
): void {
  const tint = faction === "w" ? 0xc49a78 : 0x6a6460;
  const clay = hasAlbedo ? null : clayTexture();
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = castShadows;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    const source = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
    const list = Array.isArray(source) ? source : [source];
    const cloned = list.map((mat) => {
      const next = (mat as THREE.MeshStandardMaterial).clone();
      if (!next.map && clay) {
        next.map = clay;
        next.color.setHex(faction === "w" ? 0xe0b090 : 0x9a9088);
      } else if (next.color) {
        next.color.lerp(new THREE.Color(tint), faction === "w" ? 0.28 : 0.4);
      }
      next.roughness = Math.min(0.94, (next.roughness ?? 0.7) * 1.02 + 0.08);
      next.metalness = Math.min(0.18, next.metalness ?? 0.04);
      next.envMapIntensity = hasAlbedo ? 0.75 : 0.55;
      next.flatShading = false;
      next.needsUpdate = true;
      return next;
    });
    mesh.material = Array.isArray(source) ? cloned : cloned[0];
  });
}

/**
 * Loads CC-BY Qin terracotta scans once, then clones them for each piece.
 * Falls back to procedural Han miniatures if a download fails.
 */
export class XiangqiGlbFactory {
  private warriors = new Map<WarriorKey, NormalizedTemplate>();
  private horse: NormalizedTemplate | null = null;
  private ready = false;
  private readyListeners: Array<() => void> = [];
  private castShadows = true;

  get isReady(): boolean {
    return this.ready;
  }

  whenReady(listener: () => void): void {
    if (this.ready) {
      listener();
      return;
    }
    this.readyListeners.push(listener);
  }

  setCastShadows(enabled: boolean): void {
    this.castShadows = enabled;
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
          this.warriors.set(key, normalizeScene(gltf.scene));
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
          this.horse = normalizeScene(gltf.scene);
        } catch (error) {
          console.warn("[xiangqi-glb] horse failed", error);
        } finally {
          done += 1;
          onProgress?.(done, total);
        }
      })(),
    ]);

    this.ready = true;
    for (const listener of this.readyListeners.splice(0)) listener();
  }

  /** Outer group is safe to reposition; inner figure stays unit-scaled × target. */
  cloneWarrior(kind: PieceKind, faction: Faction): THREE.Group | null {
    const key = xiangqiWarriorAsset(kind, faction);
    const template = this.warriors.get(key);
    if (!template) return null;
    const outer = new THREE.Group();
    outer.name = `xq_warrior_${key}`;
    const clone = template.root.clone(true);
    clone.scale.setScalar(XIANGQI_FIGURE_HEIGHT[kind] ?? 0.8);
    applyTerracottaLook(clone, faction, template.hasAlbedo, this.castShadows);
    outer.add(clone);
    return outer;
  }

  cloneHorse(faction: Faction, height = 0.55): THREE.Group | null {
    if (!this.horse) return null;
    const outer = new THREE.Group();
    outer.name = "xq_horse";
    const clone = this.horse.root.clone(true);
    clone.scale.setScalar(height);
    applyTerracottaLook(clone, faction, this.horse.hasAlbedo, this.castShadows);
    outer.add(clone);
    return outer;
  }

  create(kind: PieceKind, faction: Faction): THREE.Object3D {
    const warrior = this.cloneWarrior(kind, faction);

    if (kind === "k" || kind === "a" || kind === "p" || (kind === "b" && faction === "w")) {
      if (warrior) {
        const root = new THREE.Group();
        root.name = `xq_glb_${kind}`;
        warrior.position.y = 0.04;
        root.add(warrior);
        return root;
      }
      return buildXiangqiPiece(kind, faction);
    }

    if (kind === "n") {
      const root = new THREE.Group();
      root.name = "xq_glb_horse";
      const horse = this.cloneHorse(faction, 0.58);
      if (horse) {
        horse.position.y = 0.02;
        root.add(horse);
      }
      if (warrior) {
        warrior.position.set(0, horse ? 0.42 : 0.04, -0.02);
        root.add(warrior);
      }
      if (root.children.length === 0) return buildXiangqiPiece(kind, faction);
      return root;
    }

    const assembled = buildXiangqiPiece(kind, faction);
    if (!warrior) return assembled;

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

export const xiangqiGlbFactory = new XiangqiGlbFactory();
