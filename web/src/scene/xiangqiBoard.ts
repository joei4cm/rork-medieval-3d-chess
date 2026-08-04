import * as THREE from "three";

import type { SquareId } from "../core/types";
import type { ArenaLook } from "./arena";
import { BOARD_TOP, TILE } from "./boardConstants";
import { getBoardGeometry, squareToWorld } from "./boardGeometry";
import {
  captureMarkerTexture,
  landingRingTexture,
  moveMarkerTexture,
  radialTexture,
  selectMarkerTexture,
  shockwaveTexture,
} from "./textures";
import { xiangqiRiverTexture, xiangqiWoodTexture } from "./xiangqiTextures";
import type { HighlightKind } from "./board";

const HIGHLIGHT_COLORS: Record<HighlightKind, number> = {
  select: 0xffc95e,
  move: 0x5cf2a4,
  capture: 0xff5a44,
  castle: 0x63b8ff,
  promote: 0xc784ff,
  last: 0xd9a441,
  check: 0xff3b30,
  hint: 0x6aa9ff,
};

const GLOW_OPACITY: Record<HighlightKind, number> = {
  select: 0.5,
  move: 0.46,
  capture: 0.58,
  castle: 0.5,
  promote: 0.54,
  last: 0.22,
  check: 0.6,
  hint: 0.3,
};

const MARKER_OPACITY: Record<HighlightKind, number> = {
  select: 0.85,
  move: 0.9,
  capture: 1,
  castle: 0.95,
  promote: 1,
  last: 0,
  check: 0.8,
  hint: 0.5,
};

const BEAM_OPACITY: Record<HighlightKind, number> = {
  select: 0.16,
  move: 0.3,
  capture: 0.42,
  castle: 0.34,
  promote: 0.46,
  last: 0,
  check: 0.3,
  hint: 0.12,
};

const MARKER_SPIN: Record<HighlightKind, number> = {
  select: 0,
  move: 0.35,
  capture: -0.7,
  castle: 0.5,
  promote: 0.9,
  last: 0,
  check: 0.5,
  hint: 0.2,
};

const SHROUD_OPACITY = 0.55;
const POP_DURATION = 0.26;

function easeOutBack(t: number): number {
  const c = 1.9;
  const p = t - 1;
  return 1 + (c + 1) * p * p * p + c * p * p;
}

interface HighlightSlot {
  glow: THREE.Mesh;
  glowMaterial: THREE.MeshBasicMaterial;
  marker: THREE.Mesh;
  markerMaterial: THREE.MeshBasicMaterial;
  beam: THREE.Mesh;
  beamMaterial: THREE.MeshBasicMaterial;
  kind: HighlightKind | null;
  pulse: boolean;
  age: number;
  phase: number;
}

interface ShroudSlot {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  target: number;
  current: number;
  delay: number;
}

interface ImpactWave {
  ring: THREE.Mesh;
  ringMaterial: THREE.MeshBasicMaterial;
  flare: THREE.Mesh;
  flareMaterial: THREE.MeshBasicMaterial;
  age: number;
  duration: number;
  active: boolean;
}

interface LandingRipple {
  ring: THREE.Mesh;
  ringMaterial: THREE.MeshBasicMaterial;
  glow: THREE.Mesh;
  glowMaterial: THREE.MeshBasicMaterial;
  age: number;
  duration: number;
  strength: number;
  active: boolean;
}

/**
 * Chinese chess board: lacquered wood slab, engraved grid, river band,
 * palace diagonals. Pieces sit on intersections (points), not tile centres.
 */
export class XiangqiBoardView {
  readonly group = new THREE.Group();
  /** Invisible discs at each point — used for raycasting. */
  readonly tiles: THREE.Mesh[] = [];

  private slots = new Map<SquareId, HighlightSlot>();
  private shrouds = new Map<SquareId, ShroudSlot>();
  private hoverRing: THREE.Mesh;
  private baseMaterial: THREE.MeshStandardMaterial | null = null;
  private lineMaterial: THREE.LineBasicMaterial | null = null;
  private riverMaterial: THREE.MeshStandardMaterial | null = null;
  private disposables: { dispose: () => void }[] = [];
  private elapsed = 0;
  private waves: ImpactWave[] = [];
  private waveCursor = 0;
  private landings: LandingRipple[] = [];
  private landingCursor = 0;
  private markerMaps: Partial<Record<HighlightKind, THREE.Texture>> = {};

