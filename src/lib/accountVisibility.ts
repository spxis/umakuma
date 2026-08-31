/**
 * Who can see a member.
 *
 * Three levels, because "public" means two different things to a family app:
 * being visible to the other people you play with is not the same as being
 * visible to the open internet, and a child should be able to have the first
 * without the second.
 *
 * A new account starts at `private` and is asked to choose during signup.
 * Accounts that predate this field read as `public`, because that is what they
 * already were: the leaderboard had no visibility filter at all. A column
 * added underneath existing rows must not quietly remove anyone, from any
 * audience - which is why `null` is not treated as the strictest value.
 */

export const ACCOUNT_VISIBILITY = {
  private: "private",
  family: "family",
  public: "public",
} as const;

export type AccountVisibility = (typeof ACCOUNT_VISIBILITY)[keyof typeof ACCOUNT_VISIBILITY];

export const ACCOUNT_VISIBILITY_VALUES = Object.values(ACCOUNT_VISIBILITY);

/** What a new account gets before it has answered the question. */
export const DEFAULT_NEW_ACCOUNT_VISIBILITY: AccountVisibility = ACCOUNT_VISIBILITY.private;

/**
 * What an account with no stored value means.
 *
 * `public`, because that is exactly what these accounts already were. The
 * leaderboard had no visibility filter before this column existed, so every
 * account on it was visible to anyone, signed in or not.
 *
 * This was first written as `family`, which reads as the cautious choice and
 * is not: it silently took the whole family off the public board the moment it
 * deployed. Preserving what was already true is the non-destructive default,
 * and each member can lower it on their profile. Only new accounts start
 * private, where nothing is being taken away from anybody.
 */
export const LEGACY_VISIBILITY: AccountVisibility = ACCOUNT_VISIBILITY.public;

export function isAccountVisibility(value: string): value is AccountVisibility {
  return (ACCOUNT_VISIBILITY_VALUES as string[]).includes(value);
}

/** The level to apply for a stored value, which may be missing or unrecognized. */
export function resolveVisibility(stored: string | null | undefined): AccountVisibility {
  if (stored && isAccountVisibility(stored)) {
    return stored;
  }
  return LEGACY_VISIBILITY;
}

/** Copy for each level, in one place so signup and the profile page agree. */
export const ACCOUNT_VISIBILITY_DISPLAY: Record<
  AccountVisibility,
  { label: string; description: string }
> = {
  [ACCOUNT_VISIBILITY.private]: {
    label: "Private",
    description: "Only you. You will not appear on any leaderboard.",
  },
  [ACCOUNT_VISIBILITY.family]: {
    label: "Members",
    description: "Other UmaKuma members can see your name and scores on leaderboards.",
  },
  [ACCOUNT_VISIBILITY.public]: {
    label: "Public",
    description: "Anyone can see your profile and scores, including people who are not signed in.",
  },
};

/** Said at signup and again on the profile page, so the choice never feels final. */
export const VISIBILITY_REASSURANCE = "You can change this anytime in your profile.";

export type Viewer = "anonymous" | "member" | "admin";

/**
 * Whether this kind of viewer may see this member listed.
 *
 * Admins always can, because they run the site and moderate it. A member's own
 * pages are handled by `canViewUserPage`, which is about owning an account
 * rather than being listed to others.
 */
export function isVisibleTo(stored: string | null | undefined, viewer: Viewer): boolean {
  if (viewer === "admin") {
    return true;
  }

  const visibility = resolveVisibility(stored);
  if (visibility === ACCOUNT_VISIBILITY.private) {
    return false;
  }
  if (visibility === ACCOUNT_VISIBILITY.public) {
    return true;
  }
  return viewer === "member";
}
