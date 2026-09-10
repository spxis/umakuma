/** Everything the curriculum-changes panel says, in one module for the locale layer. */
export const CURRICULUM_CHANGES_COPY = {
  heading: "What changed, and when",
  blurb:
    "The ladder is rebuilt when the evidence says to, and a level that moves under you is worth an explanation. Every rebuild is listed here with what it moved.",
  /* The stamp says which curriculum a figure was drawn from; this says what
     that version did. `UN 2.0.0` on a chart and `2.0.0` in this list are the
     same fact, so they are printed the same way. */
  version: (stamp: string) => stamp,
  bump: {
    major: "A big move",
    minor: "A small move",
    patch: "A correction",
  } as Record<string, string>,
  kanjiMoved: "Kanji that changed level",
  radicals: "Radicals",
  vocabulary: "Words",
  counts: (counts: { added: number; moved: number; removed: number }) => {
    const parts: string[] = [];
    if (counts.moved) parts.push(`${counts.moved.toLocaleString("en-US")} moved`);
    if (counts.added) parts.push(`${counts.added.toLocaleString("en-US")} added`);
    if (counts.removed) parts.push(`${counts.removed.toLocaleString("en-US")} removed`);
    return parts.length > 0 ? parts.join(" · ") : "unchanged";
  },
  /*
   * How far each one went, which the panel could not say until the build
   * started recording the pair. The sentence that used to sit here said so:
   * "the rebuild recorded which characters moved, not where they moved from".
   */
  moveDelta: (from: number, to: number) => `${to > from ? "+" : ""}${to - from}`,
  moveTitle: (from: number, to: number) => `Level ${from} → level ${to}`,
  /* The shape of a rebuild in one line, so 95 tags read before any one of
     them does. A kanji that moved earlier is taught sooner than it was. */
  moveSplit: (earlier: number, later: number) => {
    const parts: string[] = [];
    if (earlier) parts.push(`${earlier.toLocaleString("en-US")} earlier`);
    if (later) parts.push(`${later.toLocaleString("en-US")} later`);
    return parts.join(" · ");
  },
  moveKey: "Each tag is how many levels that kanji moved — earlier, or later.",
  nothingYet: "Nothing has moved yet. The first rebuild will be listed here.",
} as const;
