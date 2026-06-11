/**
 * Plain WebAudio: file-based SFX/music with synthesized fallbacks, so the
 * game sounds complete even with zero audio downloads. The context is created
 * on the title-screen click (browser autoplay rules).
 */

type SynthFn = (ctx: AudioContext, dest: AudioNode) => void;

export interface AudioEntry {
  name: string;
  url: string;
}

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private raw = new Map<string, ArrayBuffer>();
  private buffers = new Map<string, AudioBuffer>();
  private synths = new Map<string, SynthFn>();
  private musicSource: AudioBufferSourceNode | null = null;

  constructor() {
    this.registerSynths();
  }

  /** Fetch audio files early (no AudioContext needed). Failures are fine. */
  async preload(entries: AudioEntry[]): Promise<void> {
    await Promise.all(
      entries.map(async ({ name, url }) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          this.raw.set(name, await res.arrayBuffer());
        } catch {
          console.warn(`Audio "${name}" unavailable; using synth fallback.`);
        }
      }),
    );
  }

  /** Create + resume the context. Must be called from a user gesture. */
  async unlock(): Promise<void> {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.8;
    this.sfxGain.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.45;
    this.musicGain.connect(this.ctx.destination);
    await this.ctx.resume();

    await Promise.all(
      [...this.raw].map(async ([name, data]) => {
        try {
          this.buffers.set(name, await this.ctx!.decodeAudioData(data.slice(0)));
        } catch {
          console.warn(`Audio "${name}" failed to decode; using synth fallback.`);
        }
      }),
    );
    this.raw.clear();
  }

  play(name: string, { volume = 1, rate = 1, vary = true } = {}): void {
    if (!this.ctx || !this.sfxGain) return;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    gain.connect(this.sfxGain);

    const buffer = this.buffers.get(name);
    if (buffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate * (vary ? 0.95 + Math.random() * 0.1 : 1);
      src.connect(gain);
      src.start();
    } else {
      this.synths.get(name)?.(this.ctx, gain);
    }
  }

  async playMusic(name: string): Promise<void> {
    if (!this.ctx || !this.musicGain || this.musicSource) return;
    let buffer = this.buffers.get(name);
    if (!buffer) {
      // no music file shipped — render a tamborzão loop instead
      buffer = await this.generateTamborzao();
      this.buffers.set(name, buffer);
    }
    this.musicSource = this.ctx.createBufferSource();
    this.musicSource.buffer = buffer;
    this.musicSource.loop = true;
    this.musicSource.connect(this.musicGain);
    this.musicSource.start();
  }

  /**
   * Procedurally rendered baile-funk percussion: the classic tamborzão
   * pattern (kick on steps 0·3·6·10·13) with clap, hats, and a sub-bass
   * shadowing the kick. Two bars at 130 BPM, seamlessly loopable.
   */
  private async generateTamborzao(): Promise<AudioBuffer> {
    const bpm = 130;
    const step = 60 / bpm / 4;
    const bars = 2;
    const steps = bars * 16;
    const sampleRate = 44100;
    const off = new OfflineAudioContext(2, Math.ceil(steps * step * sampleRate), sampleRate);

    const kickSteps = new Set([0, 3, 6, 10, 13]);
    const clapSteps = new Set([4, 12]);

    const noiseBuf = off.createBuffer(1, sampleRate, sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    for (let s = 0; s < steps; s++) {
      const t = s * step;
      const inBar = s % 16;

      if (kickSteps.has(inBar)) {
        const osc = off.createOscillator();
        const env = off.createGain();
        osc.frequency.setValueAtTime(130, t);
        osc.frequency.exponentialRampToValueAtTime(42, t + 0.1);
        env.gain.setValueAtTime(0.9, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(env).connect(off.destination);
        osc.start(t);
        osc.stop(t + 0.25);

        const bass = off.createOscillator();
        const benv = off.createGain();
        bass.type = 'triangle';
        bass.frequency.setValueAtTime(55, t);
        benv.gain.setValueAtTime(0.22, t);
        benv.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        bass.connect(benv).connect(off.destination);
        bass.start(t);
        bass.stop(t + 0.32);
      }

      if (clapSteps.has(inBar)) {
        const src = off.createBufferSource();
        src.buffer = noiseBuf;
        const hp = off.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1400;
        const env = off.createGain();
        env.gain.setValueAtTime(0.45, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        src.connect(hp).connect(env).connect(off.destination);
        src.start(t, 0.1, 0.15);
      }

      if (s % 2 === 0) {
        const src = off.createBufferSource();
        src.buffer = noiseBuf;
        const hp = off.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 6500;
        const env = off.createGain();
        env.gain.setValueAtTime(inBar % 4 === 2 ? 0.16 : 0.09, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        src.connect(hp).connect(env).connect(off.destination);
        src.start(t, 0.3, 0.05);
      }
    }

    return off.startRendering();
  }

  /** Duck the music while paused. */
  setPaused(paused: boolean): void {
    if (!this.ctx || !this.musicGain) return;
    this.musicGain.gain.linearRampToValueAtTime(
      paused ? 0.12 : 0.45,
      this.ctx.currentTime + 0.25,
    );
  }

  // ---------- synthesized fallbacks ----------

  private registerSynths(): void {
    const tone = (
      ctx: AudioContext,
      dest: AudioNode,
      type: OscillatorType,
      f0: number,
      f1: number,
      dur: number,
      delay = 0,
    ): void => {
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
      env.gain.setValueAtTime(0.25, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(env).connect(dest);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    };

    const noise = (
      ctx: AudioContext,
      dest: AudioNode,
      freq: number,
      q: number,
      dur: number,
      drop = 0.5,
    ): void => {
      const t = ctx.currentTime;
      const len = Math.ceil(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(freq, t);
      bp.frequency.exponentialRampToValueAtTime(freq * drop, t + dur);
      bp.Q.value = q;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.5, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(bp).connect(env).connect(dest);
      src.start(t);
    };

    this.synths.set('jump', (ctx, dest) => tone(ctx, dest, 'square', 280, 620, 0.16));
    this.synths.set('doublejump', (ctx, dest) => tone(ctx, dest, 'square', 420, 940, 0.18));
    this.synths.set('land', (ctx, dest) => noise(ctx, dest, 320, 1.2, 0.09, 0.4));
    this.synths.set('collect', (ctx, dest) => {
      tone(ctx, dest, 'sine', 880, 1320, 0.1);
      tone(ctx, dest, 'sine', 1320, 1760, 0.12, 0.06);
    });
    this.synths.set('bone', (ctx, dest) => {
      tone(ctx, dest, 'triangle', 523, 523, 0.12);
      tone(ctx, dest, 'triangle', 659, 659, 0.12, 0.1);
      tone(ctx, dest, 'triangle', 784, 784, 0.2, 0.2);
      tone(ctx, dest, 'triangle', 1047, 1047, 0.3, 0.3);
    });
    this.synths.set('checkpoint', (ctx, dest) => {
      tone(ctx, dest, 'sine', 660, 660, 0.12);
      tone(ctx, dest, 'sine', 990, 990, 0.18, 0.1);
    });
    this.synths.set('bark', (ctx, dest) => {
      noise(ctx, dest, 750, 2.5, 0.13, 0.45);
      tone(ctx, dest, 'sawtooth', 240, 110, 0.13);
    });
  }
}
