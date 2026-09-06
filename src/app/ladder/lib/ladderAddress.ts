import { LADDER_STREAMS, isLadderStream, type LadderStreamValue } from "@/lib/ladder/ladderStreams";

import { LADDER_BOARD_COPY } from "../ladderBoardCopy";

/**
 * The three addresses the ladder board lives at.
 *
 *   /ladder      everyone, each on their own path
 *   /ladder/un   the JLPT-band path
 *   /ladder/ug   the school-year path
 *
 * A path segment rather than a query parameter, because these are three
 * boards a member can link to and come back to - the same argument the
 * explorers settled when they stopped paging behind one URL.
 *
 * Lower case in the address and upper case in the data: `LadderStream` is a
 * Prisma enum whose members are UN and UG, and a URL that shouts is a URL
 * people mistype.
 */

/**
 * The stream an address names.
 *
 * `null` is the board of everyone, which is a real answer. `undefined` is a
 * segment that names no board at all, which is a 404 - the two must not be
 * confused, or a typo would quietly open the full board.
 */
export function streamFromPath(segments: string[] | undefined): LadderStreamValue | null | undefined {
  if (!segments || segments.length === 0) return null;
  if (segments.length > 1) return undefined;
  const wanted = segments[0]!.toUpperCase();
  return isLadderStream(wanted) ? wanted : undefined;
}

export function ladderBoardPath(stream: LadderStreamValue | null): string {
  return stream === null ? "/ladder" : `/ladder/${stream.toLowerCase()}`;
}

/** The tabs across the top, in the order they are offered. */
export function ladderBoardTabs(): { stream: LadderStreamValue | null; label: string }[] {
  return [
    { stream: null, label: LADDER_BOARD_COPY.tabs.all },
    { stream: LADDER_STREAMS.un, label: LADDER_BOARD_COPY.tabs.un },
    { stream: LADDER_STREAMS.ug, label: LADDER_BOARD_COPY.tabs.ug },
  ];
}
