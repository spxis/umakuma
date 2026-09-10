import { curriculumChangelogFor } from "@/lib/ladder/curriculumChangelog";
import type { CurriculumMove } from "@/lib/ladder/curriculumVersion";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { curriculumStampFor } from "@/lib/ladder/curriculumStamp";
import { LADDER_STREAMS, type LadderStreamValue } from "@/lib/ladder/ladderStreams";

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
                    <span className="ml-2 font-semibold normal-case tracking-normal text-foreground/60">
                      {copy.moveSplit(
                        entry.kanji.moved.filter((move) => move.to < move.from).length,
                        entry.kanji.moved.filter((move) => move.to > move.from).length,
                      )}
                    </span>
                  </p>
                  {/* A row of characters standing in a section of something
                      else, which is what SubjectPill is for - not a browsing
                      grid. `subjectType` is what gives them the kanji colour:
                      without it the pill falls through to `text-foreground`
                      and 95 kanji came out the colour of body text. */}
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {entry.kanji.moved.map((move) => (
                      <li key={move.key}>
                        <SubjectPill
                          glyph={move.key}
                          subjectType={SUBJECT_TYPES.kanji}
                          href={`/kanji/${encodeURIComponent(move.key)}`}
                          /* `to` is the level it sits on now, on this panel's
                             own ladder - so the badge a kanji carries here is
                             the same badge it carries everywhere else, and the
                             tag beside it says how it got there. */
                          unLevel={stream === LADDER_STREAMS.un ? move.to : null}
                          ugLevel={stream === LADDER_STREAMS.ug ? move.to : null}
                          trailing={<LevelMove move={move} />}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
          <li className="text-[11px] font-semibold leading-relaxed text-foreground/60">{copy.moveKey}</li>
        </ol>
      )}
    </section>
  );
}

/**
 * How far one kanji moved, drawn so it cannot be read as anything else here.
 *
 * Every other number beside a glyph on this site is one of two things: a tally
 * in light brackets (`RADICALS (3)`, `1-10 (520)`) or a stage in an uppercase
 * pill (`MASTER 7`, `WK54`, `N5`). A move is neither a count nor a status, so
 * it takes a third shape - a signed number in a tinted square, sitting under
 * the character rather than beside it.
 *
 * Tinted by direction, which is the part that makes ninety-five of them
 * readable: the row resolves into a shape before any single number does, and
 * UN 2.0.0 is then visibly one thing - eighty-eight kanji pulled earlier and
 * seven pushed later, not a hundred unrelated edits. Cool for earlier, because
 * a kanji arriving sooner is the gentler change to meet; warm for later,
 * because that is the one that moved away from somebody who was close to it.
 */
function LevelMove({ move }: { move: CurriculumMove }) {
  const later = move.to > move.from;
  return (
    <span
      title={copy.moveTitle(move.from, move.to)}
      className={`rounded px-1 py-px text-[10px] font-black tabular-nums ${
        later ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
      }`}
    >
      {copy.moveDelta(move.from, move.to)}
    </span>
  );
}
