import PillWordsToggle from "@/app/shared/PillWordsToggle";
import SubjectPill from "@/app/shared/SubjectPill";
import { RELATED_GROUPS, type RelatedGroup, type RelatedGroupId } from "@/lib/relatedSubjects";

import { SUBJECT_PAGE_COPY } from "./SubjectPage.constants";

/** What each relation is called, seen from the subject that has it. */
const GROUP_HEADINGS: Record<RelatedGroupId, string> = {
  [RELATED_GROUPS.builtFrom]: SUBJECT_PAGE_COPY.builtFrom,
  [RELATED_GROUPS.usedIn]: SUBJECT_PAGE_COPY.usedIn,
  [RELATED_GROUPS.sharesKanji]: SUBJECT_PAGE_COPY.sharesKanji,
};

/**
 * A heading over a row of linked chips.
 *
 * One block used several times over, not three components: what a group holds
 * differs by subject - radicals under a kanji, kanji under a word, words under
 * a kanji - but what it is does not. Every chip is a link to that subject's
 * own page, through the same address function the search results use, so
 * following a result and following a chip land in the same place.
 *
 * A drawn radical has no character; its chip shows its name, which is also
 * its address, rather than a blank square.
 */
export default function RelatedGroupBlock({ group, showToggle = false }: { group: RelatedGroup; showToggle?: boolean }) {
  if (group.items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
          {GROUP_HEADINGS[group.id]}
        </h3>
        {/* One control for every pill on the page, on the first group only. */}
        {showToggle ? <PillWordsToggle /> : null}
      </div>
      <ul className="flex flex-wrap gap-2">
        {group.items.map((item) => (
          <li key={item.subjectId}>
            <SubjectPill
              glyph={item.label}
              subjectType={item.subjectType}
              reading={item.reading}
              meaning={item.meaning}
              href={item.href}
              level={item.level}
              ukLevel={item.ukLevel}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
