import PillWordsToggle from "@/app/shared/PillWordsToggle";
import SubjectBlock, { type BlockCredit } from "@/app/shared/subject-page/SubjectBlock";
import SubjectPill from "@/app/shared/SubjectPill";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { CONFUSABLE_SOURCES, type ConfusableSource } from "@/lib/kanjiConfusables";
import type { ConfusableView } from "@/lib/kanjiConfusablesView";
import { SOURCE_CREDIT_COPY, SOURCE_KEYS } from "@/lib/sourceCredits";

import { SUBJECT_PAGE_COPY } from "./SubjectPage.constants";

/**
 * The characters this one gets mistaken for.
 *
 * Its own block rather than a row inside Related, because it is a different
 * question with different evidence behind it: Related is what WaniKani links a
 * subject to, and this is what two datasets and a curation pass say a learner
 * confuses. It is also the block that works without WaniKani at all, which is
 * the point for the 134 joyo kanji they never teach.
 *
 * Each chip carries the twin's UmaKuma level, because that is the actionable
 * half. 土 is taught at level 5 and 士 at 52: a member meeting 士 is being told
 * both that it has a twin and that they met the twin forty-seven levels ago.
 * They are pills like every other inline set of subjects on the site.
 */
export default function ConfusablesBlock({
  items,
  headingHref,
}: {
  items: ConfusableView[];
  /** This block's own page, where the caller is drawing the whole subject. */
  headingHref?: string | null;
}) {
  if (items.length === 0) return null;

  /* Only the sources that actually fed this character's list get named. */
  const used = new Set<ConfusableSource>(items.flatMap((item) => item.sources));
  const credits: BlockCredit[] = [];
  if (used.has(CONFUSABLE_SOURCES.strokeEditDistance)) {
    credits.push({ source: SOURCE_KEYS.kanjiConfusion, label: SOURCE_CREDIT_COPY.confusableDistances });
  }
  if (used.has(CONFUSABLE_SOURCES.wanikani)) {
    credits.push({ source: SOURCE_KEYS.wanikani, label: SOURCE_CREDIT_COPY.confusablePairs });
  }

  return (
    <SubjectBlock
      heading={SUBJECT_PAGE_COPY.sectionTitles.confusables}
      headingHref={headingHref}
      credit={credits}
      action={<PillWordsToggle />}
    >
      <p className="text-xs text-foreground/60">{SUBJECT_PAGE_COPY.confusablesHint}</p>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.kanji}>
            <SubjectPill
              glyph={item.kanji}
              subjectType={SUBJECT_TYPES.kanji}
              reading={item.reading}
              meaning={item.meaning}
              href={item.href}
              unLevel={item.unLevel}
            />
          </li>
        ))}
      </ul>
    </SubjectBlock>
  );
}
