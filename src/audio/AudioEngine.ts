import { MUTE_KEY } from '../config';
import { NoteEvent, noteFreq, parseTrack, Song, SONGS } from './music';

type Wave = OscillatorType | number; // number = pulse duty cycle

interface Channel {
  events: NoteEvent[] | null;
  drums: string | null;
  i: number;
  next: number;
  done: boolean;
}

/**
 * Everything audible is synthesised here with the Web Audio API — two pulse/square
 * voices, a triangle bass and a noise channel, like an 8-bit console.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private pulses = new Map<number, PeriodicWave>();
  muted = readMuted();

  private song: Song | null = null;
  private songName = '';
  private channels: Channel[] = [];
  private rate = 1;
  private paused = false;
  private pausedAt = 0;
  private onEnd: (() => void) | null = null;
  private pendingSong: { name: string; onEnd?: () => void } | null = null;

  /** Must be called from a user gesture (browsers block audio until then). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.55;
      this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      // 15-bit LFSR noise, like the NES noise channel, rather than Math.random hiss
      let lfsr = 1;
      for (let i = 0; i < len; i++) {
        const bit = (lfsr ^ (lfsr >> 1)) & 1;
        lfsr = (lfsr >> 1) | (bit << 14);
        d[i] = lfsr & 1 ? 0.8 : -0.8;
      }
      window.setInterval(() => this.schedule(), 25);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.pendingSong) {
      const p = this.pendingSong;
      this.pendingSong = null;
      this.playMusic(p.name, p.onEnd);
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try { localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0'); } catch { /* ignore */ }
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    return this.muted;
  }

  /* ----------------------------------------------------------------- music */

  playMusic(name: string, onEnd?: () => void): void {
    const song = SONGS[name];
    if (!song) return;
    if (!this.ctx) {
      this.pendingSong = { name, onEnd };
      return;
    }
    this.stopMusic();
    this.song = song;
    this.songName = name;
    this.onEnd = onEnd ?? null;
    this.rate = 1;
    this.paused = false;
    this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicBus.gain.setValueAtTime(0.55, this.ctx.currentTime);
    const t = this.ctx.currentTime + 0.05;
    this.channels = [
      { events: parseTrack(song.lead), drums: null, i: 0, next: t, done: false },
      { events: parseTrack(song.bass), drums: null, i: 0, next: t, done: false },
      { events: null, drums: song.drums ?? null, i: 0, next: t, done: !song.drums },
    ];
  }

  get currentSong(): string {
    return this.songName;
  }

  stopMusic(): void {
    this.song = null;
    this.songName = '';
    this.channels = [];
    this.onEnd = null;
    this.pendingSong = null;
    if (this.ctx) {
      // cut anything already scheduled in the look-ahead window
      this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicBus.gain.setValueAtTime(0, this.ctx.currentTime);
      this.musicBus.gain.setValueAtTime(0.55, this.ctx.currentTime + 0.15);
    }
  }

  setTempo(rate: number): void {
    this.rate = rate;
  }

  pauseMusic(): void {
    if (!this.ctx || this.paused) return;
    this.paused = true;
    this.pausedAt = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicBus.gain.setValueAtTime(0, this.ctx.currentTime);
  }

  resumeMusic(): void {
    if (!this.ctx || !this.paused) return;
    const shift = this.ctx.currentTime - this.pausedAt + 0.05;
    for (const ch of this.channels) ch.next += shift;
    this.paused = false;
    this.musicBus.gain.setValueAtTime(0.55, this.ctx.currentTime + 0.05);
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.song || this.paused) return;
    const song = this.song;
    const six = 60 / song.bpm / 4 / this.rate;
    const horizon = ctx.currentTime + 0.12;
    const loop = song.loop !== false;
    for (let ci = 0; ci < this.channels.length; ci++) {
      const ch = this.channels[ci];
      while (!ch.done && ch.next < horizon) {
        if (ch.events) {
          const ev = ch.events[ch.i];
          const dur = ev.len * six;
          if (ev.freq > 0) {
            if (ci === 0) this.voice(song.leadDuty ?? 0.25, ev.freq, ch.next, dur * 0.88, 0.11 * (song.leadVol ?? 1), this.musicBus);
            else this.voice('triangle', ev.freq, ch.next, dur * 0.92, 0.26, this.musicBus);
          }
          ch.next += dur;
          if (++ch.i >= ch.events.length) { if (loop) ch.i = 0; else ch.done = true; }
        } else if (ch.drums) {
          const c = ch.drums[ch.i];
          if (c === 'k') this.kick(ch.next);
          else if (c === 's') this.noiseHit(ch.next, 0.11, 0.16, 'highpass', 1200);
          else if (c === 'h') this.noiseHit(ch.next, 0.03, 0.07, 'highpass', 7000);
          ch.next += six;
          if (++ch.i >= ch.drums.length) { if (loop) ch.i = 0; else ch.done = true; }
        }
      }
    }
    if (!loop && this.channels.every((c) => c.done)) {
      const end = Math.max(...this.channels.map((c) => c.next));
      const cb = this.onEnd;
      this.song = null;
      this.songName = '';
      if (cb) window.setTimeout(cb, Math.max(0, (end - ctx.currentTime) * 1000));
    }
  }

  /* --------------------------------------------------------------- synthesis */

  private pulse(duty: number): PeriodicWave {
    let w = this.pulses.get(duty);
    if (!w) {
      const n = 48;
      const real = new Float32Array(n), imag = new Float32Array(n);
      for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      w = this.ctx!.createPeriodicWave(real, imag);
      this.pulses.set(duty, w);
    }
    return w;
  }

  private osc(wave: Wave): OscillatorNode {
    const o = this.ctx!.createOscillator();
    if (typeof wave === 'number') o.setPeriodicWave(this.pulse(wave));
    else o.type = wave;
    return o;
  }

  private voice(wave: Wave, freq: number, t: number, dur: number, vol: number, bus: AudioNode): void {
    const ctx = this.ctx!;
    const o = this.osc(wave);
    const g = ctx.createGain();
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.linearRampToValueAtTime(vol * 0.7, t + Math.min(0.08, dur * 0.5));
    g.gain.setValueAtTime(vol * 0.7, t + Math.max(0.01, dur - 0.02));
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private kick(t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.13);
  }

  private noiseHit(t: number, dur: number, vol: number, type: BiquadFilterType, f0: number, f1 = f0, bus?: AudioNode): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.5 + Math.random() * 0.2;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) filt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt).connect(g).connect(bus ?? this.musicBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private sweep(wave: Wave, f0: number, f1: number, dur: number, vol: number, delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = this.osc(wave);
    const g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private arp(wave: Wave, notes: string[], step: number, vol: number, delay = 0): void {
    const t0 = this.ctx!.currentTime + delay;
    notes.forEach((n, i) => {
      if (n !== 'R') this.voice(wave, noteFreq(n), t0 + i * step, step * 0.95, vol, this.sfxBus);
    });
  }

  private sfxNoise(dur: number, vol: number, type: BiquadFilterType, f0: number, f1 = f0, delay = 0): void {
    this.noiseHit(this.ctx!.currentTime + delay, dur, vol, type, f0, f1, this.sfxBus);
  }

  /* ---------------------------------------------------------------- effects */

  sfx(name: SfxName): void {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'jump': this.sweep(0.25, 260, 640, 0.14, 0.13); break;
      case 'bigjump': this.sweep(0.25, 180, 500, 0.17, 0.13); break;
      case 'stomp':
        this.sweep(0.5, 520, 110, 0.1, 0.16);
        this.sfxNoise(0.06, 0.18, 'lowpass', 2000);
        break;
      case 'kick': this.arp(0.5, ['A5', 'E6'], 0.035, 0.14); break;
      case 'bump':
        this.sweep('triangle', 200, 60, 0.1, 0.4);
        this.sweep(0.5, 110, 70, 0.06, 0.08);
        break;
      case 'break':
        this.sfxNoise(0.32, 0.35, 'lowpass', 3500, 250);
        this.sweep('triangle', 150, 40, 0.15, 0.35);
        break;
      case 'onion': this.arp(0.25, ['C6', 'G6', 'C7'], 0.05, 0.11); break;
      case 'appear': this.arp('triangle', ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5'], 0.05, 0.3); break;
      case 'powerup': this.arp(0.5, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.045, 0.1); break;
      case 'shrink': this.arp(0.5, ['G5', 'E5', 'C5', 'G4', 'E4', 'C4'], 0.055, 0.1); break;
      case 'grater':
        for (let i = 0; i < 4; i++) this.sfxNoise(0.07, 0.22, 'bandpass', 2600, 1800, i * 0.11);
        break;
      case 'fireball':
        this.sweep(0.125, 900, 300, 0.07, 0.12);
        break;
      case 'poof': this.sfxNoise(0.06, 0.12, 'highpass', 2500); break;
      case 'oneup': this.arp(0.25, ['C6', 'E6', 'G6', 'C7', 'R', 'G6', 'C7'], 0.07, 0.12); break;
      case 'flagpole': this.sweep(0.5, 1400, 160, 1.1, 0.1); break;
      case 'pause': this.arp(0.5, ['E6', 'R', 'E6', 'C6'], 0.05, 0.1); break;
      case 'hurry': this.arp(0.25, ['C6', 'C#6', 'D6', 'R', 'C6', 'C#6', 'D6', 'R', 'C6', 'C#6', 'D6'], 0.05, 0.1); break;
      case 'tick': this.sweep(0.25, 1800, 1800, 0.025, 0.05); break;
      case 'throw': this.sfxNoise(0.12, 0.1, 'bandpass', 1200, 3200); break;
      case 'beam': this.sweep('sawtooth', 300, 900, 0.25, 0.07); break;
      case 'bossHit':
        this.sfxNoise(0.2, 0.3, 'lowpass', 1500);
        this.sweep(0.5, 220, 70, 0.2, 0.14);
        break;
      case 'bossFall': this.sweep(0.5, 700, 50, 1.4, 0.12); break;
      case 'crumble': this.sfxNoise(0.08, 0.18, 'lowpass', 900); break;
      case 'lever':
        this.sweep('triangle', 300, 120, 0.08, 0.35);
        this.sfxNoise(0.1, 0.15, 'bandpass', 600);
        break;
      case 'skid': this.sfxNoise(0.07, 0.06, 'bandpass', 900); break;
      case 'select': this.arp(0.25, ['G5', 'D6'], 0.05, 0.1); break;
    }
  }
}

export type SfxName =
  | 'jump' | 'bigjump' | 'stomp' | 'kick' | 'bump' | 'break' | 'onion' | 'appear' | 'powerup'
  | 'shrink' | 'grater' | 'fireball' | 'poof' | 'oneup' | 'flagpole' | 'pause' | 'hurry' | 'tick'
  | 'throw' | 'beam' | 'bossHit' | 'bossFall' | 'crumble' | 'lever' | 'skid' | 'select';

function readMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

export const audio = new AudioEngine();
