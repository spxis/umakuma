import gradeLadder from "@/data/gradeLadder.json";
import kanjiLadder from "@/data/kanjiLadder.json";

import type { CurriculumMove } from "./curriculumVersion";
import { LADDER_STREAMS, type LadderStreamValue } from "./ladderStreams";

/**
 * What a rebuild moved, per ladder, as the build recorded it.
 *
 * Radicals and vocabulary are counts and kanji are the characters themselves,
 * which is a deliberate asymmetry in the build rather than an oversight here:
 * 1,537 words moved between UN 1.0.0 and 2.0.0 and nobody is going to read
 * that list, while 95 kanji is a set a member can look at and recognise.
 *
 * A moved kanji carries the pair, `from` and `to`, so the panel can say how
 * far it went rather than only that it went. It did not always: the build
 * compared two ladders and kept the verdict alone, and this comment used to
 * say the question could not be answered from here. It can now, and the
 * answer for the one rebuild that predates the change was recovered rather
 * than invented - the 1.0.0 ladders are in git at 66cfdca8, and diffing them
 * against 2.0.0 through `diffCurriculum` returns exactly the 95 and 12
 * characters already recorded, which is what made the backfill trustworthy.
 */
export type CurriculumCounts = {
  added: number;
  moved: number;
  removed: number;
};

export type CurriculumChangelogEntry = {
  version: string;
  date: string;
  bump: string;
  summary: string;
  kanji: { added: string[]; moved: CurriculumMove[]; removed: string[] };
  radicals: CurriculumCounts;
  vocabulary: CurriculumCounts;
};

type LadderFile = { curriculum?: { changelog?: CurriculumChangelogEntry[] } };

/**
 * The changelog for one ladder, newest first.
 *
 * Two cases and a conditional rather than a registry, matching
 * `ladderColumns`: there are two ladders and there will be at most one more.
 */
export function curriculumChangelogFor(stream: LadderStreamValue): CurriculumChangelogEntry[] {
  const file = (stream === LADDER_STREAMS.ug ? gradeLadder : kanjiLadder) as LadderFile;
  return file.curriculum?.changelog ?? [];
}

/** Whether this ladder has recorded a change worth showing anybody yet. */
export function hasCurriculumChanges(stream: LadderStreamValue): boolean {
  return curriculumChangelogFor(stream).length > 0;
}
