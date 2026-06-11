import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import {
  Physics,
  GROUP_PLAYER,
  GROUP_WORLD,
  interactionGroups,
  GRAVITY,
} from '../core/Physics';
import type { Input } from '../core/Input';
import { MovingPlatform } from '../level/MovingPlatform';

// Capsule dimensions (dog-sized: ~0.9 m tall).
const CAPSULE_HALF_HEIGHT = 0.18;
const CAPSULE_RADIUS = 0.28;
const FOOT_OFFSET = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS;

// Movement tuning — the game feel lives in these numbers.
const RUN_SPEED = 7;
const GROUND_RESPONSE = 14; // how snappily velocity reaches its target
const AIR_RESPONSE = 5;
const JUMP_SPEED = 8.5;
const DOUBLE_JUMP_FACTOR = 0.92;
const COYOTE_TIME = 0.12;
const JUMP_BUFFER = 0.12;
const JUMP_CUT = 0.45; // vy multiplier when Space released mid-rise
const TERMINAL_VELOCITY = 25;
const GROUND_STICK = -2;
const TURN_RESPONSE = 12;

export class PlayerController {
  /** Visual root; origin at Mel's feet. The model/capsule mesh goes in here. */
  readonly root = new THREE.Group();

  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;

  velocity = new THREE.Vector3();
  grounded = false;
  /** Yaw the model is visually facing (damped toward movement direction). */
  facingYaw = 0;

  onJump: (() => void) | null = null;
  onDoubleJump: (() => void) | null = null;
  onLand: (() => void) | null = null;
  onRespawn: (() => void) | null = null;

  private characterController: RAPIER.KinematicCharacterController;
  private coyoteTimer = 0;
  private bufferTimer = 0;
  private canAirJump = true;
  private jumpCutApplied = true;
  private respawnPoint: THREE.Vector3;
  private killY: number;

  // scratch objects to avoid per-step allocation
  private desired = new THREE.Vector3();
  private targetVel = new THREE.Vector3();

