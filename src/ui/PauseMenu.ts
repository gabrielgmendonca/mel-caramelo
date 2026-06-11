import { STR } from './strings';

export class PauseMenu {
  private el: HTMLDivElement;

  constructor(root: HTMLElement, onResume: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'pause-menu hidden';
    this.el.innerHTML = `
      <h2>${STR.paused}</h2>
      <button data-action="resume">${STR.resume}</button>
      <button data-action="restart">${STR.restart}</button>
    `;
    this.el.querySelector('[data-action="resume"]')!.addEventListener('click', onResume);
    this.el.querySelector('[data-action="restart"]')!.addEventListener('click', () => {
      location.reload();
    });
    root.appendChild(this.el);
  }

  show(): void {
    this.el.classList.remove('hidden');
  }

  hide(): void {
    this.el.classList.add('hidden');
  }
}
