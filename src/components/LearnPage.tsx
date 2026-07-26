import { useState } from "preact/hooks";
import { LESSONS } from "../data/lessons";
import { noteName } from "../music/theory";
import type { Progress } from "../music/progress";
import { PianoKeyboard } from "./PianoKeyboard";

type Props = { progress: Progress; setProgress: (progress: Progress) => void };
export function LearnPage({ progress, setProgress }: Props) {
  const [selected, setSelected] = useState(
    LESSONS.find((l) => !progress.completedLessons.includes(l.id))?.id ??
      LESSONS[0].id,
  );
  const [played, setPlayed] = useState<number[]>([]);
  const [feedback, setFeedback] = useState(
    "Choose a lesson and practice at your own pace.",
  );
  const lesson = LESSONS.find((item) => item.id === selected)!;
  const exerciseComplete = played.length === lesson.targetNotes.length;
  const lessonComplete = progress.completedLessons.includes(lesson.id);
  const highlights = new Map<number, string>();
  for (const note of new Set(played)) highlights.set(note, "played");
  if (!exerciseComplete)
    highlights.set(
      lesson.targetNotes[played.length],
      `target ${played.length + 1}`,
    );
  const notePlayed = (midi: number) => {
    if (exerciseComplete) {
      setFeedback(
        "Exercise complete. Restart it to practice the sequence again.",
      );
      return;
    }
    const expected = lesson.targetNotes[played.length];
    if (midi === expected) {
      const next = [...played, midi];
      setPlayed(next);
      if (next.length === lesson.targetNotes.length)
        setFeedback(
          "Exercise complete. Excellent—mark the lesson complete when you are ready.",
        );
      else
        setFeedback(
          `Correct: ${noteName(midi)}. Next, play ${noteName(lesson.targetNotes[next.length])}.`,
        );
    } else {
      setFeedback(
        `Try again. Expected ${noteName(expected)}, heard ${noteName(midi)}.`,
      );
    }
  };
  const select = (id: string) => {
    setSelected(id);
    setPlayed([]);
    setFeedback("Read the explanation, then try the guided sequence.");
  };
  const complete = () => {
    if (!exerciseComplete || lessonComplete) return;
    const completed = [...progress.completedLessons, lesson.id];
    setProgress({
      ...progress,
      completedLessons: completed,
      lessonAttempts: {
        ...progress.lessonAttempts,
        [lesson.id]: (progress.lessonAttempts[lesson.id] ?? 0) + 1,
      },
    });
    setFeedback(`${lesson.title} saved as complete.`);
  };
  return (
    <div class="page-grid learn-layout">
      <aside class="lesson-list" aria-label="Beginner curriculum">
        <p class="eyebrow">
          Curriculum · {progress.completedLessons.length}/{LESSONS.length}{" "}
          complete
        </p>
        {LESSONS.map((item) => (
          <button
            type="button"
            class={
              item.id === selected ? "selected lesson-link" : "lesson-link"
            }
            aria-current={item.id === selected ? "step" : undefined}
            onClick={() => select(item.id)}
            key={item.id}
          >
            <span>
              {progress.completedLessons.includes(item.id) ? "✓ " : ""}
              {item.title}
            </span>
            <small>{item.minutes} min</small>
          </button>
        ))}
      </aside>
      <div class="lesson-content">
        <article class="card lesson-card">
          <p class="eyebrow">Lesson · {lesson.minutes} minutes</p>
          <h2 tabIndex={-1}>{lesson.title}</h2>
          <h3>Objective</h3>
          <p>{lesson.objective}</p>
          <h3>Learn</h3>
          <p>{lesson.explanation}</p>
          <div class="practice-callout">
            <strong>Guided practice</strong>
            <p>{lesson.practice}</p>
            <p class="note-sequence">
              {lesson.targetNotes.map((note) => noteName(note)).join(" → ")}
            </p>
          </div>
          <div class="button-row">
            <button
              type="button"
              onClick={() => {
                setPlayed([]);
                setFeedback(
                  `Restarted. Play ${noteName(lesson.targetNotes[0])}.`,
                );
              }}
            >
              Restart exercise
            </button>
            <button
              type="button"
              class="primary"
              onClick={complete}
              disabled={!exerciseComplete || lessonComplete}
            >
              {lessonComplete
                ? "Saved as complete"
                : exerciseComplete
                  ? "Mark complete"
                  : "Finish the exercise first"}
            </button>
          </div>
          <p>
            <strong>Takeaway:</strong> {lesson.takeaway}
          </p>
          <p class="feedback" aria-live="polite">
            {feedback}
          </p>
        </article>
        <PianoKeyboard compact highlights={highlights} onNote={notePlayed} />
      </div>
    </div>
  );
}
