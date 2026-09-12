/** What the members page says, in one map for the locale layer. */
export const MEMBERS_COPY = {
  title: "Members",
  subtitle: "Everyone here, newest first.",
  blurb:
    "Who has joined, most recent at the top. A member who chose Private is not listed; simulated accounts never are.",
  joined: (date: string) => `Joined ${date}`,
  /* Under the join date: how long ago, which is what a reader scanning for
     "who is new" actually wants. */
  ago: (relative: string) => relative,
  first: "The first member",
  empty: "Nobody is listed yet.",
  emptyHint: "Members appear here once they are approved and have not chosen Private.",
  count: (shown: number) => `${shown.toLocaleString("en-US")} ${shown === 1 ? "member" : "members"}`,
  sharedPlace: (place: number) => `Joined together, ${place}`,
  you: "You",
  levels: (un: string | null, wk: string | null) => [un, wk].filter(Boolean).join(" · "),
  noLevel: "Not placed yet",
} as const;
