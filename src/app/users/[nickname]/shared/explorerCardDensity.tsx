"use client";

import { createContext, useContext, type ReactNode } from "react";

export type ExplorerCardDensity = "grid" | "list";

/**
 * Which shape of card the overlays are being drawn into.
 *
 * The badges and the tag controls are positioned absolutely, in the corners of
 * the glyph box - which is right for a card, where that box is 128 pixels tall
 * and the full width of the card. A row's glyph box is 44 pixels square, and
 * putting the same corner pieces in it stacked the level pill on top of the
 * success rate on top of the character: the JLPT explorer's first row showed
 * `L2` sitting over its own kanji, and every WaniKani row was an unreadable
 * pile where the glyph should have been.
 *
 * Passing this down rather than adding a prop to each overlay keeps the three
 * explorers that draw through `UnifiedExplorerCard` unchanged - none of them
 * has to know, and a new overlay gets the same treatment by asking.
 */
const DensityContext = createContext<ExplorerCardDensity>("grid");

export function ExplorerCardDensityProvider({
  density,
  children,
}: {
  density: ExplorerCardDensity;
  children: ReactNode;
}) {
  return <DensityContext.Provider value={density}>{children}</DensityContext.Provider>;
}

export function useExplorerCardDensity(): ExplorerCardDensity {
  return useContext(DensityContext);
}

/** True in the condensed one-line layout, where nothing may be absolutely placed. */
export function useIsRowDensity(): boolean {
  return useExplorerCardDensity() === "list";
}
