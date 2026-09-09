import { CONNECT_COPY } from "../wanikani/connectCopy";
import { PROFILE_COPY } from "./profileCopy";

export type ProfileFact = {
  label: string;
  value: string;
  hint?: string;
  /** A fact that is also a door: not connected, and here is the page that fixes it. */
  action?: { label: string; href: string };
};

/**
 * What the profile says about a member's WaniKani connection.
 *
 * Three states, not two. An account can hold a token whose first sync has not
 * landed - one connected a minute ago, or one whose sync failed - and the card
 * used to answer "Level 0" for it. Nobody is level zero: it reads as a
 * standing rather than as "not yet", and it is the same number the leaderboard
 * deliberately refuses to rank an account at.
 */
export function wanikaniFact(input: { connected: boolean; wkLevel: number | null; address: string }): ProfileFact {
  const href = `/users/${encodeURIComponent(input.address)}/wanikani`;

  if (!input.connected) {
    return {
      label: PROFILE_COPY.wanikani,
      value: PROFILE_COPY.wanikaniNone,
      action: { label: CONNECT_COPY.profileLink, href },
    };
  }

  const level = input.wkLevel;
  return {
    label: PROFILE_COPY.wanikani,
    value: level && level > 0 ? `${PROFILE_COPY.wanikaniLevel} ${level}` : PROFILE_COPY.wanikaniPending,
    hint: level && level > 0 ? PROFILE_COPY.wanikaniHint : PROFILE_COPY.wanikaniPendingHint,
    action: { label: CONNECT_COPY.replace, href },
  };
}

/**
 * The streak, on the page that is supposed to say how a member is doing.
 *
 * `resolveStreak` has computed this since the streak bonuses were wired, and
 * the only surface that ever asked was the XP history page - so the profile,
 * whose whole job is standing, was the one page that did not know.
 *
 * `activeToday` is worth saying out loud rather than leaving to arithmetic: a
 * chain that ends yesterday still counts today, and a member who does not know
 * that is a member who thinks they have already lost it.
 */
export function streakFact(standing: { current: number; longest: number; activeToday: boolean }): ProfileFact {
  if (standing.current <= 0) {
    /* Three states, not two. Somebody who has never earned on two days
       running has not started; somebody whose chain broke has a number worth
       naming, and it is the reason to start again. */
    return standing.longest > 0
      ? {
          label: PROFILE_COPY.streak,
          value: PROFILE_COPY.streakBroken,
          hint: PROFILE_COPY.streakBest(standing.longest),
        }
      : { label: PROFILE_COPY.streak, value: PROFILE_COPY.streakNone, hint: PROFILE_COPY.streakHint };
  }
  return {
    label: PROFILE_COPY.streak,
    value: PROFILE_COPY.streakDays(standing.current),
    hint: standing.activeToday ? PROFILE_COPY.streakHint : PROFILE_COPY.streakAtRisk,
  };
}

/**
 * The level on the ladder the member is actually climbing.
 *
 * The profile named a WaniKani level and a JLPT status and never ours, which
 * on an account that has moved over is naming the system they left. The badge
 * says which ladder it is - UN20 and UG20 are different achievements over the
 * same characters - so it is never a bare number.
 */
export function ourLevelFact(badge: string | null): ProfileFact {
  return {
    label: PROFILE_COPY.ourLevel,
    value: badge ?? PROFILE_COPY.ourLevelNone,
    hint: PROFILE_COPY.ourLevelHint,
  };
}
