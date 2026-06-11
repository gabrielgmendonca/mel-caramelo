import * as THREE from 'three';

/** Favela wall palette — unfinished brick, painted plaster, concrete. */
export const FAVELA_PALETTE = [
  '#b5563c', // terracotta
  '#2e8b8b', // teal
  '#e8b84b', // yellow
  '#d96a8b', // pink
  '#a0522d', // raw brick
  '#9aa0a0', // concrete gray
  '#5b8c5a', // green
  '#cc7a4a', // orange plaster
];

export const ROOF_COLOR = '#8c7a6b';
export const DARK_INSET = '#1c1410';

/** Vertical-stripe corrugated metal, tiled across rooftops. */
export function corrugatedTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  for (let x = 0; x < 64; x++) {
    const wave = Math.sin((x / 8) * Math.PI * 2); // ridge every 8px
    const shade = 150 + wave * 45;
    ctx.fillStyle = `rgb(${shade * 0.78}, ${shade * 0.7}, ${shade * 0.62})`;
    ctx.fillRect(x, 0, 1, 64);
  }
  // rust streaks
  ctx.fillStyle = 'rgba(140, 80, 40, 0.25)';
  for (const [x, y, w, h] of [[5, 30, 10, 34], [40, 10, 8, 54], [22, 45, 14, 19]]) {
    ctx.fillRect(x, y, w, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Warm dusk gradient for the sky dome. */
export function skyTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#3d6bb3'); // zenith blue
  grad.addColorStop(0.45, '#9fb8d8');
  grad.addColorStop(0.7, '#ffb36b'); // horizon glow
  grad.addColorStop(1, '#ff9d54');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Deterministic RNG so the favela looks identical on every load. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
