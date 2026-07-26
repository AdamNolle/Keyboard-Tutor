import { useMemo, useState } from "preact/hooks";
import { piano } from "../audio/PianoEngine";
import {
  CHORDS,
  SCALES,
  chordMidis,
  parseSpelling,
  scaleMidis,
  spellChord,
  spellScale,
  spellingPc,
} from "../music/theory";
import { GrandStaff } from "./GrandStaff";
import { PianoKeyboard } from "./PianoKeyboard";

const TONICS = [
  "C",
  "C♯",
  "D♭",
  "D",
  "E♭",
  "E",
  "F",
  "F♯",
  "G♭",
  "G",
  "A♭",
  "A",
  "B♭",
  "B",
];
export function TheoryPage() {
  const [kind, setKind] = useState<"scale" | "chord">("scale");
  const [tonic, setTonic] = useState("C");
  const [scaleId, setScaleId] = useState("major");
  const [chordId, setChordId] = useState("major");
  const [inversion, setInversion] = useState(0);
  const root = 60 + spellingPc(parseSpelling(tonic));
  const scale = SCALES.find((item) => item.id === scaleId)!;
  const chord = CHORDS.find((item) => item.id === chordId)!;
  const notes =
    kind === "scale"
      ? scaleMidis(root, scale)
      : chordMidis(root, chord, inversion);
  const spellings =
    kind === "scale"
      ? spellScale(tonic, scale)
      : spellChord(tonic, chord, inversion);
  const title =
    kind === "scale"
      ? `${tonic} ${scale.name}`
      : `${tonic}${chord.symbol} (${chord.name}, ${inversion === 0 ? "root position" : `${inversion}${inversion === 1 ? "st" : inversion === 2 ? "nd" : "rd"} inversion`})`;
  const noteSpellings = useMemo(
    () => new Map(notes.map((midi, index) => [midi, spellings[index]])),
    [notes.join(","), spellings.join(",")],
  );
  const highlights = useMemo(() => {
    const chordLabels: Record<number, string> = {
      0: "root · 1",
      2: "2nd",
      3: "minor 3rd",
      4: "major 3rd",
      5: "4th",
      6: "diminished 5th",
      7: "5th",
      8: "augmented 5th",
      9: "diminished 7th",
      10: "minor 7th",
      11: "major 7th",
    };
    return new Map(
      notes.map((midi, index) => {
        if (kind === "scale") return [midi, `degree ${scale.degrees[index]}`];
        const sourceIndex = (index + inversion) % chord.intervals.length;
        const interval = chord.intervals[sourceIndex];
        return [midi, chordLabels[interval] ?? `tone ${sourceIndex + 1}`];
      }),
    );
  }, [notes.join(","), kind, scale, chord, inversion]);
  return (
    <div class="feature-stack">
      <section class="card explorer" aria-labelledby="theory-title">
        <div>
          <p class="eyebrow">Theory explorer</p>
          <h2 id="theory-title">Build it. See it. Hear it.</h2>
          <p>
            Context-aware spellings keep the musical alphabet correct—even F♯
            major’s E♯.
          </p>
        </div>
        <div class="segmented" aria-label="Explorer type">
          <button
            type="button"
            aria-pressed={kind === "scale"}
            onClick={() => setKind("scale")}
          >
            Scales
          </button>
          <button
            type="button"
            aria-pressed={kind === "chord"}
            onClick={() => setKind("chord")}
          >
            Chords
          </button>
        </div>
        <div class="form-grid">
          <label>
            Tonic
            <select
              value={tonic}
              onChange={(e) => setTonic(e.currentTarget.value)}
            >
              {TONICS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          {kind === "scale" ? (
            <label>
              Scale
              <select
                value={scaleId}
                onChange={(e) => setScaleId(e.currentTarget.value)}
              >
                {SCALES.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label>
                Quality
                <select
                  value={chordId}
                  onChange={(e) => {
                    setChordId(e.currentTarget.value);
                    setInversion(0);
                  }}
                >
                  {CHORDS.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Inversion
                <select
                  value={inversion}
                  onChange={(e) => setInversion(Number(e.currentTarget.value))}
                >
                  {chord.intervals.map((_, i) => (
                    <option value={i} key={i}>
                      {i === 0 ? "Root position" : `Inversion ${i}`}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        <div class="theory-result">
          <div>
            <p class="eyebrow">{kind}</p>
            <h3>{title}</h3>
            <p class="big-notes">{spellings.join(" · ")}</p>
            <p>
              {kind === "scale"
                ? `Formula in semitones: ${scale.intervals.join("–")}. Degrees: ${scale.degrees.join(", ")}.`
                : `Formula from root: ${chord.intervals.join("–")} semitones. Inversions rotate the bass while preserving the chord’s pitch classes.`}
            </p>
          </div>
          <div class="button-row">
            {kind === "scale" ? (
              <>
                <button type="button" onClick={() => piano.playSequence(notes)}>
                  Play ascending
                </button>
                <button
                  type="button"
                  onClick={() => piano.playSequence([...notes].reverse())}
                >
                  Play descending
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => piano.playSequence(notes, false)}
                >
                  Play block
                </button>
                <button
                  type="button"
                  onClick={() => piano.playSequence(notes, true)}
                >
                  Arpeggiate
                </button>
              </>
            )}
          </div>
        </div>
      </section>
      <GrandStaff notes={notes} title={title} spellings={spellings} />
      <PianoKeyboard highlights={highlights} noteSpellings={noteSpellings} />
    </div>
  );
}
