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
  /*
   * The stroke picker. It is shut on arrival and its opener says what opening
   * it does, rather than naming a feature: a reader wants one stroke, not a
   * picker.
   */
  pickStroke: "Show one stroke",
  pickAll: "Show every stroke",
  chooseStroke: "Choose a stroke",
  /* Stepping. Marks rather than words: they share a row with the numbers. */
  previousStroke: "Previous stroke",
  nextStroke: "Next stroke",
  previousMark: "\u2039",
  nextMark: "\u203A",
  /** The label a screen reader hears on a numbered button. */
  strokeNumber: (number: number) => `Stroke ${number}`,
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
export const STROKE_SIZES = { small: 160, medium: 220, large: 370 } as const;

/**
 * The stroke numbers, in pixels on screen rather than in the drawing.
 *
 * Measured in the viewBox they scaled with the character, so growing the
 * drawing grew them by the same amount and they collided just as much. Held to
 * one readable size, the extra room goes between them, which is what somebody
 * enlarging a fifteen-stroke character is after.
 */
export const STROKE_NUMBER_PX = 13;

/** KanjiVG draws on a 109-unit square; the numbers are sized against it. */
export const STROKE_VIEWBOX_UNITS = 109;

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
