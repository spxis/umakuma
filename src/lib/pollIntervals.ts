/**
 * How often the study surfaces re-ask the server.
 *
 * These were 30 seconds, which is far more often than anything they show can
 * change: review counts move on WaniKani's SRS schedule, which is measured in
 * hours, and the queue is mutated locally as a member answers rather than
 * discovered by polling. So the poll was never the mechanism - it is a safety
 * net for a session left open while something changed elsewhere.
 *
 * The cost of getting that wrong is not small. One open tab at 30 seconds is
 * 120 serverless invocations an hour and roughly 240 database queries, and an
 * evening across the family ran to thousands of both. Worse, Neon suspends its
 * compute after five minutes idle and bills for the time it is awake - a
 * thirty-second poll means that timer never fires, so the database stays
 * running for as long as anybody has the study page open.
 *
 * Five minutes sits just past that suspend threshold on purpose: a closed
 * laptop now lets the database go to sleep. `revalidateOnFocus` stays on
 * everywhere this is used, so coming back to the tab still refreshes at once
 * and the slower poll is never what a member waits on.
 */
export const STUDY_POLL_INTERVAL_MS = 300_000;

/** Neon's free-tier idle timeout, which the interval above must clear. */
export const NEON_AUTOSUSPEND_MS = 300_000;
