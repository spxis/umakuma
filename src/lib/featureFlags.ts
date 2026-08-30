/**
 * Global feature flags.
 *
 * What flags exist is defined here, in code — the database stores only which
 * ones are switched on. That split means a flag ships dark with its feature,
 * works before any row exists (via its default), and a stale row for a deleted
 * flag is inert rather than an error. Flipping one is an admin-page action,
 * not a deploy.
 *
 * Use a flag for a door that must open later than its code lands — not for
 * per-game behavior (GAME_KIND_RULES), per-user capability, or small UI
 * changes, which just ship.
 */

export const FEATURE_FLAGS = {
  /** The open-signup door: Google sign-in creates an account for anyone. */
  openSignup: "open_signup",
  /** Site-wide developer mode: extra diagnostics and rough edges allowed. */
  developerMode: "developer_mode",
  /** Site-wide advanced mode: power-user surfaces beyond the daily basics. */
  advancedMode: "advanced_mode",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export const FEATURE_FLAG_VALUES = Object.values(FEATURE_FLAGS);

export function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return (FEATURE_FLAG_VALUES as string[]).includes(value);
}

export type FeatureFlagDefinition = {
  key: FeatureFlagKey;
  label: string;
  description: string;
  /** What the flag reads as when no database row exists. */
  defaultEnabled: boolean;
  /** Short chip shown in the footer while the flag is on; omit for silent flags. */
  footerChip?: string;
};

export const FEATURE_FLAG_DEFINITIONS: Record<FeatureFlagKey, FeatureFlagDefinition> = {
  [FEATURE_FLAGS.openSignup]: {
    key: FEATURE_FLAGS.openSignup,
    label: "Open Google sign-up",
    description:
      "Anyone signing in with Google gets an account instead of bouncing to the invite page. Keep off until privacy, gating and the WaniKani-free surfaces have shipped.",
    defaultEnabled: false,
  },
  [FEATURE_FLAGS.developerMode]: {
    key: FEATURE_FLAGS.developerMode,
    label: "Developer mode",
    description:
      "Site-wide developer switch. Nothing gates on it yet; surfaces that want extra diagnostics should check this flag. The footer wears a DEV chip while it is on.",
    defaultEnabled: false,
    footerChip: "DEV",
  },
  [FEATURE_FLAGS.advancedMode]: {
    key: FEATURE_FLAGS.advancedMode,
    label: "Advanced mode",
    description:
      "Site-wide power-user switch for surfaces beyond the daily basics. The footer wears an ADV chip while it is on.",
    defaultEnabled: false,
    footerChip: "ADV",
  },
};

/** The footer chips for whichever flags are on, in registry order. */
export function footerChipsFor(states: readonly FeatureFlagState[]): string[] {
  return states.flatMap((state) => (state.enabled && state.footerChip ? [state.footerChip] : []));
}

export type FeatureFlagRow = {
  key: string;
  enabled: boolean;
  updatedAt: Date | string | null;
};

export type FeatureFlagState = FeatureFlagDefinition & {
  enabled: boolean;
  /** True when the value comes from a stored row rather than the default. */
  stored: boolean;
  updatedAt: string | null;
};

/**
 * Merges stored rows onto the registry. Rows for flags the code no longer
 * defines are dropped — the registry is the source of what exists.
 */
export function resolveFlagStates(rows: readonly FeatureFlagRow[]): FeatureFlagState[] {
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return FEATURE_FLAG_VALUES.map((key) => {
    const definition = FEATURE_FLAG_DEFINITIONS[key];
    const row = byKey.get(key);

    if (!row) {
      return { ...definition, enabled: definition.defaultEnabled, stored: false, updatedAt: null };
    }

    const updatedAt =
      row.updatedAt === null
        ? null
        : row.updatedAt instanceof Date
          ? row.updatedAt.toISOString()
          : new Date(row.updatedAt).toISOString();

    return { ...definition, enabled: row.enabled, stored: true, updatedAt };
  });
}
