import { curriculumChangelogFor } from "@/lib/ladder/curriculumChangelog";
import { curriculumStampFor } from "@/lib/ladder/curriculumStamp";
import type { LadderStreamValue } from "@/lib/ladder/ladderStreams";

import SubjectPill from "./SubjectPill";
import { CURRICULUM_CHANGES_COPY as copy } from "./CurriculumChanges.constants";

/**
 * What each rebuild of this ladder actually moved.
 *
 * The stamp on every chart says which curriculum it was drawn from, and until
 * now that was the end of the trail: a member whose level changed under them
 * could read `UN 2.0.0` and had no way to find out what 2.0.0 did. John:
 * "it would be nice to be able to compare our versions so that you can say
 * what is different from our 1.1 and our 1.5."
 *
 * Drawn from `curriculum.changelog` in the ladder file, which is the same
 * record the published papers are written from - deliberately, because a
 * second list of what changed is a second list that can disagree with the
 * first.
 *
 * Per stream, because the two ladders move independently: the rebuild that
 * moved 95 kanji on UN moved 12 on UG.
 */
export default function CurriculumChanges({ stream }: { stream: LadderStreamValue }) {
  const entries = curriculumChangelogFor(stream);

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="text-lg font-black text-foreground">{copy.heading}</h2>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground/70">{copy.blurb}</p>

      {entries.length === 0 ? (
        <p className="mt-3 text-sm font-semibold text-foreground/60">{copy.nothingYet}</p>
      ) : (
        <ol className="mt-4 space-y-4">
          {entries.map((entry) => (
            <li key={entry.version} className="rounded-xl border border-line bg-surface-muted/40 p-3">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span translate="no" className="text-sm font-black text-foreground">
                  {copy.version(curriculumStampFor(stream, entry.version))}
                </span>
                <span className="text-[11px] font-black uppercase tracking-[0.08em] text-accent">
                  {copy.bump[entry.bump] ?? entry.bump}
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-foreground/60">{entry.date}</span>
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground/75">{entry.summary}</p>

              <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-semibold text-foreground/60">
                <span className="flex gap-1">
                  <dt>{copy.radicals}</dt>
                  <dd className="tabular-nums text-foreground/80">{copy.counts(entry.radicals)}</dd>
                </span>
                <span className="flex gap-1">
                  <dt>{copy.vocabulary}</dt>
                  <dd className="tabular-nums text-foreground/80">{copy.counts(entry.vocabulary)}</dd>
                </span>
              </dl>

              {entry.kanji.moved.length > 0 ? (
                <div className="mt-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
                    {copy.kanjiMoved} · {entry.kanji.moved.length.toLocaleString("en-US")}
                  </p>
                  {/* A row of characters standing in a section of something
                      else, which is what SubjectPill is for - not a browsing
                      grid. */}
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {entry.kanji.moved.map((character) => (
                      <li key={character}>
                        <SubjectPill glyph={character} href={`/kanji/${encodeURIComponent(character)}`} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
          <li className="text-[11px] font-semibold leading-relaxed text-foreground/60">{copy.noLevels}</li>
        </ol>
      )}
    </section>
  );
}
