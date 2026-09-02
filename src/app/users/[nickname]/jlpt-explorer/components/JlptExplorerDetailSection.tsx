import { SUBJECT_TYPE_DISPLAY, SUBJECT_TYPES } from "@/lib/domainConstants";

import type { JlptItem, UserKanjiItem } from "../../explorerTypes";
import { jlptLevelPillClass } from "../../level-explorer/lib/levelExplorerDisplay";
import { formatDate, jlptHeading, readingLabel } from "../lib/jlptDisplay";
import { jlptStatusClass, parseWordExamples } from "../lib/jlptExplorerContentHelpers";
import { ExplorerPill, NeutralPill } from "../../shared/ExplorerPill";
import JlptExplorerStatsPanel from "./JlptExplorerStatsPanel";
import type { KanjiStats } from "./JlptExplorerContent.types";
import GlyphMetadataBadges from "../../shared/GlyphMetadataBadges";
import GlyphReferenceTile from "../../shared/GlyphReferenceTile";
import FieldLabel from "../../../../shared/FieldLabel";
import ReadingsLine from "@/app/shared/ReadingsLine";
import { READING_KIND_DISPLAY, READING_KINDS } from "@/lib/domainConstants";
import SurfaceCard from "../../../../shared/SurfaceCard";

type Props = {
  selectedItem: JlptItem;
  showEnglish: boolean;
  studyMode: boolean;
  userKanjiByChar: Map<string, UserKanjiItem>;
  statsOpen: boolean;
  kanjiStats: KanjiStats | null;
  kanjiStatsLoading: boolean;
  kanjiStatsError: string | null;
  onToggleStatsOpen: () => void;
};

