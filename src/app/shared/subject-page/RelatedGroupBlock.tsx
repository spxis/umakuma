import Link from "next/link";

import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { subjectGlyphTone } from "@/app/shared/subjectListView";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { RELATED_GROUPS, type RelatedGroup, type RelatedGroupId } from "@/lib/relatedSubjects";

import { SUBJECT_PAGE_COPY } from "./SubjectPage.constants";

/** What each relation is called, seen from the subject that has it. */
const GROUP_HEADINGS: Record<RelatedGroupId, string> = {
  [RELATED_GROUPS.builtFrom]: SUBJECT_PAGE_COPY.builtFrom,
  [RELATED_GROUPS.usedIn]: SUBJECT_PAGE_COPY.usedIn,
  [RELATED_GROUPS.looksLike]: SUBJECT_PAGE_COPY.looksLike,
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
export default function RelatedGroupBlock({ group }: { group: RelatedGroup }) {
  if (group.items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
        {GROUP_HEADINGS[group.id]}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {group.items.map((item) => {
          const drawn = item.subjectType === SUBJECT_TYPES.radical && [...item.label].length > 2;
          return (
            <li key={item.subjectId}>
              <Link
                href={item.href}
                className="flex min-w-16 flex-col items-center gap-0.5 rounded-xl border border-line bg-surface px-3 py-2 transition hover:bg-surface-muted"
              >
                <span
                  lang={drawn ? undefined : "ja"}
                  translate="no"
                  className={`${drawn ? "text-sm" : "text-2xl"} font-black ${JP_TEXT_CLASS} ${subjectGlyphTone(item.subjectType)}`}
                >
                  {item.label}
                </span>
                {item.reading || item.meaning ? (
                  <span className="max-w-32 truncate text-[11px] font-semibold text-foreground/65">
                    {item.reading ?? item.meaning}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
