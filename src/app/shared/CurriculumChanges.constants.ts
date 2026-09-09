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
  /* Said once, plainly, because a reader will look for it and it is not here. */
  noLevels:
    "The rebuild recorded which characters moved, not where they moved from — so this says what changed, not by how much.",
  nothingYet: "Nothing has moved yet. The first rebuild will be listed here.",
} as const;
