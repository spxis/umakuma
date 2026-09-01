import SubjectRows from "@/app/shared/SubjectRows";
import { STUDY_TAGS, type StudyTag } from "@/lib/domainConstants";

import { formatNextReviewBadge } from "../../level-explorer/lib/levelExplorerDisplay";
import { FavouriteStarIcon, TroubleFaceIcon } from "../../shared/studyTagIcons";
import { toStudyRow, type StudyRow } from "../lib/studyRowAdapter";
import type { StudyQueueItem } from "../lib/studyExplorerTypes";
import { isReviewQueueItem, STUDY_PANEL_TEXT } from "./StudyExplorer.constants";

type Props = {
  items: StudyQueueItem[];
  isUnauthorized: boolean;
  onSelectSubject: (subjectId: number) => void;
  onToggleStudyTag: (subjectId: number, tag: StudyTag, enabled: boolean) => void;
};

function tagButtonClass(active: boolean): string {
  return `inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md px-1.5 text-xs font-black leading-none transition ${
    active ? "text-foreground" : "text-foreground/20 hover:text-foreground/60"
  }`;
}

/**
 * The condensed half of the Study queue, one line per subject.
 *
 * The grid is for browsing a wall of glyphs; this is for finding a known item
 * in a long queue, so it reuses the shared row rather than growing a third
 * private list renderer. What Study has and the other list surfaces do not —
 * how late a review is, and the tag toggles — rides in the slots.
 */
export default function StudyExplorerRows({ items, isUnauthorized, onSelectSubject, onToggleStudyTag }: Props) {
  const rows = items.map(toStudyRow);

  return (
    <SubjectRows<StudyRow>
      rows={rows}
      onSelect={(row) => {
        if (!isUnauthorized) {
          onSelectSubject(row.subjectId);
        }
      }}
      renderSubMeta={(row) => {
        const badge = isReviewQueueItem(row.item) ? formatNextReviewBadge(row.item.availableAt) : null;
        if (!badge) {
          return null;
        }

        return (
          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${badge.className}`}>
            {badge.label}
          </span>
        );
      }}
      renderTrailing={(row) => {
        const tags = row.item.studyTags ?? { favorite: false, trouble: false };
        return (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onToggleStudyTag(row.subjectId, STUDY_TAGS.trouble, !tags.trouble)}
              aria-label={STUDY_PANEL_TEXT.toggleTrouble}
              title={STUDY_PANEL_TEXT.toggleTrouble}
              className={tagButtonClass(tags.trouble)}
            >
              <TroubleFaceIcon />
            </button>
            <button
              type="button"
              onClick={() => onToggleStudyTag(row.subjectId, STUDY_TAGS.favorite, !tags.favorite)}
              aria-label={STUDY_PANEL_TEXT.toggleFavorite}
              title={STUDY_PANEL_TEXT.toggleFavorite}
              className={`${tagButtonClass(tags.favorite)} text-base`}
            >
              <FavouriteStarIcon />
            </button>
          </div>
        );
      }}
    />
  );
}
