/** What the admin preview strip says, in one map for the locale layer. */
export const VIEWER_PREVIEW_COPY = {
  label: "Seeing as",
  /* Loud on purpose: a board quietly showing fewer rows than usual reads as a
     bug rather than as a preview somebody turned on. */
  previewing: () => "Previewing — you are not seeing everything",
  asAdmin: "Admin",
  asMember: "A member",
  asPublic: "The public",
} as const;
