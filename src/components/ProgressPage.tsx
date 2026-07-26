import { useRef, useState } from "preact/hooks";
import { LESSONS } from "../data/lessons";
import {
  exportState,
  parseImport,
  type Progress,
  type SavedState,
  type Settings,
} from "../music/progress";

type Props = {
  progress: Progress;
  settings: Settings;
  replaceState: (state: SavedState) => void;
  reset: () => void;
};
export function ProgressPage({
  progress,
  settings,
  replaceState,
  reset,
}: Props) {
  const [message, setMessage] = useState(
    "Progress is stored locally on this device. Export a backup any time.",
  );
  const [confirming, setConfirming] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const skills = Object.entries(progress.skills).sort(
    (a, b) => a[1].correct / a[1].attempts - b[1].correct / b[1].attempts,
  );
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      replaceState(parseImport(await file.text()));
      setMessage("Progress imported successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };
  return (
    <div class="feature-stack">
      <section class="card progress-hero">
        <p class="eyebrow">Your local practice record</p>
        <h2>Progress</h2>
        <div class="stat-grid">
          <div>
            <strong>
              {progress.completedLessons.length}/{LESSONS.length}
            </strong>
            <span>lessons</span>
          </div>
          <div>
            <strong>{progress.sessions}</strong>
            <span>trainer sessions</span>
          </div>
          <div>
            <strong>
              {Object.values(progress.skills).reduce(
                (sum, skill) => sum + skill.attempts,
                0,
              )}
            </strong>
            <span>answers</span>
          </div>
        </div>
        <p aria-live="polite">{message}</p>
        <div class="button-row">
          <button
            type="button"
            onClick={() => exportState({ version: 1, progress, settings })}
          >
            Export JSON
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileRef}
            class="sr-only"
            type="file"
            accept="application/json"
            tabIndex={-1}
            aria-label="Choose a Piano Tutor progress JSON file"
            onChange={(e) => void importFile(e.currentTarget.files?.[0])}
          />
        </div>
      </section>
      <section class="card">
        <h3>Lesson path</h3>
        <div class="completion-list">
          {LESSONS.map((lesson) => (
            <div key={lesson.id}>
              <span aria-hidden="true">
                {progress.completedLessons.includes(lesson.id) ? "●" : "○"}
              </span>
              <span>{lesson.title}</span>
              <strong>
                {progress.completedLessons.includes(lesson.id)
                  ? "Complete"
                  : "Ready"}
              </strong>
            </div>
          ))}
        </div>
      </section>
      <section class="card">
        <h3>Skill detail</h3>
        {skills.length ? (
          <div class="skill-table">
            {skills.map(([name, skill]) => (
              <div key={name}>
                <strong>{name.replaceAll("-", " ")}</strong>
                <span>
                  {skill.correct}/{skill.attempts} correct
                </span>
                <span>
                  {Math.round((skill.correct / skill.attempts) * 100)}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p>Complete a Trainer session to build your skill record.</p>
        )}
        {skills[0] && (
          <p class="recommendation">
            <strong>Next recommendation:</strong> practice{" "}
            {skills[0][0].replaceAll("-", " ")}, currently your lowest-accuracy
            recorded skill.
          </p>
        )}
      </section>
      <section class="card danger-zone">
        <h3>Data controls</h3>
        <p>
          Browser storage can be cleared and does not sync to other devices.
        </p>
        {confirming ? (
          <div class="button-row">
            <button
              type="button"
              class="danger"
              onClick={() => {
                reset();
                setConfirming(false);
                setMessage("All local progress was reset.");
              }}
            >
              Yes, erase local progress
            </button>
            <button type="button" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)}>
            Reset progress…
          </button>
        )}
      </section>
    </div>
  );
}
