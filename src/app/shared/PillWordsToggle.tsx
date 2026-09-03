"use client";

import SegmentedControl from "./SegmentedControl";
import { PILL_WORD_MODES, type PillWordMode } from "./pillWords";
import { SUBJECT_PAGE_COPY } from "./subject-page/SubjectPage.constants";
import { usePillWords } from "./usePillWords";

/**
 * Chooses what the words on every item chip say, at once.
 *
 * One control rather than one per section: the preference is about how a
 * member likes to read, not about the section they happen to be looking at,
 * so wherever it is pressed every chip on every page follows.
 *
 * Three segments rather than a button that cycles, because a cycling button
 * cannot say what the other choices are - you press it until the page looks
 * right. `あ` and `EN` are the labels a reader of this site already knows,
 * with the words themselves on the hover title.
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
];

export default function PillWordsToggle({ className = "" }: { className?: string }) {
  const [mode, setMode] = usePillWords();
  return (
    <SegmentedControl
      ariaLabel={SUBJECT_PAGE_COPY.pillWordsLabel}
      size="xs"
      value={mode}
      onChange={setMode}
      options={OPTIONS}
      className={`inline-flex shrink-0 items-center rounded-full border border-line bg-surface p-0.5 ${className}`.trim()}
    />
  );
}
