"use client";

import { Fragment, type ReactNode } from "react";

import GlyphMetadataBadges from "../../shared/GlyphMetadataBadges";
import UnifiedExplorerCard from "../../shared/UnifiedExplorerCard";
import { ExplorerPill, NeutralPill } from "../../shared/ExplorerPill";
import { jlptLevelPillClass } from "../../level-explorer/lib/levelExplorerDisplay";
import { readingLabel, readingLabelFromList } from "../lib/jlptDisplay";
import { jlptStatusClass } from "../lib/jlptExplorerContentHelpers";
import { toJlptView } from "../lib/jlptRowAdapter";
import type { SubjectSelection } from "@/app/shared/useSubjectSelection";
import type { JlptItem, UserKanjiItem } from "../../explorerTypes";


/**
 * The JLPT catalogue as browsing cards.
 *
 * The grid half of the pair. It moved out of the page when the list half moved
 * onto the shared row component: the two branches had grown to 130 lines in
 * one file and pushed it past the size gate, and they no longer shared
 * anything but the items they were handed.
 */
export default function JlptExplorerCards({
  visibleItems,
  userKanjiByChar,
  studyMode,
  showEnglish,
  selection,
  selectedKanji,
  selectedItem,
  visibleDetailInsertIndex,
  onSetSelectedKanji,
  renderDetail,
}: {
  visibleItems: JlptItem[];
  userKanjiByChar: Map<string, UserKanjiItem>;
  studyMode: boolean;
  showEnglish: boolean;
  selection: SubjectSelection;
  selectedKanji: string | null;
  selectedItem: JlptItem | null;
  visibleDetailInsertIndex: number;
  onSetSelectedKanji: (update: (prev: string | null) => string | null) => void;
  renderDetail: () => ReactNode;
}) {
  return (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visibleItems.map((item, index) => {
            /* Both densities ask the same adapter, so they cannot disagree
             * about which reading is the primary one. */
            const { userMatch, heading, primaryReading, fallbackReadings } = toJlptView(
              item,
              userKanjiByChar,
                        );
            return (
              <Fragment key={`${item.nLevel}-${item.kanji}`}>
                <UnifiedExplorerCard
                  density="grid"
                  chosen={selection.choosing && selection.chosen.has(item.kanji)}
                  onClick={(meta) => {
                    /*
                     * Choosing borrows the card's click, the way the grade
                     * grid does - the same click, a different verb - so the
                     * grid needs no second target and no permanent checkbox.
                     */
                    if (selection.choosing) {
                      const order = visibleItems.map((entry) => entry.kanji);
                      if (meta?.shiftKey) selection.extendTo(item.kanji, order);
                      else selection.toggle(item.kanji);
                      return;
                    }
                    onSetSelectedKanji((prev) => (prev === item.kanji ? null : item.kanji));
                  }}
                  className={`rounded-2xl border p-3 text-left transition hover:brightness-95 ${
                    userMatch ? "border-kanji/50 bg-surface text-foreground" : "border-line bg-surface text-foreground"
                  } ${selectedKanji === item.kanji ? "ring-2 ring-accent" : ""}`}
                  indexLabel={`#${index + 1}`}
                  topRight={
                    <>
                      {typeof item.schoolGrade === "number" ? (
                        <NeutralPill>G{item.schoolGrade}</NeutralPill>
                      ) : null}
                      <ExplorerPill className={jlptLevelPillClass()}>{`N${item.nLevel}`}</ExplorerPill>
                    </>
                  }
                  glyphClassName={`border-kanji/50 bg-kanji/10 ${userMatch ? "text-kanji" : "text-foreground"}`}
                  glyphText={item.kanji}
                  glyphTextClassName="text-6xl"
                  glyphOverlay={
                    <GlyphMetadataBadges
                      level={userMatch?.wkLevel}
                      successRate={userMatch?.successRate}
                    />
                  }
                  glyphSubtitle={
                    studyMode
                      ? <span className="text-foreground/60">...</span>
                      : showEnglish
                        ? heading
                        : primaryReading
                          ? readingLabel(primaryReading, showEnglish)
                          : readingLabelFromList(fallbackReadings, showEnglish)
                  }
                  statusChip={
                    <ExplorerPill className={`px-3 py-1 text-xs font-bold ${jlptStatusClass(userMatch?.status)}`}>
                      {userMatch?.status ?? "untracked"}
                    </ExplorerPill>
                  }
                  rightChip={
                    <NeutralPill className="px-2 py-1 text-xs font-bold">
                      {userMatch ? `SRS ${userMatch.srsStage ?? 0}` : "-"}
                    </NeutralPill>
                  }
                />
                {selectedItem && index === visibleDetailInsertIndex ? renderDetail() : null}
              </Fragment>
            );
          })}
        </div>
  );
}
