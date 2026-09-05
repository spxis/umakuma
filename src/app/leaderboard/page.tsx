import { redirect } from "next/navigation";

/**
 * `/leaderboard` sends you to the board.
 *
 * The WaniKani board is rendered on the home page, and this folder holds only
 * its components — so the address most people would guess was a 404, which
 * became harder to defend the moment `/xp` started working as an address of
 * its own.
 *
 * A redirect rather than a second copy of the board: the home page's version
 * is 490 lines against the 500-line gate and duplicating its data loading to
 * serve the same table twice would be the worse trade. This is not a
 * compatibility shim for an old URL — nothing ever lived here. It is an
 * address that should resolve, resolving.
 */
export default function LeaderboardPage(): never {
  redirect("/");
}
