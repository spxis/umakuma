"use client";

import SubjectPill from "@/app/shared/SubjectPill";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { subjectHref } from "@/lib/globalSearch";
import type { LadderRow } from "@/lib/ladder/ladderCrosswalk";
import type { LadderLevelGroup } from "@/lib/ladder/ladderQuery";

import { UK_EXPLORER_COPY as copy } from "./UmakumaExplorer.constants";

/* A radical's page is keyed by WaniKani's slug, which the ladder's own
   radicals do not have — RADKFILE's 253 are ours, not theirs. Those lead
   nowhere and say so by having no href, rather than to a 404. */
function hrefFor(row: LadderRow): string | null {
  if (row.kind === SUBJECT_TYPES.radical && row.wkSubjectId === null) return null;
  return subjectHref({ subjectType: row.kind, characters: row.characters, slug: null });
}

/* The WaniKani level rides along, now that a level says whose it is. A pill
   reading WK3 inside a card headed UmaKuma Level 1 is a fact about two
   ladders rather than a contradiction — which is the whole reason for the
   prefix. Items WaniKani never teaches carry no badge at all. */
function Group({ label, rows }: { label: string; rows: LadderRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">
        {label} <span className="tabular-nums opacity-70">{rows.length}</span>
      </p>
      <ol className="flex flex-wrap gap-1.5">
        {rows.map((row) => (
          <li key={row.key}>
            <SubjectPill
              glyph={row.characters}
              subjectType={row.kind}
              meaning={row.primaryMeaning}
              href={hrefFor(row)}
              level={row.wkLevel}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * One UmaKuma level, drawn in the order it is met.
 *
 * Radicals, then the kanji they build, then the words those kanji make. That
 * order is the curriculum's one real promise — a member never meets a
 * character before its parts — and drawing it any other way would hide the
 * thing the ladder exists to guarantee.
 *
 * The running total on the right is deliberately "known by here" rather than
 * "added here": a learner wants to know where they will be standing, not how
 * heavy one step is.
 */
export default function UmakumaLevelCard({ group }: { group: LadderLevelGroup }) {
  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="flex items-baseline gap-2">
          <span className="text-lg font-black tabular-nums text-foreground">
            {copy.levelLabel} {group.level}
          </span>
          {group.nLevel !== null ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
              N{group.nLevel}
            </span>
          ) : null}
        </p>
        <p className="text-[11px] font-semibold tabular-nums text-foreground/60">
          {copy.counts(group.radicals.length, group.kanji.length, group.vocabulary.length)} ·{" "}
          {group.kanjiThrough.toLocaleString("en-CA")} {copy.known}
        </p>
      </div>

      <div className="space-y-3">
        <Group label={copy.radicals} rows={group.radicals} />
        {group.kanji.length > 0 ? (
          <Group label={copy.kanji} rows={group.kanji} />
        ) : (
          <p className="text-[11px] font-semibold text-foreground/60">{copy.noKanji}</p>
        )}
        <Group label={copy.vocabulary} rows={group.vocabulary} />
      </div>
    </li>
  );
}
