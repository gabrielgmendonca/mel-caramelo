import { STR } from './strings';

export class TitleScreen {
  private el: HTMLDivElement;

  constructor(root: HTMLElement, onStart: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'title-screen';
    this.el.innerHTML = `
      <h1>${STR.title}</h1>
      <p class="subtitle">${STR.subtitle}</p>
      <p class="start-hint">${STR.start}</p>
      <p class="controls">${STR.controls}</p>
    `;
    this.el.addEventListener('click', () => onStart(), { once: true });
    root.appendChild(this.el);
  }

  hide(): void {
    this.el.classList.add('hidden');
    setTimeout(() => this.el.remove(), 600);
  }
}