export default function JlptExplorerDetailSection({
  selectedItem,
  showEnglish,
  studyMode,
  userKanjiByChar,
  statsOpen,
  kanjiStats,
  kanjiStatsLoading,
  kanjiStatsError,
  onToggleStatsOpen,
}: Props) {
  const selectedUserMatch = userKanjiByChar.get(selectedItem.kanji);
  const selectedDbReadings = [
    ...selectedItem.kunReadings,
    ...selectedItem.onReadings,
    ...selectedItem.nanoriReadings,
  ];
  const primary = selectedUserMatch
    ? (selectedUserMatch.primaryReadings ?? [])[0] ?? (selectedUserMatch.readings ?? [])[0] ?? null
    : selectedDbReadings[0] ?? null;
  const secondary = selectedUserMatch
    ? (selectedUserMatch.readings ?? []).filter((reading) => reading !== primary)
    : selectedDbReadings.filter((reading) => reading !== primary);
  /*
   * The catalogue's own meanings, which hold every meaning the old static
   * jlptReadings.json carried and more - checked across all 2,211 entries.
   */
  const jsonMeanings = selectedItem.meanings.filter((meaning) => meaning.trim().length > 0);
  const wordExamples = parseWordExamples(selectedItem.wordExamples);

  return (
    <section className="col-span-1 rounded-2xl border-2 border-accent/35 bg-surface p-5 sm:col-span-2 lg:col-span-4">
      <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-x-3">
        <div className="inline-flex sm:self-start">
          <div className="group/explorer-card relative inline-flex min-h-[5.75rem] min-w-[5.75rem] flex-col items-center justify-center rounded-2xl border border-kanji/50 bg-kanji/10 px-4 py-3">
            <GlyphMetadataBadges
              level={selectedUserMatch?.wkLevel}
              successRate={selectedUserMatch?.successRate}
            />
            <p className="text-center text-4xl font-black leading-none text-kanji">{selectedItem.kanji}</p>
            {!studyMode && primary ? (
              <p className="mt-1 w-full text-center text-sm font-semibold text-foreground/85">{readingLabel(primary, showEnglish)}</p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap justify-start gap-1 sm:justify-end">
            <ExplorerPill className={jlptStatusClass(selectedUserMatch?.status)}>
              {selectedUserMatch?.status ?? "untracked"}
            </ExplorerPill>
            <ExplorerPill className={jlptLevelPillClass()}>{`N${selectedItem.nLevel}`}</ExplorerPill>
            {selectedUserMatch ? (
              <NeutralPill>SRS {selectedUserMatch.srsStage ?? 0}</NeutralPill>
            ) : null}
          </div>
          <div className="mt-2 min-w-0">
            <p className="text-4xl font-black leading-tight text-foreground">
              {studyMode
                ? SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.kanji].singular
                : jlptHeading(
                    selectedItem.primaryMeaning,
                    selectedUserMatch?.meanings,
                    selectedItem.meanings,
                    selectedItem.kanji,
                  )}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <JlptExplorerStatsPanel
          open={statsOpen}
          onToggle={onToggleStatsOpen}
          loading={kanjiStatsLoading}
          error={kanjiStatsError}
          kanjiStats={kanjiStats}
        />
        {!studyMode ? (
          <>
            <SurfaceCard className="text-sm">
              <FieldLabel>Primary reading</FieldLabel>
              <p className="mt-1 font-semibold text-foreground/90">{readingLabel(primary, showEnglish)}</p>
            </SurfaceCard>
            <SurfaceCard className="text-sm">
              <FieldLabel>Secondary readings</FieldLabel>
              <p className="mt-1 font-semibold text-foreground/90">
                {secondary.length > 0
                  ? secondary.map((reading) => readingLabel(reading, showEnglish)).join(", ")
                  : "-"}
              </p>
            </SurfaceCard>
            <SurfaceCard className="text-sm">
              {selectedItem.kunReadings.length > 0 ? (
                <ReadingsLine kind={READING_KINDS.kun} readings={selectedItem.kunReadings} showRomaji={showEnglish} />
              ) : (
                <>
                  <FieldLabel>{READING_KIND_DISPLAY[READING_KINDS.kun].label}</FieldLabel>
                  <p className="mt-1 font-semibold text-foreground/90">-</p>
                </>
              )}
            </SurfaceCard>
            <SurfaceCard className="text-sm">
              {selectedItem.onReadings.length > 0 ? (
                <ReadingsLine kind={READING_KINDS.on} readings={selectedItem.onReadings} showRomaji={showEnglish} />
              ) : (
                <>
                  <FieldLabel>{READING_KIND_DISPLAY[READING_KINDS.on].label}</FieldLabel>
                  <p className="mt-1 font-semibold text-foreground/90">-</p>
                </>
              )}
            </SurfaceCard>
            <SurfaceCard className="text-sm">
              <FieldLabel>Stroke count</FieldLabel>
              <p className="mt-1 font-semibold text-foreground/90">{selectedItem.strokeCount ?? "-"}</p>
            </SurfaceCard>
            <SurfaceCard className="text-sm">
              <FieldLabel>Main meaning</FieldLabel>
              <p className="mt-1 font-semibold text-foreground/90">{selectedItem.primaryMeaning ?? "-"}</p>
            </SurfaceCard>
          </>
        ) : null}
        <SurfaceCard className="text-sm">
          <FieldLabel>Frequency rank</FieldLabel>
          <p className="mt-1 font-semibold text-foreground/90">{selectedItem.frequencyRank ?? "-"}</p>
        </SurfaceCard>
        <SurfaceCard className="text-sm">
          <FieldLabel>School grade</FieldLabel>
          <p className="mt-1 font-semibold text-foreground/90">{selectedItem.schoolGrade ?? "-"}</p>
        </SurfaceCard>
        <SurfaceCard className="text-sm">
          <FieldLabel>Heisig keyword</FieldLabel>
          <p className="mt-1 font-semibold text-foreground/90">{selectedItem.heisigKeyword ?? "-"}</p>
        </SurfaceCard>
        <SurfaceCard className="text-sm">
          <FieldLabel>Unicode</FieldLabel>
          <p className="mt-1 font-semibold text-foreground/90">{selectedItem.unicodeHex ?? "-"}</p>
        </SurfaceCard>
        <SurfaceCard className="text-sm">
          <FieldLabel>Source JLPT</FieldLabel>
          <p className="mt-1 font-semibold text-foreground/90">
            {selectedItem.sourceJlpt ? `N${selectedItem.sourceJlpt}` : "-"}
          </p>
        </SurfaceCard>
      </div>

      {selectedUserMatch ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SurfaceCard className="text-sm">
            <FieldLabel>Started</FieldLabel>
            <p className="mt-1 font-semibold text-foreground/90">{formatDate(selectedUserMatch.startedAt)}</p>
          </SurfaceCard>
          <SurfaceCard className="text-sm">
            <FieldLabel>Next review</FieldLabel>
            <p className="mt-1 font-semibold text-foreground/90">{formatDate(selectedUserMatch.availableAt)}</p>
          </SurfaceCard>
          <SurfaceCard className="text-sm">
            <FieldLabel>Passed</FieldLabel>
            <p className="mt-1 font-semibold text-foreground/90">{formatDate(selectedUserMatch.passedAt)}</p>
          </SurfaceCard>
        </div>
      ) : null}

      {!studyMode ? (
        <div className="mt-4">
          <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
            <FieldLabel>Meaning explanation</FieldLabel>
            {jsonMeanings.length > 0 ? (
              <ul className="mt-2 space-y-1 text-foreground/90">
                {jsonMeanings.map((meaning) => (
                  <li key={meaning}>- {meaning}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-foreground/90">-</p>
            )}
          </article>
        </div>
      ) : null}

      {!studyMode && selectedItem.notes.length > 0 ? (
        <div className="mt-4">
          <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
            <FieldLabel>Dictionary notes</FieldLabel>
            <ul className="mt-2 space-y-1 text-foreground/90">
              {selectedItem.notes.map((note) => (
                <li key={note}>- {note}</li>
              ))}
            </ul>
          </article>
        </div>
      ) : null}

      {!studyMode && wordExamples.length > 0 ? (
        <div className="mt-4">
          <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
            <FieldLabel>Used in words</FieldLabel>
            <ul className="mt-2 space-y-2 text-foreground/90">
              {wordExamples.map((example, index) => (
                <li
                  key={`${selectedItem.kanji}-${example.written}-${example.pronounced}-${index}`}
                  className="rounded-lg border border-line bg-surface px-3 py-2"
                >
                  <p className="text-base font-bold text-foreground">{example.written || "-"}</p>
                  <p className="text-xs font-semibold text-foreground/70">{example.pronounced || "-"}</p>
                  <p className="mt-1 text-sm text-foreground/85">{example.gloss || "-"}</p>
                  {example.kanjiItems?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {example.kanjiItems.map((item) => (
                        <GlyphReferenceTile
                          key={`${example.written}-${item.subjectId}`}
                          glyph={item.label}
                          subtitle={item.reading ?? item.meaning}
                          subjectType={SUBJECT_TYPES.kanji}
                          wkLevel={item.wkLevel}
                          successRate={userKanjiByChar.get(item.label)?.successRate}
                        />
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </article>
        </div>
      ) : null}
    </section>
  );
}
