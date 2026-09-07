"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { JP_TEXT_CLASS, NO_TRANSLATE_CLASS } from "./japaneseText";

import { pillWords, pillWordsTitle } from "./pillWords";
import { subjectGlyphTone } from "./subjectListView";
import { PILL_LEVEL_MODES } from "./pillWords";
import { usePillLevels } from "./usePillLevels";
import { usePillWords } from "./usePillWords";
import { ugLevelBadge, unLevelBadge, wkLevelBadge } from "@/lib/levelBadge";
import { KANJI_LISTING_NOTE_DISPLAY, type KanjiListingNote } from "@/lib/kanjiListing";

/**
 * One item, as a pill: the glyph, and the words for it when they are wanted.
 *
 * Every surface that stands an item up in a row of chips draws it through
 * this - the words a kanji is used in, the related groups, the parts of a
 * character, the kanji of a place name, an explorer's related items, a paste
 * being turned into a list, a list being edited - so they say the same thing
 * in the same shape, and one toggle governs whether the text is on them.
 * There were three other chips before this one was the only one: a tile with
 * corner badges in the explorers, a bare box on the news pages, a token with
 * a cross on the selection bar. Same glyph in a border, four ways.
 *
 * The reading and the meaning are two questions, not one label: the member
 * picks which the chips answer, through the one control beside them, and the
 * pair is always on the title, so the other half costs a hover rather than a
 * trip back to the control.
 *
 * Only Japanese is marked as Japanese: a radical WaniKani draws has an
 * English name where a character would be, and telling a browser that "leaf"
 * is Japanese asks it to render an English word in a Japanese face.
 *
 * There is one size. It took a size prop for as long as there were several
 * chips, and folding the others into it carried the disagreement inside: a
 * kanji page drew the chips under Used in words at two thirds of the ones
 * under Built from a scroll below, the same component both times. A shape
 * that means "one item, here" is that everywhere or it is not shared at all.
 */
const JAPANESE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

const META_PILL = `${NO_TRANSLATE_CLASS} subject-pill border-line bg-surface/85 text-foreground/70`;

/**
 * A member's marks on the item: how often they get it right, and the level it
 * is taught at.
 *
 * A prop per ladder rather than one prop naming a system, for the reason
 * `levelBadge` gives: there are three of them and they are named in the
 * product. A caller holding WaniKani's level passes `level`, one holding a
 * standing on the exam ladder passes `unLevel` and one on the school ladder
 * passes `ugLevel`, so none of them can label a number with the wrong system
 * by accident, and a surface that knows several draws them all.
 *
 * Nothing here chooses between the two of ours. The chips printed `UN` at
 * everybody for as long as they existed, which showed a member on the school
 * ladder a standing they are not taught against under a prefix claiming they
 * are - the same bug the header carried until `viewerLadderFor`. The fix is
 * not cleverness in the chip: the surface knows whose page this is and which
 * ladder they climb, so the surface hands over the level that belongs to
 * them, and the chip draws what it is handed.
 *
 * A character on no ladder gets a word instead of a blank. Nothing here works
 * it out: a surface that looked the character up passes the note, and one that
 * never had the levels to begin with passes nothing and draws nothing, so an
 * empty row never turns into a claim the caller cannot support.
 */
function Meta({
  level,
  unLevel,
  ugLevel,
  listing,
  successRate,
}: {
  level?: number | null;
  unLevel?: number | null;
  ugLevel?: number | null;
  listing?: KanjiListingNote | null;
  successRate?: number | null;
}) {
  const rate =
    typeof successRate === "number" && Number.isFinite(successRate)
      ? Math.max(0, Math.min(100, Math.round(successRate)))
      : null;
  const [levelMode] = usePillLevels();
  const levelsOn = levelMode === PILL_LEVEL_MODES.on;
  const badges = levelsOn
    ? [wkLevelBadge(level), unLevelBadge(unLevel), ugLevelBadge(ugLevel)].filter(
        (badge): badge is string => badge !== null,
      )
    : [];
  /* The note answers "where is the level", so it goes when the levels go. */
  const note = levelsOn && listing ? KANJI_LISTING_NOTE_DISPLAY[listing] : null;
  if (rate === null && badges.length === 0 && note === null) return null;
  return (
    <span className="mt-0.5 flex items-center gap-1">
      {rate !== null ? (
        <span translate="no" className={META_PILL}>
          {rate}%
        </span>
      ) : null}
      {badges.map((badge) => (
        <span key={badge} translate="no" className={META_PILL}>
          {badge}
        </span>
      ))}
      {note ? (
        <span title={note.title} className={META_PILL}>
          {note.label}
        </span>
      ) : null}
    </span>
  );
}

export default function SubjectPill({
  glyph,
  subjectType,
  reading,
  meaning,
  href,
  onClick,
  label,
  tone,
  level,
  unLevel,
  ugLevel,
  listing,
  successRate,
  selected,
  trailing,
}: {
  glyph: string;
  subjectType?: string;
  reading?: string | null;
  meaning?: string | null;
  /** Where it leads; without one it is a button, or plain text with neither. */
  href?: string | null;
  onClick?: () => void;
  /** The accessible name where the glyph alone is not one. */
  label?: string;
  /** Overrides the colour a subject's kind would give it. */
  tone?: string;
  /** The WaniKani level, where the surface knows it. */
  level?: number | null;
  /** Our exam-ordered level, where the surface knows it. */
  unLevel?: number | null;
  /** Our school-year-ordered level, where the surface knows it. */
  ugLevel?: number | null;
  /** Why there is no level, where the surface looked and found no list. */
  listing?: KanjiListingNote | null;
  /** The member's own success rate, where the surface knows it. */
  successRate?: number | null;
  /** Lit, for a strip where one pill is the one on screen. */
  selected?: boolean;
  trailing?: ReactNode;
}) {
  const [mode] = usePillWords();
  /* One of the two, by the member's standing choice; both on the title. */
  const words = pillWords(mode, reading, meaning);
  const title = pillWordsTitle(reading, meaning);
  const japanese = JAPANESE.test(glyph);
  const glyphClass = `${japanese ? "text-2xl" : "text-sm"} font-black leading-none ${
    tone ?? subjectGlyphTone(subjectType ?? "")
  } ${japanese ? JP_TEXT_CLASS : ""}`;
  const shell = `flex min-w-14 flex-col items-center gap-0.5 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-center transition hover:bg-surface-muted ${
    selected ? "ring-2 ring-accent/65" : ""
  }`;

  const body = (
    <>
      <span lang={japanese ? "ja" : undefined} translate="no" className={glyphClass}>
        {glyph}
      </span>
      {words ? (
        <span className="max-w-28 truncate text-[11px] font-semibold text-foreground/65">{words}</span>
      ) : null}
      <Meta level={level} unLevel={unLevel} ugLevel={ugLevel} listing={listing} successRate={successRate} />
      {trailing}
    </>
  );

  if (href) {
    return (
      <Link href={href} title={title || undefined} aria-label={label} aria-current={selected ? "true" : undefined} className={shell}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title || undefined}
        aria-label={label}
        aria-pressed={selected}
        className={`${shell} cursor-pointer`}
      >
        {body}
      </button>
    );
  }
  return (
    <span title={title || undefined} aria-label={label} className={shell}>
      {body}
    </span>
  );
}
