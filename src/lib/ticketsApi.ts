/**
 * What the tickets API shares between its two routes and their tests.
 *
 * An admin session is one person pressing buttons; the limiter is for a
 * script in a loop, so it is generous and keyed by address.
 */
export const ADMIN_TICKETS_RATE_LIMIT = { windowMs: 60 * 1000, maxRequests: 120 } as const;
