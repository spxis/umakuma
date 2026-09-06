import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import PillWordsToggle from "@/app/shared/PillWordsToggle";
import SubjectPill from "@/app/shared/SubjectPill";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { SOURCE_KEYS, SOURCE_CREDIT_COPY } from "@/lib/sourceCredits";
import { jishoSearchHref, type WordExample } from "@/lib/subjectPageModel";

import SubjectBlock from "./SubjectBlock";
import { SUBJECT_PAGE_COPY } from "./SubjectPage.constants";

/**
 * The compounds a kanji appears in.
 *
 * The headline of the page, and the reason to look a kanji up: 水 on its own
 * is a fact, and 水曜日, 水泳, 水中 are what knowing it buys. The study
 * viewer has shown these from the start; the page a shared link opens showed
 * none, and knew less about 水 than the page behind the sign-in wall.
 *
 * The word itself is not a link. Most of these are not WaniKani vocabulary and
 * have no page; the kanji inside each one always do, so those are the links.
 */
export default function UsedInWordsBlock({
  words,
  headingHref,
}: {
  words: WordExample[];
  /** This block's own page, where the caller is drawing the whole subject. */
  headingHref?: string | null;
}) {
  if (words.length === 0) return null;

  return (
    <SubjectBlock
      heading={SUBJECT_PAGE_COPY.usedInWords}
      headingHref={headingHref}
      credit={{ source: SOURCE_KEYS.kanjiapi, label: SOURCE_CREDIT_COPY.words }}
      action={<PillWordsToggle />}
    >
      <ul className="divide-y divide-line/60">
        {words.map((word) => (
          <li key={`${word.written}-${word.pronounced}`} className="group py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span lang="ja" translate="no" className={`text-xl font-black text-foreground ${JP_TEXT_CLASS}`}>
                {word.written}
              </span>
              {word.pronounced ? (
                <span lang="ja" translate="no" className={`text-sm font-semibold text-foreground/70 ${JP_TEXT_CLASS}`}>
                  {word.pronounced}
                </span>
              ) : null}
              {/*
                * Out to Jisho, and only when the row is being looked at.
                *
                * `opacity-0` rather than `hidden`, so the link keeps its place
                * in the tab order and appears the moment it takes focus - a
                * control a keyboard cannot reach is not out of the way, it is
                * gone. It sits at the end of the row on `ml-auto`, which is
                * where the eye already is once it has read the word.
                */}
              <a
                href={jishoSearchHref(word.written)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={SUBJECT_PAGE_COPY.lookUpOnJisho(word.written)}
                title={SUBJECT_PAGE_COPY.lookUpOnJisho(word.written)}
                className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-foreground/60 opacity-0 transition hover:bg-surface-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 group-hover:opacity-100"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                  <path d="M7 13L13 7M13 7H8M13 7v5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
            {word.gloss ? <p className="mt-0.5 text-sm font-semibold text-foreground/80">{word.gloss}</p> : null}
            {word.kanji.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {word.kanji.map((item) => (
                  <li key={item.label}>
                    <SubjectPill
                      glyph={item.label}
                      subjectType={SUBJECT_TYPES.kanji}
                      reading={item.reading}
                      meaning={item.meaning}
                      href={item.href}
                      level={item.level}
                      unLevel={item.unLevel}
                      selected={item.current}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </SubjectBlock>
  );
}
