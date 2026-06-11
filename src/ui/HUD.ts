import { notaCanvas, boneIconCanvas } from '../textures/nota200';
import { STR } from './strings';

/** DOM overlay: collectible counters + event toasts + completion banner. */
export class HUD {
  private notaCount: HTMLSpanElement;
  private boneCount: HTMLSpanElement;
  private toastEl: HTMLDivElement;
  private toastTimer = 0;

  constructor(root: HTMLElement, notaTotal: number, boneTotal: number) {
    const counters = document.createElement('div');
    counters.className = 'hud-counters';

    const notaIcon = document.createElement('img');
    notaIcon.src = notaCanvas().toDataURL();
    notaIcon.className = 'hud-icon hud-icon-nota';
    this.notaCount = document.createElement('span');
    this.notaCount.textContent = `0/${notaTotal}`;

    const boneIcon = document.createElement('img');
    boneIcon.src = boneIconCanvas().toDataURL();
    boneIcon.className = 'hud-icon';
    this.boneCount = document.createElement('span');
    this.boneCount.textContent = `0/${boneTotal}`;

    const notaRow = document.createElement('div');
    notaRow.className = 'hud-row';
    notaRow.append(notaIcon, this.notaCount);
    const boneRow = document.createElement('div');
    boneRow.className = 'hud-row';
    boneRow.append(boneIcon, this.boneCount);
    counters.append(notaRow, boneRow);
    root.appendChild(counters);

    this.toastEl = document.createElement('div');
    this.toastEl.className = 'hud-toast';
    root.appendChild(this.toastEl);
  }

  setNotas(count: number, total: number): void {
    this.notaCount.textContent = `${count}/${total}`;
    this.pop(this.notaCount);
  }

  setBones(count: number, total: number): void {
    this.boneCount.textContent = `${count}/${total}`;
    this.pop(this.boneCount);
  }

  toast(message: string): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.add('visible');
    this.toastTimer = 2.2;
  }

  showCompletion(): void {
    const banner = document.createElement('div');
    banner.className = 'complete-banner';
    banner.innerHTML = `<h2>${STR.complete}</h2><p>${STR.completeSub}</p>`;
    document.getElementById('ui-root')!.appendChild(banner);
    setTimeout(() => banner.classList.add('visible'), 30);
    setTimeout(() => banner.classList.remove('visible'), 6000);
    setTimeout(() => banner.remove(), 7000);
  }

  update(dt: number): void {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.remove('visible');
    }
  }

  private pop(el: HTMLElement): void {
    el.classList.remove('pop');
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('pop');
  }
}
