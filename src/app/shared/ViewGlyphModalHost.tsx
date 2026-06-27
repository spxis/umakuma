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

export default function ViewGlyphModalHost() {
  const [items, setItems] = useState<StudyQueueItem[]>([]);
  const [navigationState, setNavigationState] = useState<{ trail: number[]; position: number }>({
    trail: [],
    position: 0,
  });
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

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<ViewGlyphViewerPayload>).detail;
      if (!detail?.items || detail.items.length === 0) {
        return;
      }

      setItems(detail.items);
      const startIndex = Math.max(0, Math.min(detail.startIndex ?? 0, detail.items.length - 1));
      setNavigationState({ trail: [startIndex], position: 0 });
      setAccountId(detail.accountId ?? "");
      setCustomTitle(detail.title);
      setSelector(Array.isArray(detail.selector) ? detail.selector : []);
      setFrameSize(resolveViewGlyphFrameSize(resolveParentFrameRect()));
    };

    window.addEventListener(VIEW_GLYPH_EVENT, onOpen);
    return () => {
      window.removeEventListener(VIEW_GLYPH_EVENT, onOpen);
    };
  }, []);

  const currentIndex = navigationState.trail[navigationState.position] ?? 0;
  const item = items[currentIndex] ?? null;
  const hasPreviousItem = navigationState.position > 0 || currentIndex > 0;
  const hasNextItem = navigationState.position < navigationState.trail.length - 1 || currentIndex < items.length - 1;

  const closeModal = useCallback(() => {
    setItems([]);
    setNavigationState({ trail: [], position: 0 });
    setAccountId("");
    setCustomTitle(undefined);
    setSelector([]);
    setFrameSize(null);
  }, []);

  const openIndexInPlace = useCallback(
    (nextIndex: number) => {
      setNavigationState((prev) => {
        const current = prev.trail[prev.position];
        if (current === nextIndex) {
          return prev;
        }

        const baseTrail = prev.trail.slice(0, prev.position + 1);
        return {
          trail: [...baseTrail, nextIndex],
          position: baseTrail.length,
        };
      });
    },
    [],
  );

  const goPrevious = useCallback(() => {
    setNavigationState((prev) => {
      if (prev.position > 0) {
        return { ...prev, position: prev.position - 1 };
      }

      const current = prev.trail[prev.position] ?? currentIndex;
      if (current <= 0) {
        return prev;
      }

      const baseTrail = prev.trail.slice(0, prev.position + 1);
      return {
        trail: [...baseTrail, current - 1],
        position: baseTrail.length,
      };
    });
  }, [currentIndex]);

  const goNext = useCallback(() => {
    setNavigationState((prev) => {
      if (prev.position < prev.trail.length - 1) {
        return { ...prev, position: prev.position + 1 };
      }

      const current = prev.trail[prev.position] ?? currentIndex;
      if (current >= items.length - 1) {
        return prev;
      }

      const baseTrail = prev.trail.slice(0, prev.position + 1);
      return {
        trail: [...baseTrail, current + 1],
        position: baseTrail.length,
      };
    });
  }, [currentIndex, items.length]);

  const openBySubject = useCallback(
    async (subjectId: number, fallbackType: SubjectType) => {
      if (!item || !accountId) {
        return;
      }

      const existingIndex = items.findIndex((entry) => entry.subjectId === subjectId);
      if (existingIndex >= 0) {
        openIndexInPlace(existingIndex);
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
      openIndexInPlace(nextIndex);
    },
    [accountId, item, items, openIndexInPlace],
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
        goPrevious();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
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
  }, [closeModal, goNext, goPrevious, item]);

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
          <div className="inline-flex min-w-0 items-center justify-end gap-1">
            <button
              type="button"
              onClick={goPrevious}
              disabled={!hasPreviousItem}
              className="min-h-9 min-w-20 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold text-foreground sm:px-4 sm:py-2 sm:text-sm sm:uppercase sm:tracking-widest disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-surface enabled:cursor-pointer enabled:hover:bg-surface-muted"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!hasNextItem}
              className="min-h-9 min-w-20 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold text-foreground sm:px-4 sm:py-2 sm:text-sm sm:uppercase sm:tracking-widest disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-surface enabled:cursor-pointer enabled:hover:bg-surface-muted"
            >
              Next
            </button>
          </div>
        </div>

        {selector.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2 sm:px-4">
            {selector.map((entry, entryIndex) => {
              const selected = entry.itemIndex === currentIndex;
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
                    openIndexInPlace(entry.itemIndex);
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
            glyphViewerIndex={currentIndex}
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
