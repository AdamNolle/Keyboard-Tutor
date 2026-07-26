import { afterEach, describe, expect, it } from "vitest";
import {
  defaultProgress,
  defaultSettings,
  loadState,
  parseImport,
  saveState,
  type SavedState,
} from "./progress";

const state = (): SavedState => ({
  version: 1,
  progress: {
    ...defaultProgress(),
    completedLessons: ["geography"],
    lessonAttempts: { geography: 1 },
    skills: {
      "note-reading": {
        attempts: 2,
        correct: 1,
        bestStreak: 1,
        lastPracticed: "2026-01-01T00:00:00.000Z",
      },
    },
    sessions: 1,
  },
  settings: defaultSettings(),
});

const originalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  "localStorage",
);
afterEach(() => {
  if (originalStorage)
    Object.defineProperty(globalThis, "localStorage", originalStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");
});

describe("progress persistence", () => {
  it("round-trips a complete exported state", () => {
    expect(parseImport(JSON.stringify(state()))).toEqual(state());
  });

  it.each([
    {},
    {
      version: 1,
      progress: { completedLessons: [] },
      settings: { volume: 0.5 },
    },
    {
      ...state(),
      progress: { ...state().progress, skills: { broken: { attempts: 1 } } },
    },
    {
      ...state(),
      progress: {
        ...state().progress,
        skills: {
          empty: {
            attempts: 0,
            correct: 0,
            bestStreak: 0,
            lastPracticed: "",
          },
        },
      },
    },
    { ...state(), settings: { ...state().settings, volume: 2 } },
  ])("rejects malformed or unsafe imported state", (value) => {
    expect(() => parseImport(JSON.stringify(value))).toThrow(
      "This is not a valid Piano Tutor progress file.",
    );
  });

  it("falls back safely when stored data is malformed", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: () => '{"version":1}', setItem: () => undefined },
    });
    expect(loadState().progress).toEqual(defaultProgress());
  });

  it("keeps the app running when browser storage rejects writes", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {
          throw new DOMException("denied", "QuotaExceededError");
        },
      },
    });
    expect(saveState(state())).toBe(false);
  });
});
