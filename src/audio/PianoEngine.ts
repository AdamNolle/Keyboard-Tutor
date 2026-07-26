import { frequency } from "../music/theory";

type Voice = {
  key: string;
  midi: number;
  source: string;
  gain: GainNode;
  oscillators: OscillatorNode[];
  started: number;
  held: boolean;
  released: boolean;
};

export class PianoEngine {
  private context: AudioContext | null = null;
  private pianoBus: GainNode | null = null;
  private master: GainNode | null = null;
  private tone: BiquadFilterNode | null = null;
  private voices = new Map<string, Voice>();
  private sustain = false;
  private volume = 0.72;
  private toneValue = 0.65;
  private timers = new Set<number>();
  private playbackTimers = new Set<number>();
  private activeListeners = new Set<(notes: ReadonlySet<number>) => void>();
  readonly maxVoices = 36;

  async enable() {
    const context = this.getContext();
    try {
      const nav = navigator as Navigator & {
        audioSession?: { type: string };
      };
      if (nav.audioSession) nav.audioSession.type = "playback";
    } catch {
      // The Audio Session API is an optional iOS enhancement.
    }
    if (context.state !== "running") await context.resume();
    return context.state === "running";
  }

  private getContext() {
    if (this.context) return this.context;
    const context = new AudioContext({ latencyHint: "interactive" });
    const pianoBus = context.createGain();
    const master = context.createGain();
    const tone = context.createBiquadFilter();
    const compressor = context.createDynamicsCompressor();
    const convolver = context.createConvolver();
    const wet = context.createGain();
    tone.type = "lowpass";
    tone.Q.value = 0.4;
    compressor.threshold.value = -12;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.22;
    wet.gain.value = 0.12;
    convolver.buffer = this.makeImpulse(context, 1.35);
    pianoBus.connect(tone);
    tone.connect(master);
    pianoBus.connect(convolver);
    convolver.connect(wet);
    wet.connect(master);
    master.connect(compressor);
    compressor.connect(context.destination);
    this.context = context;
    this.pianoBus = pianoBus;
    this.master = master;
    this.tone = tone;
    this.applySettings();
    return context;
  }

