import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";

/**
 * What the page is about, above the cards that answer it.
 *
 * The kanji page had no header, so the first card became one: stroke order
 * carried the readings and the meaning under its own title and was the only
 * header on the page saying two things. The character belongs to the page,
 * not to whichever block happens to be drawn first.
 *
 * It repeats what Meanings and readings holds further down, which is what a
 * page header is for - the reader should not have to scroll to learn what
 * they are looking at.
 */
export default function SubjectPageHeading({
  label,
  line,
}: {
  /** The character, or a radical's name where it has none to draw. */
  label: string;
  /** Readings and meaning, already joined; null where nothing is known. */
  line: string | null;
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <h1
        lang="ja"
        translate="no"
        className={`text-5xl font-black leading-none text-foreground sm:text-6xl ${JP_TEXT_CLASS}`}
      >
        {label}
      </h1>
      {line ? <p className="min-w-0 text-sm font-bold text-foreground/75">{line}</p> : null}
    </header>
  );
}
