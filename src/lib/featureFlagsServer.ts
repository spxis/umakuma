import "server-only";

import {
  FEATURE_FLAG_DEFINITIONS,
  footerChipsFor,
  resolveFlagStates,
  type FeatureFlagKey,
  type FeatureFlagState,
} from "@/lib/featureFlags";
import { prisma } from "@/lib/prisma";

/**
 * Reads are cached briefly per server instance so a flag check on a hot path
 * does not become a database round trip per request. A toggle busts the cache
 * on the instance that served it; other instances catch up within the TTL,
 * so a flip is global within about half a minute.
 */
const CACHE_TTL_MS = 30_000;

let cachedStates: FeatureFlagState[] | null = null;
let cachedAtMs = 0;

export async function loadFeatureFlagStates(): Promise<FeatureFlagState[]> {
  const nowMs = Date.now();
  if (cachedStates && nowMs - cachedAtMs < CACHE_TTL_MS) {
    return cachedStates;
  }

  const rows = await prisma.featureFlag.findMany();
  cachedStates = resolveFlagStates(rows);
  cachedAtMs = nowMs;
  return cachedStates;
}

export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const states = await loadFeatureFlagStates();
  return states.find((state) => state.key === key)?.enabled ?? FEATURE_FLAG_DEFINITIONS[key].defaultEnabled;
}

export async function setFeatureFlag(key: FeatureFlagKey, enabled: boolean): Promise<void> {
  await prisma.featureFlag.upsert({
    where: { key },
    update: { enabled },
    create: { key, enabled },
  });

  cachedStates = null;
}

/**
 * The concise mode chips the footer wears, for whichever flags are on.
 *
 * Never throws: the root layout calls this, and Next prerenders the static
 * pages at build time where no DATABASE_URL exists — the CI build broke the
 * first time the layout touched Prisma. A build-time or outage failure means
 * no chips, which is the right face for a page that cannot know better.
 */
export async function loadFooterModeChips(): Promise<string[]> {
  // No database configured means a build-time prerender: do not even wake
  // Prisma, whose own error logging would still spray the build output.
  if (!process.env.DATABASE_URL) {
    return [];
  }

  try {
    return footerChipsFor(await loadFeatureFlagStates());
  } catch {
    return [];
  }
}
