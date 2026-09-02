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
  /** Omitted where the set is not the member's to change from here. */
  onRemove?: (item: StudyTagListItem) => void;
  /** Passed straight through, so both densities choose the same way. */
  selection?: SubjectSelection;
  /** Why the item is on this list; null where nobody wrote a reason. */
  noteFor?: (item: StudyTagListItem) => string | null;
  /** Offered only where the reader may write one. */
  onEditNote?: (item: StudyTagListItem) => void;
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
 * The note on an item, and the way to write one.
 *
 * A list of glyphs says what to study and never why. The note is the reason a
 * member's own list beats a generated one - the mnemonic that finally worked,
 * the sentence it was met in - so it is shown as prose rather than as a pill,
 * and an item without one shows only the invitation to write it, and only to
 * somebody who may.
 */
function ItemNote({
  text,
  item,
  onEdit,
}: {
  text: string | null;
  item: StudyTagListItem;
  onEdit?: (item: StudyTagListItem) => void;
}) {
  if (!text && !onEdit) return null;

  if (!onEdit) {
    return <span className="block text-[11px] font-semibold italic text-foreground/70">{text}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onEdit(item)}
      className="block w-full text-left text-[11px] font-semibold text-foreground/70 transition hover:text-accent"
    >
      {text ? <span className="italic">{text}</span> : <span>{STUDY_TAG_LIST_COPY.addNote}</span>}
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
export default function StudyTagListsBody({
  items,
  viewMode,
  onOpen,
  onRemove,
  selection,
  noteFor,
  onEditNote,
}: Props) {
  const rows = items.map(toRow);
  const removeButton = onRemove
    ? (row: TagRow) => <RemoveButton item={row.item} onRemove={onRemove} />
    : undefined;

  /*
   * The note reads in both densities and is written from either. Drawn once
   * here rather than twice, so the row list and the card grid cannot drift
   * into saying different things about the same item.
   */
  const note = noteFor ?? (() => null);
  const noteNode = (row: TagRow) => <ItemNote text={note(row.item)} item={row.item} onEdit={onEditNote} />;
  const showNote = noteFor || onEditNote ? noteNode : undefined;

  if (viewMode === SUBJECT_VIEW_MODES.list) {
    return (
      <SubjectRows<TagRow>
        rows={rows}
        onSelect={(_row, index) => onOpen(index)}
        renderTrailing={removeButton}
        renderSubMeta={showNote}
        selection={selection}
      />
    );
  }

  return (
    <SubjectCards<TagRow>
      rows={rows}
      renderUnder={showNote}
      onSelect={(_row, index) => onOpen(index)}
      renderCorner={removeButton}
      selection={selection}
    />
  );
}
