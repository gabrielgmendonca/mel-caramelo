import * as THREE from 'three';
import type { DogAnimState, DogVisual } from './DogVisual';

/**
 * Fallback Mel built from boxes — used when the Shiba GLB is unavailable.
 * Legs trot, tail wags, body bobs; same interface as the real model.
 */
export class ProceduralDog implements DogVisual {
  readonly object = new THREE.Group();

  private legs: THREE.Mesh[] = [];
  private tail: THREE.Mesh;
  private body: THREE.Group;
  private state: DogAnimState = 'idle';
  private speed = 0;
  private time = 0;

  constructor() {
    const caramel = new THREE.MeshStandardMaterial({ color: '#c68a4b' });
    const cream = new THREE.MeshStandardMaterial({ color: '#efe3c8' });
    const dark = new THREE.MeshStandardMaterial({ color: '#3a2a18' });

    this.body = new THREE.Group();
    this.object.add(this.body);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.55), caramel);
    torso.position.set(0, 0.42, 0);
    this.body.add(torso);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.2), cream);
    chest.position.set(0, 0.34, 0.18);
    this.body.add(chest);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.2), caramel);
    head.position.set(0, 0.62, 0.32);
    this.body.add(head);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.12), dark);
    snout.position.set(0, 0.58, 0.45);
    this.body.add(snout);

    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.04), caramel);
      ear.position.set(0.07 * side, 0.75, 0.3);
      this.body.add(ear);
    }

    this.tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.25), caramel);
    this.tail.position.set(0, 0.52, -0.32);
    this.tail.rotation.x = -0.7;
    this.body.add(this.tail);

    for (const [x, z] of [
      [-0.1, 0.18],
      [0.1, 0.18],
      [-0.1, -0.18],
      [0.1, -0.18],
    ]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.07), caramel);
      leg.position.set(x, 0.15, z);
      this.body.add(leg);
      this.legs.push(leg);
    }

    this.object.traverse((n) => {
      if (n instanceof THREE.Mesh) n.castShadow = true;
    });
  }

  setState(state: DogAnimState, speed: number): void {
    this.state = state;
    this.speed = speed;
  }

  update(dt: number): void {
    this.time += dt;
    const t = this.time;

    if (this.state === 'walk' || this.state === 'run') {
      const freq = this.state === 'run' ? 14 : 8;
      const amp = this.state === 'run' ? 0.6 : 0.35;
      this.legs.forEach((leg, i) => {
        const phase = i === 0 || i === 3 ? 0 : Math.PI; // diagonal trot pairs
        leg.rotation.x = Math.sin(t * freq + phase) * amp;
      });
      this.body.position.y = Math.abs(Math.sin(t * freq)) * 0.03;
      this.tail.rotation.x = -0.5;
    } else if (this.state === 'jump' || this.state === 'fall') {
      for (const leg of this.legs) leg.rotation.x = this.state === 'jump' ? -0.8 : 0.5;
      this.tail.rotation.x = -0.2;
      this.body.position.y = 0;
    } else {
      for (const leg of this.legs) leg.rotation.x = 0;
      this.body.position.y = Math.sin(t * 2) * 0.008; // breathing
      this.tail.rotation.x = -0.7;
      this.tail.rotation.y = Math.sin(t * 6) * (0.3 + this.speed * 0); // happy wag
    }
  }
}
