"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { JP_TEXT_CLASS, NO_TRANSLATE_CLASS } from "./japaneseText";

import { pillWords, pillWordsTitle } from "./pillWords";
import { subjectGlyphTone } from "./subjectListView";
import { PILL_LEVEL_MODES } from "./pillWords";
import { usePillLevels } from "./usePillLevels";
import { usePillWords } from "./usePillWords";
import { unLevelBadge, wkLevelBadge } from "@/lib/levelBadge";

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
 * Two level props rather than one prop naming a system, for the reason
 * `levelBadge` gives: there are exactly two ladders and they are named in the
 * product. A caller holding WaniKani's level passes `level` and one holding
 * ours passes `ukLevel`, so neither can label a number with the wrong system
 * by accident, and a surface that knows both draws both.
 */
function Meta({
  level,
  ukLevel,
  successRate,
}: {
  level?: number | null;
  ukLevel?: number | null;
  successRate?: number | null;
}) {
  const rate =
    typeof successRate === "number" && Number.isFinite(successRate)
      ? Math.max(0, Math.min(100, Math.round(successRate)))
      : null;
  const [levelMode] = usePillLevels();
  const badges =
    levelMode === PILL_LEVEL_MODES.on
      ? [wkLevelBadge(level), unLevelBadge(ukLevel)].filter((badge): badge is string => badge !== null)
      : [];
  if (rate === null && badges.length === 0) return null;
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
  ukLevel,
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
  /** The UmaKuma level, where the surface knows it. */
  ukLevel?: number | null;
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
      <Meta level={level} ukLevel={ukLevel} successRate={successRate} />
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
