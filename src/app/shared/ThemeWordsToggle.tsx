"use client";

import SegmentedControl from "./SegmentedControl";
import { THEME_PICKER_COPY as copy } from "./themeCopy";
import { THEME_WORD_MODES, type ThemeWordMode } from "./themeWords";
import { useThemeWords } from "./useThemeWords";

/**
 * Chooses which script the rung names are read in, everywhere at once.
 *
 * One control rather than one per surface, for the reason the item chips have
 * one: the preference is about how a member reads, not about the page they
 * happen to be on, so the ladder on the settings page, the table on the
 * theme's page and the previews inside the browse modal all follow it.
 *
 * Segments rather than a button that flips, because a flipping button cannot
 * say what the other state is - and with the Japanese hidden behind it, that
 * is the one thing a member needs told.
 */
const OPTIONS: { value: ThemeWordMode; label: string; title: string }[] = [
  { value: THEME_WORD_MODES.romaji, label: copy.wordsRomaji, title: copy.wordsRomajiTitle },
  { value: THEME_WORD_MODES.japanese, label: copy.wordsJapanese, title: copy.wordsJapaneseTitle },
];

export default function ThemeWordsToggle({ className = "" }: { className?: string }) {
  const [mode, setMode] = useThemeWords();
  return (
    <SegmentedControl
      ariaLabel={copy.words}
      size="xs"
      value={mode}
      onChange={setMode}
      options={OPTIONS}
      className={`inline-flex shrink-0 items-center rounded-full border border-line bg-surface p-0.5 ${className}`.trim()}
    />
  );
}
