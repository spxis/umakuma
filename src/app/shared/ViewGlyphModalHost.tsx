"use client";

import { useCallback, useEffect, useState } from "react";
import { newsGlyphButtonClass } from "@/app/news/newsGlyphBoxStyle";
import type { RelatedReference } from "@/app/users/[nickname]/explorerTypes";
import {
  buildStudyReviewAllMeanings,
  collectUsedKanjiItems,
  deriveJlptGradeLabel,
  deriveStudyReviewReadings,
} from "@/app/users/[nickname]/study-explorer/lib/studyReviewModalDerivations";
import type { StudyQueueItem } from "@/app/users/[nickname]/study-explorer/lib/studyExplorerTypes";
import {
  STUDY_VIEWER_MODES,
} from "@/app/users/[nickname]/study-explorer/components/StudyExplorer.constants";
import { hasRenderableRelatedItems } from "@/app/users/[nickname]/study-explorer/components/StudyReviewModalHelpers";
import StudyReviewModalSection from "@/app/users/[nickname]/study-explorer/components/StudyReviewModalSection";
import {
  fetchHydratedViewGlyphSubject,
  shouldHydrateViewGlyphItem,
} from "@/app/shared/viewGlyphModalHydration";
import {
  resolveParentFrameRect,
  resolveViewGlyphFrameSize,
  viewerTitle,
  type ViewGlyphFrameSize,
} from "@/app/shared/viewGlyphModalHostHelpers";
import {
  SUBJECT_TYPE_DISPLAY,
  SUBJECT_TYPES,
  isSubjectType,
  type SubjectType,
} from "@/lib/domainConstants";
import { usePersistedBoolean } from "@/lib/usePersistedBoolean";
import {
  VIEW_GLYPH_EVENT,
  VIEW_GLYPH_SELECTOR_KINDS,
  VIEW_GLYPH_SELECTOR_ORIGINS,
  type ViewGlyphSelectorEntry,
  type ViewGlyphViewerPayload,
} from "@/lib/viewGlyphViewer";

const VIEW_GLYPH_STORAGE_KEYS = {
  usedInVocabularyCollapsed: "wr:view-glyph:used-in-vocabulary-collapsed",
  usedKanjiCollapsed: "wr:view-glyph:used-kanji-collapsed",
  usedInWordsCollapsed: "wr:view-glyph:used-in-words-collapsed",
} as const;

