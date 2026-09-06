import { LADDER_STREAMS, type LadderStreamValue } from "@/lib/ladder/ladderStreams";

/**
 * What the ladder boards say, in one map for the locale layer.
 *
 * The two paths are named in full wherever a member meets them for the first
 * time: "UN" and "UG" are two letters that look like a typo until somebody
 * tells you N is the JLPT's bands and G is the Japanese school grades. The
 * papers explain it at length; a board has one line to do it in.
 */
export const LADDER_BOARD_COPY = {
  title: "UmaKuma ladder",
  subtitle: "Everyone climbing our own curriculum, on either path",
  streamTitle: (stream: LadderStreamValue) =>
    stream === LADDER_STREAMS.ug ? "UmaKuma ladder — the school-year path" : "UmaKuma ladder — the JLPT path",
  streamSubtitle: (stream: LadderStreamValue) =>
    stream === LADDER_STREAMS.ug
      ? "Members following UG, which teaches the same kanji in Japanese school-year order"
      : "Members following UN, which teaches the same kanji in JLPT band order",
  /** The three tabs across the top. */
  tabs: { all: "Everyone", un: "UN · JLPT order", ug: "UG · school year" },
  /** The one line that says what the two letters mean. */
  streamsNote:
    "One curriculum, two orders. UN follows the JLPT's bands, UG the Japanese school years — the same 2,235 kanji, arranged for what you are aiming at.",
  count: (members: number) => (members === 1 ? "1 member" : `${members.toLocaleString()} members`),
  empty: "Nobody is on this path yet.",
  emptyHint: "A member joins a board by starting the curriculum.",
  /* The score, and what went into it. An unexplained number on a leaderboard
     is a number people argue about. */
  score: (score: number) => score.toLocaleString(),
  scoreLabel: "Score",
  learned: (count: number) => `${count.toLocaleString()} learned`,
  passed: (count: number) => `${count.toLocaleString()} passed`,
  burned: (count: number) => `${count.toLocaleString()} burned`,
  leading: "Leading",
  toPass: (points: number) => `${points.toLocaleString()} to pass`,
  toPassLevel: "Tied",
  you: "You",
  /* Read out in place of the blank on the repeat rows of a tie. */
  sharedPlace: (place: number) => `Joint ${place}`,
  formulaLabel: "How the score is worked out",
  papers: "How the curriculum is built",
} as const;
