import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Physics, GROUP_WORLD, interactionGroups } from '../core/Physics';
import type { Input } from '../core/Input';

const DISTANCE = 5;
const MIN_DISTANCE = 0.8;
const PIVOT_HEIGHT = 0.9;
const PITCH_MIN = (-60 * Math.PI) / 180;
const PITCH_MAX = (35 * Math.PI) / 180;
const SENSITIVITY = 0.0025;
const PIVOT_RESPONSE = 10;
const RECOVER_RESPONSE = 4; // easing back out after an occlusion
const COLLISION_RADIUS = 0.25;

/**
 * Stray-like third-person orbit camera. A sphere-cast from the pivot keeps it
 * out of walls: it snaps inward instantly when occluded and eases back out.
 */
export class ThirdPersonCamera {
  readonly camera: THREE.PerspectiveCamera;
  yaw = Math.PI; // start behind the player looking at -Z... tuned by Game
  pitch = -0.25;

  private pivot = new THREE.Vector3();
  private currentDistance = DISTANCE;
  private collisionShape: RAPIER.Ball;

  // scratch
  private desiredDir = new THREE.Vector3();
  private lookTarget = new THREE.Vector3();

  constructor(private physics: Physics, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 300);
    this.collisionShape = new RAPIER.Ball(COLLISION_RADIUS);
  }

  /** Snap everything to the player immediately (spawn, respawn). */
  reset(playerPos: THREE.Vector3): void {
    this.pivot.copy(playerPos).add(new THREE.Vector3(0, PIVOT_HEIGHT, 0));
    this.currentDistance = DISTANCE;
    this.updateTransform();
  }

  update(dt: number, playerPos: THREE.Vector3, input: Input): void {
    if (input.pointerLocked) {
      this.yaw -= input.mouseDX * SENSITIVITY;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - input.mouseDY * SENSITIVITY,
        PITCH_MIN,
        PITCH_MAX,
      );
    }
    if (input.gpLookX || input.gpLookY) {
      this.yaw -= input.gpLookX * 2.4 * dt;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - input.gpLookY * 1.8 * dt,
        PITCH_MIN,
        PITCH_MAX,
      );
    }

    const blend = 1 - Math.exp(-PIVOT_RESPONSE * dt);
    this.pivot.lerp(
      new THREE.Vector3(playerPos.x, playerPos.y + PIVOT_HEIGHT, playerPos.z),
      blend,
    );

    // Occlusion: sphere-cast from pivot toward the desired camera position.
    this.computeDesiredDir();
    const hit = this.physics.world.castShape(
      this.pivot,
      { x: 0, y: 0, z: 0, w: 1 },
      this.desiredDir,
      this.collisionShape,
      0,
      DISTANCE,
      true,
      undefined,
      interactionGroups(0xffff, GROUP_WORLD),
    );
    const freeDistance = hit ? Math.max(hit.time_of_impact - 0.05, MIN_DISTANCE) : DISTANCE;

    if (freeDistance < this.currentDistance) {
      this.currentDistance = freeDistance; // snap in: never clip through walls
    } else {
      this.currentDistance +=
        (freeDistance - this.currentDistance) * (1 - Math.exp(-RECOVER_RESPONSE * dt));
    }

    this.updateTransform();
  }

  private computeDesiredDir(): void {
    this.desiredDir.set(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      -Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
  }

  private updateTransform(): void {
    this.computeDesiredDir();
    this.camera.position
      .copy(this.pivot)
      .addScaledVector(this.desiredDir, this.currentDistance);
    this.lookTarget.copy(this.pivot).add(new THREE.Vector3(0, 0.2, 0));
    this.camera.lookAt(this.lookTarget);
  }
}
