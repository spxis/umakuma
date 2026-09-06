"use client";

import { useMemo, useState } from "react";

import PillWordsToggle from "@/app/shared/PillWordsToggle";
import SubjectCards from "@/app/shared/SubjectCards";
import SubjectRows from "@/app/shared/SubjectRows";
import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import { usePersistedEnum } from "@/lib/usePersistedEnum";
import { SUBJECT_VIEW_MODES, SUBJECT_VIEW_MODE_VALUES, type SubjectViewMode } from "@/app/shared/subjectListView";
import { SUBJECT_TYPE_DISPLAY, type SubjectType } from "@/lib/domainConstants";
import { ladderLevelSections, ladderRowAsSubject } from "@/lib/ladder/ladderLevelPage";
import type { LadderLevelGroup, LadderLevelSummary } from "@/lib/ladder/ladderQuery";

import UmakumaLevelPicker from "./UmakumaLevelPicker";
import UmakumaLadderSearch from "./UmakumaLadderSearch";
import UmakumaPapersNote from "./UmakumaPapersNote";
import CurriculumStamp from "@/app/shared/CurriculumStamp";
import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";
import { UK_EXPLORER_COPY as copy, UK_VIEW_MODE_STORAGE_KEY } from "./UmakumaExplorer.constants";

const CHIP = "inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-bold transition";
const ACTIVE = "border-accent bg-accent text-white";
const IDLE = "border-line bg-surface text-foreground/70 hover:bg-surface-muted";

/**
 * One level of the curriculum, drawn the way every other list of subjects is.
 *
 * It used to draw its own tiles, which made it the one explorer whose kanji
 * looked like nowhere else on the site. `SubjectCards` and `SubjectRows` take
 * the level's rows now, so it gets the same card, the same row, and the
 * density toggle every other list surface offers.
 *
 * What it keeps is what it was already better at: the live search across all
 * hundred levels, and the radical/kanji/word filter.
 */
export default function UmakumaLevelBoard({
  nickname,
  group,
  levels,
}: {
  nickname: string;
  group: LadderLevelGroup;
  levels: LadderLevelSummary[];
}) {
  const [kind, setKind] = useState<SubjectType | null>(null);
  const [viewMode, setViewMode] = usePersistedEnum<SubjectViewMode>(UK_VIEW_MODE_STORAGE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.grid);

  const sections = useMemo(
    () => ladderLevelSections(group).filter((section) => kind === null || section.type === kind),
    [group, kind],
  );

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-black text-foreground">{copy.browseHeading}</h2>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground/70">{copy.browseBlurb}</p>

        <UmakumaLadderSearch className="mt-3" />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setKind(null)} className={`${CHIP} ${kind === null ? ACTIVE : IDLE}`}>
            {copy.all}
          </button>
          {ladderLevelSections(group).map((section) => (
            <button
              key={section.type}
              type="button"
              onClick={() => setKind(section.type as SubjectType)}
              className={`${CHIP} ${kind === section.type ? ACTIVE : IDLE}`}
            >
              {SUBJECT_TYPE_DISPLAY[section.type as SubjectType].plural}
              <span className="ml-1.5 tabular-nums opacity-70">{section.rows.length}</span>
            </button>
          ))}

          <span className="ml-auto flex items-center gap-2">
            <PillWordsToggle />
            <SubjectViewModeToggle
              value={viewMode}
              onChange={setViewMode}
            />
          </span>
        </div>

        <div className="mt-3">
          <UmakumaLevelPicker nickname={nickname} levels={levels} current={group.level} />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-black text-foreground">
            {copy.levelHeading(group.level)}
            {group.completesJlpt !== null ? (
              <span className="ml-2 rounded-full border border-teal-300 bg-teal-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-teal-800">
                {`N${group.completesJlpt}`}
              </span>
            ) : null}
          </h2>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] tabular-nums text-foreground/60">
            {copy.levelTally(group.radicals.length, group.kanji.length, group.vocabulary.length)}
            {" · "}
            {copy.known(group.kanjiThrough)}
          </p>
        </div>

        <div className="space-y-4">
          {sections.map((section) => {
            const rows = section.rows.map(ladderRowAsSubject);
            return (
              <div key={section.type}>
                <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
                  {SUBJECT_TYPE_DISPLAY[section.type as SubjectType].plural}
                  <span className="ml-1.5 tabular-nums opacity-70">{rows.length}</span>
                </p>
                {rows.length === 0 ? (
                  <p className="text-sm font-semibold text-foreground/60">{copy.emptySection}</p>
                ) : viewMode === SUBJECT_VIEW_MODES.list ? (
                  <SubjectRows rows={rows} onSelect={() => {}} />
                ) : (
                  <SubjectCards rows={rows} onSelect={() => {}} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <UmakumaPapersNote />

      {/* Provenance, last and faint: which arrangement of the ladder this is. */}
      <CurriculumStamp stream={LADDER_STREAMS.un} className="px-1" />
    </div>
  );
}
