import Link from "next/link";

import SaveSelectionToList from "@/app/shared/SaveSelectionToList";
import SubjectRows from "@/app/shared/SubjectRows";
import { encodeSelection, SUBJECT_SELECTION_COPY } from "@/app/shared/subjectSelection";
import type { SubjectListRow } from "@/app/shared/subjectListView";

import { BULK_SELECTION_COPY } from "./bulkSelectionCopy";

/**
 * Where a bulk selection can go once it exists.
 *
 * Choosing things had two destinations on the explorers that use
 * `useSubjectSelection` - save it as a list, print it as a practice sheet - and
 * none at all on the two that use bulk mode, which meant the study and level
 * explorers could gather a set and then do nothing with it. The same
 * destinations belong on both, so they live on this panel rather than being
 * built a third time.
 *
 * Practice is offered separately from saving because a practice sheet is
 * squares to write kanji in: a selection holding radicals and vocabulary saves
 * as a list perfectly well, and only its kanji can go on a sheet.
 */
type BulkDestinations = {
  /** Whose lists this saves to. Null for a visitor, who cannot save. */
  accountId: string | null;
  /** Every chosen character, in the order chosen. */
  characters: string[];
  /** The kanji among them, which is all a practice sheet can hold. */
  practiceCharacters: string[];
  /** Where a sheet is built. Empty withholds the offer rather than pointing nowhere. */
  practicePath: string;
  /** Called after a list is saved, so the surface can leave bulk mode. */
  onSaved?: () => void;
};

type Props = {
  selectedCount: number;
  preview: string[];
  rows: SubjectListRow[];
  showFullList: boolean;
  isBusy?: boolean;
  onToggleFullList: () => void;
  onSelectVisible: () => void;
  onClearSelection: () => void;
  onDone: () => void;
  /** Drops one item from the selection. A row in this list is what it removes. */
  onRemoveSelected: (subjectId: number) => void;
  destinations?: BulkDestinations;
};

export default function ExplorerBulkSelectionPanel({
  selectedCount,
  preview,
  rows,
  showFullList,
  isBusy = false,
  onToggleFullList,
  onSelectVisible,
  onClearSelection,
  onDone,
  onRemoveSelected,
  destinations,
}: Props) {
  const hasSelection = selectedCount > 0;

  return (
    <div className="sticky top-0 z-30 mb-3 rounded-2xl border border-line bg-surface p-3 shadow-[0_8px_22px_rgba(8,16,36,0.12)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/70">
            {BULK_SELECTION_COPY.title}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground/85">
            {selectedCount === 1
              ? BULK_SELECTION_COPY.selectedOne
              : `${BULK_SELECTION_COPY.selectedPrefix} ${selectedCount} ${BULK_SELECTION_COPY.selectedManySuffix}`}
          </p>
          {hasSelection ? (
            <>
              <button
                type="button"
                onClick={onToggleFullList}
                className="mt-1 rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/80 hover:bg-surface-muted"
              >
                {showFullList ? BULK_SELECTION_COPY.hideList : BULK_SELECTION_COPY.showList}
              </button>
              {/* The glyph strip repeats what the full list shows in columns. */}
              {showFullList ? null : (
                <p className="mt-1 text-xs text-foreground/70">{preview.join("  •  ")}</p>
              )}
            </>
          ) : (
            <p className="mt-1 text-xs text-foreground/70">{BULK_SELECTION_COPY.hint}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {hasSelection && destinations?.accountId ? (
            <SaveSelectionToList
              chosen={destinations.characters}
              accountId={destinations.accountId}
              onSaved={destinations.onSaved}
            />
          ) : null}
          {hasSelection && destinations?.practicePath && destinations.practiceCharacters.length > 0 ? (
            <Link
              href={`${destinations.practicePath}/picked?picked=${encodeURIComponent(
                encodeSelection(destinations.practiceCharacters),
              )}`}
              className="inline-flex h-8 items-center rounded-full bg-accent px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
            >
              {SUBJECT_SELECTION_COPY.practise}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onSelectVisible}
            /*
             * Only while something is in flight. This was gated on `rows`,
             * which holds what is already chosen - so the one control for
             * choosing in bulk was disabled until you had chosen something by
             * hand, which is the moment you least need it.
             */
            disabled={isBusy}
            className="rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {BULK_SELECTION_COPY.selectVisible}
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            disabled={!hasSelection || isBusy}
            className="rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {BULK_SELECTION_COPY.clear}
          </button>
          <button
            type="button"
            onClick={onDone}
            disabled={isBusy}
            className="rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {BULK_SELECTION_COPY.done}
          </button>
        </div>
      </div>

      {showFullList && hasSelection ? (
        /*
         * The shared list, not a private table.
         *
         * This panel drew its own six-column table because nothing shared drew
         * one - the row list stacked the reading under the meaning everywhere
         * else. The columns won, so they moved into `SubjectRows` and this
         * renders through it: the same lanes a member reads on history, the
         * study queue and the tagged lists.
         *
         * A row removes its own item. It was a table cell before and could do
         * nothing, so picking one thing by mistake meant clearing all of them
         * and starting again.
         */
        <div className="mt-3 max-h-64 overflow-auto rounded-xl">
          <SubjectRows
            rows={rows}
            onSelect={(row) => onRemoveSelected(row.subjectId)}
            rowLabel={(row) => `${BULK_SELECTION_COPY.removeOne}: ${row.glyph}`}
            renderTrailing={(row) => (
              <span
                aria-hidden="true"
                title={`${BULK_SELECTION_COPY.removeOne} ${row.glyph}`}
                className="text-xs font-black text-foreground/60"
              >
                ×
              </span>
            )}
          />
        </div>
      ) : null}
    </div>
  );
}