/**
 * Keyboard + mouse input. Edge-triggered presses are valid for the whole
 * frame (all fixed steps included) and cleared by endFrame().
 */
export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();

  mouseDX = 0;
  mouseDY = 0;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.down.clear();
    });
    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.canvas) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });
  }

  requestPointerLock(): void {
    if (document.pointerLockElement !== this.canvas) {
      try {
        // returns a promise in modern browsers; rejection (e.g. headless,
        // or re-locking too soon after Esc) just means no mouse-look
        const result = this.canvas.requestPointerLock() as unknown;
        if (result instanceof Promise) result.catch(() => {});
      } catch {
        // ignore — keyboard play still works
      }
    }
  }

  releasePointerLock(): void {
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }

  get pointerLocked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  // touch state, written by TouchControls (virtual joystick + buttons)
  touchMoveX = 0;
  touchMoveZ = 0;
  touchLookDX = 0;
  touchLookDY = 0;

  /** Synthetic button press from a touch control. */
  touchPress(code: string): void {
    this.pressed.add(code);
    this.down.add(code);
  }

  touchRelease(code: string): void {
    this.down.delete(code);
  }

  // gamepad state (left stick move, right stick look, A jump, X bark)
  private gpMoveX = 0;
  private gpMoveZ = 0;
  gpLookX = 0;
  gpLookY = 0;
  private gpPrevButtons = new Map<number, boolean>();

  /** Poll once per frame, before fixed updates, so button edges line up. */
  pollGamepad(): void {
    const gp = navigator.getGamepads?.()[0];
    this.gpMoveX = 0;
    this.gpMoveZ = 0;
    this.gpLookX = 0;
    this.gpLookY = 0;
    if (!gp) return;

    const dz = (v: number) => (Math.abs(v) > 0.15 ? v : 0);
    this.gpMoveX = dz(gp.axes[0] ?? 0);
    this.gpMoveZ = -dz(gp.axes[1] ?? 0);
    this.gpLookX = dz(gp.axes[2] ?? 0);
    this.gpLookY = dz(gp.axes[3] ?? 0);

    const buttonToKey: Array<[number, string]> = [
      [0, 'Space'], // A → jump
      [2, 'KeyB'], // X → bark
      [9, 'Escape'], // Start → pause
    ];
    for (const [index, code] of buttonToKey) {
      const pressed = gp.buttons[index]?.pressed ?? false;
      const was = this.gpPrevButtons.get(index) ?? false;
      if (pressed && !was) this.pressed.add(code);
      if (pressed) this.down.add(code);
      else if (was) this.down.delete(code);
      this.gpPrevButtons.set(index, pressed);
    }
  }

  /** -1..1 on x (right+) and z (forward+, i.e. W). */
  get moveX(): number {
    const kb = (this.isDown('KeyD') || this.isDown('ArrowRight') ? 1 : 0) -
      (this.isDown('KeyA') || this.isDown('ArrowLeft') ? 1 : 0);
    return Math.max(-1, Math.min(1, kb + this.gpMoveX + this.touchMoveX));
  }

  get moveZ(): number {
    const kb = (this.isDown('KeyW') || this.isDown('ArrowUp') ? 1 : 0) -
      (this.isDown('KeyS') || this.isDown('ArrowDown') ? 1 : 0);
    return Math.max(-1, Math.min(1, kb + this.gpMoveZ + this.touchMoveZ));
  }

  /**
   * Edge-triggered press, consumed on read so a single keystroke can never
   * fire twice when multiple fixed steps run in one frame.
   */
  consumePressed(code: string): boolean {
    return this.pressed.delete(code);
  }

  get jumpPressed(): boolean {
    return this.consumePressed('Space');
  }

  get jumpHeld(): boolean {
    return this.down.has('Space');
  }

  get barkPressed(): boolean {
    return this.consumePressed('KeyB');
  }

  get perfTogglePressed(): boolean {
    return this.pressed.has('F3');
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  /** Call once per rAF frame, after all updates. */
  endFrame(): void {
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.touchLookDX = 0;
    this.touchLookDY = 0;
  }
}
