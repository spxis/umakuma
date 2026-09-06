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
