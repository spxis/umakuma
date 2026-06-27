"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LevelItem, RelatedReference } from "@/app/users/[nickname]/explorerTypes";
import LevelExplorerDetailSection from "@/app/users/[nickname]/level-explorer/components/LevelExplorerDetailSection";
import type { VocabularyKanjiLink } from "@/app/users/[nickname]/level-explorer/components/LevelExplorerReferenceCards";
import { stripHtml } from "@/app/users/[nickname]/level-explorer/lib/levelExplorerDisplay";
import { hasRenderableRelatedItems } from "@/app/users/[nickname]/study-explorer/components/StudyReviewModalHelpers";
import { newsGlyphButtonClass } from "@/app/news/newsGlyphBoxStyle";
import type { StudyQueueItem } from "@/app/users/[nickname]/study-explorer/lib/studyExplorerTypes";
import {
  fetchHydratedViewGlyphSubject,
  shouldHydrateViewGlyphItem,
} from "@/app/shared/viewGlyphModalHydration";
import {
  firstNonEmpty,
  resolveParentFrameRect,
  resolveViewGlyphFrameSize,
  usedInVocabularyTargetType,
  viewerTitle,
  type ViewGlyphFrameSize,
} from "@/app/shared/viewGlyphModalHostHelpers";
import {
  SUBJECT_TYPE_DISPLAY,
  SUBJECT_TYPES,
  isSubjectType,
  type SubjectType,
} from "@/lib/domainConstants";
import {
  VIEW_GLYPH_EVENT,
  VIEW_GLYPH_SELECTOR_KINDS,
  VIEW_GLYPH_SELECTOR_ORIGINS,
  type ViewGlyphSelectorEntry,
  type ViewGlyphViewerPayload,
} from "@/lib/viewGlyphViewer";
import { usePersistedBoolean } from "@/lib/usePersistedBoolean";

const VIEW_GLYPH_STORAGE_KEYS = {
  usedInVocabularyCollapsed: "wr:view-glyph:used-in-vocabulary-collapsed",
} as const;

