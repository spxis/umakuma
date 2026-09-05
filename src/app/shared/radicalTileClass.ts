/**
 * How a radical tile is drawn, wherever one is offered to be picked.
 *
 * Two pickers offer the 253: the browser at `/radicals` and the one the search
 * bar opens on `:radicals`. They had the same classes typed out twice, both
 * white with a grey border and both filling with the site accent when chosen -
 * so the two walls of radicals on this site were the two places radicals did
 * not look like radicals, and a chosen one read as a chosen button rather than
 * a chosen radical.
 *
 * One source now. The colour is the shared `radical` token at the weights
 * `typeGlyphBoxClass` uses on an explorer card, so a picker cannot drift into
 * its own blue.
 *
 * A dead end is the same blue, faded. It was a colourless box, and John's
 * rule is that there are no white boxes in a wall of radicals - a tile that
 * loses its colour when it becomes unpickable stops reading as a radical at
 * exactly the moment there are most of them on screen. Faded rather than
 * muted, so availability is carried by weight and the type by hue, and the
 * two never have to compete for the same signal.
 */
export const RADICAL_TILE_CLASS = {
  rest: "border-radical/50 bg-radical/15 text-radical hover:bg-radical/25",
  chosen: "border-radical bg-radical text-white",
  deadEnd: "cursor-not-allowed border-radical/20 bg-radical/5 text-radical/40",
} as const;
