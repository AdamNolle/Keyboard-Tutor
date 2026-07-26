import { piano } from "./PianoEngine";

export type MeterId = "2/4" | "3/4" | "4/4" | "6/8";
export const METERS = {
  "2/4": { numerator: 2, denominator: 4, groups: [2] },
  "3/4": { numerator: 3, denominator: 4, groups: [3] },
  "4/4": { numerator: 4, denominator: 4, groups: [4] },
  "6/8": { numerator: 6, denominator: 8, groups: [3, 3] },
} as const;

export function pulseIntervalSeconds(
  bpm: number,
  meter: MeterId,
  subdivision: number,
) {
  const unitsPerBeat = meter === "6/8" ? 3 : 1;
  return 60 / bpm / (unitsPerBeat * subdivision);
}

export function pulseAccent(
  pulse: number,
  meter: MeterId,
  subdivision: number,
) {
  const unit = Math.floor(pulse / subdivision);
  if (unit === 0 && pulse % subdivision === 0) return "primary";
  if (meter === "6/8" && unit === 3 && pulse % subdivision === 0)
    return "secondary";
  if (pulse % subdivision !== 0) return "subdivision";
  return "regular";
}

export class Metronome {
  bpm = 100;
  meter: MeterId = "4/4";
  subdivision: 1 | 2 | 3 | 4 = 1;
  countInBars: 0 | 1 | 2 = 0;
  running = false;
  onPulse?: (pulse: number, total: number, countingIn: boolean) => void;
  private nextTime = 0;
  private countInRemaining = 0;
  private pulse = 0;
  private timer?: number;
  private output?: GainNode;
  private runOutput?: GainNode;
  private volume = 0.55;
  private visualTimers = new Set<number>();

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.output) this.output.gain.value = this.volume;
  }
  start() {
    if (this.running) return;
    const context = piano.audioContext;
    void piano.enable();
    if (!this.output) {
      this.output = context.createGain();
      this.output.connect(context.destination);
    }
    this.output.gain.value = this.volume;
    this.runOutput = context.createGain();
    this.runOutput.connect(this.output);
    this.running = true;
    this.pulse = 0;
    this.countInRemaining =
      METERS[this.meter].numerator * this.subdivision * this.countInBars;
    this.nextTime = context.currentTime + 0.05;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 25);
  }
  stop() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    for (const timer of this.visualTimers) clearTimeout(timer);
    this.visualTimers.clear();
    const runOutput = this.runOutput;
    this.runOutput = undefined;
    if (runOutput) {
      const now = piano.audioContext.currentTime;
      runOutput.gain.cancelScheduledValues(now);
      runOutput.gain.setValueAtTime(0, now);
      window.setTimeout(() => runOutput.disconnect(), 160);
    }
  }
  private tick() {
    const context = piano.audioContext;
    while (this.running && this.nextTime < context.currentTime + 0.12) {
      const meter = METERS[this.meter];
      const total = meter.numerator * this.subdivision;
      const countingIn = this.countInRemaining > 0;
      this.click(this.pulse, total, this.nextTime, countingIn);
      if (countingIn) this.countInRemaining -= 1;
      // BPM denotes dotted-quarter pulses for compound 6/8, quarter notes otherwise.
      this.nextTime += pulseIntervalSeconds(
        this.bpm,
        this.meter,
        this.subdivision,
      );
      this.pulse = (this.pulse + 1) % total;
    }
  }
  private click(
    pulse: number,
    total: number,
    time: number,
    countingIn: boolean,
  ) {
    const context = piano.audioContext;
    const accent = pulseAccent(pulse, this.meter, this.subdivision);
    const primary = accent === "primary";
    const secondary = accent === "secondary";
    const sub = accent === "subdivision";
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = primary
      ? 1560
      : secondary
        ? 1280
        : sub
          ? 720
          : 960;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(
      primary ? 0.32 : secondary ? 0.24 : sub ? 0.09 : 0.17,
      time + 0.001,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    oscillator.connect(gain);
    gain.connect(this.runOutput!);
    oscillator.start(time);
    oscillator.stop(time + 0.05);
    const timer = window.setTimeout(
      () => {
        if (this.running) this.onPulse?.(pulse, total, countingIn);
        this.visualTimers.delete(timer);
      },
      Math.max(0, (time - context.currentTime) * 1000),
    );
    this.visualTimers.add(timer);
  }
}

export const metronome = new Metronome();
