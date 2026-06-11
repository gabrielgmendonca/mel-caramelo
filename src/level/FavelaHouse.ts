import * as THREE from 'three';
import type { HouseDef } from './LevelData';
import { FAVELA_PALETTE, DARK_INSET, mulberry32 } from '../textures/procedural';

const FLOOR_HEIGHT = 2.6;
const PARAPET_HEIGHT = 0.5;
const PARAPET_THICKNESS = 0.12;

export interface HousePart {
  geometry: THREE.BufferGeometry; // already in world space
  materialKey: string; // palette color, 'roof', or DARK_INSET
}

export interface HouseCollider {
  center: THREE.Vector3;
  halfExtents: THREE.Vector3;
  rotY: number;
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);

/**
 * Stacked-box favela house: each floor's footprint jitters slightly (the
 * signature silhouette), windows/doors are dark inset planes, the roof is
 * either a walkable terrace with parapets or a corrugated-metal slab.
 * Deterministic per position so the level never reshuffles.
 */
export function buildHouse(def: HouseDef): { parts: HousePart[]; colliders: HouseCollider[] } {
  const rng = mulberry32(Math.round(def.pos.x * 73 + def.pos.z * 1031 + def.floors * 7));
  const parts: HousePart[] = [];
  const colliders: HouseCollider[] = [];

  const toWorld = (g: THREE.BufferGeometry): THREE.BufferGeometry => {
    g.rotateY(def.rotY);
    g.translate(def.pos.x, def.pos.y, def.pos.z);
    return g;
  };
  const colliderAt = (local: THREE.Vector3, halfExtents: THREE.Vector3): void => {
    const world = local.clone().applyAxisAngle(Y_AXIS, def.rotY);
    world.x += def.pos.x;
    world.y += def.pos.y;
    world.z += def.pos.z;
    colliders.push({ center: world, halfExtents, rotY: def.rotY });
  };

  const baseColor = FAVELA_PALETTE[(def.palette ?? 0) % FAVELA_PALETTE.length];
  let w = def.w;
  let d = def.d;
  let ox = 0;
  let oz = 0;

  for (let floor = 0; floor < def.floors; floor++) {
    if (floor > 0) {
      w = THREE.MathUtils.clamp(w + (rng() - 0.5) * 1.0, 2.4, def.w + 0.5);
      d = THREE.MathUtils.clamp(d + (rng() - 0.5) * 1.0, 2.4, def.d + 0.5);
      ox += (rng() - 0.5) * 0.6;
      oz += (rng() - 0.5) * 0.6;
    }
    const yCenter = FLOOR_HEIGHT * (floor + 0.5);
    const color =
      floor === 0 || rng() < 0.6
        ? baseColor
        : FAVELA_PALETTE[Math.floor(rng() * FAVELA_PALETTE.length)];

    const box = new THREE.BoxGeometry(w, FLOOR_HEIGHT, d);
    box.translate(ox, yCenter, oz);
    parts.push({ geometry: toWorld(box), materialKey: color });
    colliderAt(
      new THREE.Vector3(ox, yCenter, oz),
      new THREE.Vector3(w / 2, FLOOR_HEIGHT / 2, d / 2),
    );

    // windows on the front face (+z) and occasionally the sides
    const facesToDress: Array<[number, number]> = [[0, 1]]; // [rotY multiplier of π/2, axis sign] front
    if (rng() < 0.5) facesToDress.push([1, 1]);
    if (rng() < 0.5) facesToDress.push([1, -1]);
    for (const [side, sign] of facesToDress) {
      const count = 1 + (rng() < 0.5 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        const win = new THREE.PlaneGeometry(0.55, 0.65);
        const along = (i - (count - 1) / 2) * 1.2 + (rng() - 0.5) * 0.4;
        if (side === 0) {
          win.translate(ox + along, yCenter + 0.25, oz + d / 2 + 0.02);
        } else {
          win.rotateY((Math.PI / 2) * sign);
          win.translate(ox + (w / 2 + 0.02) * sign, yCenter + 0.25, oz + along);
        }
        parts.push({ geometry: toWorld(win), materialKey: DARK_INSET });
      }
    }

    if (floor === 0) {
      const door = new THREE.PlaneGeometry(0.9, 1.9);
      door.translate(ox + (rng() - 0.5) * (w / 2 - 1), 0.95, oz + d / 2 + 0.02);
      parts.push({ geometry: toWorld(door), materialKey: DARK_INSET });
    }
  }

  // --- roof ---
  const roofY = FLOOR_HEIGHT * def.floors;
  if (def.roofTerrace) {
    const slab = new THREE.BoxGeometry(w + 0.2, 0.15, d + 0.2);
    slab.translate(ox, roofY + 0.075, oz);
    parts.push({ geometry: toWorld(slab), materialKey: '#b8a89a' });
    colliderAt(
      new THREE.Vector3(ox, roofY + 0.075, oz),
      new THREE.Vector3((w + 0.2) / 2, 0.075, (d + 0.2) / 2),
    );

    const py = roofY + 0.15 + PARAPET_HEIGHT / 2;
    const edges: Array<[number, number, number, number]> = [
      [ox, oz + d / 2, w + 0.2, PARAPET_THICKNESS],
      [ox, oz - d / 2, w + 0.2, PARAPET_THICKNESS],
      [ox + w / 2, oz, PARAPET_THICKNESS, d + 0.2],
      [ox - w / 2, oz, PARAPET_THICKNESS, d + 0.2],
    ];
    for (const [ex, ez, ew, ed] of edges) {
      const wall = new THREE.BoxGeometry(ew, PARAPET_HEIGHT, ed);
      wall.translate(ex, py, ez);
      parts.push({ geometry: toWorld(wall), materialKey: baseColor });
      colliderAt(
        new THREE.Vector3(ex, py, ez),
        new THREE.Vector3(ew / 2, PARAPET_HEIGHT / 2, ed / 2),
      );
    }
  } else {
    const sheet = new THREE.BoxGeometry(w + 0.6, 0.08, d + 0.6);
    sheet.translate(ox, roofY + 0.04, oz);
    parts.push({ geometry: toWorld(sheet), materialKey: 'roof' });
    colliderAt(
      new THREE.Vector3(ox, roofY + 0.04, oz),
      new THREE.Vector3((w + 0.6) / 2, 0.04, (d + 0.6) / 2),
    );
  }

  return { parts, colliders };
}
