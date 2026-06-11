import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Physics, GROUP_WORLD, GROUP_PLAYER, interactionGroups } from '../core/Physics';
import type { MovingPlatformDef } from './LevelData';

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}

export class MovingPlatform {
  readonly mesh: THREE.Mesh;
  readonly body: RAPIER.RigidBody;
  /** World-space movement applied during the last fixed step; players standing on top inherit it. */
  readonly delta = new THREE.Vector3();

  private from: THREE.Vector3;
  private to: THREE.Vector3;
  private period: number;
  private pause: number;
  private time = 0;
  private position = new THREE.Vector3();

  constructor(physics: Physics, def: MovingPlatformDef) {
    this.from = new THREE.Vector3(def.from.x, def.from.y, def.from.z);
    this.to = new THREE.Vector3(def.to.x, def.to.y, def.to.z);
    this.period = def.period;
    this.pause = def.pause ?? 0;

    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(def.size.x, def.size.y, def.size.z),
      new THREE.MeshStandardMaterial({ color: def.color ?? '#c98c3c' }),
    );
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    this.body = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        this.from.x,
        this.from.y,
        this.from.z,
      ),
    );
    const collider = physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(def.size.x / 2, def.size.y / 2, def.size.z / 2)
        .setCollisionGroups(interactionGroups(GROUP_WORLD, GROUP_PLAYER | GROUP_WORLD)),
      this.body,
    );
    physics.tagCollider(collider, this);

    this.position.copy(this.from);
    this.mesh.position.copy(this.from);
  }

  fixedUpdate(dt: number): void {
    this.time += dt;
    const cycle = 2 * (this.period + this.pause);
    let t = this.time % cycle;

    let alpha: number;
    if (t < this.period) {
      alpha = easeInOut(t / this.period); // going
    } else if (t < this.period + this.pause) {
      alpha = 1; // paused at far end
    } else if (t < 2 * this.period + this.pause) {
      alpha = easeInOut(1 - (t - this.period - this.pause) / this.period); // returning
    } else {
      alpha = 0; // paused at start
    }

    const next = this.from.clone().lerp(this.to, alpha);
    this.delta.subVectors(next, this.position);
    this.position.copy(next);
    this.body.setNextKinematicTranslation({ x: next.x, y: next.y, z: next.z });
    this.mesh.position.copy(next);
  }
}
