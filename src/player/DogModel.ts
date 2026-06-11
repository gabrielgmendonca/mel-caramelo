import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { DogAnimState, DogVisual } from './DogVisual';

const TARGET_HEIGHT = 0.85; // meters, nose-to-ground when standing
const CROSSFADE = 0.15;

// Quaternius Shiba materials → Mel's caramelo coat.
const TINTS: Record<string, string> = {
  Main: '#c68a4b',
  Main_Light: '#efe3c8',
};

const CLIP_FOR_STATE: Record<DogAnimState, string> = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Gallop',
  jump: 'Gallop_Jump',
  fall: 'Gallop_Jump',
};

const WALK_REFERENCE_SPEED = 3;
const RUN_REFERENCE_SPEED = 7;

export class DogModel implements DogVisual {
  readonly object = new THREE.Group();

  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private state: DogAnimState = 'idle';

  constructor(gltf: GLTF) {
    const model = gltf.scene;

    model.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        for (const mat of mats) {
          if (mat instanceof THREE.MeshStandardMaterial && TINTS[mat.name]) {
            mat.color.set(TINTS[mat.name]);
          }
        }
      }
    });

    // Normalize: feet on y=0, standing TARGET_HEIGHT tall.
    const bbox = new THREE.Box3().setFromObject(model);
    const height = bbox.max.y - bbox.min.y;
    const scale = TARGET_HEIGHT / height;
    model.scale.setScalar(scale);
    model.position.y = -bbox.min.y * scale;
    this.object.add(model);

    this.mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) {
      if (clip.name.includes('|')) continue; // skip duplicate 'AnimalArmature|X' clips
      this.actions.set(clip.name, this.mixer.clipAction(clip));
    }

    this.setState('idle', 0);
  }

  setState(state: DogAnimState, speed: number): void {
    const action = this.actions.get(CLIP_FOR_STATE[state]);
    if (!action) return;

    if (state !== this.state || action !== this.current) {
      this.state = state;
      action.reset();
      action.enabled = true;

      if (state === 'jump') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.timeScale = 1.3;
      } else if (state === 'fall') {
        // Hold the leap's airborne pose.
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.time = action.getClip().duration * 0.45;
        action.timeScale = 0;
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.timeScale = 1;
      }

      if (this.current && this.current !== action) {
        action.crossFadeFrom(this.current, CROSSFADE, false);
      }
      action.play();
      this.current = action;
    }

    // Sync gait to actual movement speed.
    if (state === 'walk') action.timeScale = Math.max(0.6, speed / WALK_REFERENCE_SPEED);
    if (state === 'run') {
      action.timeScale = THREE.MathUtils.clamp(speed / RUN_REFERENCE_SPEED, 0.6, 1.6);
    }
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }
}
