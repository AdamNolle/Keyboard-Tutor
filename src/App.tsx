import { useEffect, useState } from "preact/hooks";
import { registerSW } from "virtual:pwa-register";
import { piano } from "./audio/PianoEngine";
import { ChordsPage } from "./components/ChordsPage";
import { KeysPage } from "./components/KeysPage";
import { MetronomePage } from "./components/MetronomePage";
import { TrainerPage } from "./components/TrainerPage";
import {
  loadState,
  saveState,
  type Progress,
  type SavedState,
} from "./music/progress";

type Section = "keys" | "chords" | "ear" | "metronome";
const SECTIONS: { id: Section; label: string }[] = [
  { id: "keys", label: "Keys" },
  { id: "chords", label: "Chords" },
  { id: "ear", label: "Ear trainer" },
  { id: "metronome", label: "Metronome" },
];
const validSection = (value: string): value is Section =>
  SECTIONS.some((item) => item.id === value);

export function App() {
  const [saved, setSaved] = useState<SavedState>(() => loadState());
  const hash = location.hash.replace(/^#\/?/, "");
  const [section, setSection] = useState<Section>(
    validSection(hash)
      ? hash
      : validSection(saved.settings.lastSection)
        ? saved.settings.lastSection
        : "keys",
  );
  const [audioStatus, setAudioStatus] = useState("");
  const [preferFlats, setPreferFlats] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [updateSW, setUpdateSW] = useState<
    ((reload?: boolean) => Promise<void>) | null
  >(null);

  const applySection = (next: Section) => {
    piano.cancelPlayback();
    setSection(next);
    setSaved((state) => ({
      ...state,
      settings: { ...state.settings, lastSection: next },
    }));
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("#page-title")?.focus();
      document
        .querySelector<HTMLElement>('.site-header [aria-current="page"]')
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  };

  useEffect(() => {
    piano.setVolume(saved.settings.volume);
    piano.setTone(saved.settings.tone);
    setStorageWarning(
      saveState(saved) ? null : "Settings could not be saved in this browser.",
    );
  }, [saved]);

  useEffect(() => {
    let activated = false;
    const primeAudio = () => {
      if (activated) return;
      void piano
        .enable()
        .then((ready) => {
          if (!ready) return;
          activated = true;
          setAudioStatus("");
          window.removeEventListener("pointerdown", primeAudio, true);
          window.removeEventListener("keydown", primeAudio, true);
        })
        .catch(() =>
          setAudioStatus("Sound was blocked. Tap a piano key to try again."),
        );
    };
    window.addEventListener("pointerdown", primeAudio, true);
    window.addEventListener("keydown", primeAudio, true);
    return () => {
      window.removeEventListener("pointerdown", primeAudio, true);
      window.removeEventListener("keydown", primeAudio, true);
    };
  }, []);

  useEffect(() => {
    const route = () => {
      const next = location.hash.replace(/^#\/?/, "");
      if (validSection(next)) applySection(next);
    };
    window.addEventListener("hashchange", route);
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      const update = registerSW({
        onNeedRefresh: () => setUpdateReady(true),
        onOfflineReady: () => setAudioStatus("Ready offline."),
      });
      setUpdateSW(() => update);
    }
    return () => {
      window.removeEventListener("hashchange", route);
      piano.dispose();
    };
  }, []);

  const navigate = (next: Section) => {
    const target = `#/${next}`;
    if (location.hash === target) applySection(next);
    else location.hash = `/${next}`;
  };
  const setProgress = (progress: Progress) =>
    setSaved((state) => ({ ...state, progress }));
  const setSoundSetting = (key: "volume" | "tone", value: number) =>
    setSaved((state) => ({
      ...state,
      settings: { ...state.settings, [key]: value },
    }));
  const title = SECTIONS.find((item) => item.id === section)!.label;

  return (
    <>
      <a class="skip-link" href="#main">
        Skip to content
      </a>
      <header class="site-header">
        <h1 class="sr-only">Keyboard Tutor</h1>
        <nav aria-label="Sections">
          <ul>
            {SECTIONS.map((item) => (
              <li key={item.id}>
                <a
                  href={`#/${item.id}`}
                  aria-current={section === item.id ? "page" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    navigate(item.id);
                  }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {updateReady && (
        <aside class="update-banner" aria-live="polite">
          Update available.
          <button type="button" onClick={() => void updateSW?.(true)}>
            Reload
          </button>
        </aside>
      )}
      {storageWarning && (
        <aside class="storage-banner" role="alert">
          {storageWarning}
        </aside>
      )}

      <main id="main" class="main-content">
        <div class="page-heading">
          <h2 id="page-title" tabIndex={-1}>
            {title}
          </h2>
        </div>
        {section === "keys" && (
          <KeysPage
            volume={saved.settings.volume}
            tone={saved.settings.tone}
            setVolume={(value) => setSoundSetting("volume", value)}
            setTone={(value) => setSoundSetting("tone", value)}
            preferFlats={preferFlats}
            setPreferFlats={setPreferFlats}
          />
        )}
        {section === "chords" && (
          <ChordsPage
            preferFlats={preferFlats}
            setPreferFlats={setPreferFlats}
          />
        )}
        {section === "ear" && (
          <TrainerPage progress={saved.progress} setProgress={setProgress} />
        )}
        {section === "metronome" && <MetronomePage />}
      </main>

      {audioStatus && (
        <div class="global-status" aria-live="polite">
          {audioStatus}
        </div>
      )}
    </>
  );
}
