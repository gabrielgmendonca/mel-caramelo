import * as THREE from 'three';
import type { CheckpointDef } from '../level/LevelData';

/**
 * Invisible box volume; entering it moves Mel's respawn point. Visualized as
 * a small flag that lights up caramel once reached. Plain AABB checks — no
 * physics plumbing needed.
 */
export class Checkpoint {
  readonly root = new THREE.Group();
  activated = false;

  private half: THREE.Vector3;
  private center: THREE.Vector3;
  private flagMaterial: THREE.MeshStandardMaterial;

  constructor(def: CheckpointDef) {
    this.center = new THREE.Vector3(def.pos.x, def.pos.y, def.pos.z);
    this.half = new THREE.Vector3(def.size.x / 2, def.size.y / 2, def.size.z / 2);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6),
      new THREE.MeshStandardMaterial({ color: '#4a4a4a' }),
    );
    pole.position.set(0, 0.8, 0);
    this.flagMaterial = new THREE.MeshStandardMaterial({
      color: '#777777',
      side: THREE.DoubleSide,
    });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.3), this.flagMaterial);
    flag.position.set(0.25, 1.4, 0);
    this.root.add(pole, flag);
    // plant the flag at the volume's ground, off to the side
    this.root.position.set(this.center.x + this.half.x * 0.7, this.center.y - this.half.y, this.center.z);
  }

  /** True exactly once, when first entered. */
  tryActivate(playerPos: THREE.Vector3): boolean {
    if (this.activated) return false;
    if (
      Math.abs(playerPos.x - this.center.x) > this.half.x ||
      Math.abs(playerPos.y - this.center.y) > this.half.y ||
      Math.abs(playerPos.z - this.center.z) > this.half.z
    ) {
      return false;
    }
    this.activated = true;
    this.flagMaterial.color.set('#c68a4b');
    this.flagMaterial.emissive.set('#7a4a1d');
    return true;
  }

  /** Where Mel respawns: the flag's base. */
  get respawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(this.center.x, this.center.y - this.half.y + 1, this.center.z);
  }
}
