import type * as THREE from 'three';

export type DogAnimState = 'idle' | 'walk' | 'run' | 'jump' | 'fall';

/**
 * Common interface for Mel's visual — either the loaded Shiba GLB or the
 * procedural fallback. PlayerAnimator drives it without knowing which is live.
 */
export interface DogVisual {
  readonly object: THREE.Object3D;
  /** speed = current horizontal speed, used to sync gait to movement. */
  setState(state: DogAnimState, speed: number): void;
  update(dt: number): void;
}
