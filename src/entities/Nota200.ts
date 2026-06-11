import * as THREE from 'three';
import { Collectible } from './Collectible';
import { notaTexture } from '../textures/nota200';

let sharedMaterial: THREE.MeshStandardMaterial | null = null;

function material(): THREE.MeshStandardMaterial {
  if (!sharedMaterial) {
    const tex = notaTexture();
    sharedMaterial = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: '#8a6a30',
      emissiveIntensity: 0.35,
      emissiveMap: tex,
      side: THREE.DoubleSide,
    });
  }
  return sharedMaterial;
}

/** The spinning R$200 parody bill — the game's "coin". */
export class Nota200 extends Collectible {
  constructor(position: THREE.Vector3) {
    super(position);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), material());
    this.root.add(mesh);
  }
}
