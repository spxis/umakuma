/**
 * What a newcomer reads before they have an account.
 *
 * Until now their first screen was a denial notice - "You do not have access
 * to that user page yet" - which says what they cannot do and nothing about
 * what the site is. This is the other half.
 *
 * Two things it has to land. First, that you do not need WaniKani: that
 * assumption is baked into most of the app's history and it is the single
 * thing most likely to make someone close the tab. Second, that nothing here
 * is permanent - the name and the visibility can both be changed later, so
 * neither question needs thinking about for long.
 *
 * Canadian spelling, and every string lives here rather than inline so the
 * eventual locale layer has one dictionary to swap.
 */

export const WELCOME_COPY = {
  heading: "Welcome to UmaKuma",
  subheading: "Learn Japanese with the people you live with. Short rounds, real progress, family bragging rights.",

  whatHeading: "What you can do here",
  what: [
    {
      title: "Find your way around Japan",
      body: "All forty-seven prefectures — where they are, and what they are called.",
    },
    {
      title: "Take the daily challenge",
      body: "Ten questions, the same set for everyone, one attempt a day.",
    },
    {
      title: "Play a quick round",
      body: "Match, Time Attack, Shiritori. Most take a couple of minutes.",
    },
    {
      title: "Bring your reviews, if you have them",
      body: "Already use WaniKani? Connect it later and your reviews come with you.",
    },
  ],

  noWanikaniHeading: "You do not need a WaniKani account",
  noWanikaniBody:
    "Plenty here works without one, starting with the map and the daily challenge. If you ever get one, you can connect it from your profile.",

  nameHeading: "What should we call you?",
  nameHint: "The name other members see. Change it whenever you like.",
  namePlaceholder: "Pick a name",

  visibilityHeading: "Who can see you?",

  stepOf: "Step",
  skip: "Skip",
  back: "Back",

  wanikaniHeading: "Do you use WaniKani?",
  wanikaniBody:
    "If you do, connecting it brings your reviews and your level across. If you do not, skip this - most of UmaKuma works without it, and you can connect later from your profile.",
  wanikaniTokenLabel: "WaniKani API token",
  wanikaniTokenHint:
    "Find it in WaniKani under Settings, API Tokens. We check it, encrypt it, and never show it again.",
  wanikaniConnect: "Connect",
  wanikaniConnecting: "Checking with WaniKani...",
  wanikaniConnected: "Connected as",
  wanikaniSkip: "I do not use WaniKani",

  /**
   * The placement step.
   *
   * Three doors, and the first one is not a consolation prize: most newcomers
   * belong on level 1 and should be able to say so in one click, without
   * sitting a test to prove it. The other two are for the two kinds of person
   * who arrive already reading - one with a WaniKani account behind them, one
   * without.
   */
  placementHeading: "How much Japanese do you already read?",
  placementBody:
    "Nothing here is permanent. The ladder only ever moves up, so whichever you pick, you cannot end up further back than you started.",

  placementBeginner: "Start me at level 1",
  placementBeginnerHint: "Radicals first, then the kanji built from them. The right way in if you are starting out.",
  placementTest: "Take the placement test",
  placementTestHint:
    "Eight questions a round, and we stop as soon as we know where you sit. Two minutes for most people.",
  placementWanikani: "Use my WaniKani progress",
  placementWanikaniHint: "Every review you have already earned, carried across item by item.",

  placementStarting: "Setting up the first round...",
  placementImporting: "Bringing your progress across...",
  placementFailed: "Could not start the placement test. Start at level 1 for now - the ladder can still move you up.",
  placementImportFailed: "Could not read your WaniKani progress. You can connect it again later from your profile.",

  probeBody: "Pick what each one means. Guess when you are not sure - we are reading the round, not the answer.",
  probeSubmit: "Next round",
  probeSubmitting: "Checking...",
  probeStop: "That is enough",
  probeUnanswered: "Pick an answer for every one, or stop the test here.",

  resultHeading: "Here is where you start",
  resultAction: "Carry on",

  jlptHeading: "Have you taken the JLPT?",
  jlptBody: "Only if you want it on your profile. It changes nothing about how you study here.",

  finish: "Finish",
  finishing: "Almost there...",

  submit: "Create my account",
  submitting: "Setting things up...",
  failed: "Could not create your account. Please try again.",

  /** Shown when the admin has signup set to approve people first. */
  pendingHeading: "You are all set",
  pendingBody:
    "Your account is waiting to be approved. You can look around in the meantime — you will not appear on any leaderboard until then.",
  pendingAction: "Have a look around",

  /**
   * Shown to an account the admin turned away.
   *
   * No reason given and no appeal form, because neither is safe to automate:
   * a reason tells someone acting in bad faith what to change, and a form
   * hands them a channel. Whoever belongs here knows who to ask in person.
   */
  rejectedHeading: "This account is closed",
  rejectedBody:
    "UmaKuma is a small family site, and this account is not active. If you think that is a mistake, ask whoever invited you.",
  rejectedAction: "Back to the front page",

  /** Shown when someone lands here but signup is invite-only. */
  closedHeading: "UmaKuma is invite only right now",
  closedBody: "If someone gave you a code, you can use it to join. Otherwise, ask them for one.",
  closedAction: "I have a code",
} as const;

/** "Around level 35", so a member can see the test climbing. */
export function probeHeading(rung: number): string {
  return `Around level ${rung}`;
}

/** "Round 3 of 10". Named rather than counted, because most tests stop early. */
export function probeProgress(probeNumber: number, maxProbes: number): string {
  return `Round ${probeNumber} of ${maxProbes}`;
}

/**
 * What the result says, and what it never says.
 *
 * A test that is unsure still reports the level it found, never a smaller one.
 * Placing somebody below what they answered to be safe is the one outcome that
 * makes the whole thing worthless: the levels below are seeded into reviews
 * anyway, so an over-reach corrects itself within a week, while an under-reach
 * is a reader sent back through material they finished years ago.
 */
export function placementResultLine(level: number, confidence: "high" | "medium" | "low"): string {
  if (confidence === "high") {
    return `You start on level ${level}. Everything below it is in your reviews, so we can check we were right.`;
  }
  if (confidence === "medium") {
    return `You start on level ${level}. It may be a rung either way - your first reviews will settle it.`;
  }
  return `We think level ${level} - if that feels low, keep going and your reviews will lift it.`;
}

/** What the seeding did, in the two numbers a member cares about. */
export function placementSeedLine(seeded: number, seededMissed: number): string {
  const credited = `${seeded} ${seeded === 1 ? "item" : "items"} credited and due in a week`;
  if (seededMissed === 0) return `${credited}.`;
  return `${credited}, and the ${seededMissed} you missed are waiting for you now.`;
}
