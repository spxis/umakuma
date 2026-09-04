"use client";

import SubjectPill from "@/app/shared/SubjectPill";
import { SUBJECT_TYPES, type SubjectType } from "@/lib/domainConstants";
import { subjectHref } from "@/lib/globalSearch";
import type { LadderRow } from "@/lib/ladder/ladderCrosswalk";

import { UK_EXPLORER_COPY as copy } from "./UmakumaExplorer.constants";

/**
 * A search over the whole ladder, grouped by the level that teaches each hit.
 *
 * The level list answers "what does level 40 hold". This answers the other
 * question a member has — "when do I learn 語" — and it has to answer it with
 * a level number, not just the character, or it has told them nothing they
 * could not see on the kanji's own page.
 */
export default function UmakumaSearchResults({ hits, kind }: { hits: { rows: LadderRow[]; total: number } | null; kind: SubjectType | null }) {
  if (hits === null) return <p className="text-sm font-semibold text-foreground/60">{copy.loading}</p>;

  const rows = kind ? hits.rows.filter((row) => row.kind === kind) : hits.rows;
  if (rows.length === 0) return <p className="text-sm font-semibold text-foreground/60">{copy.empty}</p>;

  const byLevel = new Map<number, LadderRow[]>();
  for (const row of rows) {
    const held = byLevel.get(row.ukLevel);
    if (held) held.push(row);
    else byLevel.set(row.ukLevel, [row]);
  }
  const levels = [...byLevel.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold tabular-nums text-foreground/60">{copy.showing(rows.length, hits.total)}</p>
      <ol className="space-y-2">
        {levels.map(([level, found]) => (
          <li key={level} className="rounded-2xl border border-line bg-surface p-3">
            <p className="mb-2 text-sm font-black text-foreground">
              {copy.levelLabel} {level}
            </p>
            <ol className="flex flex-wrap gap-1.5">
              {found.map((row) => (
                <li key={row.key}>
                  <SubjectPill
                    glyph={row.characters}
                    subjectType={row.kind}
                    meaning={row.primaryMeaning}
                    href={
                      row.kind === SUBJECT_TYPES.radical && row.wkSubjectId === null
                        ? null
                        : subjectHref({ subjectType: row.kind, characters: row.characters, slug: null })
                    }
                    level={row.wkLevel}
                  />
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}
