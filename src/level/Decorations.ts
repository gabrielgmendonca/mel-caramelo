import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CableDef, LaundryDef } from './LevelData';
import { mulberry32 } from '../textures/procedural';

const CLOTH_COLORS = ['#e8e3d8', '#7fb3d5', '#e59866', '#a9dfbf', '#f5b7b1'];

/** Power cables and laundry lines — pure atmosphere, no colliders. */
export class Decorations {
  readonly group = new THREE.Group();

  private cloths: Array<{ mesh: THREE.Mesh; phase: number }> = [];

  constructor(cables: CableDef[], laundry: LaundryDef[]) {
    const cableGeos: THREE.BufferGeometry[] = [];
    for (const c of cables) {
      cableGeos.push(this.sagTube(c.from, c.to, c.sag, 0.018));
    }
    for (const l of laundry) {
      cableGeos.push(this.sagTube(l.from, l.to, 0.25, 0.01));
    }
    if (cableGeos.length > 0) {
      const merged = mergeGeometries(cableGeos, false);
      const mesh = new THREE.Mesh(
        merged,
        new THREE.MeshStandardMaterial({ color: '#181818' }),
      );
      this.group.add(mesh);
    }

    // Clothes pinned along each laundry line, swaying in the breeze.
    const rng = mulberry32(1234);
    for (const l of laundry) {
      const from = new THREE.Vector3(l.from.x, l.from.y, l.from.z);
      const to = new THREE.Vector3(l.to.x, l.to.y, l.to.z);
      const count = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < count; i++) {
        const t = (i + 1) / (count + 1);
        const pos = from.clone().lerp(to, t);
        pos.y -= 0.25 * Math.sin(Math.PI * t) * 4 * t * (1 - t) + 0.02;
        const cloth = new THREE.Mesh(
          new THREE.PlaneGeometry(0.45 + rng() * 0.2, 0.55 + rng() * 0.25),
          new THREE.MeshStandardMaterial({
            color: CLOTH_COLORS[Math.floor(rng() * CLOTH_COLORS.length)],
            side: THREE.DoubleSide,
          }),
        );
        cloth.geometry.translate(0, -0.3, 0); // hang from the pin point
        cloth.position.copy(pos);
        cloth.lookAt(pos.clone().add(new THREE.Vector3(to.z - from.z, 0, from.x - to.x)));
        this.cloths.push({ mesh: cloth, phase: rng() * Math.PI * 2 });
        this.group.add(cloth);
      }
    }
  }

  update(time: number): void {
    for (const { mesh, phase } of this.cloths) {
      mesh.rotation.x = Math.sin(time * 1.3 + phase) * 0.12;
    }
  }

  private sagTube(
    fromDef: { x: number; y: number; z: number },
    toDef: { x: number; y: number; z: number },
    sag: number,
    radius: number,
  ): THREE.BufferGeometry {
    const from = new THREE.Vector3(fromDef.x, fromDef.y, fromDef.z);
    const to = new THREE.Vector3(toDef.x, toDef.y, toDef.z);
    const mid = from.clone().lerp(to, 0.5);
    mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    return new THREE.TubeGeometry(curve, 10, radius, 4, false);
  }
}
