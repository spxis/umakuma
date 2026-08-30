/**
 * Who an account is, separately from what it is called.
 *
 * Two different things that are easy to conflate:
 *
 * - The **slug** is the address. It is unique, it is in every link anyone has
 *   ever shared, and it does not change.
 * - The **display name** is what people read. Anyone can change it whenever
 *   they like, two members may share one, and nothing keys on it.
 *
 * Keeping them apart is what lets a member rename themselves without breaking
 * their own links, and what lets an account exist before it has a name at all.
 */

/** Characters a slug may contain: lowercase letters, digits and hyphens. */
const SLUG_ALLOWED = /[^a-z0-9-]+/g;

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 32;
export const DISPLAY_NAME_MAX_LENGTH = 40;

/**
 * A URL-safe slug from arbitrary text, or null when nothing usable survives.
 *
 * Japanese names and emoji reduce to nothing here, which is the point: the
 * caller falls back to a generated name rather than producing an empty or
 * unreadable address.
 */
export function slugify(input: string | null | undefined): string | null {
  const cleaned = String(input ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(SLUG_ALLOWED, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-$/, "");

  return cleaned.length >= SLUG_MIN_LENGTH ? cleaned : null;
}

/**
 * Words for a generated name, chosen to be friendly and pronounceable.
 *
 * Everything here is either Japanese-study flavoured or plainly harmless: a
 * generated name is the first thing a new member sees themselves called, and
 * a random pairing must never land on something unkind or embarrassing.
 */
const FRIENDLY_ADJECTIVES = [
  "brave", "bright", "calm", "cheerful", "clever", "curious", "eager", "gentle",
  "happy", "keen", "kind", "lively", "lucky", "merry", "nimble", "patient",
  "quiet", "quick", "steady", "sunny", "swift", "warm", "wise", "zesty",
] as const;

const FRIENDLY_NOUNS = [
  "bamboo", "crane", "dragon", "falcon", "ginkgo", "heron", "koi", "lantern",
  "maple", "mochi", "otter", "panda", "peony", "ramen", "sakura", "shiba",
  "sparrow", "tanuki", "tiger", "turtle", "wave", "willow", "yuzu", "zen",
] as const;

/** A random integer below `max`, taking its randomness from the caller. */
function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

/**
 * A friendly name for a member who has not chosen one.
 *
 * Two words and a number, which reads as a name rather than an id and leaves
 * room for roughly a third of a million combinations before collisions matter.
 */
export function generateFriendlyName(random: () => number = Math.random): string {
  const adjective = pick(FRIENDLY_ADJECTIVES, random);
  const noun = pick(FRIENDLY_NOUNS, random);
  const number = Math.floor(random() * 900) + 100;
  return `${adjective}-${noun}-${number}`;
}

/**
 * A slug nobody else holds.
 *
 * Appends a counter rather than random noise so the second Jay is `jay-2`,
 * which is guessable and readable, instead of something that looks generated.
 */
export function uniqueSlug(preferred: string, taken: ReadonlySet<string>): string {
  if (!taken.has(preferred)) {
    return preferred;
  }

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${preferred.slice(0, SLUG_MAX_LENGTH - String(suffix).length - 1)}-${suffix}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  return `${preferred.slice(0, 20)}-${Date.now().toString(36)}`;
}

/** What a member typed, trimmed and capped; null when they cleared it. */
export function normalizeDisplayName(input: string | null | undefined): string | null {
  const trimmed = String(input ?? "").trim().replace(/\s+/g, " ").slice(0, DISPLAY_NAME_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The name to show for an account.
 *
 * Falls back through what the member chose, then the nickname the invite gave
 * them, then their slug — so something readable always renders rather than a
 * blank where a name should be.
 */
export function resolveDisplayName(account: {
  displayName?: string | null;
  nickname?: string | null;
  slug?: string | null;
}): string {
  return account.displayName?.trim() || account.nickname?.trim() || account.slug || "Member";
}
