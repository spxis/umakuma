import type { CatalogSyncMode } from "./catalogSync.types";

export const DEFAULT_SUBJECTS_PATH = "/subjects?types=radical,kanji,vocabulary";
export const FULL_SYNC_LOCK_MS = 45 * 60 * 1000;
export const INCREMENTAL_SYNC_LOCK_MS = 30 * 60 * 1000;
export const GLOBAL_STATE_ID = "global";
export const DEFAULT_ACCOUNT_MATCH = "john";

export function lockDurationMsForMode(mode: CatalogSyncMode): number {
  return mode === "full" ? FULL_SYNC_LOCK_MS : INCREMENTAL_SYNC_LOCK_MS;
}
