/** Everything the UmaKuma study session says. */
export const UK_STUDY_COPY = {
  title: "Study as UmaKuma",
  subtitle: "Our own ladder, no WaniKani account needed.",
  level: "UmaKuma level",
  lessons: "Lessons",
  reviews: "Reviews",
  upcoming: "Due later today",
  startLessons: "Start lessons",
  doReviews: "Do reviews",
  nothingDue: "Nothing due. Come back when the next batch comes round.",
  nothingToLearn: "Nothing new at this level. Clear your reviews to move up.",
  reveal: "Show me",
  loading: "Reading your queue…",
  importHeading: "You have WaniKani progress",
  /* Says what it will do before it does it: this raises a floor, and a floor
     never comes back down. */
  importOffer: (wkLevel: number, floor: number, matched: number) =>
    `WaniKani level ${wkLevel}. We can carry ${matched.toLocaleString("en-CA")} items across at the stage you left them, which starts you at UmaKuma level ${floor} instead of 1.`,
  importAction: "Bring my progress over",
  importing: "Carrying it across…",
  imported: (level: number, matched: number) =>
    `Done. ${matched.toLocaleString("en-CA")} items carried, and you are at UmaKuma level ${level}.`,
  /* Named rather than hidden: a member who counts the difference deserves the
     reason, and the reason is not a bug. */
  importUnmatched: (count: number) =>
    `${count} of WaniKani's radicals have no character we teach — they are drawn, not written — so those did not come across.`,
  failed: "Could not read your queue. Try again?",
  done: "That's the batch. Well done.",
  levelledUp: (level: number) => `Level ${level}. That was the last one.`,
  /* Names what the level is gated on. Level 1 teaches no kanji, so saying
     "0 of 15 kanji" there was both wrong and discouraging. */
  progress: (passed: number, total: number, gate: string) => `${passed} of ${total} ${gate} at Guru`,
  remaining: (left: number) => `${left} to go`,
  readingLabel: "Reading",
  meaningLabel: "Meaning",
} as const;

/** How many items one sitting hands over at a time. */
export const UK_STUDY_BATCH = 10;
