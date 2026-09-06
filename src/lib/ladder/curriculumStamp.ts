import { CURRICULUM_VERSION } from "@/lib/kanjiLadder";
import { GRADE_CURRICULUM_VERSION } from "@/lib/gradeLadder";

import { LADDER_STREAMS, type LadderStreamValue } from "./ladderStreams";

/**
 * Which curriculum a surface is showing, written the one way.
 *
 * `AGENTS.md`: "Every chart and table names the curriculum version it was
 * drawn from. `UN 2.0.0` / `UG 2.0.0`, taken from `curriculum.version` in each
 * ladder file." The ladders are rebuilt when the evidence says to and 95 kanji
 * changed level between UN 1.0.0 and 2.0.0, so a figure without a version is a
 * number nobody can reproduce - and the version is what tells a reader whether
 * the picture still matches what a member is being taught.
 *
 * One function rather than each surface pairing a stream with a constant,
 * because there are two constants and picking the wrong one is silent.
 */
export function curriculumVersionFor(stream: LadderStreamValue): string {
  return stream === LADDER_STREAMS.ug ? GRADE_CURRICULUM_VERSION : CURRICULUM_VERSION;
}

/** `UN 2.0.0`. What a stamp actually prints. */
export function curriculumStampText(stream: LadderStreamValue): string {
  return `${stream} ${curriculumVersionFor(stream)}`;
}
