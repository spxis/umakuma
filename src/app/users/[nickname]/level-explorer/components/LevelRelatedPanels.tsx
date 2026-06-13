import { ReactNode } from "react";

type Props = {
  hasPrimary: boolean;
  hasVisuallySimilar: boolean;
  hasUsedInVocabulary: boolean;
  primaryTitle: string;
  primaryContent: ReactNode;
  visuallySimilarContent: ReactNode;
  usedInVocabularyContent: ReactNode;
  usedInVocabularyCollapsed?: boolean;
  onToggleUsedInVocabularyCollapsed?: (() => void) | null;
};

export default function LevelRelatedPanels({
  hasPrimary,
  hasVisuallySimilar,
  hasUsedInVocabulary,
  primaryTitle,
  primaryContent,
  visuallySimilarContent,
  usedInVocabularyContent,
  usedInVocabularyCollapsed = false,
  onToggleUsedInVocabularyCollapsed = null,
}: Props) {
  if (!hasPrimary && !hasVisuallySimilar && !hasUsedInVocabulary) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      {hasPrimary || hasVisuallySimilar ? (
        <div
          className={`grid gap-3 ${
            hasPrimary && hasVisuallySimilar ? "lg:grid-cols-2" : "lg:grid-cols-1"
          }`}
        >
          {hasPrimary ? (
            <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
              <p className="text-xs font-bold uppercase text-foreground/70">{primaryTitle}</p>
              {primaryContent}
            </article>
          ) : null}

          {hasVisuallySimilar ? (
            <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
              <p className="text-xs font-bold uppercase text-foreground/70">Visually similar</p>
              {visuallySimilarContent}
            </article>
          ) : null}
        </div>
      ) : null}

      {hasUsedInVocabulary ? (
        <div className="grid gap-3 lg:grid-cols-1">
          <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase text-foreground/70">Used in vocabulary</p>
              {onToggleUsedInVocabularyCollapsed ? (
                <button
                  type="button"
                  onClick={onToggleUsedInVocabularyCollapsed}
                  className="rounded-full border border-line bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted"
                >
                  {usedInVocabularyCollapsed ? "Expand" : "Collapse"}
                </button>
              ) : null}
            </div>
            {!usedInVocabularyCollapsed ? usedInVocabularyContent : null}
          </article>
        </div>
      ) : null}
    </div>
  );
}
