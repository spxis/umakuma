/**
 * The two ladders UmaKuma teaches its own curriculum in.
 *
 * UN orders by JLPT band, UG by Japanese school year, over one set of subjects.
 * Both are ours, which is why both carry a curriculum version and WaniKani's
 * levels do not — theirs move when they decide, and we are not told.
 *
 * The values match the `LadderStream` enum in the schema, because an answer
 * records which of the two it was given against and a second spelling of "UN"
 * would make that record unreadable.
 */
export const LADDER_STREAMS = {
  un: "UN",
  ug: "UG",
} as const;

export type LadderStreamValue = (typeof LADDER_STREAMS)[keyof typeof LADDER_STREAMS];

export function isLadderStream(value: string): value is LadderStreamValue {
  return (Object.values(LADDER_STREAMS) as string[]).includes(value);
}
