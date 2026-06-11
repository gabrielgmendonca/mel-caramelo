export const FIXED_DT = 1 / 60;
const MAX_FRAME_DT = 0.25;

export interface LoopCallbacks {
  /** Called first each frame (input polling). */
  beginFrame(): void;
  /** Physics + gameplay, runs at exactly 60 Hz. */
  fixedUpdate(dt: number): void;
  /** Per-frame work: camera, animation, visuals. */
  update(dt: number): void;
  render(): void;
  /** Called once at the very end of each frame. */
  endFrame(): void;
}

export class GameLoop {
  private accumulator = 0;
  private lastTime = -1;
  private rafId = 0;
  private running = false;

  constructor(private callbacks: LoopCallbacks) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = -1;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (timeMs: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);

    if (this.lastTime < 0) this.lastTime = timeMs;
    const frameDt = Math.min((timeMs - this.lastTime) / 1000, MAX_FRAME_DT);
    this.lastTime = timeMs;

    this.callbacks.beginFrame();

    this.accumulator += frameDt;
    while (this.accumulator >= FIXED_DT) {
      this.callbacks.fixedUpdate(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    this.callbacks.update(frameDt);
    this.callbacks.render();
    this.callbacks.endFrame();
  };
}
