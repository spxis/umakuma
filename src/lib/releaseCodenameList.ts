import type { ReleaseCodename } from "./releaseCodenames";
import { CODENAMES_PART_1 } from "./releaseCodenameList1";
import { CODENAMES_PART_2 } from "./releaseCodenameList2";
import { CODENAMES_PART_3 } from "./releaseCodenameList3";

/**
 * Every release's name, in release order.
 *
 * Separated from the rules in `releaseCodenames.ts` because this list grows by
 * a line on every single release and nothing else there grows at all: keeping
 * them together failed the 500-line gate at 0.429.0 on a release that had done
 * nothing wrong, and the fix was a split rather than a bigger limit.
 *
 * It happened again at release 486, so the names themselves are split across
 * numbered parts. The parts carry no meaning - the order across them is the
 * release order, and this file is the one everything reads. A new name is
 * appended to the last part; when that part nears the gate, start another and
 * add it here.
 *
 * The rules - the gojūon walk, the kana each release must start on, the ban on
 * reusing a word - live next door and are read by `release:take` before it
 * will write anything here.
 */
export const CODENAMES: readonly ReleaseCodename[] = [...CODENAMES_PART_1, ...CODENAMES_PART_2, ...CODENAMES_PART_3];
