/**
 * What kind of account a row is.
 *
 * Two, and the second is new: a `member` is a person, and a `test` account is
 * one the site runs for itself - the simulated cohort that studies and plays
 * so the boards have somebody on them before the first real member arrives.
 *
 * Nothing public reads this. A test member is meant to look like anybody
 * else, which is the whole point of simulating one rather than printing a
 * number. Admin surfaces, counts and the clean-up script read it, and they
 * read it here rather than guessing from an email domain, because a guess is
 * the kind of rule that is true until somebody signs up with a matching
 * address.
 *
 * Not `internal`. That flag says "one of us" and opens the reading challenge;
 * a simulated member is nobody and gets nothing.
 *
 * The values match the `UserType` enum in the schema, and a test fails if
 * they drift, since the column is what every query is written against.
 */
export const USER_TYPES = {
  member: "member",
  test: "test",
} as const;

export type UserTypeValue = (typeof USER_TYPES)[keyof typeof USER_TYPES];

export function isUserType(value: string): value is UserTypeValue {
  return (Object.values(USER_TYPES) as string[]).includes(value);
}

/** True for an account the site runs for itself. */
export function isTestUser(userType: string | null | undefined): boolean {
  return userType === USER_TYPES.test;
}
