import "server-only";

import "./geoDatasetsAll";

/**
 * All seven countries, on the server only.
 *
 * The `server-only` marker is the compiler's half of the rule and
 * `geoLazyLoading.test.ts` is the other: a client component that reached for
 * this would fail the build, and one that reached past it for
 * `geoDatasetsAll` would fail the test.
 */
export const GEO_SERVER_DATASETS_READY = true;
