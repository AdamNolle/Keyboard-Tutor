import { useEffect, useRef, useState } from "preact/hooks";
import { metronome, METERS, type MeterId } from "../audio/Metronome";
import { median } from "../music/trainer";

export function MetronomePage() {
  const [bpm, setBpm] = useState(100);
  const [meter, setMeter] = useState<MeterId>("4/4");
  const [subdivision, setSubdivision] = useState<1 | 2 | 3 | 4>(1);
  const [running, setRunning] = useState(false);
  const [countIn, setCountIn] = useState<0 | 1 | 2>(0);
  const [countingIn, setCountingIn] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [total, setTotal] = useState(4);
  const taps = useRef<number[]>([]);
  useEffect(() => {
    metronome.bpm = bpm;
  }, [bpm]);
  useEffect(() => {
    metronome.meter = meter;
    metronome.subdivision = subdivision;
    metronome.countInBars = countIn;
    if (metronome.running) {
      metronome.stop();
      metronome.start();
    }
  }, [meter, subdivision, countIn]);
  useEffect(() => {
    metronome.onPulse = (next, count, isCountIn) => {
      setPulse(next);
      setTotal(count);
      setCountingIn(isCountIn);
    };
    return () => {
      metronome.stop();
    };
  }, []);
  const toggle = () => {
    if (running) {
      metronome.stop();
      setCountingIn(false);
    } else metronome.start();
    setRunning(!running);
  };
  const tapTempo = () => {
    const now = performance.now();
    const previous = taps.current.at(-1);
    if (!previous || now - previous > 2000) taps.current = [now];
    else taps.current.push(now);
    taps.current = taps.current.slice(-6);
    if (taps.current.length >= 2) {
      const intervals = taps.current
        .slice(1)
        .map((value, i) => value - taps.current[i])
        .filter((value) => value > 200 && value < 2000);
      if (intervals.length)
        setBpm(
          Math.max(30, Math.min(300, Math.round(60000 / median(intervals)))),
        );
    }
  };
  const meterInfo = METERS[meter];
  const unit = Math.floor(pulse / subdivision) + 1;
  const sub = (pulse % subdivision) + 1;
  return (
    <div class="metro-layout">
      <section class="card metro-card" aria-label="Metronome controls">
        <p class="metro-lead">
          A metronome clicks steadily to help you keep time. Press Start and
          play one note on each click.
        </p>
        <div
          class={`pulse-display ${running ? "pulsing" : ""}`}
          aria-hidden="true"
        >
          <span>{running ? unit : "—"}</span>
        </div>
        <p class="beat-text" aria-live="off">
          {running
            ? `${countingIn ? "Get ready · " : ""}Beat ${unit} of ${meterInfo.numerator}${subdivision > 1 ? `, extra click ${sub} of ${subdivision}` : ""}`
            : "Stopped"}
        </p>
        <div class="beat-dots" aria-hidden="true">
          {Array.from({ length: meterInfo.numerator }, (_, index) => (
            <i
              key={index}
              class={`${index === 0 ? "first" : ""} ${running && unit === index + 1 ? "current" : ""}`}
            />
          ))}
        </div>
        <div class="tempo-readout">
          <button
            type="button"
            aria-label="Decrease tempo"
            onClick={() => setBpm((v) => Math.max(30, v - 1))}
          >
            −
          </button>
          <label>
            <span>Tempo</span>
            <input
              type="number"
              min="30"
              max="300"
              value={bpm}
              onChange={(e) =>
                setBpm(
                  Math.max(30, Math.min(300, Number(e.currentTarget.value))),
                )
              }
            />
            <strong>BPM</strong>
          </label>
          <button
            type="button"
            aria-label="Increase tempo"
            onClick={() => setBpm((v) => Math.min(300, v + 1))}
          >
            +
          </button>
        </div>
        <input
          class="tempo-slider"
          aria-label="Tempo, beats per minute"
          type="range"
          min="30"
          max="300"
          value={bpm}
          onInput={(e) => setBpm(Number(e.currentTarget.value))}
        />
        <div class="preset-row" aria-label="Tempo presets">
          {[
            [60, "Slow"],
            [80, "Easy"],
            [100, "Medium"],
            [120, "Brisk"],
            [144, "Fast"],
          ].map(([value, label]) => (
            <button
              type="button"
              onClick={() => setBpm(Number(value))}
              key={value}
            >
              <strong>{value}</strong> {label}
            </button>
          ))}
        </div>
        <div class="form-grid">
          <label>
            Time signature (beats per bar)
            <select
              value={meter}
              onChange={(e) => setMeter(e.currentTarget.value as MeterId)}
            >
              {(Object.keys(METERS) as MeterId[]).map((value) => (
                <option value={value} key={value}>
                  {value} — {METERS[value].numerator} beats per bar
                </option>
              ))}
            </select>
          </label>
          <label>
            Extra clicks between beats
            <select
              value={subdivision}
              onChange={(e) =>
                setSubdivision(Number(e.currentTarget.value) as 1 | 2 | 3 | 4)
              }
            >
              <option value="1">None — one click per beat</option>
              <option value="2">2 clicks per beat</option>
              <option value="3">3 clicks per beat</option>
              <option value="4">4 clicks per beat</option>
            </select>
          </label>
          <label>
            Lead-in before you play
            <select
              value={countIn}
              onChange={(e) =>
                setCountIn(Number(e.currentTarget.value) as 0 | 1 | 2)
              }
            >
              <option value="0">Start immediately</option>
              <option value="1">Count 1 bar first</option>
              <option value="2">Count 2 bars first</option>
            </select>
          </label>
          <label>
            Click volume
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              defaultValue="0.55"
              onInput={(e) =>
                metronome.setVolume(Number(e.currentTarget.value))
              }
            />
          </label>
        </div>
        <div class="metro-actions">
          <button type="button" class="primary" onClick={toggle}>
            {running ? "■ Stop" : "▶ Start"}
          </button>
          <button type="button" onClick={tapTempo}>
            Tap tempo
          </button>
        </div>
        <p class="hint">The first beat of each bar has a stronger click.</p>
        <span class="sr-only">
          Pulse {pulse + 1} of {total}
        </span>
      </section>
    </div>
  );
}
