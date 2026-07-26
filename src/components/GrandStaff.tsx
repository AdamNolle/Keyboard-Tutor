import { piano } from "../audio/PianoEngine";
import {
  midiForStaffStep,
  noteName,
  PIANO_MAX,
  PIANO_MIN,
  pitchName,
  spellingOctave,
  staffStep,
} from "../music/theory";

type Props = {
  notes: number[];
  title: string;
  spellings?: string[];
  preferFlats?: boolean;
  selectedMidi?: number;
  onPick?: (midi: number) => void;
  concealNoteNames?: boolean;
};

function ledgerSteps(step: number) {
  if (step === 0) return [0]; // middle C
  const steps: number[] = [];
  if (step >= 12)
    for (let value = 12; value <= step; value += 2) steps.push(value);
  if (step <= -12)
    for (let value = -12; value >= step; value -= 2) steps.push(value);
  return steps;
}

export function GrandStaff({
  notes,
  title,
  spellings,
  preferFlats = false,
  selectedMidi,
  onPick,
  concealNoteNames = false,
}: Props) {
  const written = notes.map((midi, index) => {
    const spelling = spellings?.[index] ?? pitchName(midi, preferFlats);
    const writtenOctave = spellingOctave(midi, spelling);
    return {
      midi,
      spelling,
      octave: writtenOctave,
      spoken: `${spelling.replaceAll("♯", " sharp").replaceAll("♭", " flat")} ${writtenOctave}`,
      step: staffStep(midi, spelling),
      accidental: spelling.slice(1),
    };
  });
  const described = written
    .map(({ midi, spelling, octave }) =>
      spellings ? `${spelling}${octave}` : noteName(midi, preferFlats),
    )
    .join(", ");
  const yForStep = (step: number) => 112 - step * 5;
  const plotted = written.map((note, index) => ({
    ...note,
    x:
      written.length === 1
        ? 300
        : 135 + index * Math.min(62, 440 / Math.max(1, written.length - 1)),
    y: yForStep(note.step),
    stemDown: note.step >= (note.step >= 0 ? 6 : -6),
  }));
  const pickerMin = PIANO_MIN;
  const pickerMax = PIANO_MAX;
  const pickerValue = Math.max(
    pickerMin,
    Math.min(pickerMax, selectedMidi ?? notes[0] ?? 60),
  );
  const viewTop = Math.min(0, ...plotted.map((note) => note.y - 30));
  const viewBottom = Math.max(210, ...plotted.map((note) => note.y + 30));
  const viewHeight = viewBottom - viewTop;
  const playNote = (midi: number) => piano.playSequence([midi], false);
  const pickNote = (midi: number) => {
    const next = Math.max(pickerMin, Math.min(pickerMax, midi));
    onPick?.(next);
    playNote(next);
  };
  const pickFromStaff = (event: MouseEvent) => {
    if (!onPick) return;
    const svg = event.currentTarget as SVGSVGElement;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    pickNote(midiForStaffStep(Math.round((112 - point.y) / 5)));
  };
  const staffKey = (event: KeyboardEvent) => {
    if (!onPick) return;
    const changes: Record<string, number> = {
      ArrowUp: 1,
      ArrowRight: 1,
      ArrowDown: -1,
      ArrowLeft: -1,
      PageUp: 12,
      PageDown: -12,
      Home: pickerMin - pickerValue,
      End: pickerMax - pickerValue,
    };
    const change = changes[event.key];
    if (change === undefined) return;
    event.preventDefault();
    pickNote(pickerValue + change);
  };
  return (
    <figure class={`staff-card ${onPick ? "staff-picker" : ""}`}>
      {onPick && (
        <div class="staff-picker-heading">
          <div>
            <span class="section-label">Staff note picker</span>
            <p>Tap a line or space, then fine-tune the note below.</p>
          </div>
          <strong class="staff-selected-note" aria-live="polite">
            {noteName(pickerValue, preferFlats)}
          </strong>
        </div>
      )}
      <div class="staff-graphic">
        <svg
          class={`staff ${onPick ? "is-pickable" : ""}`}
          viewBox={`0 ${viewTop} 640 ${viewHeight}`}
          preserveAspectRatio={onPick ? "none" : "xMidYMid meet"}
          aria-hidden={onPick ? undefined : "true"}
          aria-label={onPick ? "Choose a note on the staff" : undefined}
          role={onPick ? "slider" : undefined}
          tabIndex={onPick ? 0 : undefined}
          aria-valuemin={onPick ? pickerMin : undefined}
          aria-valuemax={onPick ? pickerMax : undefined}
          aria-valuenow={onPick ? pickerValue : undefined}
          aria-valuetext={
            onPick ? noteName(pickerValue, preferFlats) : undefined
          }
          onClick={pickFromStaff}
          onKeyDown={staffKey}
        >
          <title>{title} on the grand staff</title>
          <desc>{described}</desc>
          {[62, 72, 82, 92, 102, 122, 132, 142, 152, 162].map((y) => (
            <line key={y} x1="45" y1={y} x2="620" y2={y} />
          ))}
          <text class="clef" x="50" y="99" aria-hidden="true">
            𝄞
          </text>
          <text class="clef bass" x="55" y="158" aria-hidden="true">
            𝄢
          </text>
          {plotted.map(({ midi, step, accidental, x, y, stemDown }, index) => {
            return (
              <g key={`${midi}-${index}`}>
                {ledgerSteps(step).map((ledger) => (
                  <line
                    class="ledger"
                    key={ledger}
                    x1={x - 14}
                    y1={yForStep(ledger)}
                    x2={x + 14}
                    y2={yForStep(ledger)}
                  />
                ))}
                {accidental && (
                  <text class="accidental" x={x - 24} y={y + 6}>
                    {accidental}
                  </text>
                )}
                <ellipse
                  cx={x}
                  cy={y}
                  rx="9"
                  ry="6"
                  transform={`rotate(-15 ${x} ${y})`}
                />
                <line
                  x1={x + (stemDown ? -8 : 8)}
                  y1={y}
                  x2={x + (stemDown ? -8 : 8)}
                  y2={y + (stemDown ? 32 : -32)}
                />
              </g>
            );
          })}
        </svg>
        {plotted.map(({ midi, spoken, x, y }, index) => (
          <button
            type="button"
            class={`staff-note-button ${onPick && midi === pickerValue ? "is-selected" : ""}`}
            style={{
              left: `${(x / 640) * 100}%`,
              top: `${((y - viewTop) / viewHeight) * 100}%`,
            }}
            aria-label={
              concealNoteNames
                ? "Play the training note"
                : `${onPick ? "Select" : "Play"} ${spoken}`
            }
            title={
              concealNoteNames
                ? "Play the training note"
                : `${onPick ? "Select" : "Play"} ${spoken}`
            }
            key={`${midi}-button-${index}`}
            onClick={() => (onPick ? pickNote(midi) : playNote(midi))}
          >
            <span class="sr-only">Play {spoken}</span>
          </button>
        ))}
      </div>
      <figcaption>
        {concealNoteNames ? (
          <>
            <strong>{title}:</strong> read its position, then choose your
            answer.
          </>
        ) : (
          <>
            <strong>{title}:</strong> {described} ·{" "}
            {onPick
              ? "Tap a line or space to choose a natural note."
              : "Select a note to hear it."}
          </>
        )}
      </figcaption>
      {onPick && (
        <div class="staff-picker-footer">
          <span class="section-label">Move selected note</span>
          <div class="staff-pick-controls" aria-label="Adjust selected note">
            <button
              type="button"
              disabled={pickerValue - 12 < pickerMin}
              onClick={() => pickNote(pickerValue - 12)}
            >
              <strong>−8ve</strong>
              <small>Octave</small>
            </button>
            <button
              type="button"
              disabled={pickerValue <= pickerMin}
              onClick={() => pickNote(pickerValue - 1)}
            >
              <strong>−1</strong>
              <small>Semitone</small>
            </button>
            <button
              type="button"
              disabled={pickerValue >= pickerMax}
              onClick={() => pickNote(pickerValue + 1)}
            >
              <strong>+1</strong>
              <small>Semitone</small>
            </button>
            <button
              type="button"
              disabled={pickerValue + 12 > pickerMax}
              onClick={() => pickNote(pickerValue + 12)}
            >
              <strong>+8ve</strong>
              <small>Octave</small>
            </button>
          </div>
        </div>
      )}
    </figure>
  );
}
