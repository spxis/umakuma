/**
 * Everything the WaniKani connection page says, in one map for the locale layer.
 *
 * The welcome wizard asks for a token once, in a step that is meant to be
 * skipped. This page is the other half of that promise: somewhere to come back
 * to, that says plainly what a connection is for before asking for anything.
 */

/** Where WaniKani keeps the tokens, linked rather than described. */
export const WANIKANI_TOKENS_URL = "https://www.wanikani.com/settings/personal_access_tokens";

export const CONNECT_COPY = {
  title: "WaniKani",
  heading: "Connect your WaniKani account",
  lead: "UmaKuma works without WaniKani. Connecting one adds your own reviews to it — the same items, the same schedule, answered here.",

  unlockHeading: "What connecting adds",
  unlocked: [
    {
      title: "Your reviews and lessons",
      body: "The queue you already have, answered here. Every review goes back to WaniKani.",
    },
    {
      title: "The Library Explorer",
      body: "All sixty levels, in the order WaniKani teaches them, with what you have learned marked.",
    },
    {
      title: "Your level and progress",
      body: "Level, item spread and burned counts, kept in step with your WaniKani account.",
    },
    {
      title: "A place on the leaderboard",
      body: "Standings are built from WaniKani progress, so an account without one is left off rather than ranked at zero.",
    },
  ],

  keepsHeading: "What you keep either way",
  keeps:
    "The maps, the daily challenge, every game, JLPT and school-grade study, your lists and your own libraries. None of it asks for a token.",

  stepsHeading: "Getting a token",
  steps: [
    {
      title: "Open your WaniKani API tokens",
      body: "Sign in to WaniKani, then Settings, then API Tokens.",
    },
    {
      title: "Generate a new token",
      body: "Tick assignments:start and reviews:create. Without those two, lessons and reviews you do here cannot reach WaniKani.",
    },
    {
      title: "Paste it below",
      body: "We check it with WaniKani first, so you see the account it resolved to rather than finding out days later.",
    },
  ],
  stepsAction: "Open WaniKani API tokens",

  tokenLabel: "WaniKani API token",
  tokenHint: "Stored encrypted, never shown again, and never sent anywhere but WaniKani.",
  connect: "Connect",
  connecting: "Checking with WaniKani…",
  failed: "Could not reach WaniKani. Check the token and try again.",
  connectedAs: "Connected as",

  connectedHeading: "Your account is connected",
  connectedLead: "Your reviews, lessons and level come from WaniKani. This is where the connection is replaced if the token ever stops working.",
  connectedLevel: "Level",
  connectedSynced: "Last synced",
  connectedNever: "Not synced yet",
  connectedBody:
    "Reviews, lessons and your level come from this account. The token is encrypted here and cannot be read back — if it stops working, generate a new one and replace it.",
  replace: "Replace token",
  replaceCancel: "Never mind",
  replaceHeading: "Replace your token",
  replaceBody: "A new token takes over from the old one straight away. It has to belong to the same WaniKani account.",

  notConnected: "Not connected",
  profileLink: "Connect WaniKani",

  /*
   * What a member reads when they reach a page that reads WaniKani's data and
   * they have no connection. It replaces the surface rather than sitting above
   * it: the Study page used to answer in red and then draw its full filter
   * panel over nothing, which reads as breakage rather than as a page that
   * needs something.
   */
  gateHeading: "This needs a WaniKani connection",
  gateAction: "Connect WaniKani",
  gateKeepsHeading: "Open to you either way",
  /** The other way on, per page: something the member can do right now. */
  gateAddLibrary: "Add a library",
  gateHistory: "History",
} as const;
