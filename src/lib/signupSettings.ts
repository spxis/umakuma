import {
  ACCOUNT_VISIBILITY,
  ACCOUNT_VISIBILITY_VALUES,
  type AccountVisibility,
  isAccountVisibility,
} from "./accountVisibility";

/**
 * How signing up works, decided by the admin rather than by a deploy.
 *
 * Same split as the feature flags: what settings exist, what they accept and
 * what they fall back to lives here in code, and the database stores only the
 * chosen values. A setting therefore works before anyone has touched it, and a
 * row left behind by a removed setting is inert instead of an error.
 *
 * The door starts shut. `invite_only` is the default because open signup lets
 * strangers create rows on a site a family uses daily; John opens it from the
 * admin page when he is ready, which is the point of it being a setting.
 */

/**
 * How often one address may ask to sign up.
 *
 * Generous, because signing up is something a person does once and the route
 * cannot mint a second account for an address that already has one - the
 * ceiling was never the number of accounts. What it bounds is the work: a
 * settings read, an account lookup and a scan of every existing slug, all of
 * which a signed-in caller could otherwise repeat as fast as they liked.
 *
 * Six in ten minutes leaves room for a form submitted twice, a retried request
 * and a reload, and still stops a loop.
 */
export const SIGNUP_RATE_LIMIT = {
  windowMs: 10 * 60 * 1000,
  maxRequests: 6,
} as const;

export const SIGNUP_MODES = {
  /** Only someone holding an invite code gets an account. */
  inviteOnly: "invite_only",
  /** Anyone may sign up, but the account waits for approval before it counts. */
  openPending: "open_pending",
  /** Anyone may sign up and is in straight away. */
  openImmediate: "open_immediate",
} as const;

export type SignupMode = (typeof SIGNUP_MODES)[keyof typeof SIGNUP_MODES];
export const SIGNUP_MODE_VALUES = Object.values(SIGNUP_MODES);

export function isSignupMode(value: string): value is SignupMode {
  return (SIGNUP_MODE_VALUES as string[]).includes(value);
}

export const SIGNUP_MODE_DISPLAY: Record<SignupMode, { label: string; description: string }> = {
  [SIGNUP_MODES.inviteOnly]: {
    label: "Invite only",
    description: "Only people you give a code to can join. Nobody else can create an account.",
  },
  [SIGNUP_MODES.openPending]: {
    label: "Open, with your approval",
    description:
      "Anyone can sign in with Google and set themselves up, but they wait for you to approve them before they appear anywhere.",
  },
  [SIGNUP_MODES.openImmediate]: {
    label: "Open to anyone",
    description: "Anyone signing in with Google gets an account straight away, with no approval step.",
  },
};

export const SIGNUP_SETTING_KEYS = {
  mode: "signup_mode",
  defaultVisibility: "signup_default_visibility",
  askVisibility: "signup_ask_visibility",
  askDisplayName: "signup_ask_display_name",
} as const;

export type SignupSettingKey = (typeof SIGNUP_SETTING_KEYS)[keyof typeof SIGNUP_SETTING_KEYS];

export type SignupSettings = {
  mode: SignupMode;
  defaultVisibility: AccountVisibility;
  askVisibility: boolean;
  askDisplayName: boolean;
};

export const SIGNUP_SETTING_DEFAULTS: SignupSettings = {
  mode: SIGNUP_MODES.inviteOnly,
  defaultVisibility: ACCOUNT_VISIBILITY.private,
  askVisibility: true,
  askDisplayName: true,
};

export type SignupSettingDefinition = {
  key: SignupSettingKey;
  label: string;
  description: string;
  /** `choice` renders as radio options, `toggle` as a switch. */
  kind: "choice" | "toggle";
  options?: readonly { value: string; label: string; description: string }[];
};

export const SIGNUP_SETTING_DEFINITIONS: readonly SignupSettingDefinition[] = [
  {
    key: SIGNUP_SETTING_KEYS.mode,
    label: "Who can join",
    description: "Whether people can create their own account, and whether you approve them first.",
    kind: "choice",
    options: SIGNUP_MODE_VALUES.map((value) => ({
      value,
      label: SIGNUP_MODE_DISPLAY[value].label,
      description: SIGNUP_MODE_DISPLAY[value].description,
    })),
  },
  {
    key: SIGNUP_SETTING_KEYS.defaultVisibility,
    label: "Visibility a new member starts on",
    description: "What they are set to before they answer the question. They can change it whenever they like.",
    kind: "choice",
    options: ACCOUNT_VISIBILITY_VALUES.map((value) => ({
      value,
      label: value,
      description: "",
    })),
  },
  {
    key: SIGNUP_SETTING_KEYS.askVisibility,
    label: "Ask who can see them",
    description: "Show the visibility question during signup. Turning this off leaves them on the starting value above.",
    kind: "toggle",
  },
  {
    key: SIGNUP_SETTING_KEYS.askDisplayName,
    label: "Ask for a display name",
    description: "Let them choose the name other members see. Turning this off uses the name on their Google account.",
    kind: "toggle",
  },
];

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

/**
 * Turn stored rows into settings, falling back per field.
 *
 * Each value is validated on its own so one bad row cannot take the rest of
 * the settings down with it - an unrecognized mode leaves signup closed rather
 * than throwing on a page every visitor loads.
 */
export function resolveSignupSettings(rows: readonly { key: string; value: string }[]): SignupSettings {
  const stored = new Map(rows.map((row) => [row.key, row.value]));

  const mode = stored.get(SIGNUP_SETTING_KEYS.mode);
  const visibility = stored.get(SIGNUP_SETTING_KEYS.defaultVisibility);

  return {
    mode: mode && isSignupMode(mode) ? mode : SIGNUP_SETTING_DEFAULTS.mode,
    defaultVisibility:
      visibility && isAccountVisibility(visibility)
        ? visibility
        : SIGNUP_SETTING_DEFAULTS.defaultVisibility,
    askVisibility: readBoolean(stored.get(SIGNUP_SETTING_KEYS.askVisibility), SIGNUP_SETTING_DEFAULTS.askVisibility),
    askDisplayName: readBoolean(stored.get(SIGNUP_SETTING_KEYS.askDisplayName), SIGNUP_SETTING_DEFAULTS.askDisplayName),
  };
}

/** Whether someone with no invite code may create an account at all. */
export function allowsSelfSignup(settings: SignupSettings): boolean {
  return settings.mode !== SIGNUP_MODES.inviteOnly;
}

/** Whether a newly created account has to wait for the admin. */
export function requiresApproval(settings: SignupSettings): boolean {
  return settings.mode === SIGNUP_MODES.openPending;
}

/** Validate one setting before it is written, so bad values never reach the row. */
export function isValidSettingValue(key: SignupSettingKey, value: string): boolean {
  switch (key) {
    case SIGNUP_SETTING_KEYS.mode:
      return isSignupMode(value);
    case SIGNUP_SETTING_KEYS.defaultVisibility:
      return isAccountVisibility(value);
    case SIGNUP_SETTING_KEYS.askVisibility:
    case SIGNUP_SETTING_KEYS.askDisplayName:
      return value === "true" || value === "false";
    default:
      return false;
  }
}

export function isSignupSettingKey(value: string): value is SignupSettingKey {
  return (Object.values(SIGNUP_SETTING_KEYS) as string[]).includes(value);
}
