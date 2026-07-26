import { describe, expect, it } from "vitest";
import {
  CHORDS,
  PIANO_MAX,
  PIANO_MIN,
  SCALES,
  chordMidis,
  frequency,
  midiForStaffStep,
  noteName,
  spellChord,
  spellScale,
  spellingOctave,
  staffStep,
} from "./theory";

describe("pitch and spelling", () => {
  it("uses MIDI piano boundaries and concert pitch", () => {
    expect(noteName(PIANO_MIN)).toBe("A0");
    expect(noteName(PIANO_MAX)).toBe("C8");
    expect(frequency(69)).toBe(440);
    expect(noteName(59)).toBe("B3");
    expect(noteName(60)).toBe("C4");
  });
  it.each([
    ["C", "major", ["C", "D", "E", "F", "G", "A", "B", "C"]],
    ["G", "major", ["G", "A", "B", "C", "D", "E", "F♯", "G"]],
    ["F", "major", ["F", "G", "A", "B♭", "C", "D", "E", "F"]],
    ["F♯", "major", ["F♯", "G♯", "A♯", "B", "C♯", "D♯", "E♯", "F♯"]],
    ["D♭", "major", ["D♭", "E♭", "F", "G♭", "A♭", "B♭", "C", "D♭"]],
    ["A", "harmonic-minor", ["A", "B", "C", "D", "E", "F", "G♯", "A"]],
    ["E♭", "harmonic-minor", ["E♭", "F", "G♭", "A♭", "B♭", "C♭", "D", "E♭"]],
    ["C", "major-pentatonic", ["C", "D", "E", "G", "A", "C"]],
    ["C", "minor-pentatonic", ["C", "E♭", "F", "G", "B♭", "C"]],
    ["C", "blues", ["C", "E♭", "F", "G♭", "G", "B♭", "C"]],
  ])("spells %s %s contextually", (tonic, scaleId, expected) => {
    expect(
      spellScale(
        tonic,
        SCALES.find((scale) => scale.id === scaleId)!,
      ),
    ).toEqual(expected);
  });
  it("honors the chosen spelling for natural-root chromatic scales", () => {
    const chromatic = SCALES.find((scale) => scale.id === "chromatic")!;
    expect(spellScale("C", chromatic, false).slice(0, 4)).toEqual([
      "C",
      "C♯",
      "D",
      "D♯",
    ]);
    expect(spellScale("C", chromatic, true).slice(0, 4)).toEqual([
      "C",
      "D♭",
      "D",
      "E♭",
    ]);
  });
  it("maps written staff movement and enharmonic octaves correctly", () => {
    expect(staffStep(60)).toBe(0);
    expect(staffStep(62)).toBe(1);
    expect(staffStep(72)).toBe(7);
    expect(staffStep(59)).toBe(-1);
    expect(staffStep(53, "F")).toBe(-4);
    expect(staffStep(57, "A")).toBe(-2);
    expect(staffStep(64, "E")).toBe(2);
    expect(staffStep(67, "G")).toBe(4);
    expect(staffStep(77, "F")).toBe(10);
    expect(staffStep(61, "C♯")).toBe(0);
    expect(staffStep(61, "D♭")).toBe(1);
    expect(spellingOctave(71, "C♭")).toBe(5);
    expect(spellingOctave(72, "B♯")).toBe(4);
    expect(midiForStaffStep(-23)).toBe(21);
    expect(midiForStaffStep(-7)).toBe(48);
    expect(midiForStaffStep(-1)).toBe(59);
    expect(midiForStaffStep(0)).toBe(60);
    expect(midiForStaffStep(7)).toBe(72);
    expect(midiForStaffStep(14)).toBe(84);
    expect(midiForStaffStep(28)).toBe(108);
  });
});

describe("chords", () => {
  it("spells chord qualities and inversions contextually", () => {
    const major = CHORDS.find((chord) => chord.id === "major")!;
    const diminished7 = CHORDS.find((chord) => chord.id === "diminished7")!;
    expect(spellChord("C♯", major)).toEqual(["C♯", "E♯", "G♯"]);
    expect(spellChord("C♯", major, 1)).toEqual(["E♯", "G♯", "C♯"]);
    expect(spellChord("E♭", diminished7)).toEqual(["E♭", "G♭", "B♭♭", "D♭♭"]);
  });
  it("keeps pitch classes through every valid inversion", () => {
    for (const chord of CHORDS) {
      const original = chordMidis(60, chord)
        .map((note) => note % 12)
        .sort();
      for (let inversion = 0; inversion < chord.intervals.length; inversion++) {
        expect(
          chordMidis(60, chord, inversion)
            .map((note) => note % 12)
            .sort(),
        ).toEqual(original);
      }
    }
  });
});
