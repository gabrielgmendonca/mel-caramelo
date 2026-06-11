import * as THREE from 'three';
import { GameLoop } from './GameLoop';
import { Input } from './Input';
import { Physics } from './Physics';
import type { AssetManager } from './AssetManager';
import { PlayerController } from '../player/PlayerController';
import { PlayerAnimator } from '../player/PlayerAnimator';
import { DogModel } from '../player/DogModel';
import { ProceduralDog } from '../player/ProceduralDog';
import type { DogVisual } from '../player/DogVisual';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera';
import { LevelBuilder } from '../level/LevelBuilder';
import { LEVEL } from '../level/LevelData';
import { skyTexture } from '../textures/procedural';
import { Nota200 } from '../entities/Nota200';
import { GoldenBone } from '../entities/GoldenBone';
import { Pigeon } from '../entities/Pigeon';
import { Checkpoint } from '../entities/Checkpoint';
import type { Collectible } from '../entities/Collectible';
import { HUD } from '../ui/HUD';
import { TitleScreen } from '../ui/TitleScreen';
import { PauseMenu } from '../ui/PauseMenu';
import { STR } from '../ui/strings';
import type { AudioSystem } from '../audio/AudioSystem';

type GameState = 'title' | 'playing' | 'paused';

const BARK_COOLDOWN = 0.6;
const PLAYER_CENTER_HEIGHT = 0.45; // pickups measure to Mel's chest, not feet

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly input: Input;
  readonly physics: Physics;
  readonly player: PlayerController;
  readonly cameraRig: ThirdPersonCamera;
  readonly level: LevelBuilder;

  state: GameState = 'title';
  notasCollected = 0;
  bonesCollected = 0;

  private loop: GameLoop;
  private animator: PlayerAnimator;
  private dog: DogVisual;
  private hud: HUD;
  private titleScreen: TitleScreen;
  private pauseMenu: PauseMenu;
  private notas: Nota200[] = [];
  private bones: GoldenBone[] = [];
  private pigeons: Pigeon[] = [];
  private checkpoints: Checkpoint[] = [];
  private barkTimer = 0;
  private barkPulse = 0;
  private flipTimer = 0;
  private respawnFade: HTMLDivElement;
  private elapsed = 0;
  private perfOverlay: HTMLDivElement;
  private perfVisible = false;
  private frameMs = 0;

  constructor(
    canvas: HTMLCanvasElement,
    assets: AssetManager,
    private audio: AudioSystem,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.input = new Input(canvas);
    this.physics = new Physics();

    this.setupAtmosphere();

    this.level = new LevelBuilder(this.physics);
    this.level.build(LEVEL);
    this.scene.add(this.level.group);

    // ?spawn=x,y,z — debug spawn override for playtesting specific areas
    const spawnParam = new URLSearchParams(location.search).get('spawn');
    const spawn = spawnParam
      ? new THREE.Vector3(...spawnParam.split(',').map(Number))
      : new THREE.Vector3(LEVEL.spawn.x, LEVEL.spawn.y, LEVEL.spawn.z);

    this.player = new PlayerController(this.physics, spawn, LEVEL.killY);
    this.scene.add(this.player.root);

    const shiba = assets.gltf('shiba');
    this.dog = shiba ? new DogModel(shiba) : new ProceduralDog();
    this.player.root.add(this.dog.object);
    this.animator = new PlayerAnimator(this.dog, this.player);

    this.cameraRig = new ThirdPersonCamera(this.physics, window.innerWidth / window.innerHeight);
    this.cameraRig.reset(this.player.position);

    this.spawnEntities();

    // --- UI ---
    const uiRoot = document.getElementById('ui-root')!;
    this.hud = new HUD(uiRoot, LEVEL.notas.length, LEVEL.bones.length);
    this.pauseMenu = new PauseMenu(uiRoot, () => this.resume());
    this.titleScreen = new TitleScreen(uiRoot, () => this.startPlaying());

    this.respawnFade = document.createElement('div');
    this.respawnFade.id = 'respawn-fade';
    document.body.appendChild(this.respawnFade);

    this.player.onRespawn = () => {
      this.cameraRig.reset(this.player.position);
      this.respawnFade.classList.add('active');
      setTimeout(() => this.respawnFade.classList.remove('active'), 350);
    };
    this.player.onJump = () => this.audio.play('jump', { volume: 0.5 });
    this.player.onDoubleJump = () => {
      this.audio.play('doublejump', { volume: 0.5 });
      this.flipTimer = 0.45;
    };
    this.player.onLand = () => this.audio.play('land', { volume: 0.3 });

    canvas.addEventListener('click', () => {
      if (this.state === 'playing') this.input.requestPointerLock();
    });
    // browser Esc exits pointer lock → treat as pause
    document.addEventListener('pointerlockchange', () => {
      if (this.state === 'playing' && !this.input.pointerLocked) this.pause();
    });
    window.addEventListener('resize', () => this.onResize());

    this.perfOverlay = document.createElement('div');
    this.perfOverlay.style.cssText =
      'position:fixed;top:8px;right:8px;z-index:30;color:#0f0;background:rgba(0,0,0,.6);' +
      'font:12px monospace;padding:4px 8px;border-radius:4px;display:none;pointer-events:none;';
    document.body.appendChild(this.perfOverlay);

    this.loop = new GameLoop({
      beginFrame: () => this.input.pollGamepad(),
      fixedUpdate: (dt) => this.fixedUpdate(dt),
      update: (dt) => this.update(dt),
      render: () => this.render(),
      endFrame: () => this.input.endFrame(),
    });
  }

  start(): void {
    this.loop.start();
  }

  private startPlaying(): void {
    this.state = 'playing';
    this.titleScreen.hide();
    this.input.requestPointerLock();
    void this.audio.unlock().then(() => this.audio.playMusic('music'));
  }

  private pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.releasePointerLock();
    this.pauseMenu.show();
    this.audio.setPaused(true);
  }

  private resume(): void {
    this.state = 'playing';
    this.pauseMenu.hide();
    this.input.requestPointerLock();
    this.audio.setPaused(false);
  }

  private spawnEntities(): void {
    for (const n of LEVEL.notas) {
      const nota = new Nota200(new THREE.Vector3(n.x, n.y, n.z));
      this.notas.push(nota);
      this.scene.add(nota.root);
    }
    for (const b of LEVEL.bones) {
      const bone = new GoldenBone(new THREE.Vector3(b.x, b.y, b.z));
      this.bones.push(bone);
      this.scene.add(bone.root);
    }
    for (const p of LEVEL.pigeons) {
      const pigeon = new Pigeon(new THREE.Vector3(p.x, p.y, p.z));
      this.pigeons.push(pigeon);
      this.scene.add(pigeon.root);
    }
    for (const c of LEVEL.checkpoints) {
      const checkpoint = new Checkpoint(c);
      this.checkpoints.push(checkpoint);
      this.scene.add(checkpoint.root);
    }
  }

  private fixedUpdate(dt: number): void {
    if (this.state !== 'playing') return;
    this.level.fixedUpdate(dt);
    this.player.fixedUpdate(dt, this.input, this.cameraRig.yaw);
    this.physics.step();

    // --- bark ---
    this.barkTimer = Math.max(0, this.barkTimer - dt);
    if (this.input.barkPressed && this.barkTimer === 0) {
      this.barkTimer = BARK_COOLDOWN;
      this.barkPulse = 1;
      this.audio.play('bark', { volume: 0.8 });
      const origin = this.player.position;
      for (const pigeon of this.pigeons) pigeon.onBark(origin);
    }

    // --- pickups & checkpoints ---
    const center = this.player.position;
    center.y += PLAYER_CENTER_HEIGHT;

    for (const nota of this.notas) {
      if (nota.tryCollect(center)) {
        this.notasCollected++;
        this.hud.setNotas(this.notasCollected, this.notas.length);
        this.audio.play('collect', { volume: 0.55 });
        if (this.notasCollected === this.notas.length) this.hud.toast(STR.allNotas);
      }
    }
    for (const bone of this.bones) {
      if (bone.tryCollect(center)) {
        this.bonesCollected++;
        this.hud.setBones(this.bonesCollected, this.bones.length);
        this.hud.toast(STR.boneFound);
        this.audio.play('bone', { volume: 0.8, vary: false });
        if (this.bonesCollected === this.bones.length) this.hud.showCompletion();
      }
    }
    for (const checkpoint of this.checkpoints) {
      if (checkpoint.tryActivate(center)) {
        this.player.setRespawnPoint(checkpoint.respawnPoint);
        this.hud.toast(STR.checkpoint);
        this.audio.play('checkpoint', { volume: 0.6, vary: false });
      }
    }
  }

  private update(dt: number): void {
    if (this.state === 'playing' || this.state === 'title') {
      this.elapsed += dt;
      this.player.update(dt);
      this.animator.update(dt);
      this.level.update(this.elapsed);

      const playerPos = this.player.position;
      for (const c of [...this.notas, ...this.bones] as Collectible[]) {
        c.update(dt, this.elapsed);
      }
      for (const pigeon of this.pigeons) pigeon.update(dt, this.elapsed, playerPos);

      // bark feedback: quick squash-and-stretch on Mel
      if (this.barkPulse > 0) {
        this.barkPulse = Math.max(0, this.barkPulse - dt * 5);
        const s = 1 + Math.sin(this.barkPulse * Math.PI) * 0.15;
        this.dog.object.scale.set(s, 2 - s, s);
      }

      // double-jump backflip
      if (this.flipTimer > 0) {
        this.flipTimer = Math.max(0, this.flipTimer - dt);
        const t = 1 - this.flipTimer / 0.45;
        this.dog.object.rotation.x = -Math.PI * 2 * t * (2 - t); // ease-out full backflip
        if (this.flipTimer === 0) this.dog.object.rotation.x = 0;
      }

      if (this.state === 'playing') {
        this.cameraRig.update(dt, playerPos, this.input);
      } else {
        // gentle showcase orbit behind the title screen
        this.cameraRig.yaw += dt * 0.07;
        this.cameraRig.update(dt, playerPos, this.input);
      }
    }

    // Esc while pointer-locked exits the lock (handled by pointerlockchange);
    // this covers Esc/P when playing without mouse-look.
    if (this.input.consumePressed('Escape') || this.input.consumePressed('KeyP')) {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
    }

    this.hud.update(dt);

    if (this.input.perfTogglePressed) {
      this.perfVisible = !this.perfVisible;
      this.perfOverlay.style.display = this.perfVisible ? 'block' : 'none';
    }
    if (this.perfVisible) {
      this.frameMs = this.frameMs * 0.95 + dt * 1000 * 0.05;
      this.perfOverlay.textContent =
        `${this.frameMs.toFixed(1)} ms · ${this.renderer.info.render.calls} calls · ` +
        `${(this.renderer.info.render.triangles / 1000).toFixed(0)}k tris`;
    }
  }

  private render(): void {
    this.renderer.render(this.scene, this.cameraRig.camera);
  }

  private setupAtmosphere(): void {
    // Warm late-afternoon favela light: most of the Stray mood, cheap.
    this.scene.fog = new THREE.Fog('#ffb36b', 50, 180);

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(240, 24, 16),
      new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
    );
    sky.position.set(0, 0, 30);
    this.scene.add(sky);

    // the city far below the hill, swallowed by haze
    const cityBelow = new THREE.Mesh(
      new THREE.PlaneGeometry(460, 460),
      new THREE.MeshStandardMaterial({ color: '#5a6a7a' }),
    );
    cityBelow.rotation.x = -Math.PI / 2;
    cityBelow.position.set(0, -14, 30);
    this.scene.add(cityBelow);

    const hemi = new THREE.HemisphereLight('#9ec4ff', '#b07a4a', 1.0);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight('#ffd9a0', 2.2);
    sun.position.set(40, 60, 0);
    sun.target.position.set(0, 5, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.camera.left = -45;
    sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.camera.far = 200;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    this.scene.add(sun.target);
  }

  private onResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.cameraRig.camera.aspect = window.innerWidth / window.innerHeight;
    this.cameraRig.camera.updateProjectionMatrix();
  }
}
