import Link from "next/link";

import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { SOURCE_CREDITS, SOURCE_CREDIT_COPY } from "@/lib/sourceCredits";
import type { WordExample } from "@/lib/subjectPageModel";

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
export default function UsedInWordsBlock({ words }: { words: WordExample[] }) {
  if (words.length === 0) return null;

  return (
    <SubjectBlock
      heading={SUBJECT_PAGE_COPY.usedInWords}
      credit={{ source: SOURCE_CREDITS.kanjiapi, label: SOURCE_CREDIT_COPY.words }}
    >
      <ul className="divide-y divide-line/60">
        {words.map((word) => (
          <li key={`${word.written}-${word.pronounced}`} className="py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span lang="ja" translate="no" className={`text-xl font-black text-foreground ${JP_TEXT_CLASS}`}>
                {word.written}
              </span>
              {word.pronounced ? (
                <span lang="ja" translate="no" className={`text-sm font-semibold text-foreground/70 ${JP_TEXT_CLASS}`}>
                  {word.pronounced}
                </span>
              ) : null}
            </div>
            {word.gloss ? <p className="mt-0.5 text-sm font-semibold text-foreground/80">{word.gloss}</p> : null}
            {word.kanji.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {word.kanji.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      title={[item.reading, item.meaning].filter(Boolean).join(" · ")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-muted px-2.5 py-1 text-xs font-bold text-foreground transition hover:bg-surface"
                    >
                      <span lang="ja" translate="no" className={`text-base leading-none text-kanji ${JP_TEXT_CLASS}`}>
                        {item.label}
                      </span>
                      {item.meaning ? <span className="text-foreground/70">{item.meaning}</span> : null}
                    </Link>
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
