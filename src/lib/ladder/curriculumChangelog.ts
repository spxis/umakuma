import gradeLadder from "@/data/gradeLadder.json";
import kanjiLadder from "@/data/kanjiLadder.json";

import { LADDER_STREAMS, type LadderStreamValue } from "./ladderStreams";

/**
 * What a rebuild moved, per ladder, as the build recorded it.
 *
 * Radicals and vocabulary are counts and kanji are the characters themselves,
 * which is a deliberate asymmetry in the build rather than an oversight here:
 * 1,537 words moved between UN 1.0.0 and 2.0.0 and nobody is going to read
 * that list, while 95 kanji is a set a member can look at and recognise.
 *
 * Note what is *not* recorded, because a reader of this module will look for
 * it: a moved kanji carries no from-level and no to-level. The build compares
 * two ladders and keeps the verdict, not the pair, and the previous ladder is
 * not kept either - so "moved from 12 to 20" cannot be answered from here. It
 * would take the build recording the pair, which is its own change.
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
  kanji: { added: string[]; moved: string[]; removed: string[] };
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
