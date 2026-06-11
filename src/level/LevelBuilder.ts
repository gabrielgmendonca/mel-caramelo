import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Physics } from '../core/Physics';
import type { LevelData, StairsDef } from './LevelData';
import { MovingPlatform } from './MovingPlatform';
import { buildHouse } from './FavelaHouse';
import { Decorations } from './Decorations';
import { corrugatedTexture, DARK_INSET } from '../textures/procedural';

const DEFAULT_STEP_HEIGHT = 0.18;
const DEFAULT_STEP_DEPTH = 0.3;

/**
 * Turns LevelData into meshes + colliders. Geometry and collision come from
 * the same definitions so they can never drift apart. All static geometry is
 * batched per material into one merged mesh each to keep draw calls low.
 */
export class LevelBuilder {
  readonly group = new THREE.Group();
  readonly movingPlatforms: MovingPlatform[] = [];

  private batches = new Map<string, THREE.BufferGeometry[]>();
  private decorations: Decorations | null = null;

  constructor(private physics: Physics) {}

  build(data: LevelData): void {
    for (const p of data.platforms) {
      this.addBox(
        new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z),
        new THREE.Vector3(p.size.x, p.size.y, p.size.z),
        p.rotY ?? 0,
        p.color ?? '#8d8d8d',
      );
    }

    for (const p of data.props) {
      this.addBox(
        new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z),
        new THREE.Vector3(p.size.x, p.size.y, p.size.z),
        p.rotY ?? 0,
        p.color ?? '#9b7653',
      );
    }

    for (const s of data.stairs) this.buildStairs(s);

    for (const h of data.houses) {
      const { parts, colliders } = buildHouse(h);
      for (const part of parts) this.batch(part.materialKey).push(part.geometry);
      for (const c of colliders) this.physics.addStaticCuboid(c.center, c.halfExtents, c.rotY);
    }

    for (const t of data.waterTowers) {
      this.buildWaterTower(new THREE.Vector3(t.pos.x, t.pos.y, t.pos.z), t.legHeight, t.tankRadius, t.tankHeight);
    }

    for (const def of data.movingPlatforms) {
      const platform = new MovingPlatform(this.physics, def);
      this.movingPlatforms.push(platform);
      this.group.add(platform.mesh);
    }

    this.decorations = new Decorations(data.cables, data.laundry);
    this.group.add(this.decorations.group);

    this.finalize();
  }

  fixedUpdate(dt: number): void {
    for (const p of this.movingPlatforms) p.fixedUpdate(dt);
  }

  update(time: number): void {
    this.decorations?.update(time);
  }

  /** Box geometry batched per color + matching cuboid collider. */
  addBox(center: THREE.Vector3, size: THREE.Vector3, rotY: number, color: string): void {
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    geo.rotateY(rotY);
    geo.translate(center.x, center.y, center.z);
    this.batch(color).push(geo);
    this.physics.addStaticCuboid(center, size.clone().multiplyScalar(0.5), rotY);
  }

  private buildStairs(s: StairsDef): void {
    const stepH = s.stepHeight ?? DEFAULT_STEP_HEIGHT;
    const stepD = s.stepDepth ?? DEFAULT_STEP_DEPTH;
    const dir = new THREE.Vector3(Math.sin(s.rotY), 0, Math.cos(s.rotY));

    for (let i = 0; i < s.steps; i++) {
      // Full-height blocks from the ground up — solid poured-concrete favela
      // stairs with no gaps underneath.
      const h = stepH * (i + 1);
      const center = new THREE.Vector3(s.pos.x, s.pos.y, s.pos.z)
        .addScaledVector(dir, stepD * (i + 0.5));
      center.y = s.pos.y + h / 2;
      this.addBox(center, new THREE.Vector3(s.width, h, stepD), s.rotY, '#a8a098');
    }
  }

  private buildWaterTower(
    base: THREE.Vector3,
    legHeight: number,
    tankRadius: number,
    tankHeight: number,
  ): void {
    const legOffset = tankRadius * 0.6;
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      this.addBox(
        new THREE.Vector3(base.x + lx * legOffset, base.y + legHeight / 2, base.z + lz * legOffset),
        new THREE.Vector3(0.18, legHeight, 0.18),
        0,
        '#6b5b4a',
      );
    }
    const tank = new THREE.CylinderGeometry(tankRadius, tankRadius, tankHeight, 20);
    const tankCenter = new THREE.Vector3(base.x, base.y + legHeight + tankHeight / 2, base.z);
    tank.translate(tankCenter.x, tankCenter.y, tankCenter.z);
    this.batch('#5d87a8').push(tank);
    this.physics.addStaticCylinder(tankCenter, tankHeight / 2, tankRadius);
  }

  private batch(key: string): THREE.BufferGeometry[] {
    let list = this.batches.get(key);
    if (!list) {
      list = [];
      this.batches.set(key, list);
    }
    return list;
  }

  /** Merge each material batch into a single mesh. */
  private finalize(): void {
    for (const [key, geos] of this.batches) {
      const merged = mergeGeometries(geos, false);
      let material: THREE.MeshStandardMaterial;
      if (key === 'roof') {
        material = new THREE.MeshStandardMaterial({
          map: corrugatedTexture(),
          roughness: 0.85,
          metalness: 0.25,
        });
      } else if (key === DARK_INSET) {
        material = new THREE.MeshStandardMaterial({
          color: DARK_INSET,
          side: THREE.DoubleSide,
        });
      } else {
        material = new THREE.MeshStandardMaterial({ color: key, roughness: 0.9 });
      }
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      for (const g of geos) g.dispose();
    }
    this.batches.clear();
  }
}
