export type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";
export type Spelling = { letter: Letter; accidental: -2 | -1 | 0 | 1 | 2 };
export type Scale = {
  id: string;
  name: string;
  intervals: readonly number[];
  degrees: readonly string[];
};
export type Chord = {
  id: string;
  name: string;
  symbol: string;
  intervals: readonly number[];
  degreeSteps: readonly number[];
};

export const PIANO_MIN = 21;
export const PIANO_MAX = 108;
const LETTERS: Letter[] = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PC: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
const SHARP_NAMES = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
];
const FLAT_NAMES = [
  "C",
  "D♭",
  "D",
  "E♭",
  "E",
  "F",
  "G♭",
  "G",
  "A♭",
  "A",
  "B♭",
  "B",
];

export const SCALES: Scale[] = [
  {
    id: "major",
    name: "Major",
    intervals: [0, 2, 4, 5, 7, 9, 11, 12],
    degrees: ["1", "2", "3", "4", "5", "6", "7", "8"],
  },
  {
    id: "natural-minor",
    name: "Natural minor",
    intervals: [0, 2, 3, 5, 7, 8, 10, 12],
    degrees: ["1", "2", "♭3", "4", "5", "♭6", "♭7", "8"],
  },
  {
    id: "harmonic-minor",
    name: "Harmonic minor",
    intervals: [0, 2, 3, 5, 7, 8, 11, 12],
    degrees: ["1", "2", "♭3", "4", "5", "♭6", "7", "8"],
  },
  {
    id: "melodic-minor",
    name: "Melodic minor",
    intervals: [0, 2, 3, 5, 7, 9, 11, 12],
    degrees: ["1", "2", "♭3", "4", "5", "6", "7", "8"],
  },
  {
    id: "major-pentatonic",
    name: "Major pentatonic",
    intervals: [0, 2, 4, 7, 9, 12],
    degrees: ["1", "2", "3", "5", "6", "8"],
  },
  {
    id: "minor-pentatonic",
    name: "Minor pentatonic",
    intervals: [0, 3, 5, 7, 10, 12],
    degrees: ["1", "♭3", "4", "5", "♭7", "8"],
  },
  {
    id: "blues",
    name: "Blues",
    intervals: [0, 3, 5, 6, 7, 10, 12],
    degrees: ["1", "♭3", "4", "♭5", "5", "♭7", "8"],
  },
  {
    id: "chromatic",
    name: "Chromatic",
    intervals: Array.from({ length: 13 }, (_, i) => i),
    degrees: Array.from({ length: 13 }, (_, i) => String(i + 1)),
  },
];

export const CHORDS: Chord[] = [
  {
    id: "major",
    name: "Major",
    symbol: "",
    intervals: [0, 4, 7],
    degreeSteps: [0, 2, 4],
  },
  {
    id: "minor",
    name: "Minor",
    symbol: "m",
    intervals: [0, 3, 7],
    degreeSteps: [0, 2, 4],
  },
  {
    id: "diminished",
    name: "Diminished",
    symbol: "°",
    intervals: [0, 3, 6],
    degreeSteps: [0, 2, 4],
  },
  {
    id: "augmented",
    name: "Augmented",
    symbol: "+",
    intervals: [0, 4, 8],
    degreeSteps: [0, 2, 4],
  },
  {
    id: "sus2",
    name: "Suspended 2",
    symbol: "sus2",
    intervals: [0, 2, 7],
    degreeSteps: [0, 1, 4],
  },
  {
    id: "sus4",
    name: "Suspended 4",
    symbol: "sus4",
    intervals: [0, 5, 7],
    degreeSteps: [0, 3, 4],
  },
  {
    id: "dominant7",
    name: "Dominant 7",
    symbol: "7",
    intervals: [0, 4, 7, 10],
    degreeSteps: [0, 2, 4, 6],
  },
  {
    id: "major7",
    name: "Major 7",
    symbol: "maj7",
    intervals: [0, 4, 7, 11],
    degreeSteps: [0, 2, 4, 6],
  },
  {
    id: "minor7",
    name: "Minor 7",
    symbol: "m7",
    intervals: [0, 3, 7, 10],
    degreeSteps: [0, 2, 4, 6],
  },
  {
    id: "half-diminished7",
    name: "Half-diminished 7",
    symbol: "ø7",
    intervals: [0, 3, 6, 10],
    degreeSteps: [0, 2, 4, 6],
  },
  {
    id: "diminished7",
    name: "Diminished 7",
    symbol: "°7",
    intervals: [0, 3, 6, 9],
    degreeSteps: [0, 2, 4, 6],
  },
];

