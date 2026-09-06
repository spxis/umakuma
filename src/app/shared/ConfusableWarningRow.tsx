"use client";

import SubjectPill from "@/app/shared/SubjectPill";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { CONFUSABLE_STANDINGS, type ConfusableWarning } from "@/lib/kanjiConfusableWarning.types";
import { wkLevelBadge } from "@/lib/levelBadge";

import { CONFUSABLE_WARNING_COPY } from "./ConfusableWarning.constants";

/**
 * The characters this one will be answered wrong for.
 *
 * A row of the same pill every other inline set of subjects uses, with one
 * mark added: whether the member has met the twin yet. That mark is the whole
 * difference between the two warnings. A twin they know is a live risk - two
 * shapes in their head and one answer box - while a twin still ahead is a note
 * to keep, so that meeting it later is a recognition rather than a collision.
 *
 * Nothing is drawn for a twin far enough ahead: the gating happens before this
 * in `confusableWarnings`, because a warning on every character is one a
 * reader learns to skip.
 */
export default function ConfusableWarningRow({
  items,
  showEnglish = true,
}: {
  items: ConfusableWarning[];
  /** Off while a surface is hiding English, the way the related cards are. */
  showEnglish?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => {
        const known = item.standing === CONFUSABLE_STANDINGS.known;
        const badge = wkLevelBadge(item.wkLevel);
        return (
          <li key={item.kanji}>
            <SubjectPill
              glyph={item.kanji}
              subjectType={SUBJECT_TYPES.kanji}
              reading={item.reading}
              meaning={showEnglish ? item.meaning : null}
              level={item.wkLevel}
              unLevel={item.unLevel}
              label={known ? CONFUSABLE_WARNING_COPY.knownTitle : CONFUSABLE_WARNING_COPY.aheadTitle(badge ?? "")}
              trailing={
                <span
                  translate="no"
                  className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${
                    known ? "bg-surface-muted text-foreground/60" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {known ? CONFUSABLE_WARNING_COPY.known : CONFUSABLE_WARNING_COPY.ahead}
                </span>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
