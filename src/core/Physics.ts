import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

// Collision group memberships (Rapier packs membership << 16 | filter).
export const GROUP_WORLD = 0x0001;
export const GROUP_PLAYER = 0x0002;
export const GROUP_SENSOR = 0x0004;

export function interactionGroups(membership: number, filter: number): number {
  return (membership << 16) | filter;
}

export const GRAVITY = 22; // ~2.25x real gravity — platformers want snappy falls

/**
 * Owns the Rapier world. All static level collision uses cuboids only —
 * trimeshes cause ghost-edge snags with kinematic character controllers.
 */
export class Physics {
  readonly world: RAPIER.World;
  readonly eventQueue: RAPIER.EventQueue;

  /** Collider handle → arbitrary gameplay object (moving platforms, checkpoints). */
  private tags = new Map<number, unknown>();

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });
    this.world.timestep = 1 / 60;
    this.eventQueue = new RAPIER.EventQueue(true);
  }

  step(): void {
    this.world.step(this.eventQueue);
  }

  addStaticCuboid(
    center: THREE.Vector3,
    halfExtents: THREE.Vector3,
    rotY = 0,
  ): RAPIER.Collider {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    const desc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
      .setTranslation(center.x, center.y, center.z)
      .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
      .setCollisionGroups(interactionGroups(GROUP_WORLD, GROUP_PLAYER | GROUP_WORLD));
    return this.world.createCollider(desc);
  }

  addStaticCylinder(
    center: THREE.Vector3,
    halfHeight: number,
    radius: number,
  ): RAPIER.Collider {
    const desc = RAPIER.ColliderDesc.cylinder(halfHeight, radius)
      .setTranslation(center.x, center.y, center.z)
      .setCollisionGroups(interactionGroups(GROUP_WORLD, GROUP_PLAYER | GROUP_WORLD));
    return this.world.createCollider(desc);
  }

  tagCollider(collider: RAPIER.Collider, tag: unknown): void {
    this.tags.set(collider.handle, tag);
  }

  getTag(handle: number): unknown {
    return this.tags.get(handle);
  }
}
