"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { JP_TEXT_CLASS } from "./japaneseText";
import { subjectGlyphTone } from "./subjectListView";
import { usePillText } from "./usePillText";

/**
 * One item, as a pill: the glyph, and the words for it when they are wanted.
 *
 * Every surface that stands an item up in a row of chips draws it through
 * this - the words a kanji is used in, the related groups, a paste being
 * turned into a list, a list being edited - so they say the same thing in
 * the same shape, and one toggle governs whether the text is on them.
 *
 * The text is always in the title, whether it is drawn or not, so hiding it
 * costs a reader nothing but a hover.
 */
export default function SubjectPill({
  glyph,
  subjectType,
  reading,
  meaning,
  href,
  onClick,
  label,
  tone,
  size = "md",
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
  size?: "sm" | "md";
  trailing?: ReactNode;
}) {
  const [showText] = usePillText();
  const words = [reading, meaning].filter(Boolean).join(" · ");
  const glyphClass = `${size === "sm" ? "text-base" : "text-2xl"} font-black leading-none ${tone ?? subjectGlyphTone(subjectType ?? "")} ${JP_TEXT_CLASS}`;
  const shell = `flex min-w-14 flex-col items-center gap-0.5 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-center transition hover:bg-surface-muted ${
    size === "sm" ? "min-w-11" : ""
  }`;

  const body = (
    <>
      <span lang="ja" translate="no" className={glyphClass}>
        {glyph}
      </span>
      {showText && words ? (
        <span className="max-w-28 truncate text-[11px] font-semibold text-foreground/65">{words}</span>
      ) : null}
      {trailing}
    </>
  );

  if (href) {
    return (
      <Link href={href} title={words || undefined} aria-label={label} className={shell}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={words || undefined} aria-label={label} className={`${shell} cursor-pointer`}>
        {body}
      </button>
    );
  }
  return (
    <span title={words || undefined} className={shell}>
      {body}
    </span>
  );
}
