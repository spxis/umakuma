/**
 * What a member can reach, and what a WaniKani connection is the price of.
 *
 * An account no longer needs WaniKani, but the site was built when it did, so
 * the assumption survived in the places nobody thought of as WaniKani
 * features: a Study page that answered "This account has no WaniKani
 * connection" in red, a Library Explorer that rendered sixty levels of nothing,
 * a Stats page of zeros congratulating a member on a level gate they had
 * passed by never starting, and header links to all three.
 *
 * The fix is not a check at each of those; that is the kind that gets
 * forgotten on the fourth. It is one list of what the site can do, each entry
 * saying whether it reads WaniKani's data or the app's own, with the
 * navigation, the pages and the connection page all asking this rather than
 * deciding for themselves.
 *
 * The split is drawn from what a feature actually reads, not from where it
 * appears. Study needs the member's live SRS state, which only WaniKani has.
 * The games draw on the shared catalogue, so they never needed a token, and
 * neither do the maps, JLPT, the lists or a member's own libraries.
 */

export const MEMBER_CAPABILITIES = {
  /** The SRS queue: what is due, what is next, and answering it. */
  studyQueue: "studyQueue",
  /** The Library Explorer: sixty WaniKani levels with the member's progress on them. */
  wanikaniLibrary: "wanikaniLibrary",
  /** Level, item spread, burned counts - mirrors of WaniKani's own figures. */
  wanikaniProgress: "wanikaniProgress",
  /** A standing on the leaderboard, which is scored from WaniKani progress. */
  leaderboardRank: "leaderboardRank",
  /** JLPT kanji study, out of the app's own table. */
  jlptStudy: "jlptStudy",
  /** Kanji by school grade, out of the app's own table. */
  gradeStudy: "gradeStudy",
  /** Every game, which draws on the shared catalogue rather than an account. */
  games: "games",
  /** The maps: prefectures, states and provinces, static and identical for everyone. */
  maps: "maps",
  /** Uploaded study libraries, with their own SRS state in this app. */
  customLibraries: "customLibraries",
  /** Saved lists, trouble and favourites - the app's own tags. */
  lists: "lists",
  /** The news reader, which tokenizes text against the local catalogue. */
  newsReader: "newsReader",
  /** Study history: what the member answered here, recorded here. */
  studyHistory: "studyHistory",
} as const;

export type MemberCapabilityId = (typeof MEMBER_CAPABILITIES)[keyof typeof MEMBER_CAPABILITIES];

export type MemberCapability = {
  id: MemberCapabilityId;
  /** What a member calls it, in the one place the connection page reads from. */
  label: string;
  /** One line on what it is, or on why it cannot work without a connection. */
  detail: string;
  requiresWanikani: boolean;
};

export const MEMBER_CAPABILITY_DEFINITIONS: Record<MemberCapabilityId, MemberCapability> = {
  [MEMBER_CAPABILITIES.studyQueue]: {
    id: MEMBER_CAPABILITIES.studyQueue,
    label: "Your reviews and lessons",
    detail: "The queue you already have, answered here. Every review goes back to WaniKani.",
    requiresWanikani: true,
  },
  [MEMBER_CAPABILITIES.wanikaniLibrary]: {
    id: MEMBER_CAPABILITIES.wanikaniLibrary,
    label: "The Library Explorer",
    detail: "All sixty levels, in the order WaniKani teaches them, with what you have learned marked.",
    requiresWanikani: true,
  },
  [MEMBER_CAPABILITIES.wanikaniProgress]: {
    id: MEMBER_CAPABILITIES.wanikaniProgress,
    label: "Your level and progress",
    detail: "Level, item spread and burned counts, kept in step with your WaniKani account.",
    requiresWanikani: true,
  },
  [MEMBER_CAPABILITIES.leaderboardRank]: {
    id: MEMBER_CAPABILITIES.leaderboardRank,
    label: "A place on the leaderboard",
    detail: "Standings are built from WaniKani progress, so an account without one is left off rather than ranked at zero.",
    requiresWanikani: true,
  },
  [MEMBER_CAPABILITIES.jlptStudy]: {
    id: MEMBER_CAPABILITIES.jlptStudy,
    label: "JLPT study",
    detail: "Every kanji behind N5 to N1, from this app's own table.",
    requiresWanikani: false,
  },
  [MEMBER_CAPABILITIES.gradeStudy]: {
    id: MEMBER_CAPABILITIES.gradeStudy,
    label: "School grades",
    detail: "The kanji Japanese schools teach, grade by grade.",
    requiresWanikani: false,
  },
  [MEMBER_CAPABILITIES.games]: {
    id: MEMBER_CAPABILITIES.games,
    label: "Every game",
    detail: "Match, Time Attack, Shiritori, Map, Practice and the daily challenge.",
    requiresWanikani: false,
  },
  [MEMBER_CAPABILITIES.maps]: {
    id: MEMBER_CAPABILITIES.maps,
    label: "The maps",
    detail: "Japan's forty-seven prefectures, and the states and provinces beyond them.",
    requiresWanikani: false,
  },
  [MEMBER_CAPABILITIES.customLibraries]: {
    id: MEMBER_CAPABILITIES.customLibraries,
    label: "Your own libraries",
    detail: "Bring your own list of items and study it here, with its own review schedule.",
    requiresWanikani: false,
  },
  [MEMBER_CAPABILITIES.lists]: {
    id: MEMBER_CAPABILITIES.lists,
    label: "Lists, trouble and favourites",
    detail: "Anything you save or tag is this app's own, and stays.",
    requiresWanikani: false,
  },
  [MEMBER_CAPABILITIES.newsReader]: {
    id: MEMBER_CAPABILITIES.newsReader,
    label: "The news reader",
    detail: "Japanese news, read with the kanji levels taken from the local catalogue.",
    requiresWanikani: false,
  },
  [MEMBER_CAPABILITIES.studyHistory]: {
    id: MEMBER_CAPABILITIES.studyHistory,
    label: "Your study history",
    detail: "What you answered here, recorded here.",
    requiresWanikani: false,
  },
};

/** What a surface needs to know about the member it is rendering for. */
export type MemberAccess = {
  hasWanikani: boolean;
};

/** Whether this member may use this capability at all. */
export function canUseCapability(id: MemberCapabilityId, access: MemberAccess): boolean {
  return !MEMBER_CAPABILITY_DEFINITIONS[id].requiresWanikani || access.hasWanikani;
}

const ALL_CAPABILITIES: MemberCapability[] = Object.values(MEMBER_CAPABILITIES).map(
  (id) => MEMBER_CAPABILITY_DEFINITIONS[id],
);

/** What connecting WaniKani adds, in registry order. */
export function capabilitiesNeedingWanikani(): MemberCapability[] {
  return ALL_CAPABILITIES.filter((capability) => capability.requiresWanikani);
}

/** What a member has either way, in registry order. */
export function capabilitiesWithoutWanikani(): MemberCapability[] {
  return ALL_CAPABILITIES.filter((capability) => !capability.requiresWanikani);
}
