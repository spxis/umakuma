import type { SimPersona } from "./balanceSimulator";

/**
 * Twenty people, with lives.
 *
 * The first set of personas were adjectives — devoted, steady, gamer — and
 * they were fine for pacing arithmetic and useless for judging whether the
 * system is fair. "Ambitious" does not tell you why somebody vanishes for
 * three weeks; "a teacher in her first year" does, and it tells you it will
 * happen again every September.
 *
 * Each carries a `story` because the numbers underneath it are a claim about
 * a real person, and a claim you can read is a claim you can argue with. If a
 * setting looks wrong for one of these, the story is where to check whether
 * the persona or the setting is at fault.
 *
 * `attendance` is the share of days they open the site at all; `holidayDays`
 * is one unbroken absence in the year, which is where vacation rules get
 * tested. Accuracy is the cruellest number in here: it decides how fast items
 * reach Guru, and a wrong answer costs the review plus every repetition it
 * undoes.
 */

export type StoriedPersona = SimPersona & { story: string };

export const SIM_PERSONAS_STORIED: StoriedPersona[] = [
  {
    id: "jhs-teacher-japan",
    label: "ALT teaching English in Japan",
    story:
      "First year on the JET Programme in rural Akita. Surrounded by Japanese all day and motivated by needing it, but exhausted every evening and away for two weeks at New Year.",
    attendance: 0.85, reviewsPerDay: 60, lessonsPerDay: 12, gamesPerDay: 2, accuracy: 0.84, sessionHours: [7, 21], sitsExams: true, holidayDays: 14,
  },
  {
    id: "uni-student-major",
    label: "University student, Japanese major",
    story:
      "Third year, sits the JLPT every December. Studies hard in term and disappears entirely over the summer, which is the pattern that matters here.",
    attendance: 0.8, reviewsPerDay: 90, lessonsPerDay: 20, gamesPerDay: 2, accuracy: 0.88, sessionHours: [9, 14, 22], sitsExams: true, holidayDays: 45,
  },
  {
    id: "uni-student-elective",
    label: "University student, Japanese as an elective",
    story:
      "Taking it alongside engineering because it sounded interesting. Enthusiastic in September, thinner by March, and honest that it is the fourth priority of four.",
    attendance: 0.45, reviewsPerDay: 30, lessonsPerDay: 8, gamesPerDay: 1, accuracy: 0.74, sessionHours: [22], sitsExams: false, holidayDays: 30,
  },
  {
    id: "work-visa-tokyo",
    label: "On a work visa in Tokyo, office job",
    story:
      "Engineer at a Japanese company, meetings in Japanese he half follows. Needs business register more than kanji count, studies on the train, and travels for work about a month a year.",
    attendance: 0.75, reviewsPerDay: 50, lessonsPerDay: 10, gamesPerDay: 1, accuracy: 0.8, sessionHours: [8, 19], sitsExams: true, holidayDays: 21,
  },
  {
    id: "lifer-in-japan",
    label: "Living in Japan long term, married in",
    story:
      "Twelve years there, fluent in speech and functionally illiterate, which is a common and frustrating shape. Reads slowly, high accuracy on anything spoken, patchy on anything only ever seen written.",
    attendance: 0.7, reviewsPerDay: 40, lessonsPerDay: 8, gamesPerDay: 1, accuracy: 0.86, sessionHours: [7, 20], sitsExams: false, holidayDays: 10,
  },
  {
    id: "commuter-japan",
    label: "Back and forth to Japan on business",
    story:
      "Four trips a year, a fortnight each. Studies hard before a trip and not at all during one, which makes their year a sawtooth rather than a line.",
    attendance: 0.55, reviewsPerDay: 70, lessonsPerDay: 12, gamesPerDay: 2, accuracy: 0.79, sessionHours: [7, 22], sitsExams: false, holidayDays: 56,
  },
  {
    id: "retiree",
    label: "Retired, learning for the pleasure of it",
    story:
      "Every morning with coffee, without fail, and in no hurry whatsoever. The most consistent attendance of anyone here and the smallest daily volume.",
    attendance: 0.97, reviewsPerDay: 30, lessonsPerDay: 5, gamesPerDay: 1, accuracy: 0.83, sessionHours: [8, 15], sitsExams: false, holidayDays: 21,
  },
  {
    id: "parent-young-kids",
    label: "Parent of small children",
    story:
      "Twenty minutes after bedtime, if bedtime went well. Cannot promise any given day and will not be made to feel bad about it — the persona the rest-day allowance exists for.",
    attendance: 0.6, reviewsPerDay: 25, lessonsPerDay: 4, gamesPerDay: 1, accuracy: 0.81, sessionHours: [21], sitsExams: false, holidayDays: 14,
  },
  {
    id: "anime-teen",
    label: "Teenager who got here through anime",
    story:
      "Enormous listening vocabulary, no reading. Bursts of four hours followed by a fortnight of nothing, and treats the games as the main event.",
    attendance: 0.5, reviewsPerDay: 80, lessonsPerDay: 18, gamesPerDay: 4, accuracy: 0.72, sessionHours: [17, 23], sitsExams: false, holidayDays: 21,
  },
  {
    id: "exam-crammer",
    label: "Sitting N2 in eleven weeks",
    story:
      "Deadline-driven and knows it. Punishing volume, thin retention, and will stop dead the day after the exam whatever the result.",
    attendance: 0.95, reviewsPerDay: 160, lessonsPerDay: 30, gamesPerDay: 0, accuracy: 0.7, sessionHours: [7, 12, 17, 22], sitsExams: true, holidayDays: 0,
  },
  {
    id: "heritage-speaker",
    label: "Heritage speaker relearning the writing",
    story:
      "Japanese mother, spoken fluency, left school in Canada at seven. Knows every word the moment they see the reading, which makes their accuracy high and their patience with beginner material low.",
    attendance: 0.65, reviewsPerDay: 70, lessonsPerDay: 15, gamesPerDay: 2, accuracy: 0.91, sessionHours: [9, 21], sitsExams: true, holidayDays: 14,
  },
  {
    id: "shift-worker",
    label: "Nurse on rotating shifts",
    story:
      "Four days on, four off, and the four on are impossible. Not unmotivated — unavailable, which the system should be able to tell apart.",
    attendance: 0.5, reviewsPerDay: 55, lessonsPerDay: 10, gamesPerDay: 1, accuracy: 0.82, sessionHours: [8], sitsExams: false, holidayDays: 14,
  },
  {
    id: "wanikani-refugee",
    label: "Came from WaniKani at level 30",
    story:
      "Arrives already knowing a great deal, imports their progress, and starts around UmaKuma 40. Impatient with anything below where they stand.",
    attendance: 0.85, reviewsPerDay: 85, lessonsPerDay: 15, gamesPerDay: 2, accuracy: 0.87, sessionHours: [7, 13, 21], sitsExams: true, holidayDays: 14,
  },
  {
    id: "absolute-beginner-adult",
    label: "Absolute beginner, adult, self-taught",
    story:
      "Has never learned a language before and does not know what is normal. The most likely of anyone here to conclude they are bad at this and stop — which is a design problem, not a personal one.",
    attendance: 0.7, reviewsPerDay: 35, lessonsPerDay: 6, gamesPerDay: 2, accuracy: 0.68, sessionHours: [20], sitsExams: false, holidayDays: 14,
  },
  {
    id: "child-learner",
    label: "Nine-year-old, doing it with a parent",
    story:
      "Short sessions, loves the games, needs the sticker more than the schedule. Attendance depends entirely on whether the parent remembers.",
    attendance: 0.55, reviewsPerDay: 15, lessonsPerDay: 3, gamesPerDay: 4, accuracy: 0.76, sessionHours: [17], sitsExams: false, holidayDays: 21,
  },
  {
    id: "high-school-class",
    label: "High schooler, Japanese class",
    story:
      "Doing it because it is timetabled. Term-time only, zero over the summer, and the marks matter more than the language does.",
    attendance: 0.6, reviewsPerDay: 40, lessonsPerDay: 8, gamesPerDay: 2, accuracy: 0.75, sessionHours: [16, 21], sitsExams: true, holidayDays: 60,
  },
  {
    id: "polyglot",
    label: "Serial language learner, fourth language",
    story:
      "Knows exactly how to study and has done this before. Very high accuracy, high volume, and the highest risk of leaving for the next language once the novelty passes.",
    attendance: 0.8, reviewsPerDay: 110, lessonsPerDay: 22, gamesPerDay: 1, accuracy: 0.93, sessionHours: [6, 12, 20], sitsExams: true, holidayDays: 30,
  },
  {
    id: "very-busy-professional",
    label: "Consultant, travels constantly",
    story:
      "Wants this badly and has almost no time. Ten minutes in an airport, three days missed, ten minutes again — the case where an unforgiving streak does real damage.",
    attendance: 0.4, reviewsPerDay: 20, lessonsPerDay: 3, gamesPerDay: 1, accuracy: 0.78, sessionHours: [7], sitsExams: false, holidayDays: 30,
  },
  {
    id: "returner-after-years",
    label: "Studied years ago, coming back",
    story:
      "Did two years at university a decade ago. Remembers more than they expect on kanji and almost nothing on vocabulary, and is quietly embarrassed to be starting again.",
    attendance: 0.65, reviewsPerDay: 50, lessonsPerDay: 10, gamesPerDay: 2, accuracy: 0.79, sessionHours: [8, 21], sitsExams: true, holidayDays: 45,
  },
  {
    id: "family-together",
    label: "Family learning together for a trip",
    story:
      "Booked three weeks in Japan next spring and studying as a household. Sharp motivation with a hard deadline, and an open question about what happens the week after they get home.",
    attendance: 0.75, reviewsPerDay: 35, lessonsPerDay: 8, gamesPerDay: 3, accuracy: 0.8, sessionHours: [18], sitsExams: false, holidayDays: 21,
  },
];
