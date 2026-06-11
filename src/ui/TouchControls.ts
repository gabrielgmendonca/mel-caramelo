import type { Input } from '../core/Input';

const JOY_RADIUS = 55; // px from base center to full deflection

export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
}

/** The pointer can vanish between event and capture (or be synthetic). */
function capture(el: Element, pointerId: number): void {
  try {
    el.setPointerCapture(pointerId);
  } catch {
    // fine — move/up events still bubble to the zone
  }
}

/**
 * Mobile controls: a floating virtual joystick on the left half, drag-to-look
 * on the right half, and jump/bark/pause buttons. Writes straight into Input,
 * so the rest of the game can't tell touch from keyboard.
 */
export class TouchControls {
  private joyPointer = -1;
  private lookPointer = -1;
  private joyOrigin = { x: 0, y: 0 };
  private lastLook = { x: 0, y: 0 };
  private joyBase: HTMLDivElement;
  private joyKnob: HTMLDivElement;

  constructor(root: HTMLElement, input: Input, onPause: () => void) {
    const container = document.createElement('div');
    container.className = 'touch-controls';
    root.appendChild(container);

    // --- zones (joystick left, camera-look right) ---
    const joyZone = document.createElement('div');
    joyZone.className = 'touch-zone touch-zone-left';
    const lookZone = document.createElement('div');
    lookZone.className = 'touch-zone touch-zone-right';
    container.append(joyZone, lookZone);

    this.joyBase = document.createElement('div');
    this.joyBase.className = 'joy-base';
    this.joyKnob = document.createElement('div');
    this.joyKnob.className = 'joy-knob';
    this.joyBase.appendChild(this.joyKnob);
    container.appendChild(this.joyBase);

    joyZone.addEventListener('pointerdown', (e) => {
      if (this.joyPointer !== -1) return;
      this.joyPointer = e.pointerId;
      this.joyOrigin = { x: e.clientX, y: e.clientY };
      this.joyBase.style.left = `${e.clientX}px`;
      this.joyBase.style.top = `${e.clientY}px`;
      this.joyBase.classList.add('active');
      capture(joyZone, e.pointerId);
    });
    joyZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joyPointer) return;
      let dx = e.clientX - this.joyOrigin.x;
      let dy = e.clientY - this.joyOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len > JOY_RADIUS) {
        dx *= JOY_RADIUS / len;
        dy *= JOY_RADIUS / len;
      }
      this.joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      input.touchMoveX = dx / JOY_RADIUS;
      input.touchMoveZ = -dy / JOY_RADIUS;
    });
    const joyEnd = (e: PointerEvent): void => {
      if (e.pointerId !== this.joyPointer) return;
      this.joyPointer = -1;
      this.joyBase.classList.remove('active');
      this.joyKnob.style.transform = '';
      input.touchMoveX = 0;
      input.touchMoveZ = 0;
    };
    joyZone.addEventListener('pointerup', joyEnd);
    joyZone.addEventListener('pointercancel', joyEnd);

    lookZone.addEventListener('pointerdown', (e) => {
      if (this.lookPointer !== -1) return;
      this.lookPointer = e.pointerId;
      this.lastLook = { x: e.clientX, y: e.clientY };
      capture(lookZone, e.pointerId);
    });
    lookZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookPointer) return;
      input.touchLookDX += e.clientX - this.lastLook.x;
      input.touchLookDY += e.clientY - this.lastLook.y;
      this.lastLook = { x: e.clientX, y: e.clientY };
    });
    const lookEnd = (e: PointerEvent): void => {
      if (e.pointerId === this.lookPointer) this.lookPointer = -1;
    };
    lookZone.addEventListener('pointerup', lookEnd);
    lookZone.addEventListener('pointercancel', lookEnd);

    // --- buttons ---
    const makeButton = (
      className: string,
      label: string,
      onDown: () => void,
      onUp?: () => void,
    ): void => {
      const btn = document.createElement('div');
      btn.className = `touch-btn ${className}`;
      btn.textContent = label;
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        btn.classList.add('pressed');
        onDown();
      });
      const release = (): void => {
        btn.classList.remove('pressed');
        onUp?.();
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
      container.appendChild(btn);
    };

    makeButton(
      'btn-jump',
      '⬆',
      () => input.touchPress('Space'),
      () => input.touchRelease('Space'),
    );
    makeButton(
      'btn-bark',
      'AU!',
      () => input.touchPress('KeyB'),
      () => input.touchRelease('KeyB'),
    );
    makeButton('btn-pause', '⏸', () => onPause());
  }
}
