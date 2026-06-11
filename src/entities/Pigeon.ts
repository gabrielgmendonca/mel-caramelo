import * as THREE from 'three';
import { mulberry32 } from '../textures/procedural';

const FLEE_RADIUS_BARK = 6;
const FLEE_RADIUS_PROXIMITY = 1.3;
const FLEE_DURATION = 2.5;
const RESPAWN_DELAY = 20;

type PigeonState = 'idle' | 'fleeing' | 'gone';

/** A pombo: pecks around until Mel barks (or gets too close), then bolts. */
export class Pigeon {
  readonly root = new THREE.Group();

  private home: THREE.Vector3;
  private state: PigeonState = 'idle';
  private timer = 0;
  private velocity = new THREE.Vector3();
  private wings: THREE.Mesh[] = [];
  private body: THREE.Group;
  private rng: () => number;
  private peckPhase = 0;

  constructor(position: THREE.Vector3) {
    this.home = position.clone();
    this.root.position.copy(position);
    this.rng = mulberry32(Math.round(position.x * 31 + position.z * 97));

    const gray = new THREE.MeshStandardMaterial({ color: '#8d99a6' });
    const darkGray = new THREE.MeshStandardMaterial({ color: '#5d6770' });

    this.body = new THREE.Group();
    this.root.add(this.body);

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), gray);
    torso.scale.set(1, 0.9, 1.35);
    torso.position.y = 0.13;
    this.body.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), darkGray);
    head.position.set(0, 0.26, 0.1);
    this.body.add(head);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 6), new THREE.MeshStandardMaterial({ color: '#d9a05b' }));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.25, 0.17);
    this.body.add(beak);

    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), darkGray);
      wing.material.side = THREE.DoubleSide;
      wing.position.set(0.1 * side, 0.17, 0);
      wing.rotation.z = 0.3 * side;
      this.body.add(wing);
      this.wings.push(wing);
    }

    this.body.traverse((n) => {
      if (n instanceof THREE.Mesh) n.castShadow = true;
    });

    this.body.rotation.y = this.rng() * Math.PI * 2;
    this.timer = 1 + this.rng() * 3;
  }

  /** Called when Mel barks; flees if within earshot. */
  onBark(barkOrigin: THREE.Vector3): void {
    if (this.state !== 'idle') return;
    if (this.root.position.distanceTo(barkOrigin) <= FLEE_RADIUS_BARK) {
      this.flee(barkOrigin);
    }
  }

  update(dt: number, time: number, playerPos: THREE.Vector3): void {
    switch (this.state) {
      case 'idle': {
        if (this.root.position.distanceTo(playerPos) < FLEE_RADIUS_PROXIMITY) {
          this.flee(playerPos);
          return;
        }
        // peck and shuffle
        this.timer -= dt;
        if (this.timer <= 0) {
          this.timer = 1.5 + this.rng() * 3;
          this.body.rotation.y = this.rng() * Math.PI * 2;
          this.peckPhase = time;
        }
        const sincePeck = time - this.peckPhase;
        this.body.rotation.x = sincePeck < 0.6 ? Math.sin(sincePeck * 10) * 0.35 : 0;
        break;
      }
      case 'fleeing': {
        this.timer += dt;
        this.velocity.y += 2 * dt; // climbing as it flaps
        this.root.position.addScaledVector(this.velocity, dt);
        for (const [i, wing] of this.wings.entries()) {
          wing.rotation.z = (i === 0 ? 1 : -1) * Math.sin(this.timer * 30) * 0.9;
        }
        if (this.timer >= FLEE_DURATION) {
          this.state = 'gone';
          this.root.visible = false;
          this.timer = 0;
        }
        break;
      }
      case 'gone': {
        this.timer += dt;
        if (this.timer >= RESPAWN_DELAY) {
          this.state = 'idle';
          this.root.visible = true;
          this.root.position.copy(this.home);
          this.timer = 1 + this.rng() * 3;
        }
        break;
      }
    }
  }

  private flee(threat: THREE.Vector3): void {
    this.state = 'fleeing';
    this.timer = 0;
    const away = this.root.position.clone().sub(threat);
    away.y = 0;
    if (away.lengthSq() < 0.01) away.set(this.rng() - 0.5, 0, this.rng() - 0.5);
    away.normalize();
    this.velocity.set(away.x * 3.5, 3.5, away.z * 3.5);
    this.body.rotation.x = 0;
    this.body.rotation.y = Math.atan2(away.x, away.z);
  }
}
