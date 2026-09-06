import { curriculumStampText } from "@/lib/ladder/curriculumStamp";
import type { LadderStreamValue } from "@/lib/ladder/ladderStreams";

/**
 * Which curriculum a surface is showing, said faintly and last.
 *
 * John, when the study page first carried one: "keep it so that you can
 * barely see it - it's not data that the general public needs to see, so it
 * shouldn't stand out." It is provenance, not a feature a member is meant to
 * study: there for the moment somebody needs to know why a level moved under
 * them, and invisible the rest of the time.
 *
 * `AGENTS.md` requires it on anything drawn from a ladder, because both
 * ladders are rebuilt when the evidence says to - 95 kanji changed level
 * between UN 1.0.0 and 2.0.0 - and a figure without a version is a number
 * nobody can reproduce.
 */
export default function CurriculumStamp({
  stream,
  className = "",
}: {
  stream: LadderStreamValue;
  className?: string;
}) {
  return (
    <p
      translate="no"
      className={`text-[10px] font-medium tracking-[0.08em] text-foreground/35 ${className}`.trim()}
    >
      {curriculumStampText(stream)}
    </p>
  );
}
