export type Skill = {
  attempts: number;
  correct: number;
  bestStreak: number;
  lastPracticed: string;
};
export type Progress = {
  version: 1;
  completedLessons: string[];
  lessonAttempts: Record<string, number>;
  skills: Record<string, Skill>;
  sessions: number;
};
export type Settings = { volume: number; tone: number; lastSection: string };
export type SavedState = { version: 1; progress: Progress; settings: Settings };

export const defaultProgress = (): Progress => ({
  version: 1,
  completedLessons: [],
  lessonAttempts: {},
  skills: {},
  sessions: 0,
});
export const defaultSettings = (): Settings => ({
  volume: 0.72,
  tone: 0.65,
  lastSection: "keys",
});

const KEY = "piano-tutor:v1";
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0;
const isPositiveCount = (value: unknown): value is number =>
  isCount(value) && value > 0;
const isUnit = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1;

function decodeState(value: unknown): SavedState {
  if (!isRecord(value) || value.version !== 1) throw new Error("version");
  const progress = value.progress;
  const settings = value.settings;
  if (!isRecord(progress) || !isRecord(settings)) throw new Error("shape");
  if (
    progress.version !== 1 ||
    !Array.isArray(progress.completedLessons) ||
    !progress.completedLessons.every((item) => typeof item === "string") ||
    !isRecord(progress.lessonAttempts) ||
    !Object.values(progress.lessonAttempts).every(isCount) ||
    !isRecord(progress.skills) ||
    !isCount(progress.sessions) ||
    !isUnit(settings.volume) ||
    !isUnit(settings.tone) ||
    typeof settings.lastSection !== "string"
  )
    throw new Error("shape");

  const skills: Record<string, Skill> = {};
  for (const [name, raw] of Object.entries(progress.skills)) {
    if (
      !isRecord(raw) ||
      !isPositiveCount(raw.attempts) ||
      !isCount(raw.correct) ||
      raw.correct > raw.attempts ||
      !isCount(raw.bestStreak) ||
      typeof raw.lastPracticed !== "string"
    )
      throw new Error("skill");
    skills[name] = {
      attempts: raw.attempts,
      correct: raw.correct,
      bestStreak: raw.bestStreak,
      lastPracticed: raw.lastPracticed,
    };
  }

  return {
    version: 1,
    progress: {
      version: 1,
      completedLessons: [...progress.completedLessons],
      lessonAttempts: { ...progress.lessonAttempts } as Record<string, number>,
      skills,
      sessions: progress.sessions,
    },
    settings: {
      volume: settings.volume,
      tone: settings.tone,
      lastSection: settings.lastSection,
    },
  };
}

export function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) throw new Error("empty");
    return decodeState(JSON.parse(raw));
  } catch {
    return {
      version: 1,
      progress: defaultProgress(),
      settings: defaultSettings(),
    };
  }
}
export function saveState(state: SavedState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
export function exportState(state: SavedState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = "piano-tutor-progress.json";
  anchor.click();
  URL.revokeObjectURL(href);
}
export function parseImport(text: string): SavedState {
  try {
    return decodeState(JSON.parse(text));
  } catch {
    throw new Error("This is not a valid Keyboard Tutor progress file.");
  }
}
