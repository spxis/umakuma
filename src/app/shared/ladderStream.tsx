"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { LadderStreamValue } from "@/lib/ladder/ladderStreams";

/**
 * Which of our two ladders the member reading this page climbs.
 *
 * A fact about the viewer that is needed at the bottom of the tree: the level
 * on a study card, on an upcoming row, in the glyph's own badges. Passing it
 * down would mean threading one prop through four render sites of the review
 * modal alone, and every one of those is a place to forget it - which is how
 * the explorer came to print `UN` at everybody in the first place, months
 * after `viewerLadderFor` was written to prevent exactly that.
 *
 * Null is a visitor, and null draws the exam ladder: it is the site's
 * headline ordering and what somebody with no account is shown. Said here
 * once rather than defaulted in each component.
 */
const LadderStreamContext = createContext<LadderStreamValue | null>(null);

export function LadderStreamProvider({
  stream,
  children,
}: {
  stream: LadderStreamValue | null;
  children: ReactNode;
}) {
  return <LadderStreamContext.Provider value={stream}>{children}</LadderStreamContext.Provider>;
}

export function useLadderStream(): LadderStreamValue | null {
  return useContext(LadderStreamContext);
}
