import Link from "next/link";

import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import SubjectBlock from "@/app/shared/subject-page/SubjectBlock";
import { SOURCE_CREDIT_COPY, SOURCE_KEYS } from "@/lib/sourceCredits";
import type { RadicalPart } from "@/lib/radicalSearchServer";

import { RADICAL_PARTS_COPY } from "./radicalPartsCopy";

/**
 * What a character is written with.
 *
 * The page already says how a kanji is drawn and what it means; this is the
 * part between the two - the pieces you can see in it. Each one is a link into
 * the radical search rather than a page of its own, because the question a
 * reader has next is what else is written with it, and that is the question
 * the search answers.
 *
 * Its own block because the parts are EDRDG's data, not WaniKani's, and every
 * block here names the source it came from.
 */
export default function RadicalPartsBlock({ parts }: { parts: RadicalPart[] }) {
  if (parts.length === 0) return null;

  return (
    <SubjectBlock
      heading={RADICAL_PARTS_COPY.heading}
      credit={{ source: SOURCE_KEYS.radkfile, label: SOURCE_CREDIT_COPY.radicals }}
    >
      <p className="text-xs text-foreground/60">{RADICAL_PARTS_COPY.hint}</p>
      <ul className="flex flex-wrap gap-2">
        {parts.map((part) => (
          <li key={part.radical}>
            <Link
              href={part.href}
              title={RADICAL_PARTS_COPY.partTitle(part.strokes)}
              className="flex min-w-[3.5rem] flex-col items-center gap-0.5 rounded-xl border border-line bg-surface px-3 py-2 text-center transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
            >
              <span className={`text-2xl leading-none text-foreground ${JP_TEXT_CLASS}`}>{part.radical}</span>
              {/*
                * The English name where the dictionary has one. Many radicals
                * have none, and a made-up label would be worse than none: the
                * character is the thing being pointed at.
                */}
              {part.name ? (
                <span className="text-[10px] font-semibold leading-tight text-foreground/60">{part.name}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </SubjectBlock>
  );
}
