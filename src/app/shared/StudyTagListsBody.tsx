"use client";

import SubjectCards from "@/app/shared/SubjectCards";
import SubjectRows from "@/app/shared/SubjectRows";
import {
  SUBJECT_VIEW_MODES,
  type SubjectListRow,
  type SubjectViewMode,
} from "@/app/shared/subjectListView";
import { STUDY_TAG_LIST_COPY } from "@/app/shared/studyTagListsUi";
import { srsBucketFromStage } from "@/lib/domainConstants";
import type { StudyTagListItem } from "@/lib/studyTagLists";
import type { SubjectSelection } from "@/app/shared/useSubjectSelection";

type Props = {
  items: StudyTagListItem[];
  viewMode: SubjectViewMode;
  onOpen: (index: number) => void;
  onRemove: (item: StudyTagListItem) => void;
  /** Passed straight through, so both densities choose the same way. */
  selection?: SubjectSelection;
};

/** A list row is a subject plus the tagged item it came from. */
type TagRow = SubjectListRow & { item: StudyTagListItem };

function toRow(item: StudyTagListItem): TagRow {
  const srsStage = typeof item.srsStage === "number" ? item.srsStage : null;
  return {
    key: String(item.subjectId),
    subjectId: item.subjectId,
    subjectType: item.subjectType ?? "",
    glyph: item.characters,
    meaning: item.meanings[0] ?? "",
    reading: item.readings?.[0] ?? null,
    wkLevel: typeof item.wkLevel === "number" ? item.wkLevel : null,
    srsStage,
    srsBucket: srsBucketFromStage(srsStage),
    item,
  };
}

function RemoveButton({
  item,
  onRemove,
}: {
  item: StudyTagListItem;
  onRemove: (item: StudyTagListItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRemove(item)}
      aria-label={`${STUDY_TAG_LIST_COPY.remove} ${item.characters}`}
      title={STUDY_TAG_LIST_COPY.remove}
      className="h-7 w-7 cursor-pointer rounded-full border border-line bg-surface/90 text-xs font-black text-foreground hover:bg-surface-muted"
    >
      ×
    </button>
  );
}

/**
 * The tagged items, as either browsing cards or a scannable list.
 *
 * Both views show the same items in the same order and open the same glyph
 * viewer; they differ only in density. Both halves are the shared subject
 * renderers, so a tagged item and a history attempt read identically.
 */
export default function StudyTagListsBody({ items, viewMode, onOpen, onRemove, selection }: Props) {
  const rows = items.map(toRow);
  const removeButton = (row: TagRow) => <RemoveButton item={row.item} onRemove={onRemove} />;

  if (viewMode === SUBJECT_VIEW_MODES.list) {
    return (
      <SubjectRows<TagRow>
        rows={rows}
        onSelect={(_row, index) => onOpen(index)}
        renderTrailing={removeButton}
        selection={selection}
      />
    );
  }

  return (
    <SubjectCards<TagRow>
      rows={rows}
      onSelect={(_row, index) => onOpen(index)}
      renderCorner={removeButton}
      selection={selection}
    />
  );
}
