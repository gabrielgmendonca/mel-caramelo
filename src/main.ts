import RAPIER from '@dimforge/rapier3d-compat';
import { AssetManager } from './core/AssetManager';
import { AudioSystem } from './audio/AudioSystem';
import { Game } from './core/Game';
import { preventMobileZoom } from './core/preventMobileZoom';

preventMobileZoom();

const MANIFEST = [{ name: 'shiba', url: 'assets/models/shiba.glb' }];

const AUDIO_MANIFEST = [
  { name: 'jump', url: 'assets/audio/jump.ogg' },
  { name: 'doublejump', url: 'assets/audio/doublejump.ogg' },
  { name: 'collect', url: 'assets/audio/collect.ogg' },
  { name: 'bone', url: 'assets/audio/bone.ogg' },
  { name: 'checkpoint', url: 'assets/audio/checkpoint.ogg' },
  { name: 'land', url: 'assets/audio/land.ogg' },
  { name: 'bark', url: 'assets/audio/bark.mp3' },
  { name: 'music', url: 'assets/audio/music.mp3' }, // optional; tamborzão generated if absent
];

async function boot(): Promise<void> {
  const loadingBar = document.getElementById('loading-bar') as HTMLDivElement;
  const loadingScreen = document.getElementById('loading-screen') as HTMLDivElement;
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

  loadingBar.style.width = '15%';
  await RAPIER.init();
  loadingBar.style.width = '40%';

  const assets = new AssetManager();
  const audio = new AudioSystem();
  await Promise.all([
    assets.loadAll(MANIFEST, (loaded, total) => {
      loadingBar.style.width = `${40 + (loaded / total) * 55}%`;
    }),
    audio.preload(AUDIO_MANIFEST),
  ]);

  const game = new Game(canvas, assets, audio);

  loadingBar.style.width = '100%';
  loadingScreen.classList.add('hidden');

  // debug handle for headless smoke tests
  (window as unknown as { __game: Game }).__game = game;

  game.start();
}

boot().catch((err) => {
  console.error('Boot failed:', err);
  const label = document.getElementById('loading-label');
  if (label) label.textContent = 'Erro ao carregar o jogo :(';
});
