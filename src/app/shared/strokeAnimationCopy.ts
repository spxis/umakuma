/** Copy for the stroke-order animation, in one map for the locale layer. */
export const STROKE_ANIMATION_COPY = {
  title: "Stroke order",
  open: "Strokes",
  replay: "Replay",
  numbers: "Numbers",
  copyLink: "Copy link",
  linkCopied: "Copied",
  stroke: "stroke",
  strokes: "strokes",
  loading: "Loading stroke order",
  unavailable: "No stroke order for this character.",
  creditPrefix: "Stroke data from",
  printed: "Printed",
  gothic: "Gothic",
  mincho: "Mincho",
  textbook: "Textbook",
  brush: "Brush",
  /** Hover title on a face: "Textbook face". */
  face: (label: string) => `${label} face`,
  animated: "Stroke order",
  close: "Close",
  /* The three drawing sizes. Named by their initial, since the row is tiny. */
  sizeLabel: "Size",
  sizes: { small: "S", medium: "M", large: "L" },
  sizeTitle: { small: "Small", medium: "Medium", large: "Large (best for stroke numbers)" },
} as const;

/**
 * How big the drawing is, in pixels.
 *
 * Three, because the numbers are the reason to resize: at the old single size
 * a sixteen-stroke character crowds sixteen numerals into 200px and none of
 * them can be read, which makes the Numbers button useless exactly where it
 * matters most. Large is the size those numbers are legible at.
 */
export const STROKE_SIZES = { small: 160, medium: 220, large: 320 } as const;

/**
 * How wide the blocks either side of the drawing are.
 *
 * The printed faces sit on one side and the controls on the other, and they
 * are naturally different widths - 140px of glyph cells against 88px of
 * buttons - which pushed the drawing 28px right of centre. Fixing both to the
 * same width is what actually centres it, so the two must move together.
 */
export const STROKE_SIDE_WIDTH = "sm:w-36";

export type StrokeSize = keyof typeof STROKE_SIZES;

export const STROKE_SIZE_VALUES = Object.keys(STROKE_SIZES) as StrokeSize[];

/** Remembered per device: a phone and a desktop want different answers. */
export const STROKE_SIZE_STORAGE_KEY = "umakuma:stroke-size";

/** How long one stroke takes to draw; strokes run one after another. */
export const STROKE_MS_PER_STROKE = 420;