  private makeImpulse(context: AudioContext, seconds: number) {
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(2, length, context.sampleRate);
    let seed = 1977;
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        seed = (seed * 16807) % 2147483647;
        data[i] = ((seed / 2147483647) * 2 - 1) * (1 - i / length) ** 2.7;
      }
    }
    return buffer;
  }

  private applySettings() {
    if (!this.context || !this.master || !this.tone) return;
    this.master.gain.setTargetAtTime(
      this.volume,
      this.context.currentTime,
      0.015,
    );
    this.tone.frequency.setTargetAtTime(
      1100 + this.toneValue * 9200,
      this.context.currentTime,
      0.02,
    );
  }
  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    this.applySettings();
  }
  setTone(value: number) {
    this.toneValue = Math.max(0, Math.min(1, value));
    this.applySettings();
  }
  get audioContext() {
    return this.getContext();
  }

  subscribeActiveNotes(listener: (notes: ReadonlySet<number>) => void) {
    this.activeListeners.add(listener);
    listener(this.activeNotes());
    return () => this.activeListeners.delete(listener);
  }

  private activeNotes() {
    return new Set(
      [...this.voices.values()]
        .filter((voice) => !voice.released)
        .map((voice) => voice.midi),
    );
  }

  private emitActiveNotes() {
    const notes = this.activeNotes();
    for (const listener of this.activeListeners) listener(notes);
  }

  noteOn(midi: number, velocity = 0.78, source = "ui") {
    if (midi < 21 || midi > 108) return;
    const context = this.getContext();
    void this.enable();
    const key = `${source}:${midi}`;
    const existing = this.voices.get(key);
    if (existing) this.release(existing, 0.035);
    this.enforceLimit();
    const now = context.currentTime;
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1700 + velocity * 8800;
    filter.Q.value = 0.55;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.012, velocity * 0.19),
      now + 0.006,
    );
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.006, velocity * 0.085),
      now + 0.38,
    );
    gain.gain.exponentialRampToValueAtTime(0.008, now + 5.5);
    gain.connect(filter);
    filter.connect(this.pianoBus!);
    const base = frequency(midi);
    const partials =
      midi < 45
        ? [1, 2.004, 3.012, 4.025, 5.04, 6.06]
        : [1, 2.003, 3.01, 4.022, 5.035];
    const oscillators = partials
      .filter((p) => base * p < context.sampleRate * 0.46)
      .map((partial, index) => {
        const oscillator = context.createOscillator();
        const partialGain = context.createGain();
        oscillator.type = index === 0 ? "triangle" : "sine";
        oscillator.frequency.value = base * partial;
        oscillator.detune.value =
          index > 0 ? (index % 2 ? 1.8 : -1.3) * velocity : 0;
        const partialPeak =
          (1 / (1 + index * index * 0.75)) *
          (index === 0 ? 0.85 : 0.65 + velocity * 0.5);
        const partialDecay = (midi < 48 ? 7.2 : 4.8) / (1 + index * 0.85);
        partialGain.gain.setValueAtTime(partialPeak, now);
        partialGain.gain.exponentialRampToValueAtTime(
          Math.max(0.0001, partialPeak * (index === 0 ? 0.06 : 0.008)),
          now + Math.max(0.38, partialDecay),
        );
        oscillator.connect(partialGain);
        partialGain.connect(gain);
        oscillator.start(now);
        return oscillator;
      });
    // A short, deterministic filtered-noise impulse models the felt hammer.
    const hammerBuffer = context.createBuffer(
      1,
      Math.floor(context.sampleRate * 0.024),
      context.sampleRate,
    );
    const hammerData = hammerBuffer.getChannelData(0);
    let seed = midi * 997 + Math.floor(now * 1000);
    for (let i = 0; i < hammerData.length; i++) {
      seed = (seed * 16807) % 2147483647;
      hammerData[i] =
        ((seed / 2147483647) * 2 - 1) * (1 - i / hammerData.length);
    }
    const hammer = context.createBufferSource();
    const hammerGain = context.createGain();
    hammer.buffer = hammerBuffer;
    hammerGain.gain.value = 0.018 + velocity * 0.055;
    hammer.connect(hammerGain);
    hammerGain.connect(filter);
    hammer.start(now);

    const voice: Voice = {
      key,
      midi,
      source,
      gain,
      oscillators,
      started: now,
      held: true,
      released: false,
    };
    this.voices.set(key, voice);
    this.emitActiveNotes();
  }

  noteOff(midi: number, source = "ui") {
    const voice = this.voices.get(`${source}:${midi}`);
    if (!voice) return;
    voice.held = false;
    if (!this.sustain) this.release(voice);
  }

  setSustain(on: boolean) {
    this.sustain = on;
    if (!on)
      for (const voice of this.voices.values())
        if (!voice.held) this.release(voice);
  }

  private release(voice: Voice, seconds = 0.38) {
    if (voice.released || !this.context) return;
    voice.released = true;
    this.emitActiveNotes();
    const now = this.context.currentTime;
    const parameter = voice.gain.gain;
    if (typeof parameter.cancelAndHoldAtTime === "function")
      parameter.cancelAndHoldAtTime(now);
    else {
      const current = Math.max(0.0001, parameter.value);
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(current, now);
    }
    parameter.exponentialRampToValueAtTime(0.0001, now + seconds);
    for (const oscillator of voice.oscillators)
      oscillator.stop(now + seconds + 0.04);
    const timer = window.setTimeout(
      () => {
        voice.gain.disconnect();
        if (this.voices.get(voice.key) === voice) this.voices.delete(voice.key);
        this.timers.delete(timer);
      },
      (seconds + 0.1) * 1000,
    );
    this.timers.add(timer);
  }

  private enforceLimit() {
    if (this.voices.size < this.maxVoices) return;
    const candidates = [...this.voices.values()].sort(
      (a, b) => Number(a.held) - Number(b.held) || a.started - b.started,
    );
    const stolen = candidates[0];
    stolen.held = false;
    this.release(stolen, 0.025);
    if (this.voices.get(stolen.key) === stolen) this.voices.delete(stolen.key);
  }

  allNotesOff(source?: string) {
    for (const voice of this.voices.values())
      if (!source || voice.source === source) {
        voice.held = false;
        this.release(voice, 0.06);
      }
    if (!source) this.sustain = false;
  }

  playSequence(notes: number[], arpeggio = true, velocity = 0.72) {
    this.cancelPlayback();
    void this.enable();
    const source = `demo-${Date.now()}`;
    notes.forEach((midi, index) => {
      const delay = arpeggio ? index * 320 : 0;
      const on = window.setTimeout(() => {
        this.noteOn(midi, velocity, source);
        this.playbackTimers.delete(on);
      }, delay);
      const off = window.setTimeout(
        () => {
          this.noteOff(midi, source);
          this.playbackTimers.delete(off);
        },
        delay + (arpeggio ? 700 : 1100),
      );
      this.playbackTimers.add(on);
      this.playbackTimers.add(off);
    });
  }

  playTimed(midi: number, offsets: number[]) {
    this.cancelPlayback();
    void this.enable();
    const source = `demo-${Date.now()}`;
    for (const offset of offsets) {
      const on = window.setTimeout(() => {
        this.noteOn(midi, 0.78, source);
        this.playbackTimers.delete(on);
      }, offset);
      const off = window.setTimeout(() => {
        this.noteOff(midi, source);
        this.playbackTimers.delete(off);
      }, offset + 120);
      this.playbackTimers.add(on);
      this.playbackTimers.add(off);
    }
  }

  cancelPlayback() {
    for (const timer of this.playbackTimers) clearTimeout(timer);
    this.playbackTimers.clear();
    for (const voice of this.voices.values())
      if (voice.source.startsWith("demo-")) this.release(voice, 0.05);
  }

  dispose() {
    this.cancelPlayback();
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.allNotesOff();
    void this.context?.close();
    this.context = null;
    this.emitActiveNotes();
  }
}

export const piano = new PianoEngine();