export default function ViewGlyphModalHost() {
  const [items, setItems] = useState<StudyQueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [accountId, setAccountId] = useState("");
  const [showEnglish, setShowEnglish] = useState(true);
  const [usedInVocabularyCollapsed, setUsedInVocabularyCollapsed] = usePersistedBoolean(
    VIEW_GLYPH_STORAGE_KEYS.usedInVocabularyCollapsed,
    {
      defaultValue: false,
      mode: "one-is-true",
    },
  );
  const [customTitle, setCustomTitle] = useState<string | undefined>(undefined);
  const [selector, setSelector] = useState<ViewGlyphSelectorEntry[]>([]);
  const [tagOverrides, setTagOverrides] = useState<Record<number, { favorite: boolean; trouble: boolean }>>({});
  const [frameSize, setFrameSize] = useState<ViewGlyphFrameSize | null>(null);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<ViewGlyphViewerPayload>).detail;
      if (!detail?.items || detail.items.length === 0) {
        return;
      }

      setItems(detail.items);
      setIndex(Math.max(0, Math.min(detail.startIndex ?? 0, detail.items.length - 1)));
      setAccountId(detail.accountId ?? "");
      setCustomTitle(detail.title);
      setSelector(Array.isArray(detail.selector) ? detail.selector : []);
      setTagOverrides({});
      setFrameSize(resolveViewGlyphFrameSize(resolveParentFrameRect()));
    };

    window.addEventListener(VIEW_GLYPH_EVENT, onOpen);
    return () => {
      window.removeEventListener(VIEW_GLYPH_EVENT, onOpen);
    };
  }, []);

  const item = items[index] ?? null;
  const selectedTags = item
    ? (tagOverrides[item.subjectId] ?? item.studyTags ?? { favorite: false, trouble: false })
    : { favorite: false, trouble: false };
  const hasPreviousItem = index > 0;
  const hasNextItem = index < items.length - 1;
  const showNavigationButtons = hasPreviousItem || hasNextItem;

  const closeModal = useCallback(() => {
    setItems([]);
    setIndex(0);
    setAccountId("");
    setCustomTitle(undefined);
    setSelector([]);
    setTagOverrides({});
    setFrameSize(null);
  }, []);

  const toggleStudyTag = useCallback(async (tag: "favorite" | "trouble") => {
    if (!item || !accountId) {
      return;
    }

    const current = tagOverrides[item.subjectId] ?? item.studyTags ?? { favorite: false, trouble: false };
    const next = { ...current, [tag]: !current[tag] };

    setTagOverrides((prev) => ({ ...prev, [item.subjectId]: next }));
    setItems((prev) =>
      prev.map((entry) =>
        entry.subjectId === item.subjectId
          ? { ...entry, studyTags: next }
          : entry,
      ),
    );

    try {
      const response = await fetch(`/api/study/${accountId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: item.subjectId, tag, enabled: next[tag] }),
      });
      if (!response.ok) {
        throw new Error("Tag update failed.");
      }

      window.dispatchEvent(
        new CustomEvent("wr:study-tags-updated", {
          detail: { accountId, subjectId: item.subjectId },
        }),
      );
    } catch {
      setTagOverrides((prev) => ({ ...prev, [item.subjectId]: current }));
      setItems((prev) =>
        prev.map((entry) =>
          entry.subjectId === item.subjectId
            ? { ...entry, studyTags: current }
            : entry,
        ),
      );
    }
  }, [accountId, item, tagOverrides]);

  const subjectById = useMemo(() => {
    const map = new Map<number, LevelItem>();
    for (const entry of items) {
      map.set(entry.subjectId, entry);
    }
    return map;
  }, [items]);

  const createSyntheticItem = useCallback(
    (related: RelatedReference, subjectType: SubjectType): StudyQueueItem | null => {
      if (!item) return null;
      return {
        assignmentId: -1,
        queueType: "review",
        subjectId: related.subjectId,
        subjectType,
        wkLevel: related.wkLevel ?? item.wkLevel,
        characters: firstNonEmpty([related.label]),
        meanings: [firstNonEmpty([related.meaning, "-"])],
        readings: related.reading ? [related.reading] : [],
        primaryReadings: related.reading ? [related.reading] : [],
        radicals: [],
        visuallySimilar: [],
        usedInVocabulary: [],
        componentKanji: [],
        meaningExplanation: undefined,
        readingExplanation: undefined,
        jlptLevel: item.jlptLevel ?? null,
        jlptMeta: null,
        srsStage: item.srsStage,
        status: item.status,
        startedAt: null,
        passedAt: null,
        availableAt: null,
      };
    },
    [item],
  );

  const openBySubject = useCallback(
    async (subjectId: number, fallbackType: SubjectType) => {
      const existingIndex = items.findIndex((entry) => entry.subjectId === subjectId);
      if (existingIndex >= 0) {
        setIndex(existingIndex);
        return;
      }
      if (!item) {
        return;
      }
      const allRelated: Array<{ ref: RelatedReference; type: SubjectType }> = [
        ...((item.radicals as RelatedReference[] | undefined) ?? []).map((ref) => ({ ref, type: SUBJECT_TYPES.radical })),
        ...((item.visuallySimilar as RelatedReference[] | undefined) ?? []).map((ref) => ({ ref, type: SUBJECT_TYPES.kanji })),
        ...((item.componentKanji as RelatedReference[] | undefined) ?? []).map((ref) => ({ ref, type: SUBJECT_TYPES.kanji })),
        ...((item.usedInVocabulary as RelatedReference[] | undefined) ?? []).map((ref) => ({
          ref,
          type: usedInVocabularyTargetType(item.subjectType),
        })),
      ];

      const found = allRelated.find((entry) => entry.ref.subjectId === subjectId);
      const resolvedType = found?.type ?? fallbackType;
      const hydrated = await fetchHydratedViewGlyphSubject({
        accountId,
        subjectId,
        fallbackType: resolvedType,
        fallbackItem: item,
      });
      if (hydrated) {
        let nextIndex = 0;
        setItems((prev) => {
          const alreadyExistingIndex = prev.findIndex((entry) => entry.subjectId === hydrated.subjectId);
          if (alreadyExistingIndex >= 0) {
            nextIndex = alreadyExistingIndex;
            return prev;
          }

          nextIndex = prev.length;
          return [...prev, hydrated];
        });
        setIndex(nextIndex);
        return;
      }

      const synthetic = createSyntheticItem(found?.ref ?? { subjectId, label: "-" }, found?.type ?? fallbackType);
      if (!synthetic) {
        return;
      }

      let nextIndex = 0;
      setItems((prev) => {
        const alreadyExistingIndex = prev.findIndex((entry) => entry.subjectId === synthetic.subjectId);
        if (alreadyExistingIndex >= 0) {
          nextIndex = alreadyExistingIndex;
          return prev;
        }

        nextIndex = prev.length;
        return [...prev, synthetic];
      });
      setIndex(nextIndex);
    },
    [accountId, createSyntheticItem, item, items],
  );

  useEffect(() => {
    if (!item) {
      return;
    }

    const onResize = () => {
      setFrameSize(resolveViewGlyphFrameSize(resolveParentFrameRect()));
    };

    const onKeyDownCapture = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((prev) => Math.min(items.length - 1, prev + 1));
        return;
      }
    };

    const { overflow, overscrollBehavior } = document.body.style;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";

    window.addEventListener("keydown", onKeyDownCapture, true);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("keydown", onKeyDownCapture, true);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = overflow;
      document.body.style.overscrollBehavior = overscrollBehavior;
    };
  }, [closeModal, item, items.length]);

  useEffect(() => {
    if (!item || !accountId || !shouldHydrateViewGlyphItem(item)) {
      return;
    }

    let cancelled = false;
    const fallbackType = isSubjectType(item.subjectType) ? item.subjectType : SUBJECT_TYPES.kanji;

    void fetchHydratedViewGlyphSubject({
      accountId,
      subjectId: item.subjectId,
      fallbackType,
      fallbackItem: item,
    }).then((hydrated) => {
      if (cancelled || !hydrated) {
        return;
      }

      setItems((prev) =>
        prev.map((entry) =>
          entry.subjectId === hydrated.subjectId
            ? { ...entry, ...hydrated, studyTags: entry.studyTags }
            : entry,
        ),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [accountId, item]);

  if (!item) {
    return null;
  }

  const selectedMeaningExplanation = stripHtml(item.meaningExplanation) || "-";
  const selectedReadingExplanationRaw = stripHtml(item.readingExplanation);
  const showReadingExplanation = selectedReadingExplanationRaw.length > 0;
  const hasPrimaryRelatedPanel = hasRenderableRelatedItems(
    item.subjectType === SUBJECT_TYPES.vocabulary
      ? (item.componentKanji as RelatedReference[] | undefined)
      : (item.radicals as RelatedReference[] | undefined),
  );
  const hasVisuallySimilarPanel = hasRenderableRelatedItems(item.visuallySimilar as RelatedReference[] | undefined);
  const hasUsedInVocabularyPanel = hasRenderableRelatedItems(item.usedInVocabulary as RelatedReference[] | undefined);

  const vocabularyKanjiLinks: VocabularyKanjiLink[] =
    item.subjectType === SUBJECT_TYPES.vocabulary
      ? ((item.componentKanji as RelatedReference[] | undefined) ?? [])
          .filter((entry) => entry.label.trim().length > 0 && entry.label.trim() !== "-")
          .map((entry) => ({
            char: entry.label,
            subjectId: entry.subjectId,
            reading: entry.reading ?? "-",
            wkLevel: entry.wkLevel ?? null,
          }))
      : [];

  const modalFrameStyle = frameSize
    ? { width: `${frameSize.width}px`, height: `${frameSize.height}px` }
    : { width: "calc(100vw - 25px)", height: "calc(100dvh - 25px)" };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(6,12,26,0.56)] p-1 backdrop-blur-[1px] sm:p-3">
      <div style={modalFrameStyle} className="mx-auto flex max-h-[calc(100dvh-8px)] w-full max-w-[calc(100vw-8px)] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_20px_65px_rgba(0,0,0,0.42)]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-line bg-surface-muted px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center justify-start">
            <button
              type="button"
              onClick={closeModal}
              className="min-h-9 min-w-20 cursor-pointer whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold text-foreground hover:bg-surface-muted sm:px-4 sm:py-2 sm:text-sm sm:uppercase sm:tracking-[0.1em]"
            >
              Close
            </button>
          </div>
          <p className="truncate text-center text-sm font-black uppercase tracking-[0.1em] text-foreground/80 sm:text-base">
            {customTitle ?? viewerTitle(item)}
          </p>
          {showNavigationButtons ? (
            <div className="inline-flex min-w-0 items-center justify-end gap-1">
              {hasPreviousItem ? (
                <button
                  type="button"
                  onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
                  className="min-h-9 min-w-20 cursor-pointer whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold text-foreground hover:bg-surface-muted sm:px-4 sm:py-2 sm:text-sm sm:uppercase sm:tracking-[0.1em]"
                >
                  Prev
                </button>
              ) : null}
              {hasNextItem ? (
                <button
                  type="button"
                  onClick={() => setIndex((prev) => Math.min(items.length - 1, prev + 1))}
                  className="min-h-9 min-w-20 cursor-pointer whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold text-foreground hover:bg-surface-muted sm:px-4 sm:py-2 sm:text-sm sm:uppercase sm:tracking-[0.1em]"
                >
                  Next
                </button>
              ) : null}
            </div>
          ) : (
            <div />
          )}
        </div>

        {selector.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2 sm:px-4">
            {selector.map((entry, entryIndex) => {
              const selected = entry.itemIndex === index;
              const unavailable = !entry.exists || entry.itemIndex === null;
              const isSessionEntry = entry.origin === VIEW_GLYPH_SELECTOR_ORIGINS.session;
              const glyphType = entry.kind === VIEW_GLYPH_SELECTOR_KINDS.vocabulary
                ? VIEW_GLYPH_SELECTOR_KINDS.vocabulary
                : VIEW_GLYPH_SELECTOR_KINDS.kanji;
              const sessionClass = isSessionEntry && !selected ? "ring-1 ring-current/35" : "";
              return (
                <button
                  key={`${entry.label}-${entry.kind}-${entryIndex}`}
                  type="button"
                  onClick={() => {
                    if (entry.itemIndex === null) {
                      return;
                    }
                    setIndex(entry.itemIndex);
                  }}
                  disabled={entry.itemIndex === null}
                  className={
                    unavailable
                      ? `inline-flex min-h-14 min-w-14 items-center rounded-xl border border-line/70 bg-surface-muted px-3 text-4xl font-black leading-none text-foreground/70 ${entry.itemIndex === null ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`
                      : `${newsGlyphButtonClass({
                          type: glyphType,
                          selected,
                          clickable: entry.itemIndex !== null,
                        })} gap-1 ${sessionClass}`
                  }
                  title={
                    unavailable
                      ? `${entry.label} not found in WaniKani`
                      : `${SUBJECT_TYPE_DISPLAY[entry.kind].singular}: ${entry.label}`
                  }
                >
                  <span>{entry.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <LevelExplorerDetailSection
            accountId={accountId}
            selectedItem={item}
            studyTags={selectedTags}
            onToggleStudyTag={accountId ? (tag) => { void toggleStudyTag(tag); } : null}
            showEnglish={showEnglish}
            clampLongTitle
            titleMeaningToggleOnly
            canToggleEnglish
            onToggleShowEnglish={() => setShowEnglish((prev) => !prev)}
            hideTimeStats={false}
            studyMode={false}
            selectedMeaningExplanation={selectedMeaningExplanation}
            selectedReadingExplanationRaw={selectedReadingExplanationRaw}
            showReadingExplanation={showReadingExplanation}
            hasPrimaryRelatedPanel={hasPrimaryRelatedPanel}
            hasVisuallySimilarPanel={hasVisuallySimilarPanel}
            hasUsedInVocabularyPanel={hasUsedInVocabularyPanel}
            usedInVocabularyCollapsed={usedInVocabularyCollapsed}
            onToggleUsedInVocabularyCollapsed={() => setUsedInVocabularyCollapsed((value) => !value)}
            vocabularyKanjiLinks={vocabularyKanjiLinks}
            subjectById={subjectById}
            onJumpToRelatedSubject={async (subjectId) => {
              const fallback = usedInVocabularyTargetType(item.subjectType);
              await openBySubject(subjectId, fallback);
            }}
            onJumpToKanji={async (subjectId) => {
              await openBySubject(subjectId, SUBJECT_TYPES.kanji);
            }}
          />
        </div>
      </div>
    </div>
  );
}
