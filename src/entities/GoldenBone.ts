import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Collectible } from './Collectible';

let sharedGeometry: THREE.BufferGeometry | null = null;
let sharedMaterial: THREE.MeshStandardMaterial | null = null;

function boneGeometry(): THREE.BufferGeometry {
  if (!sharedGeometry) {
    const shaft = new THREE.CylinderGeometry(0.07, 0.07, 0.45, 10);
    shaft.rotateZ(Math.PI / 2);
    const knobs: THREE.BufferGeometry[] = [shaft];
    for (const [x, y] of [[-0.24, 0.08], [-0.24, -0.08], [0.24, 0.08], [0.24, -0.08]]) {
      const knob = new THREE.SphereGeometry(0.11, 12, 10);
      knob.translate(x, y, 0);
      knobs.push(knob);
    }
    sharedGeometry = mergeGeometries(knobs, false);
  }
  return sharedGeometry;
}

/** Osso de Ouro — the rare hero collectible. */
export class GoldenBone extends Collectible {
  private material: THREE.MeshStandardMaterial;

  constructor(position: THREE.Vector3) {
    super(position);
    if (!sharedMaterial) {
      sharedMaterial = new THREE.MeshStandardMaterial({
        color: '#e8b84b',
        metalness: 0.85,
        roughness: 0.25,
        emissive: '#9a6a10',
        emissiveIntensity: 0.4,
      });
    }
    this.material = sharedMaterial;
    const mesh = new THREE.Mesh(boneGeometry(), this.material);
    mesh.scale.setScalar(1.4);
    this.root.add(mesh);
    this.spinSpeed = 1.6;
  }

  override update(dt: number, time: number): void {
    super.update(dt, time);
    this.material.emissiveIntensity = 0.4 + Math.sin(time * 3) * 0.2;
  }
}
