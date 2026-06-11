import { STR } from './strings';
import { isTouchDevice } from './TouchControls';

export class TitleScreen {
  private el: HTMLDivElement;

  constructor(root: HTMLElement, onStart: () => void) {
    const touch = isTouchDevice();
    this.el = document.createElement('div');
    this.el.className = 'title-screen';
    this.el.innerHTML = `
      <h1>${STR.title}</h1>
      <p class="subtitle">${STR.subtitle}</p>
      <p class="start-hint">${touch ? STR.startTouch : STR.start}</p>
      <p class="controls">${touch ? STR.controlsTouch : STR.controls}</p>
    `;
    this.el.addEventListener('click', () => onStart(), { once: true });
    root.appendChild(this.el);
  }

  hide(): void {
    this.el.classList.add('hidden');
    setTimeout(() => this.el.remove(), 600);
  }
}
