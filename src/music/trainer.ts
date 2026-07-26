import { CHORDS, INTERVALS, noteName, pitchName } from "./theory";

export type TrainerMode =
  | "visual-name"
  | "find-note"
  | "ear-pitch"
  | "interval"
  | "chord-quality"
  | "rhythm";
export type Question = {
  id: string;
  mode: TrainerMode;
  prompt: string;
  answer: string;
  choices: string[];
  midi: number[];
  skill: string;
};

export function seeded(seed: number) {
  let state = seed >>> 0;
  return () => (state = (state * 1664525 + 1013904223) >>> 0) / 4294967296;
}
function shuffle<T>(values: T[], random: () => number) {
  return values
    .map((value) => ({ value, n: random() }))
    .sort((a, b) => a.n - b.n)
    .map(({ value }) => value);
}
export function generateQuestion(
  mode: TrainerMode,
  seed: number,
  index: number,
): Question {
  const random = seeded(seed + index * 7919);
  const midi = 60 + Math.floor(random() * 12);
  if (mode === "visual-name") {
    const answer = pitchName(midi);
    return {
      id: `${seed}-${index}`,
      mode,
      prompt: "Name the highlighted key shown on the keyboard and staff.",
      answer,
      choices: shuffle(
        [answer, pitchName(midi + 2), pitchName(midi + 5), pitchName(midi - 2)],
        random,
      ),
      midi: [midi],
      skill: "note-reading",
    };
  }
  if (mode === "find-note" || mode === "ear-pitch") {
    const answer = String(midi);
    return {
      id: `${seed}-${index}`,
      mode,
      prompt:
        mode === "ear-pitch"
          ? "Listen, then play the matching key."
          : `Play ${noteName(midi)} on the keyboard.`,
      answer,
      choices: [],
      midi: [midi],
      skill: mode === "ear-pitch" ? "ear-pitch" : "key-finding",
    };
  }
  if (mode === "interval") {
    const semitones = 1 + Math.floor(random() * 12);
    const answer = INTERVALS[semitones];
    const pool = INTERVALS.slice(1);
    return {
      id: `${seed}-${index}`,
      mode,
      prompt: "Listen to the two notes. Identify the interval.",
      answer,
      choices: shuffle(
        [
          answer,
          ...shuffle(
            pool.filter((v) => v !== answer),
            random,
          ).slice(0, 3),
        ],
        random,
      ),
      midi: [60, 60 + semitones],
      skill: `interval-${semitones}`,
    };
  }
  if (mode === "chord-quality") {
    const chord = CHORDS[Math.floor(random() * 4)];
    return {
      id: `${seed}-${index}`,
      mode,
      prompt: "Listen to the chord. Identify its quality.",
      answer: chord.name,
      choices: shuffle(
        CHORDS.slice(0, 4).map((c) => c.name),
        random,
      ),
      midi: chord.intervals.map((n) => 60 + n),
      skill: `chord-${chord.id}`,
    };
  }
  const patterns = [
    { name: "Even quarters", hits: [0, 500, 1000, 1500] },
    { name: "Two eighths, two quarters", hits: [0, 250, 500, 1000] },
    { name: "Dotted rhythm", hits: [0, 750, 1000, 1500] },
  ];
  const pattern = patterns[Math.floor(random() * patterns.length)];
  return {
    id: `${seed}-${index}`,
    mode,
    prompt: `Tap this pattern: ${pattern.name}. Use the Tap rhythm button four times.`,
    answer: pattern.hits.join(","),
    choices: [],
    midi: [],
    skill: "rhythm",
  };
}

export function evaluateRhythm(
  expected: string,
  taps: number[],
  tolerance = 180,
) {
  const target = expected.split(",").map(Number);
  if (taps.length !== target.length) return false;
  const normalized = taps.map((n) => n - taps[0]);
  return normalized.every((n, i) => Math.abs(n - target[i]) <= tolerance);
}
export function median(values: number[]) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}
