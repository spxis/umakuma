export const ADMIN_XP_TYPES_COPY = {
  heading: "What XP is worth",
  blurb:
    "The code decides which kinds of XP exist; this decides what each one pays. Changes take effect immediately, without a deploy — and once you have priced a kind here, the seeder stops overwriting it, so a later release cannot quietly undo the decision. Values end in a 0 or a 5.",
  worth: "XP",
  cap: "Daily cap",
  uncapped: "none",
  save: "Save",
  saved: (label: string) => `${label} repriced.`,
  saveFailed: "Could not save that.",
  loading: "Reading the XP types…",
  priced: "Priced",
  pricedHint: "Set here rather than in the code. The seeder leaves it alone.",
} as const;
