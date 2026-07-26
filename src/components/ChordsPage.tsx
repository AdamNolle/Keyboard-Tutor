import { useMemo, useState } from "preact/hooks";
import { piano } from "../audio/PianoEngine";
import {
  CHORDS,
  chordMidis,
  parseSpelling,
  pitchName,
  spellChord,
  spellingOctave,
  spellingPc,
} from "../music/theory";
import { GrandStaff } from "./GrandStaff";
import { PianoKeyboard } from "./PianoKeyboard";

const CHORD_CATEGORIES = [
  {
    id: "basic",
    label: "Basic",
    chords: ["major", "minor", "diminished", "augmented"],
  },
  {
    id: "suspended",
    label: "Suspended",
    chords: ["sus2", "sus4"],
  },
  {
    id: "sevenths",
    label: "7th chords",
    chords: [
      "dominant7",
      "major7",
      "minor7",
      "half-diminished7",
      "diminished7",
    ],
  },
] as const;

const TONE_NAMES: Record<number, string> = {
  0: "Root",
  2: "2nd",
  3: "Minor 3rd",
  4: "Major 3rd",
  5: "4th",
  6: "Diminished 5th",
  7: "5th",
  8: "Augmented 5th",
  9: "Diminished 7th",
  10: "Minor 7th",
  11: "Major 7th",
};

type Props = {
  preferFlats: boolean;
  setPreferFlats: (value: boolean) => void;
};

export function ChordsPage({ preferFlats, setPreferFlats }: Props) {
  const [tonic, setTonic] = useState("C");
  const [chordId, setChordId] = useState("major");
  const [inversion, setInversion] = useState(0);
  const chord = CHORDS.find((item) => item.id === chordId)!;
  const rootPc = spellingPc(parseSpelling(tonic));
  const root = 60 + rootPc;
  const notes = chordMidis(root, chord, inversion);
  const spellings = spellChord(tonic, chord, inversion);
  const rootPositionSpellings = spellChord(tonic, chord, 0);
  const inversionName =
    inversion === 0
      ? "Root position"
      : `${inversion === 1 ? "1st" : inversion === 2 ? "2nd" : "3rd"} inversion`;
  const title =
    chord.id === "major" ? `${tonic} major` : `${tonic}${chord.symbol}`;
  const tonics = Array.from({ length: 12 }, (_, index) =>
    pitchName(index, preferFlats),
  );
  const chordIndex = CHORDS.findIndex((item) => item.id === chordId);
  const activeCategory = CHORD_CATEGORIES.find((category) =>
    category.chords.some((id) => id === chordId),
  )!;
  const categoryChords = activeCategory.chords.map((id) =>
    CHORDS.find((item) => item.id === id)!,
  );
  const selectChord = (nextId: string) => {
    setChordId(nextId);
    setInversion(0);
  };
  const chooseSpelling = (flats: boolean) => {
    setTonic(pitchName(rootPc, flats));
    setPreferFlats(flats);
  };
  const tones = notes.map((midi, index) => {
    const sourceIndex = (index + inversion) % chord.intervals.length;
    const interval = chord.intervals[sourceIndex];
    return {
      midi,
      spelling: spellings[index],
      interval,
      label: TONE_NAMES[interval] ?? `Tone ${sourceIndex + 1}`,
    };
  });

  const highlights = useMemo(
    () => new Map(tones.map((tone) => [tone.midi, tone.label])),
    [notes.join(","), inversion, chord],
  );
  const noteSpellings = useMemo(
    () => new Map(tones.map((tone) => [tone.midi, tone.spelling])),
    [notes.join(","), spellings.join(",")],
  );

  return (
    <div class="feature-stack chords-page">
      <section class="card explorer-bar" aria-label="Chord controls">
        <div class="explorer-title">
          <div>
            <span class="section-label">Chord</span>
            <h3>
              {title} <small>{inversionName}</small>
            </h3>
          </div>
          <div class="button-row">
            <button
              type="button"
              class="primary"
              onClick={() => piano.playSequence(notes, false)}
            >
              Hear together
            </button>
            <button type="button" onClick={() => piano.playSequence(notes)}>
              Hear one at a time
            </button>
          </div>
        </div>
        <div class="chord-root-controls">
          <div class="spelling-control" aria-label="Note spelling">
            <span class="section-label">Note names</span>
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
        </div>
        <div class="chord-browser">
          <div class="chord-browser-heading">
            <div>
              <span class="section-label">Browse chords</span>
              <strong aria-live="polite">
                {chordIndex + 1} of {CHORDS.length} · {chord.name}
              </strong>
            </div>
            <div class="chord-stepper">
              <button
                type="button"
                disabled={chordIndex === 0}
                onClick={() => selectChord(CHORDS[chordIndex - 1].id)}
              >
                ← Previous
              </button>
              <button
                type="button"
                disabled={chordIndex === CHORDS.length - 1}
                onClick={() => selectChord(CHORDS[chordIndex + 1].id)}
              >
                Next →
              </button>
            </div>
          </div>
          <div
            class="chord-category-row"
            role="group"
            aria-label="Chord family"
          >
            {CHORD_CATEGORIES.map((category) => (
              <button
                type="button"
                class={category.id === activeCategory.id ? "primary" : ""}
                aria-pressed={category.id === activeCategory.id}
                onClick={() => selectChord(category.chords[0])}
                key={category.id}
              >
                {category.label}
              </button>
            ))}
          </div>
          <div class="chord-chip-row" role="group" aria-label="Chord type">
            {categoryChords.map((item) => (
              <button
                type="button"
                class={item.id === chordId ? "selected" : ""}
                aria-pressed={item.id === chordId}
                onClick={() => selectChord(item.id)}
                key={item.id}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
        <details class="chord-options">
          <summary>More chord options</summary>
          <label>
            Lowest note
            <select
              value={inversion}
              onChange={(event) =>
                setInversion(Number(event.currentTarget.value))
              }
            >
              {chord.intervals.map((_, index) => (
                <option value={index} key={index}>
                  {index === 0
                    ? `Root position — ${rootPositionSpellings[0]} is lowest`
                    : `${index === 1 ? "1st" : index === 2 ? "2nd" : "3rd"} inversion — ${rootPositionSpellings[index]} is lowest`}
                </option>
              ))}
            </select>
          </label>
          <p class="hint">
            Changing the lowest note rearranges the chord without changing its
            name. Distances from the root: {chord.intervals.join(", ")}{" "}
            semitones.
          </p>
        </details>
      </section>

      <section class="card chord-keys-card" aria-labelledby="chord-keys-title">
        <div class="chord-keys-heading">
          <div>
            <span class="section-label">Keys to press</span>
            <h3 id="chord-keys-title">{spellings.join("  +  ")}</h3>
          </div>
        </div>
        <p class="chord-instruction">
          Press these marked piano keys at the same time.
        </p>
        <div class="chord-key-list">
          {tones.map((tone) => (
            <button
              type="button"
              key={tone.midi}
              class={tone.interval === 0 ? "root-tone" : ""}
              onClick={() => piano.playSequence([tone.midi], false)}
            >
              <strong>
                {tone.spelling}
                {spellingOctave(tone.midi, tone.spelling)}
              </strong>
              <span>{tone.label}</span>
            </button>
          ))}
        </div>
      </section>

      <PianoKeyboard
        title="Chord keyboard"
        highlights={highlights}
        noteSpellings={noteSpellings}
        showNoteNames
        preferFlats={preferFlats}
      />

      <GrandStaff
        notes={notes}
        title={title}
        spellings={spellings}
        preferFlats={preferFlats}
      />
    </div>
  );
}
