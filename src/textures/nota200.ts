import * as THREE from 'three';

/**
 * The "Nota de 200" — an original parody banknote starring Mel, homage to the
 * campaign to put the vira-lata caramelo on the real R$200 bill. Drawn in
 * code; deliberately NOT a reproduction of any Banco Central banknote.
 */

let cached: HTMLCanvasElement | null = null;

export function notaCanvas(): HTMLCanvasElement {
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // paper: warm caramel-tinted note
  const bg = ctx.createLinearGradient(0, 0, 512, 256);
  bg.addColorStop(0, '#e8d5a8');
  bg.addColorStop(0.5, '#f0e2bd');
  bg.addColorStop(1, '#dfc394');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);

  // guilloche-ish arcs
  ctx.strokeStyle = 'rgba(160, 110, 50, 0.25)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.ellipse(256, 128, 230 - i * 12, 100 - i * 5, (i * Math.PI) / 14, 0, Math.PI * 2);
    ctx.stroke();
  }

  // border
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 240);
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, 480, 224);

  // corner "200"s
  ctx.fillStyle = '#7a4a1d';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('200', 26, 60);
  ctx.textAlign = 'right';
  ctx.fillText('200', 486, 238);

  // headers
  ctx.textAlign = 'center';
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText('REPÚBLICA CARAMELO DO BRASIL', 256, 42);
  ctx.font = 'italic 15px Georgia, serif';
  ctx.fillText('DUZENTOS CARAMELOS', 256, 234);
  ctx.save();
  ctx.translate(60, 128);
  ctx.rotate(-Math.PI / 2);
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText('SEM VALOR · MUITO VALOR', 0, 0);
  ctx.restore();

  drawMel(ctx, 256, 130, 1);

  cached = canvas;
  return canvas;
}

/** Mel's portrait: a happy caramel dog face drawn with primitives. */
function drawMel(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);

  // ears
  ctx.fillStyle = '#b3763a';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(34 * side, -58);
    ctx.lineTo(52 * side, -26);
    ctx.lineTo(16 * side, -34);
    ctx.closePath();
    ctx.fill();
  }

  // head
  ctx.fillStyle = '#c68a4b';
  ctx.beginPath();
  ctx.ellipse(0, -10, 46, 42, 0, 0, Math.PI * 2);
  ctx.fill();

  // muzzle
  ctx.fillStyle = '#e9d9b8';
  ctx.beginPath();
  ctx.ellipse(0, 8, 26, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  ctx.fillStyle = '#2b1d12';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(18 * side, -22, 5.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(18 * side - 2, -24, 1.8, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // nose
  ctx.fillStyle = '#2b1d12';
  ctx.beginPath();
  ctx.ellipse(0, 2, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // happy mouth + tongue
  ctx.strokeStyle = '#2b1d12';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(-8, 10, 9, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(8, 10, 9, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = '#d96a8b';
  ctx.beginPath();
  ctx.ellipse(0, 22, 7, 9, 0, 0, Math.PI);
  ctx.fill();

  ctx.restore();
}

export function notaTexture(): THREE.Texture {
  const tex = new THREE.CanvasTexture(notaCanvas());
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Small bone icon for the HUD. */
export function boneIconCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e8b84b';
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 3;
  ctx.save();
  ctx.translate(32, 32);
  ctx.rotate(-Math.PI / 4);
  ctx.beginPath();
  ctx.roundRect(-16, -5, 32, 10, 5);
  ctx.fill();
  ctx.stroke();
  for (const [ex, ey] of [[-16, -7], [-16, 7], [16, -7], [16, 7]]) {
    ctx.beginPath();
    ctx.arc(ex, ey, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  return canvas;
}
