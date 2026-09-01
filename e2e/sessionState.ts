import path from "node:path";

/**
 * Where the signed-in state is written, and read back by everything that needs it.
 *
 * Its own module because Playwright refuses to let one test file import
 * another, and both `auth.setup.ts` (which writes it) and the specs (which
 * build contexts from it) need the same path.
 */
export const STORAGE_STATE = path.join(process.cwd(), "e2e", ".auth", "session.json");
