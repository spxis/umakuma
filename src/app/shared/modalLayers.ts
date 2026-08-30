/**
 * Every stacking layer in the app, in order, in one place.
 *
 * These were previously chosen per component, which turned into an escalation
 * war: a dialog that had to sit above a modal picked a bigger number, the next
 * one picked bigger still, and the app ended up with nineteen distinct z-index
 * values including `z-10020` and `z-[9990]`. Ordering only makes sense read
 * together, so it lives here rather than in the components.
 *
 * The values keep the stacking the app already had; naming them is the point.
 * Anything that must sit above a layer takes the matching `*Alert` entry rather
 * than inventing a new number.
 */
export const MODAL_LAYERS = {
  /** Ordinary page modals: reading check-ins, review, side-by-side. */
  page: "z-50",
  /** Menus and admin overlays that sit over a page modal. */
  menu: "z-60",
  /** The Trouble/Favourites panel, over whatever the player was doing. */
  lists: "z-80",
  /** The glyph viewer, which stacks above the lists panel it was opened from. */
  viewer: "z-90",
  /** Stroke order, which can be raised from inside the glyph viewer. */
  strokes: "z-[95]",
  /** The full-screen game runner. */
  game: "z-100",
  /** Confirmations raised from inside the game runner. */
  gameAlert: "z-110",
  /** Transient corner toasts. */
  toast: "z-120",
  /** The header menu scrim and its panel. */
  headerScrim: "z-[9990]",
  headerPanel: "z-[9991]",
  /** The custom-study library loader and confirmations raised from it. */
  library: "z-10020",
  libraryAlert: "z-10030",
} as const;

export type ModalLayer = (typeof MODAL_LAYERS)[keyof typeof MODAL_LAYERS];
