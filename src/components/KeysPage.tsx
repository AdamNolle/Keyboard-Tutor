import { useMemo, useState } from "preact/hooks";
import { piano } from "../audio/PianoEngine";
import {
  PIANO_MAX,
  PIANO_MIN,
  SCALES,
  frequency,
  mod,
  noteName,
  octave,
  pitchName,
  scaleMidis,
  spellScale,
  spellingPc,
  parseSpelling,
} from "../music/theory";
import { GrandStaff } from "./GrandStaff";
import { PianoKeyboard } from "./PianoKeyboard";

type Props = {
  volume: number;
  tone: number;
  setVolume: (value: number) => void;
  setTone: (value: number) => void;
  preferFlats: boolean;
  setPreferFlats: (value: boolean) => void;
};

export function KeysPage({
  volume,
  tone,
  setVolume,
  setTone,
  preferFlats,
  setPreferFlats,
}: Props) {
  const [tonic, setTonic] = useState("C");
  const [scaleId, setScaleId] = useState("major");
  const [showScale, setShowScale] = useState(false);
  const [selected, setSelected] = useState(60);
  const scale = SCALES.find((item) => item.id === scaleId)!;
  const rootPc = spellingPc(parseSpelling(tonic));
  const root = 60 + rootPc;
  const notes = scaleMidis(root, scale);
  const spellings = spellScale(tonic, scale, preferFlats);
  const title = `${tonic} ${scale.name}`;
  const coreIntervals = scale.intervals.filter((interval) => interval < 12);
  const tonics = Array.from({ length: 12 }, (_, index) =>
    pitchName(index, preferFlats),
  );
  const selectedName = noteName(selected, preferFlats);
  const chooseSpelling = (flats: boolean) => {
    setTonic(pitchName(rootPc, flats));
    setPreferFlats(flats);
  };
  const chooseNote = (midi: number) => {
    setShowScale(false);
    setSelected(midi);
  };

  const highlights = useMemo(() => {
    if (!showScale) return new Map<number, string>();
    const result = new Map<number, string>();
    for (let midi = PIANO_MIN; midi <= PIANO_MAX; midi++) {
      const interval = mod(midi - rootPc);
      const index = coreIntervals.indexOf(interval);
      if (index >= 0)
        result.set(midi, interval === 0 ? "root" : scale.degrees[index]);
    }
    return result;
  }, [rootPc, scale, showScale]);

  const noteSpellings = useMemo(() => {
    const result = new Map<number, string>();
    for (let midi = PIANO_MIN; midi <= PIANO_MAX; midi++) {
      const interval = mod(midi - rootPc);
      const index = coreIntervals.indexOf(interval);
      if (index >= 0) result.set(midi, spellings[index]);
    }
    return result;
  }, [rootPc, scale, spellings.join(",")]);

  return (
    <div class="feature-stack keys-page">
      <div class="spelling-bar" aria-label="Note spelling">
        <span>Note names</span>
        <div class="segmented">
          <button
            type="button"
            aria-pressed={!preferFlats}
            onClick={() => chooseSpelling(false)}
          >
            Sharps ♯
          </button>
          <button
            type="button"
            aria-pressed={preferFlats}
            onClick={() => chooseSpelling(true)}
          >
            Flats ♭
          </button>
        </div>
      </div>
      <PianoKeyboard
        title="Play the piano"
        highlights={highlights}
        noteSpellings={showScale ? noteSpellings : undefined}
        showNoteNames
        preferFlats={preferFlats}
        selectedMidi={selected}
        onNote={setSelected}
      />

      <div class="info-grid">
        <section class="card selected-note-card">
          <span class="section-label">Selected note</span>
          <div class="selected-note">
            <strong>{selectedName}</strong>
            <div>
              <span>Octave {octave(selected)}</span>
              <small>{frequency(selected).toFixed(2)} Hz</small>
            </div>
          </div>
          <div class="sound-settings inline-settings">
            <label>
              Volume
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onInput={(event) =>
                  setVolume(Number(event.currentTarget.value))
                }
              />
            </label>
            <label>
              Tone
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={tone}
                onInput={(event) => setTone(Number(event.currentTarget.value))}
              />
            </label>
          </div>
        </section>
        <GrandStaff
          notes={showScale ? notes : [selected]}
          title={showScale ? title : `Selected note ${selectedName}`}
          spellings={showScale ? spellings : [pitchName(selected, preferFlats)]}
          preferFlats={preferFlats}
          selectedMidi={selected}
          onPick={showScale ? undefined : chooseNote}
        />
      </div>

      <section class="card explorer-bar" aria-label="Scale explorer">
        <div class="explorer-title">
          <div>
            <span class="section-label">Explore a scale</span>
            <h3>{title}</h3>
          </div>
          <div class="button-row">
            <button
              type="button"
              class={showScale ? "primary" : ""}
              aria-pressed={showScale}
              onClick={() => setShowScale((value) => !value)}
            >
              {showScale ? "Hide highlights" : "Highlight notes"}
            </button>
            <button type="button" onClick={() => piano.playSequence(notes)}>
              Hear low to high
            </button>
            <button
              type="button"
              onClick={() => piano.playSequence([...notes].reverse())}
            >
              Hear high to low
            </button>
          </div>
        </div>
        <div class="form-grid compact-form">
          <label>
            Starting note
            <select
              value={tonic}
              onChange={(event) => setTonic(event.currentTarget.value)}
            >
              {tonics.map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Scale pattern
            <select
              value={scaleId}
              onChange={(event) => setScaleId(event.currentTarget.value)}
            >
              {SCALES.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p class="scale-help">
          Play these notes in order. Start and finish on the root (1).
        </p>
        <div class="note-strip" aria-label={`${title} notes`}>
          {spellings.map((spelling, index) => (
            <button
              type="button"
              class={
                index === 0 || index === spellings.length - 1 ? "root-note" : ""
              }
              key={`${spelling}-${index}`}
              onClick={() => piano.playSequence([notes[index]], false)}
            >
              <strong>{spelling}</strong>
              <span>{scale.degrees[index]}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
