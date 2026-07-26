import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import { piano } from "../audio/PianoEngine";
import {
  accessibleNoteName,
  isBlack,
  noteName,
  pitchName,
  spellingOctave,
} from "../music/theory";

type Props = {
  title?: string;
  highlights?: Map<number, string>;
  noteSpellings?: Map<number, string>;
  showNoteNames?: boolean;
  revealHighlightNames?: boolean;
  preferFlats?: boolean;
  selectedMidi?: number;
  onNote?: (midi: number) => void;
  compact?: boolean;
};
const KEY_CODES = [
  "KeyA",
  "KeyW",
  "KeyS",
  "KeyE",
  "KeyD",
  "KeyF",
  "KeyT",
  "KeyG",
  "KeyY",
  "KeyH",
  "KeyU",
  "KeyJ",
  "KeyK",
];
const interactive = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(
    target.closest(
      'button, a[href], input, select, textarea, summary, [role="button"], [contenteditable]:not([contenteditable="false"])',
    ),
  );

export function PianoKeyboard({
  title = "Piano",
  highlights = new Map(),
  noteSpellings = new Map(),
  showNoteNames = false,
  revealHighlightNames = true,
  preferFlats = false,
  selectedMidi,
  onNote,
  compact = false,
}: Props) {
  const [start, setStart] = useState(compact ? 48 : 36);
  const [fullRange, setFullRange] = useState(false);
  const [octave, setOctave] = useState(4);
  const octaveRef = useRef(octave);
  octaveRef.current = octave;
  const [focused, setFocused] = useState(60);
  const [active, setActive] = useState<Set<number>>(new Set());
  const [sustain, setSustainState] = useState(false);
  const [midiStatus, setMidiStatus] = useState(
    "Optional MIDI is not connected.",
  );
  const pointers = useRef(new Map<number, number>());
  const computer = useRef(new Map<string, number>());
  const accessibleHeld = useRef(new Map<string, number>());
  const sustainSources = useRef(new Set<string>());
  const spaceSustain = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const onNoteRef = useRef(onNote);
  onNoteRef.current = onNote;
  const midiCleanup = useRef<(() => void) | null>(null);
  const sourceNotes = useRef(new Map<string, Set<number>>());
  const end = fullRange ? 108 : start + (compact ? 24 : 48);
  const notes = useMemo(
    () => Array.from({ length: end - start + 1 }, (_, i) => start + i),
    [start, end],
  );
  const whiteNotes = notes.filter((midi) => !isBlack(midi));

  useEffect(
    () => piano.subscribeActiveNotes((notes) => setActive(new Set(notes))),
    [],
  );

  const play = useCallback((midi: number, source: string, velocity = 0.8) => {
    if (midi < 21 || midi > 108) return;
    const held = sourceNotes.current.get(source) ?? new Set<number>();
    if (held.has(midi)) return;
    held.add(midi);
    sourceNotes.current.set(source, held);
    piano.noteOn(midi, velocity, source);
    onNoteRef.current?.(midi);
  }, []);
  const release = useCallback((midi: number, source: string) => {
    const held = sourceNotes.current.get(source);
    if (!held?.delete(midi)) return;
    if (!held.size) sourceNotes.current.delete(source);
    piano.noteOff(midi, source);
  }, []);
  const syncSustain = useCallback(() => {
    const next = sustainSources.current.size > 0;
    setSustainState(next);
    piano.setSustain(next);
  }, []);
  const clearSource = useCallback(
    (source?: string) => {
      if (source) {
        sourceNotes.current.delete(source);
        sustainSources.current.delete(source);
        piano.allNotesOff(source);
      } else {
        sourceNotes.current.clear();
        sustainSources.current.clear();
        piano.allNotesOff();
        pointers.current.clear();
        computer.current.clear();
        accessibleHeld.current.clear();
        spaceSustain.current = false;
      }
      syncSustain();
    },
    [syncSustain],
  );
  const setSustain = useCallback(
    (source: string, next: boolean) => {
      if (next) sustainSources.current.add(source);
      else sustainSources.current.delete(source);
      syncSustain();
    },
    [syncSustain],
  );

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        interactive(event.target) ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      if (event.code === "KeyZ" || event.code === "KeyX") {
        event.preventDefault();
        setOctave((v) =>
          Math.max(1, Math.min(6, v + (event.code === "KeyX" ? 1 : -1))),
        );
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        spaceSustain.current = true;
        setSustain("computer-sustain", true);
        return;
      }
      const index = KEY_CODES.indexOf(event.code);
      if (index >= 0) {
        event.preventDefault();
        const midi = (octaveRef.current + 1) * 12 + index;
        computer.current.set(event.code, midi);
        play(midi, `computer-${event.code}`, 0.74);
      }
    };
    const keyup = (event: KeyboardEvent) => {
      if (event.code === "Space" && spaceSustain.current) {
        spaceSustain.current = false;
        setSustain("computer-sustain", false);
        return;
      }
      const midi = computer.current.get(event.code);
      if (midi !== undefined) {
        release(midi, `computer-${event.code}`);
        computer.current.delete(event.code);
      }
    };
    const cleanup = () => clearSource();
    const visibility = () => {
      if (document.hidden) cleanup();
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", cleanup);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", cleanup);
      document.removeEventListener("visibilitychange", visibility);
      midiCleanup.current?.();
      cleanup();
    };
  }, [clearSource, play, release, setSustain]);

  useEffect(() => {
    if (focused < start || focused > end)
      setFocused(Math.max(start, Math.min(end, focused)));
  }, [start, end, focused]);

  useEffect(() => {
    if (fullRange) return;
    const highlighted = [...highlights.keys()].sort((a, b) => a - b);
    const targets =
      highlighted.length > 0 && highlighted.length <= 8
        ? highlighted
        : selectedMidi !== undefined
          ? [selectedMidi]
          : [];
    if (!targets.length) return;
    const target = targets[Math.floor(targets.length / 2)];
    const span = compact ? 24 : 48;
    const maxStart = compact ? 84 : 60;
    const nextStart = Math.max(
      21,
      Math.min(maxStart, Math.round(target - span / 2)),
    );
    setStart(nextStart);
    setFocused(target);
  }, [compact, fullRange, highlights, selectedMidi]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const scroller = scrollRef.current;
      const centeredMidi = Math.max(start, Math.min(end, focused));
      const key = scroller?.querySelector<HTMLElement>(
        `[data-midi="${centeredMidi}"]`,
      );
      if (scroller && key)
        scroller.scrollLeft = Math.max(
          0,
          key.offsetLeft + key.offsetWidth / 2 - scroller.clientWidth / 2,
        );
    });
    return () => cancelAnimationFrame(frame);
  }, [start, end, focused, fullRange]);

  const pointerDown = (event: PointerEvent, midi: number) => {
    event.preventDefault();
    const source = `pointer-${event.pointerId}`;
    pointers.current.set(event.pointerId, midi);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    play(midi, source, event.pointerType === "mouse" ? 0.76 : 0.84);
  };
  const pointerMove = (event: PointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return;
    const element = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-midi]");
    const next = Number(element?.dataset.midi);
    const previous = pointers.current.get(event.pointerId)!;
    if (Number.isFinite(next) && next !== previous) {
      release(previous, `pointer-${event.pointerId}`);
      pointers.current.set(event.pointerId, next);
      play(next, `pointer-${event.pointerId}`, 0.8);
    }
  };
  const pointerEnd = (event: PointerEvent) => {
    const midi = pointers.current.get(event.pointerId);
    if (midi !== undefined) release(midi, `pointer-${event.pointerId}`);
    pointers.current.delete(event.pointerId);
  };
  const moveFocus = (midi: number) => {
    const next = Math.max(start, Math.min(end, midi));
    setFocused(next);
    scrollRef.current
      ?.querySelector<HTMLElement>(`[data-midi="${next}"]`)
      ?.focus();
  };
  const keyControl = (event: KeyboardEvent, midi: number) => {
    if (event.code === "ArrowRight") {
      event.preventDefault();
      moveFocus(midi + 1);
    } else if (event.code === "ArrowLeft") {
      event.preventDefault();
      moveFocus(midi - 1);
    } else if (event.code === "ArrowUp") {
      event.preventDefault();
      moveFocus(midi + 12);
    } else if (event.code === "ArrowDown") {
      event.preventDefault();
      moveFocus(midi - 12);
    } else if (event.code === "Home") {
      event.preventDefault();
      moveFocus(start);
    } else if (event.code === "End") {
      event.preventDefault();
      moveFocus(end);
    } else if (
      (event.code === "Enter" || event.code === "Space") &&
      !event.repeat
    ) {
      event.preventDefault();
      const source = `accessible-${event.code}`;
      accessibleHeld.current.set(event.code, midi);
      play(midi, source);
    }
  };
  const keyRelease = (event: KeyboardEvent) => {
    const midi = accessibleHeld.current.get(event.code);
    if (midi === undefined) return;
    release(midi, `accessible-${event.code}`);
    accessibleHeld.current.delete(event.code);
  };

  const shiftVisibleRange = (direction: -1 | 1) => {
    setStart((value) =>
      direction < 0
        ? Math.max(21, value - 12)
        : Math.min(compact ? 84 : 60, value + 12),
    );
    setFocused((value) => Math.max(21, Math.min(108, value + direction * 12)));
  };

  const setPianoView = (showFullPiano: boolean) => {
    setFullRange(showFullPiano);
    setStart(showFullPiano ? 21 : compact ? 48 : 36);
  };

  const connectMidi = async () => {
    const nav = navigator as Navigator & {
      requestMIDIAccess?: (options: { sysex: boolean }) => Promise<any>;
    };
    if (!nav.requestMIDIAccess) {
      setMidiStatus(
        "Web MIDI is unavailable in this browser. The piano still works.",
      );
      return;
    }
    try {
      const access = await nav.requestMIDIAccess({ sysex: false });
      midiCleanup.current?.();
      const attach = () => {
        for (const input of access.inputs.values())
          input.onmidimessage = (event: any) => {
            const [status, midi, velocity = 0] = event.data;
            const command = status & 0xf0;
            const source = `midi-${input.id}`;
            if (command === 0x90 && velocity > 0)
              play(midi, source, velocity / 127);
            else if (command === 0x80 || (command === 0x90 && velocity === 0))
              release(midi, source);
            else if (command === 0xb0 && midi === 64)
              setSustain(source, velocity >= 64);
          };
        setMidiStatus(
          access.inputs.size
            ? `${access.inputs.size} MIDI input connected.`
            : "MIDI permission granted; connect a device.",
        );
      };
      attach();
      access.onstatechange = (event: any) => {
        if (event.port?.state === "disconnected")
          clearSource(`midi-${event.port.id}`);
        attach();
      };
      midiCleanup.current = () => {
        access.onstatechange = null;
        for (const input of access.inputs.values()) input.onmidimessage = null;
      };
    } catch {
      setMidiStatus(
        "MIDI permission was not granted. Touch and QWERTY input still work.",
      );
    }
  };

  let whiteIndex = 0;
  return (
    <section class="keyboard-panel" aria-labelledby="keyboard-heading">
      <div class="keyboard-toolbar">
        <div>
          <h3 id="keyboard-heading">{title}</h3>
          <p class="piano-instruction">
            {fullRange
              ? "Full keyboard overview. Switch to Focused for larger playable keys."
              : "Tap or click a key to play it. Use Lower and Higher to move."}
            {highlights.size > 0 && " Marked keys are the notes to practice."}
          </p>
        </div>
        <div class="keyboard-actions">
          <div class="piano-view-toggle" role="group" aria-label="Piano view">
            <button
              type="button"
              class={!fullRange ? "is-on" : ""}
              aria-pressed={!fullRange}
              onClick={() => setPianoView(false)}
            >
              Focused
            </button>
            <button
              type="button"
              class={fullRange ? "is-on" : ""}
              aria-pressed={fullRange}
              onClick={() => setPianoView(true)}
            >
              Full 88 keys
            </button>
          </div>
          {!fullRange && (
            <div class="range-controls" aria-label="Move across the piano">
              <span>
                {noteName(start, preferFlats)}–{noteName(end, preferFlats)}
              </span>
              <button
                type="button"
                onClick={() => shiftVisibleRange(-1)}
                aria-label="Show lower octave"
              >
                ← Lower
              </button>
              <button
                type="button"
                onClick={() => shiftVisibleRange(1)}
                aria-label="Show higher octave"
              >
                Higher →
              </button>
            </div>
          )}
        </div>
      </div>
      <p class="sr-only" aria-live="polite">
        {midiStatus}
      </p>
      <div
        ref={scrollRef}
        class={`piano-scroll ${fullRange ? "full-piano-scroll" : ""}`}
        aria-label={
          fullRange
            ? "Full 88-key piano overview"
            : `Piano keyboard, ${noteName(start, preferFlats)} through ${noteName(end, preferFlats)}`
        }
      >
        <div
          class={`piano ${fullRange ? "full-piano-view" : ""}`}
          aria-hidden={fullRange ? "true" : undefined}
          style={{ "--white-count": whiteNotes.length } as any}
          onPointerMove={pointerMove}
          onPointerUp={pointerEnd}
          onPointerCancel={pointerEnd}
          onLostPointerCapture={pointerEnd}
        >
          {notes.map((midi) => {
            const black = isBlack(midi);
            const position = black ? whiteIndex - 0.34 : whiteIndex++;
            const contextualSpelling = noteSpellings.get(midi);
            const label = contextualSpelling
              ? `${contextualSpelling
                  .replaceAll("♯", " sharp")
                  .replaceAll(
                    "♭",
                    " flat",
                  )} ${spellingOctave(midi, contextualSpelling)}`
              : accessibleNoteName(midi, preferFlats);
            const state = highlights.get(midi);
            const root = state?.toLowerCase() === "root";
            const visualName =
              contextualSpelling ?? pitchName(midi, preferFlats);
            const accessibleLabel =
              state && !revealHighlightNames
                ? `Highlighted question, ${black ? "black" : "white"} key`
                : `${label}, ${black ? "black" : "white"} key${state ? `, ${state}` : ""}${selectedMidi === midi ? ", selected" : ""}`;
            return (
              <button
                key={midi}
                type="button"
                data-midi={midi}
                aria-label={accessibleLabel}
                data-playing={active.has(midi) ? "true" : undefined}
                tabIndex={!fullRange && focused === midi ? 0 : -1}
                class={`piano-key ${black ? "black-key" : "white-key"} ${active.has(midi) ? "active-key" : ""} ${selectedMidi === midi ? "selected-key" : ""} ${state ? "highlight-key" : ""} ${root ? "root-key" : ""}`}
                style={{ "--key-index": position } as any}
                onFocus={() => setFocused(midi)}
                onPointerDown={(e) => pointerDown(e, midi)}
                onClick={(event) => {
                  if (event.detail !== 0) return;
                  const source = `assistive-${midi}`;
                  play(midi, source);
                  window.setTimeout(() => release(midi, source), 450);
                }}
                onKeyDown={(e) => keyControl(e, midi)}
                onKeyUp={keyRelease}
              >
                <span class="key-label">
                  {state ? (
                    <>
                      {revealHighlightNames && <strong>{visualName}</strong>}
                      {!fullRange && <small>{state}</small>}
                    </>
                  ) : showNoteNames ? (
                    <strong>{visualName}</strong>
                  ) : !black && midi % 12 === 0 ? (
                    <strong>{noteName(midi)}</strong>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <details class="piano-options">
        <summary>More piano controls</summary>
        <div class="toolbar-controls">
          <button
            type="button"
            class={sustain ? "is-on" : ""}
            aria-pressed={sustain}
            onClick={() =>
              setSustain("ui-toggle", !sustainSources.current.has("ui-toggle"))
            }
          >
            Sustain {sustain ? "on" : "off"}
          </button>
          <button type="button" onClick={connectMidi}>
            Connect MIDI
          </button>
        </div>
        <p class="keyboard-status" aria-live="off">
          Computer keys: A–K play notes · Z/X changes octave (now C{octave}) ·
          Space holds sustain. <span>{midiStatus}</span>
        </p>
      </details>
    </section>
  );
}
