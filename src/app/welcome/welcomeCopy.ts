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

  /** Shown when someone lands here but signup is invite-only. */
  closedHeading: "UmaKuma is invite only right now",
  closedBody: "If someone gave you a code, you can use it to join. Otherwise, ask them for one.",
  closedAction: "I have a code",
} as const;
