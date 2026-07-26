import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { piano } from "../audio/PianoEngine";
import {
  evaluateRhythm,
  generateQuestion,
  median,
  type TrainerMode,
} from "../music/trainer";
import type { Progress } from "../music/progress";
import { GrandStaff } from "./GrandStaff";
import { PianoKeyboard } from "./PianoKeyboard";

const MODES: {
  id: TrainerMode;
  name: string;
  description: string;
  tag: string;
}[] = [
  {
    id: "ear-pitch",
    name: "Match a pitch",
    description: "Hear one note, then find it on the piano",
    tag: "Start here",
  },
  {
    id: "find-note",
    name: "Find the note",
    description: "Read a note name, then play that key",
    tag: "Beginner",
  },
  {
    id: "visual-name",
    name: "Name the note",
    description: "Read a piano key and staff note",
    tag: "By sight",
  },
  {
    id: "interval",
    name: "Intervals",
    description: "Hear two notes and name their distance",
    tag: "Next step",
  },
  {
    id: "chord-quality",
    name: "Chord quality",
    description: "Hear whether a chord is major or minor",
    tag: "Next step",
  },
  {
    id: "rhythm",
    name: "Copy a rhythm",
    description: "Hear four taps, then copy the pattern",
    tag: "Timing",
  },
];
type Answer = { correct: boolean; ms: number };
type Props = { progress: Progress; setProgress: (progress: Progress) => void };
export function TrainerPage({ progress, setProgress }: Props) {
  const [mode, setMode] = useState<TrainerMode>("ear-pitch");
  const [count, setCount] = useState(5);
  const [seed, setSeed] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [resolved, setResolved] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState("Choose a drill.");
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [taps, setTaps] = useState<number[]>([]);
  const startedAt = useRef(0);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const summaryHeading = useRef<HTMLHeadingElement>(null);
  const question = useMemo(
    () => (seed === null ? null : generateQuestion(mode, seed, index)),
    [mode, seed, index],
  );
  const finished = seed !== null && index >= count;
  useEffect(() => {
    if (seed === null) return;
    const frame = requestAnimationFrame(() => {
      (finished ? summaryHeading : questionHeading).current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [seed, index, finished]);
  const start = () => {
    const nextSeed = Math.floor(Date.now() / 1000);
    setSeed(nextSeed);
    setIndex(0);
    setAnswers([]);
    setResolved(null);
    setFeedback("Question 1.");
    setStreak(0);
    setBestStreak(0);
    setTaps([]);
    startedAt.current = performance.now();
    const firstQuestion = generateQuestion(mode, nextSeed, 0);
    if (["ear-pitch", "interval", "chord-quality"].includes(mode))
      piano.playSequence(
        firstQuestion.midi,
        firstQuestion.mode !== "chord-quality",
      );
  };
  const listen = () => {
    if (question)
      piano.playSequence(question.midi, question.mode !== "chord-quality");
  };
  const commit = (correct: boolean) => {
    if (!question || resolved !== null) return;
    const ms = Math.round(performance.now() - startedAt.current);
    const nextStreak = correct ? streak + 1 : 0;
    setResolved(correct);
    setStreak(nextStreak);
    setBestStreak(Math.max(bestStreak, nextStreak));
    setAnswers((values) => [...values, { correct, ms }]);
    setFeedback(
      correct
        ? `Correct. ${question.answer}.`
        : `Not quite. The answer is ${question.answer}.`,
    );
    const previous = progress.skills[question.skill] ?? {
      attempts: 0,
      correct: 0,
      bestStreak: 0,
      lastPracticed: "",
    };
    setProgress({
      ...progress,
      skills: {
        ...progress.skills,
        [question.skill]: {
          attempts: previous.attempts + 1,
          correct: previous.correct + Number(correct),
          bestStreak: Math.max(previous.bestStreak, nextStreak),
          lastPracticed: new Date().toISOString(),
        },
      },
    });
  };
  const next = () => {
    const value = index + 1;
    setIndex(value);
    setResolved(null);
    setTaps([]);
    setFeedback(
      value >= count ? "Session complete." : `Question ${value + 1}.`,
    );
    startedAt.current = performance.now();
    if (value >= count)
      setProgress({ ...progress, sessions: progress.sessions + 1 });
    else if (
      seed !== null &&
      ["ear-pitch", "interval", "chord-quality"].includes(mode)
    ) {
      const nextQuestion = generateQuestion(mode, seed, value);
      piano.playSequence(
        nextQuestion.midi,
        nextQuestion.mode !== "chord-quality",
      );
    }
  };
  const playAnswer = (midi: number) => {
    if (question && ["find-note", "ear-pitch"].includes(question.mode))
      commit(String(midi) === question.answer);
  };
  const tap = () => {
    if (!question || resolved !== null) return;
    const next = [...taps, performance.now()];
    setTaps(next);
    if (next.length === 4) commit(evaluateRhythm(question.answer, next));
  };
  if (finished) {
    const correct = answers.filter((item) => item.correct).length;
    const accuracy = Math.round((correct / Math.max(1, answers.length)) * 100);
    return (
      <section class="card session-summary">
        <span class="section-label">Session complete</span>
        <h3 ref={summaryHeading} tabIndex={-1}>
          {accuracy}% accuracy
        </h3>
        <div class="stat-grid">
          <div>
            <strong>
              {correct}/{answers.length}
            </strong>
            <span>correct</span>
          </div>
          <div>
            <strong>{bestStreak}</strong>
            <span>best streak</span>
          </div>
          <div>
            <strong>
              {(median(answers.map((a) => a.ms)) / 1000).toFixed(1)}s
            </strong>
            <span>median response</span>
          </div>
        </div>
        <button type="button" class="primary" onClick={start}>
          Practice again
        </button>
      </section>
    );
  }
  return (
    <div class="feature-stack">
      <section class="card trainer-card" aria-label="Ear trainer">
        <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {feedback}
        </p>
        {seed === null ? (
          <>
            <div class="trainer-intro">
              <h3>Choose what to practice</h3>
              <p>
                New to piano? Start with <strong>Match a pitch</strong> and use
                the on-screen keys to find the sound you hear.
              </p>
            </div>
            <div class="mode-grid">
              {MODES.map((item) => (
                <button
                  type="button"
                  class={mode === item.id ? "mode-card selected" : "mode-card"}
                  aria-pressed={mode === item.id}
                  onClick={() => setMode(item.id)}
                  key={item.id}
                >
                  <small>{item.tag}</small>
                  <strong>{item.name}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
            <div class="form-grid">
              <label>
                Questions
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.currentTarget.value))}
                >
                  <option value="5">5 questions</option>
                  <option value="10">10 questions</option>
                  <option value="20">20 questions</option>
                </select>
              </label>
            </div>
            <button type="button" class="primary" onClick={start}>
              Start {count}-question practice
            </button>
          </>
        ) : (
          question && (
            <div class="question-panel">
              <div class="session-line">
                <span>
                  Question {index + 1} of {count}
                </span>
                <span>Streak {streak}</span>
              </div>
              <h3 ref={questionHeading} tabIndex={-1}>
                {question.prompt}
              </h3>
              {["ear-pitch", "interval", "chord-quality"].includes(mode) && (
                <div class="button-row">
                  <button type="button" onClick={listen}>
                    {mode === "ear-pitch"
                      ? "Replay note"
                      : mode === "interval"
                        ? "Replay two notes"
                        : "Replay chord"}
                  </button>
                  {mode === "ear-pitch" && (
                    <button
                      type="button"
                      onClick={() => piano.playSequence([60])}
                    >
                      Play reference C4
                    </button>
                  )}
                </div>
              )}
              {question.choices.length > 0 && (
                <div class="answer-grid">
                  {question.choices.map((choice) => (
                    <button
                      type="button"
                      disabled={resolved !== null}
                      onClick={() => commit(choice === question.answer)}
                      key={choice}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              )}
              {mode === "rhythm" && (
                <div class="rhythm-practice">
                  <p>Listen first, then copy the four-tap pattern.</p>
                  <div class="button-row">
                    <button
                      type="button"
                      onClick={() => {
                        setTaps([]);
                        piano.playTimed(
                          72,
                          question.answer.split(",").map(Number),
                        );
                      }}
                    >
                      1 · Hear four taps
                    </button>
                    <button
                      type="button"
                      class="tap-button"
                      disabled={resolved !== null}
                      onClick={tap}
                    >
                      2 · Copy it ({taps.length}/4)
                    </button>
                  </div>
                </div>
              )}
              <p
                class={`feedback ${resolved === true ? "success" : resolved === false ? "error" : ""}`}
              >
                {feedback}
              </p>
              {resolved !== null && (
                <button type="button" class="primary" onClick={next}>
                  {index + 1 === count ? "View summary" : "Next question"}
                </button>
              )}
            </div>
          )
        )}
      </section>
      {question && mode === "visual-name" && (
        <GrandStaff
          notes={question.midi}
          title="Training note"
          concealNoteNames
        />
      )}
      {question && ["visual-name", "find-note", "ear-pitch"].includes(mode) && (
        <PianoKeyboard
          compact
          highlights={
            mode === "visual-name"
              ? new Map([[question.midi[0], "question"]])
              : new Map()
          }
          title="Answer keyboard"
          revealHighlightNames={false}
          onNote={playAnswer}
        />
      )}
    </div>
  );
}
