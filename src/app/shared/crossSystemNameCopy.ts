import { LEVEL_SYSTEMS } from "@/lib/levelBadge";

/**
 * What the other system calls this, in one map for the locale layer.
 *
 * The prefixes are `levelBadge`'s, because a member reads `WK` and `UK` on
 * every chip on the site and a third spelling of the same two systems here
 * would be a third thing to learn.
 */
export const CROSS_SYSTEM_NAME_COPY = {
  wanikani: `${LEVEL_SYSTEMS.wanikani} meaning`,
  umakuma: `${LEVEL_SYSTEMS.umakuma} meaning`,
  wanikaniTitle: (name: string) => `WaniKani teaches this radical as ${name}`,
  umakumaTitle: (name: string) => `UmaKuma teaches this radical as ${name}`,
} as const;
