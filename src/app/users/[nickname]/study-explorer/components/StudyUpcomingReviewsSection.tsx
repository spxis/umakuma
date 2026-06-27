import { formatDateTimeShort, formatRelativeFromNow } from "@/lib/timeFormat";

import type { UpcomingReviewItem } from "../lib/studyExplorerTypes";
import { shortSubjectTypeLabel } from "../../level-explorer/lib/levelExplorerDisplay";
import { NeutralPill, SubjectTypePill } from "../../shared/ExplorerPill";
import { STUDY_PANEL_TEXT } from "./StudyExplorer.constants";

type StudyUpcomingReviewsSectionProps = {
  showUpcomingReviews: boolean;
  upcomingItems: UpcomingReviewItem[];
  isLoadingUpcomingReviews: boolean;
  upcomingErrorMessage: string | null;
  onToggleShowUpcomingReviews: () => void;
};

export default function StudyUpcomingReviewsSection({
  showUpcomingReviews,
  upcomingItems,
  isLoadingUpcomingReviews,
  upcomingErrorMessage,
  onToggleShowUpcomingReviews,
}: StudyUpcomingReviewsSectionProps) {
  return (
    <div className="mt-3 rounded-xl border border-line bg-surface px-3 py-3">
      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground/85">
        <input
          type="checkbox"
          checked={showUpcomingReviews}
          onChange={onToggleShowUpcomingReviews}
          className="h-4 w-4 rounded border border-line bg-surface accent-accent"
        />
        {STUDY_PANEL_TEXT.showUpcomingReviews}
      </label>

      {!showUpcomingReviews ? null : isLoadingUpcomingReviews ? (
        <p className="mt-2 text-xs font-medium text-foreground/65">{STUDY_PANEL_TEXT.loadingUpcomingReviews}</p>
      ) : upcomingErrorMessage ? (
        <p className="mt-2 text-xs font-medium text-red-700">{STUDY_PANEL_TEXT.upcomingReviewLoadError}</p>
      ) : upcomingItems.length === 0 ? (
        <p className="mt-2 text-xs font-medium text-foreground/65">{STUDY_PANEL_TEXT.noUpcomingReviews}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {upcomingItems.map((item) => {
            const relative = formatRelativeFromNow(item.availableAt, { style: "short", allowFuture: true });
            return (
              <li
                key={`${item.subjectId}:${item.availableAt}`}
                className="rounded-lg border border-line bg-surface-muted/50 px-2.5 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-bold text-foreground">{item.characters}</span>
                      <SubjectTypePill type={item.subjectType}>{shortSubjectTypeLabel(item.subjectType)}</SubjectTypePill>
                      {typeof item.wkLevel === "number" ? (
                        <NeutralPill>L{item.wkLevel}</NeutralPill>
                      ) : null}
                    </div>
                    {(item.primaryMeaning || item.primaryReading) ? (
                      <p className="truncate text-[11px] text-foreground/70">
                        {item.primaryMeaning ?? "-"}
                        {item.primaryReading ? ` · ${item.primaryReading}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-[10px] font-semibold text-foreground/65">
                    <p>{relative}</p>
                    <p>{formatDateTimeShort(item.availableAt, "-")}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}