export const ADMIN_SRS_RULES_COPY = {
  heading: "How the scheduler scores",
  blurb:
    "Every rule here is off until you switch it on, and every change takes effect on the next review with no deploy in between. docs/SRS_MECHANISMS.md lists what other systems do about each of these and why we made the call we did.",
  save: "Save rules",
  saved: "Scoring rules updated.",
  saveFailed: "Could not save that.",
  loading: "Reading the scoring rules…",
  notBuilt: "Not built yet — the switch does nothing until it is.",
  rules: {
    throttleLessonsOnBacklog: {
      label: "Hold lessons back while reviews are waiting",
      note: "Anki does this by default. Our own simulator measured it across twenty-four learners: average backlog down 85%, progress down 0.8%. It costs people who study once a day the most, because they open behind more often.",
    },
    backlogThreshold: {
      label: "Reviews waiting before lessons stop",
      note: "Measured when the day's first lesson is asked for.",
    },
    leechRule: {
      label: "Flag an item that keeps failing",
      note: "WaniKani is the only system we surveyed without one. Flagging only — nothing is suspended or hidden.",
    },
    leechWrongThreshold: {
      label: "Wrong answers before an item is a leech",
      note: "Anki uses eight.",
    },
    leechMinStage: {
      label: "Stage at which an item stops counting as a leech",
      note: "SuperMemo's refinement: an item that has climbed well is not a leech however badly it started.",
    },
    ghostReviews: {
      label: "Give a missed item its own short track",
      note: "Bunpro's ghost reviews — the main schedule keeps moving while the missed item is drilled separately.",
    },
  },
} as const;
