/*
 * Every country in memory, for the whole test run.
 *
 * The app loads one country at a time now, so the registry starts empty and a
 * helper asked about Japan before anything fetched it gets nothing. Tests are
 * not the place to rehearse that - they are checking the maths and the copy -
 * so the world they run in is the one the server sees: all seven present.
 *
 * What this deliberately does not cover is a *browser* path that forgot to
 * load its country. `geoLazyLoading.test.ts` covers that from the other side,
 * by failing if a client module reaches for the whole set.
 */
import "@/lib/geoDatasetsAll";
