"use client";

import { useState } from "react";

import SourceCredit from "@/app/shared/SourceCredit";
import { SOURCE_KEYS, SOURCE_CREDIT_COPY } from "@/lib/sourceCredits";

import { SUBJECT_TYPE_DISPLAY, SUBJECT_TYPES } from "@/lib/domainConstants";
import { titleForDisplay } from "../lib/levelExplorerDisplay";
import LevelRelatedPanels from "./LevelRelatedPanels";
import LevelExplorerReviewStatsCard from "./LevelExplorerReviewStatsCard";
import {
  RelatedReferenceCards,
  VocabularyKanjiCards,
} from "./LevelExplorerReferenceCards";
import LevelExplorerDetailGlyphBox from "./LevelExplorerDetailGlyphBox";
import LevelExplorerDetailFacts from "./LevelExplorerDetailFacts";
import {
  isKanjiSubjectType,
  isRadicalSubjectType,
  isVocabularySubjectType,
} from "../lib/levelExplorerDomain";
import type { LevelExplorerDetailSectionProps as Props } from "./LevelExplorerDetailSection.types";

export default function LevelExplorerDetailSection({
  accountId,
  selectedItem,
  showEnglish,
  clampLongTitle = false,
  titleMeaningToggleOnly = false,
  canToggleEnglish = true,
  onToggleShowEnglish = null,
  hideTimeStats = false,
  studyMode,
  revealStudyReading = false,
  onTogglePeek = null,
  selectedMeaningExplanation,
  selectedReadingExplanationRaw,
  showReadingExplanation,
  hasPrimaryRelatedPanel,
  hasVisuallySimilarPanel,
  hasUsedInVocabularyPanel,
  usedInVocabularyCollapsed = false,
  onToggleUsedInVocabularyCollapsed = null,
  vocabularyKanjiLinks,
  subjectById,
  onJumpToRelatedSubject,
  onJumpToKanji,
  onResetToLessons = null,
  studyTags,
  onToggleStudyTag = null,
}: Props) {
  const lockMeaningToggleToTitle = titleMeaningToggleOnly && !studyMode;
  const showEnglishForGlyphSubtitle = lockMeaningToggleToTitle ? false : showEnglish;
  const showEnglishForReadings = lockMeaningToggleToTitle ? true : showEnglish;
  const showEnglishForKanjiCards = lockMeaningToggleToTitle ? false : showEnglish;
  const [expandedHeaderTitleKey, setExpandedHeaderTitleKey] = useState<string | null>(null);
  const isStudyHidden = studyMode && !revealStudyReading;
  const canShowReadings = !isStudyHidden;
  const primaryMeaning = selectedItem.meanings.find((entry) => entry.trim().length > 0) ?? "";
  const revealedStudyTitle =
    primaryMeaning ||
    titleForDisplay(selectedItem, true) ||
    (isKanjiSubjectType(selectedItem.subjectType)
      ? SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.kanji].singular
      : isRadicalSubjectType(selectedItem.subjectType)
        ? SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.radical].singular
        : SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.vocabulary].singular);
  const headerTitle = studyMode
    ? revealStudyReading
      ? revealedStudyTitle
      : null
    : titleForDisplay(selectedItem, showEnglish);
  const headerSubtitle = studyMode
    ? revealStudyReading
      ? titleForDisplay(selectedItem, false)
      : null
    : null;
  const headerTitleKey = `${selectedItem.subjectId}:${headerTitle ?? ""}`;
  const isHeaderTitleExpanded = expandedHeaderTitleKey === headerTitleKey;
  const shouldClampHeaderTitle = clampLongTitle && Boolean(headerTitle) && !isHeaderTitleExpanded;

  return (
    <section data-view-glyph-parent-frame="true" className="col-span-1 rounded-2xl border-2 border-accent/35 bg-surface p-5 sm:col-span-2 lg:col-span-4">
      <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-x-3">
        <div className="flex sm:self-center">
          <LevelExplorerDetailGlyphBox
            selectedItem={selectedItem}
            studyMode={studyMode}
            isStudyHidden={isStudyHidden}
            showEnglishForGlyphSubtitle={showEnglishForGlyphSubtitle}
            canToggleEnglish={canToggleEnglish}
            showEnglish={showEnglish}
            onToggleShowEnglish={onToggleShowEnglish}
            onTogglePeek={onTogglePeek}
            studyTags={studyTags}
            onToggleStudyTag={onToggleStudyTag}
          />
        </div>

        <div className="min-w-0">
          <div className="mt-2 min-w-0">
            {studyMode && isStudyHidden ? (
              <>
                <p className="text-base font-black uppercase tracking-[0.08em] text-foreground/80">Blind Review</p>
                <p className="mt-1 text-sm font-semibold text-foreground/65">Recall meaning and reading, then reveal answer.</p>
              </>
            ) : (
              <>
                {headerTitle ? (
                  clampLongTitle ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedHeaderTitleKey((value) =>
                          value === headerTitleKey ? null : headerTitleKey,
                        )
                      }
                      className="w-full cursor-pointer text-left"
                      title={isHeaderTitleExpanded ? "Collapse title" : "Expand title"}
                    >
                      <p className={`text-4xl font-black leading-tight text-foreground ${shouldClampHeaderTitle ? "line-clamp-2" : ""}`}>{headerTitle}</p>
                    </button>
                  ) : (
                    <p className="text-4xl font-black leading-tight text-foreground">{headerTitle}</p>
                  )
                ) : null}
                {headerSubtitle ? <p className="mt-1 text-2xl font-semibold text-foreground/85">{headerSubtitle}</p> : null}
              </>
            )}
          </div>
        </div>
      </div>

      <LevelExplorerDetailFacts
        selectedItem={selectedItem}
        canShowReadings={canShowReadings}
        showEnglishForReadings={showEnglishForReadings}
        hideTimeStats={hideTimeStats}
        studyMode={studyMode}
        revealStudyReading={revealStudyReading}
        selectedMeaningExplanation={selectedMeaningExplanation}
        selectedReadingExplanationRaw={selectedReadingExplanationRaw}
        showReadingExplanation={showReadingExplanation}
      />

      {!studyMode || revealStudyReading ? (
        <LevelRelatedPanels
          hasPrimary={hasPrimaryRelatedPanel}
          hasVisuallySimilar={hasVisuallySimilarPanel}
          hasUsedInVocabulary={hasUsedInVocabularyPanel}
          usedInVocabularyCollapsed={usedInVocabularyCollapsed}
          onToggleUsedInVocabularyCollapsed={onToggleUsedInVocabularyCollapsed}
          primaryTitle={
            isVocabularySubjectType(selectedItem.subjectType)
              ? SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.kanji].singular
              : SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.radical].plural
          }
          primaryContent={
            isVocabularySubjectType(selectedItem.subjectType) ? (
              <VocabularyKanjiCards
                links={vocabularyKanjiLinks}
                showEnglish={showEnglishForKanjiCards}
                selectedSubjectId={selectedItem.subjectId}
                onJumpToKanji={onJumpToKanji}
              />
            ) : (
              <RelatedReferenceCards
                items={selectedItem.radicals ?? []}
                large={isKanjiSubjectType(selectedItem.subjectType)}
                showEnglish={showEnglish}
                subjectById={subjectById}
                fallbackType={SUBJECT_TYPES.radical}
                onJumpToRelatedSubject={onJumpToRelatedSubject}
              />
            )
          }
          visuallySimilarContent={
            <RelatedReferenceCards
              items={selectedItem.visuallySimilar ?? []}
              large={isKanjiSubjectType(selectedItem.subjectType)}
              showEnglish={showEnglish}
              subjectById={subjectById}
              fallbackType={SUBJECT_TYPES.kanji}
              onJumpToRelatedSubject={onJumpToRelatedSubject}
            />
          }
          usedInVocabularyContent={
            <RelatedReferenceCards
              items={selectedItem.usedInVocabulary ?? []}
              large
              showEnglish={showEnglish}
              subjectById={subjectById}
              fallbackType={
                isRadicalSubjectType(selectedItem.subjectType)
                  ? SUBJECT_TYPES.kanji
                  : SUBJECT_TYPES.vocabulary
              }
              onJumpToRelatedSubject={onJumpToRelatedSubject}
            />
          }
        />
      ) : null}

      {!studyMode || isStudyHidden || revealStudyReading ? (
        <LevelExplorerReviewStatsCard
          accountId={accountId}
          subjectId={selectedItem.subjectId}
          currentSrsStage={selectedItem.srsStage}
          startedAt={selectedItem.startedAt}
        />
      ) : null}

      {onResetToLessons ? (
        <details className="mt-4 rounded-xl border border-line bg-surface-muted p-3">
          <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-[0.12em] text-foreground/70">
            Advanced Actions
          </summary>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-foreground/70">
              Per-item reset is not supported by the official WaniKani API.
            </p>
            <button
              type="button"
              onClick={onResetToLessons}
              disabled
              className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Unsupported
            </button>
          </div>
        </details>
      ) : null}

      {/* The meanings, readings and mnemonics above are WaniKani's, the same as
        * on the public subject pages, and are credited the same way. */}
      <SourceCredit source={SOURCE_KEYS.wanikani} label={SOURCE_CREDIT_COPY.subjectData} />
    </section>
  );
}
