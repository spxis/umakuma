import type { AccountVisibility } from "@/lib/accountVisibility";
import type {
  AdminAccountDetail,
  AdminAccountDetailPayload,
  AdminRestStanding,
  AdminTimeOffGrantRow,
  AdminXpTypeOption,
} from "@/lib/adminAccountDetail.types";

/** One label-and-value line in the read-only grid. */
export type AdminUserFact = {
  label: string;
  value: string;
};

/**
 * What the edit form holds while it is being typed in.
 *
 * Strings rather than the account's nullable columns, because a text input has
 * no null: an empty box means "clear it", and `editPatchFrom` is the one place
 * that translation happens.
 */
export type AdminUserEditDraft = {
  nickname: string;
  displayName: string;
  visibility: AccountVisibility;
  /** Empty means the member has never said, which is a null column. */
  ageBand: string;
};

/**
 * What each section needs from its parent.
 *
 * `onChanged` takes the payload the route answered with, so a section never
 * re-fetches: every mutating route on this screen returns the whole detail,
 * which is what keeps the screen showing what the database holds rather than
 * what the click hoped for.
 */
export type AdminUserSectionProps = {
  account: AdminAccountDetail;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onChanged: (payload: AdminAccountDetailPayload) => void;
};

export type AdminUserXpProps = AdminUserSectionProps & {
  xpTypes: AdminXpTypeOption[];
  recentXpEvents: AdminAccountDetailPayload["recentXpEvents"];
};

export type AdminUserTimeOffProps = AdminUserSectionProps & {
  rest: AdminRestStanding;
  grants: AdminTimeOffGrantRow[];
};