export const INTERVALS = [
  "Unison",
  "Minor 2nd",
  "Major 2nd",
  "Minor 3rd",
  "Major 3rd",
  "Perfect 4th",
  "Tritone",
  "Perfect 5th",
  "Minor 6th",
  "Major 6th",
  "Minor 7th",
  "Major 7th",
  "Octave",
];

export function mod(n: number, d = 12) {
  return ((n % d) + d) % d;
}
export function frequency(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}
export function octave(midi: number) {
  return Math.floor(midi / 12) - 1;
}
export function isBlack(midi: number) {
  return [1, 3, 6, 8, 10].includes(mod(midi));
}
export function noteName(midi: number, flats = false) {
  return `${(flats ? FLAT_NAMES : SHARP_NAMES)[mod(midi)]}${octave(midi)}`;
}
export function pitchName(pc: number, flats = false) {
  return (flats ? FLAT_NAMES : SHARP_NAMES)[mod(pc)];
}
export function accessibleNoteName(midi: number, flats = false) {
  return noteName(midi, flats)
    .replaceAll("♯", " sharp ")
    .replaceAll("♭", " flat ");
}

export function parseSpelling(value: string): Spelling {
  const match = /^([A-G])([#♯b♭]{0,2})$/i.exec(value);
  if (!match) return { letter: "C", accidental: 0 };
  const marks = match[2].replaceAll("♯", "#").replaceAll("♭", "b");
  return {
    letter: match[1].toUpperCase() as Letter,
    accidental: (marks.startsWith("b")
      ? -marks.length
      : marks.length) as Spelling["accidental"],
  };
}
export function spellingPc(s: Spelling) {
  return mod(NATURAL_PC[s.letter] + s.accidental);
}
export function formatSpelling(s: Spelling) {
  return `${s.letter}${s.accidental < 0 ? "♭".repeat(-s.accidental) : "♯".repeat(s.accidental)}`;
}

function spellInterval(
  tonic: Spelling,
  letterOffset: number,
  interval: number,
) {
  const start = LETTERS.indexOf(tonic.letter);
  const letter = LETTERS[mod(start + letterOffset, 7)];
  const desired = mod(spellingPc(tonic) + interval);
  let accidental = mod(desired - NATURAL_PC[letter]);
  if (accidental > 6) accidental -= 12;
  return formatSpelling({
    letter,
    accidental: Math.max(-2, Math.min(2, accidental)) as Spelling["accidental"],
  });
}

export function spellScale(
  tonicText: string,
  scale: Scale,
  preferFlats?: boolean,
): string[] {
  const tonic = parseSpelling(tonicText);
  if (scale.id === "chromatic")
    return scale.intervals.map((n) =>
      pitchName(spellingPc(tonic) + n, preferFlats ?? tonic.accidental < 0),
    );
  return scale.intervals.map((interval, index) => {
    const degree = Number(scale.degrees[index].match(/\d+/)?.[0] ?? index + 1);
    return spellInterval(tonic, degree - 1, interval);
  });
}

export function spellChord(
  tonicText: string,
  chord: Chord,
  inversion = 0,
): string[] {
  const tonic = parseSpelling(tonicText);
  const spellings = chord.intervals.map((interval, index) =>
    spellInterval(tonic, chord.degreeSteps[index], interval),
  );
  const rotated = mod(inversion, spellings.length);
  return [...spellings.slice(rotated), ...spellings.slice(0, rotated)];
}

export function scaleMidis(rootMidi: number, scale: Scale) {
  return scale.intervals.map((n) => rootMidi + n);
}
export function chordMidis(rootMidi: number, chord: Chord, inversion = 0) {
  const notes = chord.intervals.map((n) => rootMidi + n);
  for (let i = 0; i < inversion && i < notes.length; i++) notes[i] += 12;
  return notes.sort((a, b) => a - b);
}
export function spellingOctave(midi: number, spellingText: string) {
  const spelling = parseSpelling(spellingText);
  return (
    Math.round(
      (midi - NATURAL_PC[spelling.letter] - spelling.accidental) / 12,
    ) - 1
  );
}
export function staffStep(midi: number, spellingText = pitchName(midi)) {
  const spelling = parseSpelling(spellingText);
  return (
    (spellingOctave(midi, spellingText) - 4) * 7 +
    LETTERS.indexOf(spelling.letter)
  ); // written C4 = zero
}

export function midiForStaffStep(step: number) {
  const letterIndex = mod(step, 7);
  const octaveOffset = (step - letterIndex) / 7;
  return 60 + octaveOffset * 12 + NATURAL_PC[LETTERS[letterIndex]];
}