  constructor(
    private physics: Physics,
    spawn: THREE.Vector3,
    killY: number,
  ) {
    this.respawnPoint = spawn.clone();
    this.killY = killY;

    this.body = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y, spawn.z),
    );
    this.collider = physics.world.createCollider(
      RAPIER.ColliderDesc.capsule(CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS).setCollisionGroups(
        interactionGroups(GROUP_PLAYER, GROUP_WORLD),
      ),
      this.body,
    );

    const cc = physics.world.createCharacterController(0.01);
    cc.enableAutostep(0.4, 0.2, true); // favela stairs walk up without jumping
    cc.enableSnapToGround(0.3); // ...and walk down without launching
    cc.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    cc.setMinSlopeSlideAngle((60 * Math.PI) / 180);
    cc.setApplyImpulsesToDynamicBodies(false);
    this.characterController = cc;
  }

  get position(): THREE.Vector3 {
    const t = this.body.translation();
    return new THREE.Vector3(t.x, t.y, t.z);
  }

  get horizontalSpeed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  setRespawnPoint(point: THREE.Vector3): void {
    this.respawnPoint.copy(point);
  }

  fixedUpdate(dt: number, input: Input, cameraYaw: number): void {
    // --- horizontal movement, camera-relative ---
    const inX = input.moveX;
    const inZ = input.moveZ;
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);
    // camera forward (horizontal) = (-sin, 0, -cos); right = (cos, 0, -sin)
    this.targetVel
      .set(-sin * inZ + cos * inX, 0, -cos * inZ - sin * inX)
      .normalize()
      .multiplyScalar(RUN_SPEED);

    const response = this.grounded ? GROUND_RESPONSE : AIR_RESPONSE;
    const blend = 1 - Math.exp(-response * dt);
    this.velocity.x += (this.targetVel.x - this.velocity.x) * blend;
    this.velocity.z += (this.targetVel.z - this.velocity.z) * blend;

    // --- jumping ---
    this.coyoteTimer = this.grounded ? COYOTE_TIME : Math.max(0, this.coyoteTimer - dt);
    this.bufferTimer = input.jumpPressed ? JUMP_BUFFER : Math.max(0, this.bufferTimer - dt);

    if (this.bufferTimer > 0) {
      if (this.coyoteTimer > 0) {
        this.velocity.y = JUMP_SPEED;
        this.coyoteTimer = 0;
        this.bufferTimer = 0;
        this.grounded = false;
        this.jumpCutApplied = false;
        this.onJump?.();
      } else if (this.canAirJump) {
        this.velocity.y = JUMP_SPEED * DOUBLE_JUMP_FACTOR;
        this.bufferTimer = 0;
        this.canAirJump = false;
        this.jumpCutApplied = false;
        this.onDoubleJump?.();
      }
    }

    // Variable jump height: cut the rise short when Space is released.
    if (!this.jumpCutApplied && !input.jumpHeld && this.velocity.y > 0) {
      this.velocity.y *= JUMP_CUT;
      this.jumpCutApplied = true;
    }

    // --- gravity ---
    this.velocity.y = Math.max(this.velocity.y - GRAVITY * dt, -TERMINAL_VELOCITY);

    // --- moving platform carry ---
    this.desired.copy(this.velocity).multiplyScalar(dt);
    const platform = this.grounded ? this.groundPlatform() : null;
    if (platform) this.desired.add(platform.delta);

    // --- character controller step ---
    this.characterController.computeColliderMovement(
      this.collider,
      this.desired,
      undefined,
      interactionGroups(GROUP_PLAYER, GROUP_WORLD),
    );
    const movement = this.characterController.computedMovement();
    const t = this.body.translation();
    this.body.setNextKinematicTranslation({
      x: t.x + movement.x,
      y: t.y + movement.y,
      z: t.z + movement.z,
    });

    const wasGrounded = this.grounded;
    this.grounded = this.characterController.computedGrounded();
    if (this.grounded) {
      this.canAirJump = true;
      if (this.velocity.y < 0) this.velocity.y = GROUND_STICK;
      if (!wasGrounded) this.onLand?.();
    } else if (this.velocity.y > 0 && movement.y < this.desired.y - 1e-4) {
      this.velocity.y = 0; // bonked head on a ceiling
    }

    // --- kill plane ---
    if (t.y < this.killY) this.respawn();
  }

  /** Per-frame: sync visual root to physics body, damp facing toward velocity. */
  update(dt: number): void {
    const t = this.body.translation();
    this.root.position.set(t.x, t.y - FOOT_OFFSET, t.z);

    if (this.horizontalSpeed > 0.5) {
      const targetYaw = Math.atan2(this.velocity.x, this.velocity.z);
      let diff = targetYaw - this.facingYaw;
      diff = ((diff + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      this.facingYaw += diff * (1 - Math.exp(-TURN_RESPONSE * dt));
    }
    this.root.rotation.y = this.facingYaw;
  }

  private respawn(): void {
    this.body.setTranslation(
      { x: this.respawnPoint.x, y: this.respawnPoint.y, z: this.respawnPoint.z },
      true,
    );
    this.velocity.set(0, 0, 0);
    this.grounded = false;
    this.canAirJump = true;
    this.onRespawn?.();
  }

  /** The moving platform under our feet, if any. */
  private groundPlatform(): MovingPlatform | null {
    const t = this.body.translation();
    const ray = new RAPIER.Ray({ x: t.x, y: t.y, z: t.z }, { x: 0, y: -1, z: 0 });
    const hit = this.physics.world.castRay(
      ray,
      FOOT_OFFSET + 0.3,
      true,
      undefined,
      interactionGroups(GROUP_PLAYER, GROUP_WORLD),
      this.collider,
    );
    if (!hit) return null;
    const tag = this.physics.getTag(hit.collider.handle);
    return tag instanceof MovingPlatform ? tag : null;
  }
}
