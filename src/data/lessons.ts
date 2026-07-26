export type Lesson = {
  id: string;
  title: string;
  minutes: number;
  objective: string;
  explanation: string;
  practice: string;
  targetNotes: number[];
  takeaway: string;
};

export const LESSONS: Lesson[] = [
  {
    id: "geography",
    title: "1. Meet the keyboard",
    minutes: 5,
    objective: "Find repeating groups of two and three black keys.",
    explanation:
      "Sit tall with relaxed shoulders and curved fingers. Every C is immediately left of a group of two black keys. Finger numbers run thumb 1 through little finger 5.",
    practice: "Play any C. Then find the next C.",
    targetNotes: [60, 72],
    takeaway: "The keyboard repeats every 12 keys; C anchors each octave.",
  },
  {
    id: "c-position",
    title: "2. C position & note names",
    minutes: 7,
    objective: "Play C–D–E–F–G with the right hand.",
    explanation:
      "Middle C is C4. In C position, place right-hand fingers 1–5 on C4 through G4. Move one key at a time and keep the wrist level.",
    practice: "Play C4, D4, E4, F4, G4 in order.",
    targetNotes: [60, 62, 64, 65, 67],
    takeaway: "Adjacent white keys follow the musical alphabet A–G.",
  },
  {
    id: "steps",
    title: "3. Half steps & accidentals",
    minutes: 7,
    objective: "Recognize half steps, whole steps, sharps, and flats.",
    explanation:
      "A half step moves to the very next key, black or white. A whole step spans two half steps. A sharp raises a note; a flat lowers it. F♯ and G♭ sound the same but have different context.",
    practice: "Play C4, C♯4, then D4.",
    targetNotes: [60, 61, 62],
    takeaway: "Enharmonic names can share one sounding key.",
  },
  {
    id: "staff",
    title: "4. The grand staff",
    minutes: 8,
    objective: "Connect landmark notes to the keyboard.",
    explanation:
      "Treble clef commonly serves the right hand; bass clef the left. Middle C sits between the staves. Treble G4 and bass F3 are useful landmarks.",
    practice: "Play F3, C4, then G4.",
    targetNotes: [53, 60, 67],
    takeaway:
      "Read by interval from landmarks instead of memorizing isolated dots.",
  },
  {
    id: "rhythm",
    title: "5. Pulse, values & meter",
    minutes: 8,
    objective: "Count quarter, half, and whole notes in common meters.",
    explanation:
      "In 4/4 a quarter note gets one beat, a half gets two, and a whole gets four. 3/4 groups three quarter beats. 6/8 groups six eighth notes as two big beats: 1-2-3, 4-5-6.",
    practice:
      "Play C4 twice to complete this note-only checkpoint. Then open Metronome, choose 4/4, and practice the same two notes on beats 1 and 3.",
    targetNotes: [60, 60],
    takeaway: "Steady pulse and grouped accents make rhythm understandable.",
  },
  {
    id: "scales",
    title: "6. Intervals & major scales",
    minutes: 10,
    objective: "Build the C major scale from whole and half steps.",
    explanation:
      "The major pattern is whole, whole, half, whole, whole, whole, half. Scale degrees are numbered 1–8. G major uses F♯; F major uses B♭.",
    practice: "Play the C major scale from C4 to C5.",
    targetNotes: [60, 62, 64, 65, 67, 69, 71, 72],
    takeaway: "Scale spelling preserves one of each letter name.",
  },
  {
    id: "triads",
    title: "7. Triads & inversions",
    minutes: 10,
    objective: "Build major and minor triads and invert them.",
    explanation:
      "A major triad stacks 4 then 3 semitones; a minor triad stacks 3 then 4. Move the lowest note up an octave for first inversion. I–IV–V–I creates a strong cadence.",
    practice: "Play C4, E4, and G4 together or in quick succession.",
    targetNotes: [60, 64, 67],
    takeaway: "Inversions keep the same pitch classes with a new bass note.",
  },
  {
    id: "hands",
    title: "8. Two-hand checkpoint",
    minutes: 12,
    objective: "Coordinate a bass anchor with a right-hand phrase.",
    explanation:
      "Practice each hand alone first. Keep a slow pulse, prepare the next position, and stop before tension builds. Speed follows accuracy—not the reverse.",
    practice: "Play C3, then C4–E4–G4–C5.",
    targetNotes: [48, 60, 64, 67, 72],
    takeaway: "Short, accurate repetitions build coordination.",
  },
];
