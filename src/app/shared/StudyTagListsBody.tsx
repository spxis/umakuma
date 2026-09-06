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
  /**
   * Keeps the controls' lane open on a surface whose controls come and go.
   *
   * A list page's Edit toggle hands this component its remove and note
   * callbacks, and without the lane held open the columns jumped sideways the
   * moment Edit was pressed. Nothing is drawn in it until there is something
   * to draw.
   */
  reserveControls?: boolean;
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
    reading: item.primaryReadings?.[0] ?? item.readings?.[0] ?? null,
    onReadings: item.onReadings,
    kunReadings: item.kunReadings,
    wkLevel: typeof item.wkLevel === "number" ? item.wkLevel : null,
    unLevel: item.unLevel ?? item.ukLevel ?? null,
    ugLevel: item.ugLevel ?? null,
    jlptLevel: item.jlptLevel ?? null,
    schoolGrade: item.schoolGrade ?? null,
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
      /*
       * Quiet until it is wanted. A permanent × on every card turned a grid of
       * characters into a grid of controls, and the mark it was drawn with -
       * the letter x - read as part of the card rather than as a button.
       */
      className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-line/70 bg-surface/95 text-foreground/70 opacity-0 shadow-sm transition group-hover:opacity-100 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100"
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3 w-3 fill-current">
        <path d="M5.28 3.86 10 8.59l4.72-4.73a1 1 0 0 1 1.42 1.42L11.41 10l4.73 4.72a1 1 0 0 1-1.42 1.42L10 11.41l-4.72 4.73a1 1 0 0 1-1.42-1.42L8.59 10 3.86 5.28a1 1 0 0 1 1.42-1.42Z" />
      </svg>
    </button>
  );
}

/**
 * The note on an item.
 *
 * A list of glyphs says what to study and never says why. The note is the
 * reason a member's own list beats a generated one - the mnemonic that finally
 * worked, the sentence it was met in - so it is shown as prose rather than as
 * a pill, to every reader, whether or not anybody is editing.
 *
 * Content only. The invitation to write one is a control and lives with the
 * other controls, in the row's trailing lane and the card's corner: as a line
 * under the meaning it appeared when Edit went on and pushed every row open,
 * so turning a control on moved the whole list under the reader.
 */
function ItemNote({ text }: { text: string | null }) {
  if (!text) return null;
  return <span className="block text-[11px] font-semibold italic text-foreground/70">{text}</span>;
}

/** Writing one, in the space the remove button already occupies. */
function NoteButton({
  item,
  hasNote,
  onEdit,
}: {
  item: StudyTagListItem;
  hasNote: boolean;
  onEdit: (item: StudyTagListItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(item)}
      aria-label={`${hasNote ? STUDY_TAG_LIST_COPY.editNote : STUDY_TAG_LIST_COPY.addNote} ${item.characters}`}
      title={hasNote ? STUDY_TAG_LIST_COPY.editNote : STUDY_TAG_LIST_COPY.addNote}
      className={`inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-line/70 bg-surface/95 text-foreground/70 shadow-sm transition hover:border-accent hover:text-accent focus-visible:opacity-100 ${
        hasNote ? "" : "opacity-0 group-hover:opacity-100"
      }`}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3 w-3 fill-current">
        <path d="M13.6 2.8a1.6 1.6 0 0 1 2.3 0l1.3 1.3a1.6 1.6 0 0 1 0 2.3l-8.1 8.1-3.6.9.9-3.6 8.1-8.1ZM3 16.5h14v1.6H3v-1.6Z" />
      </svg>
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
  reserveControls = false,
}: Props) {
  const rows = items.map(toRow);

  /*
   * The note reads in both densities and is written from either. Drawn once
   * here rather than twice, so the row list and the card grid cannot drift
   * into saying different things about the same item.
   */
  const note = noteFor ?? (() => null);
  const showNote = noteFor ? (row: TagRow) => <ItemNote text={note(row.item)} /> : undefined;

  /*
   * Both controls in one slot, and both of them overlays: a row is exactly as
   * tall with Edit on as with it off, which is the whole point of putting the
   * note's pencil here rather than under the meaning.
   */
  const controls =
    onRemove || onEditNote || reserveControls
      ? (row: TagRow) => (
          <span className="inline-flex items-center gap-1">
            {onEditNote ? (
              <NoteButton item={row.item} hasNote={Boolean(note(row.item))} onEdit={onEditNote} />
            ) : null}
            {onRemove ? <RemoveButton item={row.item} onRemove={onRemove} /> : null}
          </span>
        )
      : undefined;

  if (viewMode === SUBJECT_VIEW_MODES.list) {
    return (
      <SubjectRows<TagRow>
        rows={rows}
        onSelect={(_row, index) => onOpen(index)}
        renderTrailing={controls}
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
      renderCorner={controls}
      selection={selection}
    />
  );
}
