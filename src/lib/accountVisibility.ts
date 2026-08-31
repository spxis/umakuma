/**
 * Who can see a member.
 *
 * Three levels, because "public" means two different things to a family app:
 * being visible to the other people you play with is not the same as being
 * visible to the open internet, and a child should be able to have the first
 * without the second.
 *
 * A new account starts at `private` and is asked to choose during signup.
 * Accounts that predate this field read as `family`: they were already on the
 * leaderboard, and a column added underneath them must not quietly remove
 * anyone. That is why `null` is not simply treated as the strictest value.
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
 * Every account that existed before this column was added was listed on the
 * leaderboard, so reading `null` as `private` would have removed the whole
 * family from it on deploy.
 */
export const LEGACY_VISIBILITY: AccountVisibility = ACCOUNT_VISIBILITY.family;

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
