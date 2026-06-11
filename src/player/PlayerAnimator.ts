import type { DogAnimState, DogVisual } from './DogVisual';
import type { PlayerController } from './PlayerController';

const WALK_THRESHOLD = 0.3;
const RUN_THRESHOLD = 4;

/** Maps the controller's physical state to dog animation states. */
export class PlayerAnimator {
  constructor(
    private visual: DogVisual,
    private player: PlayerController,
  ) {}

  update(dt: number): void {
    const speed = this.player.horizontalSpeed;

    let state: DogAnimState;
    if (!this.player.grounded) {
      state = this.player.velocity.y > 0.5 ? 'jump' : 'fall';
    } else if (speed < WALK_THRESHOLD) {
      state = 'idle';
    } else if (speed < RUN_THRESHOLD) {
      state = 'walk';
    } else {
      state = 'run';
    }

    this.visual.setState(state, speed);
    this.visual.update(dt);
  }
}
