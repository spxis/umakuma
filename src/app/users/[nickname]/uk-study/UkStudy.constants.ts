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
  gotIt: "I knew it",
  missedIt: "I missed it",
  loading: "Reading your queue…",
  failed: "Could not read your queue. Try again?",
  done: "That's the batch. Well done.",
  levelledUp: (level: number) => `Level ${level}. That was the last one.`,
  /* Names what the level is gated on. Level 1 teaches no kanji, so saying
     "0 of 15 kanji" there was both wrong and discouraging. */
  progress: (passed: number, total: number, gate: string) => `${passed} of ${total} ${gate} at Guru`,
  remaining: (left: number) => `${left} to go`,
  readingLabel: "Reading",
  meaningLabel: "Meaning",
  /* Self-graded for now, and it says so rather than pretending to mark. */
  honesty: "You mark your own answer. Typed grading comes later.",
} as const;

/** How many items one sitting hands over at a time. */
export const UK_STUDY_BATCH = 10;
