import type { MemberPlaced } from "@/lib/memberBoard";
import { rankMemberBoard } from "@/lib/memberBoard";
import { resolveDisplayName } from "@/lib/accountIdentity";
import { isTestUser } from "@/lib/userType";

/** The columns the members page reads, after `listableTo` has had its say. */
export type MembersBoardAccount = {
  id: string;
  slug: string | null;
  nickname: string | null;
  displayName: string | null;
  wkUsername: string | null;
  wkLevel: number | null;
  unLevel: number;
  createdAt: Date;
  userType: string | null;
};

export type MembersBoardEntry = MemberPlaced<{
  id: string;
  name: string;
  address: string | null;
  joinedAt: Date;
  wkLevel: number | null;
  unLevel: number;
}>;

/**
 * Everyone, newest first.
 *
 * John: "Do we have a page that shows all the newest members? like Itsutsu
 * does? it shows all the new members, from current to old." There was none -
 * the admin table sorts by join date but is the admin's, and the public board
 * ranks by XP.
 *
 * Ranked through `rankMemberBoard` like every other board rather than sorted
 * by hand, so the row shape is the shared one and two members who joined in
 * the same second share a place instead of being numbered as if one came
 * first. The score is the join instant; higher is newer.
 *
 * Simulated cohort members are left out here rather than in the query, for
 * the same reason `listableTo` is a function and not a `where`: a rule that
 * lives in one place cannot be forgotten by the next board. `listableTo`
 * itself does not look at `userType` - it answers who *may* be seen, and a
 * test account may be, on the admin's surfaces - so this is the members
 * page's own rule, said once.
 */
export function membersNewestFirst(accounts: readonly MembersBoardAccount[]): MembersBoardEntry[] {
  const real = accounts.filter((account) => !isTestUser(account.userType));
  return rankMemberBoard(
    real.map((account) => ({
      id: account.id,
      name: resolveDisplayName(account),
      address: account.slug ?? account.wkUsername ?? null,
      joinedAt: account.createdAt,
      wkLevel: account.wkLevel,
      unLevel: account.unLevel,
    })),
    { score: (row) => row.joinedAt.getTime(), tiebreak: (row) => row.name },
  );
}