  private riverFlow: THREE.MeshStandardMaterial | null = null;
  private riverFlow2: THREE.MeshStandardMaterial | null = null;
  private mistSprites: THREE.Mesh[] = [];
  private foamPoints: THREE.Points | null = null;
  private foamVelocities: Float32Array | null = null;
  private splashRings: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; age: number; life: number }[] = [];
  private splashCursor = 0;

  constructor() {
    this.group.name = "xiangqi-board";
    const geom = getBoardGeometry();

    const width = (geom.fileCount - 1) * TILE + TILE * 1.35;
    const depth = (geom.rankCount - 1) * TILE + TILE * 1.35;

    // Thick lacquered wood slab with grain.
    const woodMap = this.track(xiangqiWoodTexture(false));
    const wood = this.track(
      new THREE.MeshStandardMaterial({
        map: woodMap,
        color: 0xe8c890,
        roughness: 0.58,
        metalness: 0.06,
      }),
    );
    this.baseMaterial = wood;

    const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.28, depth), wood);
    slab.position.y = BOARD_TOP - 0.14;
    slab.receiveShadow = true;
    slab.castShadow = true;
    this.group.add(slab);

    // Clean playing face — warm lacquer, no muddy landscape wash.
    const faceMat = this.track(
      new THREE.MeshStandardMaterial({
        map: this.track(xiangqiWoodTexture(false)),
        color: 0xf0d9a0,
        roughness: 0.52,
        metalness: 0.04,
      }),
    );
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry((geom.fileCount - 1) * TILE + 0.15, (geom.rankCount - 1) * TILE + 0.15),
      faceMat,
    );
    face.rotation.x = -Math.PI / 2;
    face.position.y = BOARD_TOP + 0.002;
    face.receiveShadow = true;
    this.group.add(face);

    // Vermilion lacquer rim / frame.
    const rim = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x8b1e1e,
        roughness: 0.4,
        metalness: 0.28,
        emissive: 0x3a0808,
        emissiveIntensity: 0.18,
      }),
    );
    const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.34, 0.36, depth + 0.34), rim);
    frame.position.y = BOARD_TOP - 0.22;
    frame.receiveShadow = true;
    frame.castShadow = true;
    this.group.add(frame);

    // Inner gold trim.
    const trim = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xd4a84a,
        roughness: 0.35,
        metalness: 0.65,
        emissive: 0x3a2808,
        emissiveIntensity: 0.12,
      }),
    );
    const trimMesh = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.04, depth + 0.08), trim);
    trimMesh.position.y = BOARD_TOP - 0.01;
    this.group.add(trimMesh);

    // Classic 楚河汉界 band — calligraphy strip between the camps (not a fake 3D river).
    const riverBand = this.track(
      new THREE.MeshStandardMaterial({
        map: this.track(xiangqiWoodTexture(false)),
        color: 0xe0c078,
        roughness: 0.55,
        metalness: 0.08,
        emissive: 0x3a2010,
        emissiveIntensity: 0.08,
      }),
    );
    this.riverMaterial = riverBand;
    const bandMesh = new THREE.Mesh(
      new THREE.PlaneGeometry((geom.fileCount - 1) * TILE - 0.08, TILE * 0.92),
      riverBand,
    );
    bandMesh.rotation.x = -Math.PI / 2;
    bandMesh.position.set(0, BOARD_TOP + 0.006, 0);
    this.group.add(bandMesh);

    // Soft shimmer sheet over the calligraphy band (keeps a hint of water without drowning the board).
    const shimmerMap = this.track(xiangqiRiverTexture());
    shimmerMap.repeat.set(4, 1);
    const shimmer = this.track(
      new THREE.MeshStandardMaterial({
        map: shimmerMap,
        color: 0x88c0b8,
        roughness: 0.25,
        metalness: 0.2,
        transparent: true,
        opacity: 0.18,
        emissive: 0x306858,
        emissiveIntensity: 0.15,
        depthWrite: false,
      }),
    );
    this.riverFlow = shimmer;
    this.riverFlow2 = null;
    const shimmerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry((geom.fileCount - 1) * TILE - 0.2, TILE * 0.7),
      shimmer,
    );
    shimmerMesh.rotation.x = -Math.PI / 2;
    shimmerMesh.position.set(0, BOARD_TOP + 0.01, 0);
    this.group.add(shimmerMesh);

    this.initFoamParticles((geom.fileCount - 1) * TILE * 0.6);
    this.initSplashRings();

    // Large traditional calligraphy sitting in the band.
    this.addRiverCalligraphy();

    // Palace floors — inlaid darker wood panels under the nine-palace.
    const palaceMat = this.track(
      new THREE.MeshStandardMaterial({
        map: this.track(xiangqiWoodTexture(true)),
        color: 0xb88848,
        roughness: 0.48,
        metalness: 0.12,
        emissive: 0x2a1808,
        emissiveIntensity: 0.1,
      }),
    );
    for (const baseRank of [0, 7]) {
      const zCentre = (geom.halfRanks - (baseRank + 1)) * TILE;
      const palace = new THREE.Mesh(
        new THREE.BoxGeometry(2 * TILE + 0.06, 0.025, 2 * TILE + 0.06),
        palaceMat,
      );
      palace.position.set(0, BOARD_TOP + 0.008, zCentre);
      palace.receiveShadow = true;
      this.group.add(palace);
    }

    // Grid lines — classic dark vermilion on lacquer.
    const lineMat = this.track(new THREE.LineBasicMaterial({ color: 0x6a1810, transparent: true, opacity: 0.95 }));
    this.lineMaterial = lineMat;
    const points: THREE.Vector3[] = [];
    const yLine = BOARD_TOP + 0.018;
    for (let r = 0; r < geom.rankCount; r++) {
      const z = (geom.halfRanks - r) * TILE;
      const x0 = -geom.halfFiles * TILE;
      const x1 = geom.halfFiles * TILE;
      points.push(new THREE.Vector3(x0, yLine, z), new THREE.Vector3(x1, yLine, z));
    }
    for (let f = 0; f < geom.fileCount; f++) {
      const x = (f - geom.halfFiles) * TILE;
      if (f === 0 || f === geom.fileCount - 1) {
        points.push(
          new THREE.Vector3(x, yLine, geom.halfRanks * TILE),
          new THREE.Vector3(x, yLine, -geom.halfRanks * TILE),
        );
      } else {
        points.push(
          new THREE.Vector3(x, yLine, geom.halfRanks * TILE),
          new THREE.Vector3(x, yLine, 0.5 * TILE),
          new THREE.Vector3(x, yLine, -0.5 * TILE),
          new THREE.Vector3(x, yLine, -geom.halfRanks * TILE),
        );
      }
    }
    // Palace diagonals (九宫)
    for (const baseRank of [0, 7]) {
      const z0 = (geom.halfRanks - baseRank) * TILE;
      const z2 = (geom.halfRanks - (baseRank + 2)) * TILE;
      const x3 = (3 - geom.halfFiles) * TILE;
      const x5 = (5 - geom.halfFiles) * TILE;
      points.push(
        new THREE.Vector3(x3, yLine + 0.001, z0),
        new THREE.Vector3(x5, yLine + 0.001, z2),
        new THREE.Vector3(x5, yLine + 0.001, z0),
        new THREE.Vector3(x3, yLine + 0.001, z2),
      );
    }
    // Traditional "cannon / soldier" position markers (炮位 / 兵位)
    const markOffsets: [number, number][] = [
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
    for (const [f, r] of markOffsets) {
      const x = (f - geom.halfFiles) * TILE;
      const z = (geom.halfRanks - r) * TILE;
      const s = 0.1;
      points.push(
        new THREE.Vector3(x - s, yLine + 0.001, z - s * 0.6),
        new THREE.Vector3(x - s * 0.35, yLine + 0.001, z - s * 0.6),
        new THREE.Vector3(x - s, yLine + 0.001, z - s * 0.6),
        new THREE.Vector3(x - s, yLine + 0.001, z - s * 0.2),
        new THREE.Vector3(x + s, yLine + 0.001, z - s * 0.6),
        new THREE.Vector3(x + s * 0.35, yLine + 0.001, z - s * 0.6),
        new THREE.Vector3(x + s, yLine + 0.001, z - s * 0.6),
        new THREE.Vector3(x + s, yLine + 0.001, z - s * 0.2),
        new THREE.Vector3(x - s, yLine + 0.001, z + s * 0.6),
        new THREE.Vector3(x - s * 0.35, yLine + 0.001, z + s * 0.6),
        new THREE.Vector3(x - s, yLine + 0.001, z + s * 0.6),
        new THREE.Vector3(x - s, yLine + 0.001, z + s * 0.2),
        new THREE.Vector3(x + s, yLine + 0.001, z + s * 0.6),
        new THREE.Vector3(x + s * 0.35, yLine + 0.001, z + s * 0.6),
        new THREE.Vector3(x + s, yLine + 0.001, z + s * 0.6),
        new THREE.Vector3(x + s, yLine + 0.001, z + s * 0.2),
      );
    }

    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    this.group.add(new THREE.LineSegments(lineGeo, lineMat));

    this.markerMaps.select = this.track(selectMarkerTexture());
    this.markerMaps.move = this.track(moveMarkerTexture());
    this.markerMaps.capture = this.track(captureMarkerTexture());
    this.markerMaps.check = this.track(captureMarkerTexture());
    this.markerMaps.hint = this.track(moveMarkerTexture());
    this.markerMaps.last = this.track(radialTexture("#ffd27a", "rgba(0,0,0,0)"));

    // Smaller hit discs — pieces stand on points, not tile centres.
    const hitGeo = new THREE.CircleGeometry(TILE * 0.28, 20);
    hitGeo.rotateX(-Math.PI / 2);
    const hitMat = this.track(new THREE.MeshBasicMaterial({ visible: false }));

    for (const square of geom.allSquares()) {
      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.position.copy(squareToWorld(square, BOARD_TOP + 0.02));
      hit.userData.square = square;
      this.tiles.push(hit);
      this.group.add(hit);
      this.slots.set(square, this.makeHighlight(square));
      this.shrouds.set(square, this.makeShroud(square));
    }

    const hoverMat = this.track(
      new THREE.MeshBasicMaterial({
        map: this.track(radialTexture("#ffe6a8", "rgba(0,0,0,0)")),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    this.hoverRing = new THREE.Mesh(new THREE.CircleGeometry(TILE * 0.32, 28), hoverMat);
    this.hoverRing.rotation.x = -Math.PI / 2;
    this.hoverRing.position.y = BOARD_TOP + 0.022;
    this.group.add(this.hoverRing);

    this.initWaves();
    this.initLandings();
  }

  /** Low carved peaks along the far shores — reads as 山水 without blocking play. */
  private initFoamParticles(riverWidth: number): void {
    const count = 64;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * riverWidth;
      positions[i * 3 + 1] = BOARD_TOP + 0.02 + Math.random() * 0.04;
      positions[i * 3 + 2] = (Math.random() - 0.5) * TILE * 0.7;
      velocities[i * 3] = 0.15 + Math.random() * 0.35;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = this.track(
      new THREE.PointsMaterial({
        map: this.track(radialTexture("rgba(230,250,245,0.9)", "rgba(230,250,245,0)")),
        size: 0.14,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.foamPoints = new THREE.Points(geo, mat);
    this.foamPoints.frustumCulled = false;
    this.foamVelocities = velocities;
    this.group.add(this.foamPoints);
  }

  private initSplashRings(): void {
    for (let i = 0; i < 6; i++) {
      const mat = this.track(
        new THREE.MeshBasicMaterial({
          map: this.track(shockwaveTexture()),
          transparent: true,
          opacity: 0,
          depthWrite: false,
          color: 0xb8e8e0,
        }),
      );
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 28), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.group.add(mesh);
      this.splashRings.push({ mesh, mat, age: 0, life: 0.5 });
    }
  }

  private updateFoam(delta: number): void {
    if (!this.foamPoints || !this.foamVelocities) return;
    const pos = this.foamPoints.geometry.getAttribute("position") as THREE.BufferAttribute;
    const halfW = TILE * 4.2;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i) + this.foamVelocities[i * 3] * delta;
      let y = pos.getY(i) + this.foamVelocities[i * 3 + 1] * delta;
      let z = pos.getZ(i) + this.foamVelocities[i * 3 + 2] * delta;
      this.foamVelocities[i * 3 + 1] *= Math.exp(-delta * 3.5);
      this.foamVelocities[i * 3 + 1] -= delta * 0.35;
      if (y < BOARD_TOP + 0.015) {
        y = BOARD_TOP + 0.015 + Math.random() * 0.02;
        this.foamVelocities[i * 3 + 1] = 0;
        z = (Math.random() - 0.5) * TILE * 0.65;
      }
      if (x > halfW) x = -halfW;
      if (x < -halfW) x = halfW;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }

  private updateSplashRings(delta: number): void {
    for (const ring of this.splashRings) {
      if (!ring.mesh.visible && ring.age >= 0) continue;
      ring.age += delta;
      if (ring.age < 0) continue;
      const t = ring.age / ring.life;
      if (t >= 1) {
        ring.mesh.visible = false;
        ring.mat.opacity = 0;
        continue;
      }
      ring.mesh.visible = true;
      ring.mesh.scale.setScalar(0.2 + t * 1.6);
      ring.mat.opacity = (1 - t) * 0.65;
    }
  }

  private addShoreMountains(width: number, _depth: number): void {
    const geom = getBoardGeometry();
    const rock = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x5a6a58,
        roughness: 0.92,
        metalness: 0.02,
        flatShading: true,
      }),
    );
    const mistRock = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x6a7a88,
        roughness: 0.88,
        metalness: 0.04,
        flatShading: true,
      }),
    );
    const pine = this.track(
      new THREE.MeshStandardMaterial({ color: 0x2a4030, roughness: 0.9, metalness: 0 }),
    );

    const placePeak = (x: number, z: number, h: number, r: number, material: THREE.Material) => {
      const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), material);
      peak.position.set(x, BOARD_TOP + h * 0.5 + 0.02, z);
      peak.castShadow = true;
      peak.receiveShadow = true;
      this.group.add(peak);
    };

    // North / south lacquer margins — outside the back ranks, inside the rim.
    const zN = -(geom.halfRanks * TILE + TILE * 0.42);
    const zS = geom.halfRanks * TILE + TILE * 0.42;
    for (let i = -3; i <= 3; i++) {
      const x = i * TILE * 1.05;
      placePeak(x + 0.08, zN, 0.22 + (Math.abs(i) % 3) * 0.06, 0.14 + (Math.abs(i) % 2) * 0.04, mistRock);
      placePeak(x - 0.04, zS, 0.2 + ((i + 1) % 3) * 0.05, 0.13, rock);
    }
    // Corner massifs on the rim
    for (const [x, z, mat] of [
      [-width * 0.36, zN, mistRock],
      [width * 0.36, zN, mistRock],
      [-width * 0.36, zS, rock],
      [width * 0.36, zS, rock],
    ] as const) {
      placePeak(x, z, 0.34, 0.22, mat);
      placePeak(x + 0.14, z + (z < 0 ? -0.05 : 0.05), 0.22, 0.14, mat);
    }

    // Tiny pines on the ridges
    for (let i = 0; i < 8; i++) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.1, 5), rock);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 6), pine);
      const x = (i - 3.5) * TILE * 0.95;
      const z = i % 2 === 0 ? zN : zS;
      trunk.position.set(x, BOARD_TOP + 0.1, z);
      crown.position.set(x, BOARD_TOP + 0.2, z);
      this.group.add(trunk, crown);
    }
  }

  /** Large 楚河 · 汉界 calligraphy in the centre band — the classic board signature. */
  private addRiverCalligraphy(): void {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 1024, 160);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 92px 'Noto Serif SC','Songti SC','STSong',serif";
    ctx.fillStyle = "#5a1810";
    ctx.fillText("楚  河", 280, 82);
    ctx.fillText("汉  界", 744, 82);
    // Centre divider ornament
    ctx.fillStyle = "#8a3020";
    ctx.beginPath();
    ctx.arc(512, 80, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a3020";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(480, 80);
    ctx.lineTo(544, 80);
    ctx.stroke();

    const tex = this.track(new THREE.CanvasTexture(canvas));
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = this.track(
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, depthWrite: false }),
    );
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(TILE * 7.2, TILE * 0.72), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, BOARD_TOP + 0.014, 0);
    this.group.add(mesh);
  }

  private addRiverLabel(text: string, x: number, color: string): void {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = "bold 36px 'Noto Serif SC', 'Songti SC', serif";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 32);
    const tex = this.track(new THREE.CanvasTexture(canvas));
    const mat = this.track(
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.82, depthWrite: false }),
    );
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(TILE * 2.4, TILE * 0.55), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, BOARD_TOP + 0.006, 0);
    this.group.add(mesh);
  }

  private makeHighlight(square: SquareId): HighlightSlot {
    const glowMat = this.track(
      new THREE.MeshBasicMaterial({
        map: this.track(radialTexture("#ffffff", "rgba(0,0,0,0)")),
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    const glow = new THREE.Mesh(new THREE.CircleGeometry(TILE * 0.32, 24), glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.copy(squareToWorld(square, BOARD_TOP + 0.02));
    this.group.add(glow);

    const markerMat = this.track(
      new THREE.MeshBasicMaterial({
        map: this.markerMaps.move ?? null,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    const marker = new THREE.Mesh(new THREE.CircleGeometry(TILE * 0.26, 28), markerMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.copy(squareToWorld(square, BOARD_TOP + 0.026));
    this.group.add(marker);

    const beamMat = this.track(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 0.45, 10, 1, true), beamMat);
    beam.position.copy(squareToWorld(square, BOARD_TOP + 0.25));
    this.group.add(beam);

    return {
      glow,
      glowMaterial: glowMat,
      marker,
      markerMaterial: markerMat,
      beam,
      beamMaterial: beamMat,
      kind: null,
      pulse: false,
      age: 0,
      phase: Math.random() * Math.PI * 2,
    };
  }

  private makeShroud(square: SquareId): ShroudSlot {
    const material = this.track(
      new THREE.MeshBasicMaterial({
        color: 0x060308,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(TILE * 0.4, 20), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(squareToWorld(square, BOARD_TOP + 0.004));
    this.group.add(mesh);
    return { mesh, material, target: 0, current: 0, delay: 0 };
  }

  private initWaves(): void {
    for (let i = 0; i < 6; i++) {
      const ringMat = this.track(
        new THREE.MeshBasicMaterial({
          map: this.track(shockwaveTexture()),
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      const ring = new THREE.Mesh(new THREE.CircleGeometry(1, 32), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      this.group.add(ring);
      const flareMat = this.track(
        new THREE.MeshBasicMaterial({
          map: this.track(radialTexture("#ffa457", "rgba(0,0,0,0)")),
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      const flare = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), flareMat);
      flare.rotation.x = -Math.PI / 2;
      flare.visible = false;
      this.group.add(flare);
      this.waves.push({ ring, ringMaterial: ringMat, flare, flareMaterial: flareMat, age: 0, duration: 0.5, active: false });
    }
  }

  private initLandings(): void {
    for (let i = 0; i < 4; i++) {
      const ringMat = this.track(
        new THREE.MeshBasicMaterial({
          map: this.track(landingRingTexture()),
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      const ring = new THREE.Mesh(new THREE.CircleGeometry(1, 28), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      this.group.add(ring);
      const glowMat = this.track(
        new THREE.MeshBasicMaterial({
          map: this.track(radialTexture("#ffffff", "rgba(0,0,0,0)")),
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), glowMat);
      glow.rotation.x = -Math.PI / 2;
      glow.visible = false;
      this.group.add(glow);
      this.landings.push({
        ring,
        ringMaterial: ringMat,
        glow,
        glowMaterial: glowMat,
        age: 0,
        duration: 0.45,
        strength: 1,
        active: false,
      });
    }
  }

  applyArena(_look: ArenaLook): void {
    // Lacquer board keeps its own palette; arena still drives the hall around it.
  }

  setHighlight(square: SquareId, kind: HighlightKind, pulse = false, delay = 0): void {
    const slot = this.slots.get(square);
    if (!slot) return;
    slot.kind = kind;
    slot.pulse = pulse;
    slot.age = -delay;
    slot.glowMaterial.color.setHex(HIGHLIGHT_COLORS[kind]);
    slot.beamMaterial.color.setHex(HIGHLIGHT_COLORS[kind]);
    slot.markerMaterial.map = this.markerMaps[kind] ?? this.markerMaps.move ?? null;
    slot.markerMaterial.needsUpdate = true;
  }

  clearHighlights(): void {
    for (const slot of this.slots.values()) {
      slot.kind = null;
      slot.glowMaterial.opacity = 0;
      slot.markerMaterial.opacity = 0;
      slot.beamMaterial.opacity = 0;
    }
  }

  setShroud(keep: SquareId[] | null, _origin?: SquareId): void {
    const keepSet = keep ? new Set(keep) : null;
    let i = 0;
    for (const [square, slot] of this.shrouds) {
      const veiled = keepSet !== null && !keepSet.has(square);
      slot.target = veiled ? SHROUD_OPACITY : 0;
      slot.delay = veiled ? (i++ % 12) * 0.012 : 0;
    }
  }

  setHover(square: SquareId | null): void {
    const mat = this.hoverRing.material as THREE.MeshBasicMaterial;
    if (!square) {
      mat.opacity = 0;
      return;
    }
    this.hoverRing.position.copy(squareToWorld(square, BOARD_TOP + 0.014));
    mat.opacity = 0.55;
  }

  impact(square: SquareId, color: number, strength: number): void {
    const wave = this.waves[this.waveCursor++ % this.waves.length];
    const centre = squareToWorld(square, BOARD_TOP + 0.02);
    wave.active = true;
    wave.age = 0;
    wave.duration = 0.45 + strength * 0.2;
    wave.ring.visible = true;
    wave.flare.visible = true;
    wave.ring.position.copy(centre);
    wave.flare.position.copy(centre).setY(BOARD_TOP + 0.03);
    wave.ringMaterial.color.setHex(color);
    wave.flareMaterial.color.setHex(color);
    wave.ring.scale.setScalar(0.2);
    wave.flare.scale.setScalar(0.4);
  }

  land(square: SquareId, color: number, strength: number): void {
    const ripple = this.landings[this.landingCursor++ % this.landings.length];
    const centre = squareToWorld(square, BOARD_TOP + 0.018);
    ripple.active = true;
    ripple.age = 0;
    ripple.strength = strength;
    ripple.duration = 0.4 + strength * 0.15;
    ripple.ring.visible = true;
    ripple.glow.visible = true;
    ripple.ring.position.copy(centre);
    ripple.glow.position.copy(centre).setY(BOARD_TOP + 0.014);
    ripple.ringMaterial.color.setHex(color);
    ripple.glowMaterial.color.setHex(color);
    ripple.ring.scale.setScalar(0.25);
  }

  /**
   * Splash where a piece fords the 楚河 — expanding rings + foam kick at world X.
   */
  splash(worldX: number, strength = 1): void {
    const s = Math.max(0.4, Math.min(2, strength));
    for (let i = 0; i < 2; i++) {
      const ring = this.splashRings[this.splashCursor++ % this.splashRings.length];
      ring.age = -i * 0.08;
      ring.life = 0.55 + s * 0.2;
      ring.mesh.visible = true;
      ring.mesh.position.set(worldX + (i === 0 ? 0 : 0.08), BOARD_TOP + 0.03, (i - 0.5) * 0.12);
      ring.mesh.scale.setScalar(0.15);
      ring.mat.opacity = 0.7 * s;
      ring.mat.color.setHex(i === 0 ? 0xb8e8e0 : 0x7ec8d0);
    }
    // Kick foam particles upward near the crossing.
    if (this.foamPoints && this.foamVelocities) {
      const pos = this.foamPoints.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        if (Math.abs(pos.getX(i) - worldX) < TILE * 1.2 && Math.random() > 0.55) {
          this.foamVelocities[i * 3 + 1] = 0.6 + Math.random() * 0.9 * s;
          this.foamVelocities[i * 3] = (Math.random() - 0.5) * 0.4;
          this.foamVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
        }
      }
    }
  }

  update(delta: number): void {
    this.elapsed += delta;

    // Dual-layer river flow — soft shimmer over the calligraphy band.
    if (this.riverFlow?.map) {
      this.riverFlow.map.offset.x = (this.elapsed * 0.06) % 1;
      this.riverFlow.opacity = 0.12 + 0.08 * Math.sin(this.elapsed * 1.2);
      this.riverFlow.needsUpdate = true;
    }
    if (this.riverFlow2?.map) {
      this.riverFlow2.map.offset.x = (-this.elapsed * 0.09) % 1;
      this.riverFlow2.opacity = 0.1 + 0.06 * Math.sin(this.elapsed * 1.4);
      this.riverFlow2.needsUpdate = true;
    }
    for (let i = 0; i < this.mistSprites.length; i++) {
      const mist = this.mistSprites[i];
      const mat = mist.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.2 + 0.16 * Math.sin(this.elapsed * 0.85 + i * 0.9);
      mist.position.x += Math.sin(this.elapsed * 0.35 + i) * delta * 0.08;
      // Soft wrap so mist stays over the river band.
      const half = TILE * 4.5;
      if (mist.position.x > half) mist.position.x -= half * 2;
      if (mist.position.x < -half) mist.position.x += half * 2;
    }

    this.updateFoam(delta);
    this.updateSplashRings(delta);

    for (const slot of this.slots.values()) {
      if (!slot.kind) {
        slot.glowMaterial.opacity = THREE.MathUtils.damp(slot.glowMaterial.opacity, 0, 12, delta);
        slot.markerMaterial.opacity = THREE.MathUtils.damp(slot.markerMaterial.opacity, 0, 12, delta);
        slot.beamMaterial.opacity = THREE.MathUtils.damp(slot.beamMaterial.opacity, 0, 12, delta);
        continue;
      }
      slot.age += delta;
      const pop = slot.age < 0 ? 0 : easeOutBack(Math.min(1, slot.age / POP_DURATION));
      const pulse = slot.pulse ? 0.85 + 0.15 * Math.sin(this.elapsed * 4 + slot.phase) : 1;
      slot.glowMaterial.opacity = GLOW_OPACITY[slot.kind] * pop * pulse;
      slot.markerMaterial.opacity = MARKER_OPACITY[slot.kind] * pop;
      slot.beamMaterial.opacity = BEAM_OPACITY[slot.kind] * pop * pulse;
      slot.marker.rotation.z += MARKER_SPIN[slot.kind] * delta;
      slot.beam.position.y = BOARD_TOP + 0.275 * (0.4 + pop * 0.6);
      slot.glow.scale.setScalar(0.7 + pop * 0.3);
    }

    for (const shroud of this.shrouds.values()) {
      if (shroud.delay > 0) {
        shroud.delay -= delta;
        continue;
      }
      shroud.current = THREE.MathUtils.damp(shroud.current, shroud.target, 10, delta);
      shroud.material.opacity = shroud.current;
    }

    for (const wave of this.waves) {
      if (!wave.active) continue;
      wave.age += delta;
      const t = wave.age / wave.duration;
      if (t >= 1) {
        wave.active = false;
        wave.ring.visible = false;
        wave.flare.visible = false;
        continue;
      }
      wave.ring.scale.setScalar(0.3 + t * 1.8);
      wave.ringMaterial.opacity = (1 - t) * 0.7;
      wave.flare.scale.setScalar(0.5 + t * 0.8);
      wave.flareMaterial.opacity = (1 - t) * 0.55;
    }

    for (const ripple of this.landings) {
      if (!ripple.active) continue;
      ripple.age += delta;
      const t = ripple.age / ripple.duration;
      if (t >= 1) {
        ripple.active = false;
        ripple.ring.visible = false;
        ripple.glow.visible = false;
        continue;
      }
      ripple.ring.scale.setScalar(0.3 + t * 1.2 * ripple.strength);
      ripple.ringMaterial.opacity = (1 - t) * 0.8;
      ripple.glowMaterial.opacity = (1 - t) * 0.45;
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }

  private track<T extends { dispose: () => void }>(value: T): T {
    this.disposables.push(value);
    return value;
  }
}
