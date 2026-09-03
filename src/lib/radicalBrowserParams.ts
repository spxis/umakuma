/**
 * The radicals page's query parameter.
 *
 * Its own module because the address is built in the browser and read on the
 * server, and the server side of that reads the radical index - which is
 * `server-only`. Importing the reader for one string took Prisma into the
 * client bundle once already, on the practice sheet.
 */
export const RADICAL_BROWSER_PARAMS = { parts: "parts" } as const;
