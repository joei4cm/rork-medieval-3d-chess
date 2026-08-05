import * as THREE from "three";

import type { Faction } from "../core/types";
import {
  xiangqiClayAlbedo,
  xiangqiClayRoughness,
  xiangqiLacquerAlbedo,
} from "./xiangqiTextures";

/**
 * Shared PBR recipes for Xiangqi — mirrors western clearcoat / envMapIntensity
 * tuning while keeping terracotta + lacquer identity (no western GLBs).
 */

const clayAlbedoCache = new Map<Faction, THREE.Texture>();
const clayRoughCache = new Map<string, THREE.Texture>();
const lacquerCache = new Map<Faction, THREE.Texture>();

function clayMap(faction: Faction): THREE.Texture {
  let tex = clayAlbedoCache.get(faction);
  if (!tex) {
    tex = xiangqiClayAlbedo(faction);
    clayAlbedoCache.set(faction, tex);
  }
  return tex;
}

function clayRough(dark: boolean): THREE.Texture {
  const key = dark ? "d" : "l";
  let tex = clayRoughCache.get(key);
  if (!tex) {
    tex = xiangqiClayRoughness(dark);
    clayRoughCache.set(key, tex);
  }
  return tex;
}

function lacquerMap(faction: Faction): THREE.Texture {
  let tex = lacquerCache.get(faction);
  if (!tex) {
    tex = xiangqiLacquerAlbedo(faction);
    lacquerCache.set(faction, tex);
  }
  return tex;
}

/** Fired pottery body — subtle albedo + roughness, soft env response. */
export function clayMaterial(
  faction: Faction,
  tint: number,
  opts: { dark?: boolean; roughness?: number; metalness?: number } = {},
): THREE.MeshStandardMaterial {
  const dark = opts.dark ?? false;
  return new THREE.MeshStandardMaterial({
    map: clayMap(faction),
    color: tint,
    roughness: opts.roughness ?? (dark ? 0.78 : 0.68),
    metalness: opts.metalness ?? 0.08,
    roughnessMap: clayRough(dark),
    envMapIntensity: 0.55,
  });
}

/** Polished vermilion / black lacquer with clearcoat (western marble parity). */
export function lacquerMaterial(
  faction: Faction,
  tint: number,
  opts: { emissive?: number; emissiveIntensity?: number } = {},
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    map: lacquerMap(faction),
    color: tint,
    roughness: 0.22,
    metalness: 0.12,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.05,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
}

/** Aged bronze / gold trim — catches hall env like western weapon steel. */
export function bronzeMaterial(
  tint: number,
  opts: { emissive?: number; emissiveIntensity?: number } = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: tint,
    roughness: 0.28,
    metalness: 0.92,
    envMapIntensity: 1.35,
    emissive: opts.emissive ?? 0x2a1a06,
    emissiveIntensity: opts.emissiveIntensity ?? 0.22,
  });
}

/** Dark leather / boot — matte but still env-aware. */
export function leatherMaterial(tint: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: tint,
    roughness: 0.82,
    metalness: 0.04,
    envMapIntensity: 0.35,
  });
}

/** Armor plates — slightly greasier clay with metal flecks. */
export function armorMaterial(faction: Faction, tint: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: clayMap(faction),
    color: tint,
    roughness: 0.55,
    metalness: 0.22,
    roughnessMap: clayRough(true),
    envMapIntensity: 0.75,
  });
}

/** Lit glyph (not MeshBasic) so hall lighting reaches the seal. */
export function glyphMaterial(map: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    depthWrite: false,
    roughness: 0.45,
    metalness: 0.05,
    envMapIntensity: 0.4,
    emissive: 0x221108,
    emissiveIntensity: 0.15,
  });
}

/** Wood disc underside. */
export function woodMaterial(tint: number, map?: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: map ?? null,
    color: tint,
    roughness: 0.48,
    metalness: 0.08,
    envMapIntensity: 0.7,
  });
}
