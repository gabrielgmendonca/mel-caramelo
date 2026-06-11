import * as THREE from 'three';

const PICKUP_RADIUS = 0.9;
const PICKUP_ANIM_TIME = 0.35;

/**
 * Base for spinning/bobbing pickups. Detection is a squared-distance check
 * against the player — cheaper and simpler than physics sensors at this scale.
 */
export abstract class Collectible {
  readonly root = new THREE.Group();
  collected = false;

  private basePos: THREE.Vector3;
  private animTimer = -1;
  protected spinSpeed = 2.5;

  constructor(position: THREE.Vector3) {
    this.basePos = position.clone();
    this.root.position.copy(position);
  }

  /** True exactly once, on the frame the player grabs it. */
  tryCollect(playerCenter: THREE.Vector3): boolean {
    if (this.collected) return false;
    if (this.root.position.distanceToSquared(playerCenter) > PICKUP_RADIUS * PICKUP_RADIUS) {
      return false;
    }
    this.collected = true;
    this.animTimer = 0;
    return true;
  }

  update(dt: number, time: number): void {
    if (this.collected) {
      if (this.animTimer < 0) return;
      this.animTimer += dt;
      const t = Math.min(this.animTimer / PICKUP_ANIM_TIME, 1);
      this.root.position.y = this.basePos.y + t * 1.2;
      const s = 1 + t * 0.6;
      this.root.scale.setScalar(s * (1 - t * t));
      if (t >= 1) {
        this.root.visible = false;
        this.animTimer = -1;
      }
      return;
    }
    this.root.rotation.y = time * this.spinSpeed;
    this.root.position.y = this.basePos.y + Math.sin(time * 2.2 + this.basePos.x) * 0.08;
  }
}
