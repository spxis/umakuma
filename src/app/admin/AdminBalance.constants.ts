/** Copy for the balance simulator, in one module for the locale layer. */

const count = (value: number) => value.toLocaleString("en-CA");
const share = (value: number) => `${Math.round(value * 100)}%`;

export const ADMIN_BALANCE_COPY = {
  label: "Modelling",
  title: "Balance simulator",
  description:
    "Twenty-four people, a day at a time, on the real intervals and the real ladder. It writes nothing — change an award or a rank cost, run it again, and see who it helped and who it did not.",

  who: "Who",
  everyone: "Everyone",
  horizon: "Days",
  seed: "Seed",
  seedHint: "The same seed twice is the same run twice. Change it to see how much of a difference was luck.",
  lessonGate: "Lesson gate",
  lessonGateOff: "No gate",
  lessonGateHint:
    "Hold new lessons while this many items are still below Guru. Off is the honest default: a lesson rate the review budget cannot service is a finding, not something to hide.",
  throttle: "Anki throttle",
  throttleHint:
    "Take no lessons on a day that opens already behind on reviews — Anki's default, where new cards come out of the same daily limit. Over the whole set it takes the average backlog from about seventy-four items to eleven and costs a third of a level in fifty. Nothing here does this today.",
  compareSittings: "Compare sittings",
  compareSittingsHint:
    "Runs the same person at one, two, three and four sittings a day, everything else held.",
  run: "Run it",
  running: "Running…",
  reset: "Back to their own settings",
  resetConfirm: "Put every setting back to the way the persona is written?",
  ranTitle: (days: number, people: number) =>
    `${count(people)} ${people === 1 ? "person" : "people"} over ${count(days)} days.`,
  failed: "Could not run the simulation.",
  ran: "Simulation finished.",
  idle: "Nothing has been run yet.",
  loading: "Reading the personas…",

  settings: "Their day",
  attendance: "Attendance",
  reviewsPerDay: "Reviews a day",
  lessonsPerDay: "Lessons a day",
  gamesPerDay: "Games a day",
  accuracy: "Accuracy",
  sessionHours: "Sittings (hours, comma separated)",
  holidayDays: "Holiday (days)",
  startLevel: "Starting level",
  sitsExams: "Sits level tests",

  columns: {
    person: "Person",
    sittings: "Sittings",
    rank: "XP rank",
    level: "Level",
    daysStudied: "Days studied",
    reviews: "Reviews",
    wrong: "Wrong",
    wrongShare: "Wrong share",
    lessons: "Lessons",
    games: "Games",
    xp: "XP",
    xpReviews: "XP · reviews",
    xpLessons: "XP · lessons",
    xpGames: "XP · games",
    xpLevels: "XP · levels",
    xpStreaks: "XP · streaks",
    xpQuality: "XP · doing it well",
    inFlight: "In flight",
    backlog: "Backlog",
    load: "Load",
    streak: "Longest streak",
    rest: "Rest days",
    holiday: "Holiday",
  },

  loadHint:
    "The reviews their lessons will eventually demand, against the reviews they actually did. Above one and the queue has to grow.",
  backlogHint: "Items that came due and never got answered. A backlog that grows every month is the thing to worry about.",
  inFlightHint: "Started and not yet burned. Guru is not the end — an item goes on to a week, a fortnight, a month and four months.",
  holidayKept: "Kept",
  holidayLost: "Broke",
  holidayNone: "—",
  restOf: (spent: number, allowed: number) => `${count(spent)} of ${count(allowed)}`,
  rankOf: (rank: number, name: string) => (name ? `${rank} · ${name}` : String(rank)),
  percent: share,
  number: count,
  days: (value: number | null) => (value === null ? "—" : `${count(value)} d`),

  sittingsTitle: "The same person, sitting down more often",
  sittingsBlurb:
    "Stage 1 comes back in four hours and stage 2 in eight, so a second sitting can catch an item the same day. Stages three and four wait 23 and 47 hours, which no number of sittings compresses — which is why the second sitting is worth a great deal and the fourth almost nothing. And once the review budget is what binds rather than the schedule, the whole effect goes away: something is always due, so when you sit down stops deciding anything.",

  importTitle: "Arriving from WaniKani",
  importBlurb:
    "What a member who earned the level here had banked getting there, beside what an import is actually paid. The gap is the argument: paying for the knowledge would seat a day-one importer above somebody who turned up every day for most of a year. The flat award is for the act of importing, which is something they did here; the entitlement floor is what a level-20 queue actually needs.",
  importLevel: "Imported at",
  importEarned: "Earned here",
  importEarnedDays: "Took them",
  importFlat: "Flat award",
  importFloor: "Entitlement floor",
  importFloorDetail: (games: number, rest: number, weeks: number) =>
    `${count(games)} games/day · ${count(rest)} rest days · ${count(weeks)} vacation weeks`,
} as const;
