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

  constructor() {
    this.group.name = "xiangqi-board";
    const geom = getBoardGeometry();

    const width = (geom.fileCount - 1) * TILE + TILE * 1.35;
    const depth = (geom.rankCount - 1) * TILE + TILE * 1.35;

    const wood = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xc4a06a,
        roughness: 0.62,
        metalness: 0.08,
      }),
    );
    this.baseMaterial = wood;

    const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, depth), wood);
    slab.position.y = BOARD_TOP - 0.11;
    slab.receiveShadow = true;
    slab.castShadow = true;
    this.group.add(slab);

    const rim = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x8b1e1e,
        roughness: 0.45,
        metalness: 0.25,
        emissive: 0x3a0808,
        emissiveIntensity: 0.15,
      }),
    );
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.28, 0.28, depth + 0.28),
      rim,
    );
    frame.position.y = BOARD_TOP - 0.16;
    frame.receiveShadow = true;
    this.group.add(frame);

    // River band between ranks 4 and 5.
    const river = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x6a9bb8,
        roughness: 0.35,
        metalness: 0.2,
        transparent: true,
        opacity: 0.55,
        emissive: 0x1a3344,
        emissiveIntensity: 0.25,
      }),
    );
    this.riverMaterial = river;
    const riverMesh = new THREE.Mesh(new THREE.PlaneGeometry((geom.fileCount - 1) * TILE, TILE * 0.92), river);
    riverMesh.rotation.x = -Math.PI / 2;
    riverMesh.position.set(0, BOARD_TOP + 0.002, 0);
    this.group.add(riverMesh);

    // Grid lines
    const lineMat = this.track(new THREE.LineBasicMaterial({ color: 0x2a1810, transparent: true, opacity: 0.85 }));
    this.lineMaterial = lineMat;
    const points: THREE.Vector3[] = [];
    for (let r = 0; r < geom.rankCount; r++) {
      const z = (geom.halfRanks - r) * TILE;
      const x0 = -geom.halfFiles * TILE;
      const x1 = geom.halfFiles * TILE;
      points.push(new THREE.Vector3(x0, BOARD_TOP + 0.004, z), new THREE.Vector3(x1, BOARD_TOP + 0.004, z));
    }
    for (let f = 0; f < geom.fileCount; f++) {
      const x = (f - geom.halfFiles) * TILE;
      // Vertical lines break at the river (except edges).
      if (f === 0 || f === geom.fileCount - 1) {
        points.push(
          new THREE.Vector3(x, BOARD_TOP + 0.004, geom.halfRanks * TILE),
          new THREE.Vector3(x, BOARD_TOP + 0.004, -geom.halfRanks * TILE),
        );
      } else {
        points.push(
          new THREE.Vector3(x, BOARD_TOP + 0.004, geom.halfRanks * TILE),
          new THREE.Vector3(x, BOARD_TOP + 0.004, 0.5 * TILE),
          new THREE.Vector3(x, BOARD_TOP + 0.004, -0.5 * TILE),
          new THREE.Vector3(x, BOARD_TOP + 0.004, -geom.halfRanks * TILE),
        );
      }
    }
    // Palace diagonals
    for (const baseRank of [0, 7]) {
      const z0 = (geom.halfRanks - baseRank) * TILE;
      const z2 = (geom.halfRanks - (baseRank + 2)) * TILE;
      const x3 = (3 - geom.halfFiles) * TILE;
      const x5 = (5 - geom.halfFiles) * TILE;
      points.push(
        new THREE.Vector3(x3, BOARD_TOP + 0.005, z0),
        new THREE.Vector3(x5, BOARD_TOP + 0.005, z2),
        new THREE.Vector3(x5, BOARD_TOP + 0.005, z0),
        new THREE.Vector3(x3, BOARD_TOP + 0.005, z2),
      );
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    this.group.add(new THREE.LineSegments(lineGeo, lineMat));

    // River labels (楚河 / 汉界) as simple planes with canvas textures
    this.addRiverLabel("楚 河", -2.2 * TILE, "#1a3050");
    this.addRiverLabel("汉 界", 2.2 * TILE, "#5a1515");

    this.markerMaps.select = this.track(selectMarkerTexture());
    this.markerMaps.move = this.track(moveMarkerTexture());
    this.markerMaps.capture = this.track(captureMarkerTexture());
    this.markerMaps.check = this.track(captureMarkerTexture());
    this.markerMaps.hint = this.track(moveMarkerTexture());
    this.markerMaps.last = this.track(radialTexture("#ffd27a", "rgba(0,0,0,0)"));

    const hitGeo = new THREE.CircleGeometry(TILE * 0.38, 20);
    hitGeo.rotateX(-Math.PI / 2);
    const hitMat = this.track(new THREE.MeshBasicMaterial({ visible: false }));

    for (const square of geom.allSquares()) {
      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.position.copy(squareToWorld(square, BOARD_TOP + 0.01));
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
    this.hoverRing = new THREE.Mesh(new THREE.CircleGeometry(TILE * 0.42, 28), hoverMat);
    this.hoverRing.rotation.x = -Math.PI / 2;
    this.hoverRing.position.y = BOARD_TOP + 0.012;
    this.group.add(this.hoverRing);

    this.initWaves();
    this.initLandings();
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
    const glow = new THREE.Mesh(new THREE.CircleGeometry(TILE * 0.48, 24), glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.copy(squareToWorld(square, BOARD_TOP + 0.008));
    this.group.add(glow);

    const markerMat = this.track(
      new THREE.MeshBasicMaterial({
        map: this.markerMaps.move ?? null,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    const marker = new THREE.Mesh(new THREE.CircleGeometry(TILE * 0.36, 28), markerMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.copy(squareToWorld(square, BOARD_TOP + 0.016));
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
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 0.55, 10, 1, true), beamMat);
    beam.position.copy(squareToWorld(square, BOARD_TOP + 0.275));
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

  update(delta: number): void {
    this.elapsed += delta;
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
