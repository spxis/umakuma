import PillWordsToggle from "@/app/shared/PillWordsToggle";
import SubjectBlock from "@/app/shared/subject-page/SubjectBlock";
import SubjectPill from "@/app/shared/SubjectPill";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import type { RadicalPart } from "@/lib/radicalSearchServer";
import { SOURCE_CREDIT_COPY, SOURCE_KEYS } from "@/lib/sourceCredits";

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
 * block here names the source it came from. The parts are the same pill the
 * blocks under them use - this one drew a box of its own for a release, and a
 * page showed two chip shapes a scroll apart.
 */
export default function RadicalPartsBlock({ parts }: { parts: RadicalPart[] }) {
  if (parts.length === 0) return null;

  return (
    <SubjectBlock
      heading={RADICAL_PARTS_COPY.heading}
      credit={{ source: SOURCE_KEYS.radkfile, label: SOURCE_CREDIT_COPY.radicals }}
      action={<PillWordsToggle />}
    >
      <p className="text-xs text-foreground/60">{RADICAL_PARTS_COPY.hint}</p>
      <ul className="flex flex-wrap gap-2">
        {parts.map((part) => (
          <li key={part.radical}>
            {/*
              * The English name where the dictionary has one. Many radicals
              * have none, and a made-up label would be worse than none: the
              * character is the thing being pointed at.
              */}
            <SubjectPill glyph={part.radical} subjectType={SUBJECT_TYPES.radical} meaning={part.name} href={part.href} />
          </li>
        ))}
      </ul>
    </SubjectBlock>
  );
}
