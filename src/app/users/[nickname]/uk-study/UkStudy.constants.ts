/** Everything the UmaKuma study session says. */
export const UK_STUDY_COPY = {
  /* Barely visible on purpose: the stamp says which arrangement of the ladder
     an answer was recorded against, for the day somebody asks why a level
     moved. Not a number a member is meant to read every session. */
  curriculumStamp: (stream: string, version: string) => `${stream} curriculum ${version}`,
  title: "Study as UmaKuma",
  subtitle: "Our own ladder, no WaniKani account needed.",
  level: "UmaKuma level",
  lessons: "Lessons",
  reviews: "Reviews",
  upcoming: "Due later today",
  openStudy: "Open Study",
  startLessons: "Start lessons",
  doReviews: "Do reviews",
  nothingDue: "Nothing due. Come back when the next batch comes round.",
  /* Held, not finished. An empty lesson list with no explanation is the
     cruellest possible reading of a backlog. */
  lessonsHeld: (due: number) =>
    `Lessons are on hold while you have ${due} reviews waiting. Clear some and they will come back.`,
  nothingToLearn: "Nothing new at this level. Clear your reviews to move up.",
  reveal: "Show me",
  /* A test standing between the member and the next level. The two kinds
     read differently on purpose: one is practice, the other is a claim. */
  testWaiting: {
    checkpoint: (level: number) => `Level ${level} is done. A short checkpoint is waiting — it opens the next level whatever you score.`,
    jlpt_final: (level: number, nLevel: number) => `Level ${level} is done and that completes N${nLevel}. The N${nLevel} test has to be passed before the next level opens.`,
  },
  sitTest: "Sit the test",
  /* The latch, named. WaniKani has this rule and never says so on screen. */
  passed: "Passed",
  passedHint: "Reached Guru once, so it counts toward the level for good - even if it slips back.",
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

