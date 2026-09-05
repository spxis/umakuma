"use client";

import SegmentedControl from "./SegmentedControl";
import { PILL_LEVEL_MODES, PILL_WORD_MODES, type PillWordMode } from "./pillWords";
import { SUBJECT_PAGE_COPY } from "./subject-page/SubjectPage.constants";
import { usePillLevels } from "./usePillLevels";
import { usePillWords } from "./usePillWords";

/**
 * Chooses what the words on every item chip say, at once.
 *
 * One control rather than one per section: the preference is about how a
 * member likes to read, not about the section they happen to be looking at,
 * so wherever it is pressed every chip on every page follows.
 *
 * Segments rather than a button that cycles, because a cycling button cannot
 * say what the other choices are - you press it until the page looks right,
 * and with four states that is three presses of guessing. `あ` and `EN` are
 * the labels a reader of this site already knows, with the words themselves
 * on the hover title.
 */
const OPTIONS: { value: PillWordMode; label: string; title: string }[] = [
  { value: PILL_WORD_MODES.off, label: SUBJECT_PAGE_COPY.pillWordsOff, title: SUBJECT_PAGE_COPY.pillWordsOffTitle },
  {
    value: PILL_WORD_MODES.reading,
    label: SUBJECT_PAGE_COPY.pillWordsReading,
    title: SUBJECT_PAGE_COPY.pillWordsReadingTitle,
  },
  {
    value: PILL_WORD_MODES.english,
    label: SUBJECT_PAGE_COPY.pillWordsEnglish,
    title: SUBJECT_PAGE_COPY.pillWordsEnglishTitle,
  },
  {
    value: PILL_WORD_MODES.both,
    label: SUBJECT_PAGE_COPY.pillWordsBoth,
    title: SUBJECT_PAGE_COPY.pillWordsBothTitle,
  },
];

export default function PillWordsToggle({ className = "" }: { className?: string }) {
  const [mode, setMode] = usePillWords();
  const [levels, setLevels] = usePillLevels();
  const levelsOn = levels === PILL_LEVEL_MODES.on;
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border border-line bg-surface p-0.5 ${className}`.trim()}>
      <SegmentedControl
        ariaLabel={SUBJECT_PAGE_COPY.pillWordsLabel}
        size="xs"
        value={mode}
        onChange={setMode}
        options={OPTIONS}
        className="inline-flex items-center"
      />
      {/* Levels are a second question, not a fifth answer to the first: a
          member reading in English may or may not want WK6 under every chip,
          so it is a switch beside the segments rather than a segment. */}
      <button
        type="button"
        aria-pressed={levelsOn}
        title={SUBJECT_PAGE_COPY.pillLevelsTitle}
        onClick={() => setLevels(levelsOn ? PILL_LEVEL_MODES.off : PILL_LEVEL_MODES.on)}
        className={`ml-0.5 rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ${
          levelsOn ? "bg-accent text-white" : "text-foreground/60 hover:text-foreground"
        }`}
      >
        {SUBJECT_PAGE_COPY.pillLevels}
      </button>
    </span>
  );
}
