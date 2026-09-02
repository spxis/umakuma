/**
 * What kind of member somebody is.
 *
 * Three, and the middle one is new: admins run the place, internal members
 * are the family and anybody let in deliberately, and everybody else is a
 * member. The distinction exists because the reading challenge and its daily
 * check-ins are one family's arrangement about pocket money, not a feature of
 * a Japanese study site - they were being offered to every stranger who
 * signed in.
 *
 * Admins are internal by definition: somebody who can read every account's
 * page is not kept out of a reading list.
 */
export const MEMBER_KINDS = { admin: "admin", internal: "internal", member: "member" } as const;
export type MemberKind = (typeof MEMBER_KINDS)[keyof typeof MEMBER_KINDS];

export function memberKindFor(input: { isAdmin: boolean; internal: boolean }): MemberKind {
  if (input.isAdmin) return MEMBER_KINDS.admin;
  return input.internal ? MEMBER_KINDS.internal : MEMBER_KINDS.member;
}

/**
 * Whether this kind counts as internal.
 *
 * What being internal *gets* you is not decided here: that is the capability
 * registry's job, and `MEMBER_CAPABILITIES.readingChallenge` is the one thing
 * it opens today. This says only who is one of us.
 */
export function isInternalKind(kind: MemberKind): boolean {
  return kind === MEMBER_KINDS.admin || kind === MEMBER_KINDS.internal;
}

/**
 * Who counts as internal without being told.
 *
 * John's answer for the members already here: a WaniKani connection and a
 * month on the site. Somebody who has kept a study habit going that long
 * through the account they connected is one of us; a new sign-in is not.
 */
export const INTERNAL_TENURE_DAYS = 30;

export function qualifiesAsInternal(
  account: { hasWanikani: boolean; createdAt: Date | string },
  now: Date = new Date(),
): boolean {
  if (!account.hasWanikani) return false;
  const created = typeof account.createdAt === "string" ? new Date(account.createdAt) : account.createdAt;
  const days = (now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000);
  return days >= INTERNAL_TENURE_DAYS;
}
