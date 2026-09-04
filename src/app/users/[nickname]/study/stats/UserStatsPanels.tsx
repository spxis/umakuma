"use client";

import { useState } from "react";

import {
  ItemSpreadTabPanel,
  LevelProgressTabPanel,
  MainTabPanel,
} from "../../UserDashboardTabPanels";
import type { loadLevelProgress } from "../../lib/levelProgress";

type Progress = Awaited<ReturnType<typeof loadLevelProgress>>;

/**
 * The three stats panels, lifted out of the shared dashboard component when
 * Stats became a route of its own.
 *
 * The selected level for the progress panel is the only state here, and it is
 * genuinely local - it says which level you are reading about, not which page
 * you are on, so it does not belong in the address.
 */
export default function UserStatsPanels({
  accountId,
  progress,
}: {
  accountId: string;
  progress: Progress;
}) {
  const { account, itemSpread, itemSpreadDetails, levelProgressByLevel, availableProgressLevels } = progress;
  const wkLevel = account.wkLevel ?? 0;
  /* These arrived as twenty separate props while this lived on the shared
     dashboard component; they are all one loader's result now. */
  const {
    levelKanjiLearned,
    levelKanjiTotal,
    levelKanjiLocked,
    estimatedHoursRemaining,
    apprenticeCount,
    guruCount,
    masterCount,
    enlightenedCount,
    burnedCount,
    radicalCount,
    vocabularyCount,
  } = account;
  const totalLearnedKanji = progress.totalLearnedKanji;
  const totalKanjiCount = itemSpread.totals.kanji;
  const [selectedProgressLevel, setSelectedProgressLevel] = useState<number | null>(null);
  const safeProgressLevels = availableProgressLevels.length > 0 ? availableProgressLevels : [wkLevel];
  const effectiveSelectedProgressLevel = selectedProgressLevel ?? wkLevel;
  const selectedLevelProgress =
    levelProgressByLevel[effectiveSelectedProgressLevel] ?? progress.currentLevelProgress;

  return (
    <section className="space-y-4" role="tabpanel">

        <section className="rounded-2xl border border-line bg-surface/90 p-3 sm:p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/65">Snapshot</p>
          <MainTabPanel
            wkLevel={wkLevel}
            levelKanjiLearned={levelKanjiLearned}
            levelKanjiTotal={levelKanjiTotal}
            levelKanjiLocked={levelKanjiLocked}
            totalLearnedKanji={totalLearnedKanji}
            estimatedHoursRemaining={estimatedHoursRemaining}
            apprenticeCount={apprenticeCount}
            guruCount={guruCount}
            masterCount={masterCount}
            enlightenedCount={enlightenedCount}
            burnedCount={burnedCount}
            radicalCount={radicalCount}
            totalKanjiCount={totalKanjiCount}
            vocabularyCount={vocabularyCount}
          />
        </section>

        <section className="rounded-2xl border border-line bg-surface/90 p-3 sm:p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/65">Item spread</p>
          <ItemSpreadTabPanel itemSpread={itemSpread} itemSpreadDetails={itemSpreadDetails} />
        </section>

        <section className="rounded-2xl border border-line bg-surface/90 p-3 sm:p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/65">Level progress</p>
          <LevelProgressTabPanel
            accountId={accountId}
            currentWkLevel={wkLevel}
            wkLevel={effectiveSelectedProgressLevel}
            levelOptions={safeProgressLevels}
            levelProgressByLevel={levelProgressByLevel}
            onSelectLevel={setSelectedProgressLevel}
            levelRadicalProgress={selectedLevelProgress.radical}
            levelKanjiProgress={selectedLevelProgress.kanji}
            levelVocabularyProgress={selectedLevelProgress.vocabulary}
            remainingToLevelUp={selectedLevelProgress.remainingToLevelUp}
            passedLevelUpGate={selectedLevelProgress.passedLevelUpGate}
          />
        </section>
      </section>
  );
}
