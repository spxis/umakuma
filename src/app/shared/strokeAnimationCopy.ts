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
} as const;

/** How long one stroke takes to draw; strokes run one after another. */
export const STROKE_MS_PER_STROKE = 420;