type ViewGlyphStackEntry = {
  index: number;
  frameSize: ViewGlyphFrameSize | null;
};

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
  const [usedKanjiCollapsed, setUsedKanjiCollapsed] = usePersistedBoolean(
    VIEW_GLYPH_STORAGE_KEYS.usedKanjiCollapsed,
    {
      defaultValue: false,
      mode: "one-is-true",
    },
  );
  const [usedInWordsCollapsed, setUsedInWordsCollapsed] = usePersistedBoolean(
    VIEW_GLYPH_STORAGE_KEYS.usedInWordsCollapsed,
    {
      defaultValue: false,
      mode: "one-is-true",
    },
  );
  const [customTitle, setCustomTitle] = useState<string | undefined>(undefined);
  const [selector, setSelector] = useState<ViewGlyphSelectorEntry[]>([]);
  const [frameSize, setFrameSize] = useState<ViewGlyphFrameSize | null>(null);
  const [stack, setStack] = useState<ViewGlyphStackEntry[]>([]);

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
      setStack([]);
      setFrameSize(resolveViewGlyphFrameSize(resolveParentFrameRect()));
    };

    window.addEventListener(VIEW_GLYPH_EVENT, onOpen);
    return () => {
      window.removeEventListener(VIEW_GLYPH_EVENT, onOpen);
    };
  }, []);

  const item = items[index] ?? null;
  const hasPreviousItem = index > 0;
  const hasNextItem = index < items.length - 1;
  const showNavigationButtons = hasPreviousItem || hasNextItem;
  const canStepBack = stack.length > 0;

  const closeModal = useCallback(() => {
    setItems([]);
    setIndex(0);
    setAccountId("");
    setCustomTitle(undefined);
    setSelector([]);
    setStack([]);
    setFrameSize(null);
  }, []);

  const pushStackAndOpen = useCallback(
    (nextIndex: number) => {
      if (nextIndex === index) {
        return;
      }

      setStack((prev) => [...prev, { index, frameSize }]);
      setFrameSize((current) => resolveViewGlyphFrameSize(current ?? resolveParentFrameRect()));
      setIndex(nextIndex);
    },
    [frameSize, index],
  );

  const stepBackOrClose = useCallback(() => {
    if (!canStepBack) {
      closeModal();
      return;
    }

    setStack((prev) => {
      const previous = prev[prev.length - 1];
      if (!previous) {
        return prev;
      }

      setIndex(previous.index);
      setFrameSize(previous.frameSize);
      return prev.slice(0, -1);
    });
  }, [canStepBack, closeModal]);

  const openBySubject = useCallback(
    async (subjectId: number, fallbackType: SubjectType) => {
      if (!item || !accountId) {
        return;
      }

      const existingIndex = items.findIndex((entry) => entry.subjectId === subjectId);
      if (existingIndex >= 0) {
        pushStackAndOpen(existingIndex);
        return;
      }

      const allRelated: Array<{ ref: RelatedReference; type: SubjectType }> = [
        ...((item.radicals as RelatedReference[] | undefined) ?? []).map((ref) => ({ ref, type: SUBJECT_TYPES.radical })),
        ...((item.visuallySimilar as RelatedReference[] | undefined) ?? []).map((ref) => ({ ref, type: SUBJECT_TYPES.kanji })),
        ...((item.componentKanji as RelatedReference[] | undefined) ?? []).map((ref) => ({ ref, type: SUBJECT_TYPES.kanji })),
        ...((item.usedInVocabulary as RelatedReference[] | undefined) ?? []).map((ref) => ({
          ref,
          type: item.subjectType === SUBJECT_TYPES.radical ? SUBJECT_TYPES.kanji : SUBJECT_TYPES.vocabulary,
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

      if (!hydrated) {
        return;
      }

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
      pushStackAndOpen(nextIndex);
    },
    [accountId, item, items, pushStackAndOpen],
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
        stepBackOrClose();
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
  }, [item, items.length, stepBackOrClose]);

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

  const allMeanings = buildStudyReviewAllMeanings(item);
  const { primaryReadingHiragana, primaryReadingKatakana, secondaryReadingValue } = deriveStudyReviewReadings(item);
  const hasRadicals = hasRenderableRelatedItems(item.radicals as RelatedReference[] | undefined);
  const hasVisuallySimilar = hasRenderableRelatedItems(item.visuallySimilar as RelatedReference[] | undefined);
  const hasUsedInVocabulary = hasRenderableRelatedItems(item.usedInVocabulary as RelatedReference[] | undefined);
  const hasComponentKanji = hasRenderableRelatedItems(item.componentKanji as RelatedReference[] | undefined);
  const usedKanjiItems = collectUsedKanjiItems(item);
  const jlptGradeLabel = deriveJlptGradeLabel(item);

  const modalFrameStyle = frameSize
    ? { width: `${frameSize.width}px`, height: `${frameSize.height}px` }
    : { width: "calc(100vw - 25px)", height: "calc(100dvh - 25px)" };

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center bg-[rgba(6,12,26,0.56)] p-1 backdrop-blur-[1px] sm:p-3">
      <div style={modalFrameStyle} className="mx-auto flex max-h-[calc(100dvh-8px)] w-full max-w-[calc(100vw-8px)] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_20px_65px_rgba(0,0,0,0.42)]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-line bg-surface-muted px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center justify-start">
            {canStepBack ? (
              <button
                type="button"
                onClick={stepBackOrClose}
                className="mr-2 min-h-9 min-w-20 cursor-pointer whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold text-foreground hover:bg-surface-muted sm:px-4 sm:py-2 sm:text-sm sm:uppercase sm:tracking-widest"
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={closeModal}
              className="min-h-9 min-w-20 cursor-pointer whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold text-foreground hover:bg-surface-muted sm:px-4 sm:py-2 sm:text-sm sm:uppercase sm:tracking-widest"
            >
              Close
            </button>
          </div>
          <p className="truncate text-center text-sm font-black uppercase tracking-widest text-foreground/80 sm:text-base">
            {customTitle ?? viewerTitle(item)}
          </p>
          {showNavigationButtons ? (
            <div className="inline-flex min-w-0 items-center justify-end gap-1">
              {hasPreviousItem ? (
                <button
                  type="button"
                  onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
                  className="min-h-9 min-w-20 cursor-pointer whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold text-foreground hover:bg-surface-muted sm:px-4 sm:py-2 sm:text-sm sm:uppercase sm:tracking-widest"
                >
                  Prev
                </button>
              ) : null}
              {hasNextItem ? (
                <button
                  type="button"
                  onClick={() => setIndex((prev) => Math.min(items.length - 1, prev + 1))}
                  className="min-h-9 min-w-20 cursor-pointer whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold text-foreground hover:bg-surface-muted sm:px-4 sm:py-2 sm:text-sm sm:uppercase sm:tracking-widest"
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
          <StudyReviewModalSection
            accountId={accountId}
            studyMode={false}
            showEnglish={showEnglish}
            canToggleEnglish
            viewerMode={STUDY_VIEWER_MODES.detail}
            selectedItem={item}
            isPracticeItem={false}
            selectedOutcome={undefined}
            isSubmittingSelected={false}
            submitFeedback={null}
            requiresReveal={false}
            isAnswerRevealed
            isOutcomeFinal
            detailsRevealed
            useStudyFlashLayout={false}
            flashCycleDone={false}
            flashRevealed={false}
            currentFlashKey={`view-glyph:${item.subjectId}`}
            allMeanings={allMeanings}
            primaryReadingHiragana={primaryReadingHiragana}
            primaryReadingKatakana={primaryReadingKatakana}
            secondaryReadingValue={secondaryReadingValue}
            hasRadicals={hasRadicals}
            hasVisuallySimilar={hasVisuallySimilar}
            hasUsedInVocabulary={hasUsedInVocabulary}
            hasComponentKanji={hasComponentKanji}
            usedKanjiItems={usedKanjiItems}
            usedInVocabularyCollapsed={usedInVocabularyCollapsed}
            usedKanjiCollapsed={usedKanjiCollapsed}
            usedInWordsCollapsed={usedInWordsCollapsed}
            jlptGradeLabel={jlptGradeLabel}
            wrong={0}
            skipped={0}
            correct={0}
            glyphViewerItems={items}
            glyphViewerIndex={index}
            onReveal={() => {}}
            onSubmit={() => {}}
            onSkipCurrent={() => {}}
            onStartLesson={() => {}}
            onAdvanceFlashOrNext={() => {}}
            onFlashTouchStart={() => {}}
            onFlashTouchEnd={() => {}}
            onSetFlashRevealKey={() => {}}
            onToggleUsedInVocabularyCollapsed={() => setUsedInVocabularyCollapsed((value) => !value)}
            onToggleUsedKanjiCollapsed={() => setUsedKanjiCollapsed((value) => !value)}
            onToggleUsedInWordsCollapsed={() => setUsedInWordsCollapsed((value) => !value)}
            onToggleShowEnglish={() => setShowEnglish((prev) => !prev)}
            onOpenRelatedSubject={openBySubject}
          />
        </div>
      </div>
    </div>
  );
}
