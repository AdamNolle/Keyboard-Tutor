import { describe, expect, it } from "vitest";
import { LESSONS } from "../data/lessons";
import { METERS, pulseAccent, pulseIntervalSeconds } from "../audio/Metronome";
import {
  evaluateRhythm,
  generateQuestion,
  median,
  seeded,
  type TrainerMode,
} from "./trainer";

describe("training logic", () => {
  it("generates deterministic questions for all modes", () => {
    const modes: TrainerMode[] = [
      "visual-name",
      "find-note",
      "ear-pitch",
      "interval",
      "chord-quality",
      "rhythm",
    ];
    for (const mode of modes)
      expect(generateQuestion(mode, 1234, 2)).toEqual(
        generateQuestion(mode, 1234, 2),
      );
    expect(seeded(7)()).toBe(seeded(7)());
  });
  it("scores relative rhythm with a forgiving latency-neutral window", () => {
    expect(evaluateRhythm("0,500,1000,1500", [9234, 9750, 10210, 10740])).toBe(
      true,
    );
    expect(evaluateRhythm("0,500,1000,1500", [0, 200, 400, 600])).toBe(false);
  });
  it("calculates medians", () => {
    expect(median([10, 100, 20])).toBe(20);
    expect(median([10, 20])).toBe(15);
  });
});

describe("curriculum and meter data", () => {
  it("has a unique, playable eight-lesson beginner path", () => {
    expect(LESSONS).toHaveLength(8);
    expect(new Set(LESSONS.map((lesson) => lesson.id)).size).toBe(
      LESSONS.length,
    );
    for (const lesson of LESSONS) {
      expect(lesson.targetNotes.length).toBeGreaterThan(0);
      expect(
        lesson.targetNotes.every((note) => note >= 21 && note <= 108),
      ).toBe(true);
      expect(lesson.explanation.length).toBeGreaterThan(40);
    }
  });
  it("models and schedules compound 6/8 as two groups of three", () => {
    expect(METERS["6/8"].groups).toEqual([3, 3]);
    expect(METERS["6/8"].denominator).toBe(8);
    expect(METERS["4/4"].groups).toEqual([4]);
    expect(pulseIntervalSeconds(120, "6/8", 1)).toBeCloseTo(1 / 6);
    expect(pulseIntervalSeconds(120, "4/4", 1)).toBeCloseTo(0.5);
    expect(pulseAccent(0, "6/8", 1)).toBe("primary");
    expect(pulseAccent(3, "6/8", 1)).toBe("secondary");
    expect(pulseAccent(1, "6/8", 2)).toBe("subdivision");
  });
});
