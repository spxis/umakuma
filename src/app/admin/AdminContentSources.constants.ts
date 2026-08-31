/**
 * Copy for the school-grade and map data panels.
 *
 * One module for the group, per the repo's constants rule, so the eventual
 * locale layer swaps this file rather than editing two components.
 */
export const ADMIN_CONTENT_SOURCES_COPY = {
  loading: "Reading the data sources…",
  loadFailed: "Could not read the data sources.",
  needsAuth: "Sign in as an admin to see the data sources.",

  grades: {
    label: "Grades",
    title: "Japanese school grades",
    description:
      "Kanji by school year. The files ship in the repo and a seed script loads them into the database — this shows whether that has happened.",
    inFiles: "In files",
    inDatabase: "In database",
    standard: "Standard",
    filesShort: "files",
    databaseShort: "db",
    inSync: "Every grade matches between the shipped files and the database.",
    driftHeading: "The files and the database disagree",
    driftBody:
      "A grade file has changed without the seed being re-run, so the explorer is showing the older list. Run:",
    seedCommand: "pnpm db:seed:school-grades",
  },

  maps: {
    label: "Maps",
    title: "Map regions",
    description:
      "The prefectures, states and provinces Map mode plays on. Generated into the repo from public sources rather than synced, so what matters is whether the geometry is real and complete.",
    regions: "regions",
    detail: "Avg path points",
    viewBox: "Canvas",
    orphans: "No neighbours",
    orphansBody: "Regions with no shared border, which cannot supply neighbouring distractors:",
    sourcePrefix: "Source:",
    regenerateHeading: "Regenerating",
    regenerateBody:
      "Map data is built from its source, never hand-edited — a hand-tweaked path is lost on the next build. Rebuild with:",
    // map:build is Japan only; map:build:all is the one that rebuilds all three.
    regenerateCommand: "pnpm map:build:all",
  },
} as const;
