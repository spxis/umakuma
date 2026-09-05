import { ACCOUNT_APPROVAL_DISPLAY, resolveApproval } from "@/lib/accountApproval";
import { ACCOUNT_VISIBILITY_DISPLAY, resolveVisibility } from "@/lib/accountVisibility";
import type { AdminAccountDetail, AdminXpTypeOption } from "@/lib/adminAccountDetail.types";
import { formatDateTimeShort } from "@/lib/timeFormat";

import { ADMIN_USER_DETAIL_COPY as COPY } from "./AdminUserDetail.constants";
import type { AdminUserEditDraft, AdminUserFact } from "./AdminUserDetail.types";

/**
 * The pure half of the screen: what the facts read as, what the edit form
 * starts from, what it sends, and what the XP form warns about.
 *
 * Split out so all four are testable without a browser, and so the components
 * stay markup. Every label comes from the copy module and every domain word
 * comes from its own display map rather than being spelled out again here.
 */

/** What a member's standing reads as: enabled, or switched off and when. */
export function standingLine(account: AdminAccountDetail): string {
  if (!account.disabledAt) {
    return COPY.facts.enabled;
  }
  const since = COPY.facts.disabledSince(formatDateTimeShort(account.disabledAt));
  return account.disabledBy ? `${since} ${COPY.facts.disabledBy(account.disabledBy)}` : since;
}

/**
 * The read-only grid, in the order an admin reads it: who they are, how they
 * stand, what they are connected to, where they have got to, and when things
 * last happened.
 */
export function accountFacts(account: AdminAccountDetail): AdminUserFact[] {
  const none = COPY.facts.none;
  return [
    { label: COPY.facts.nickname, value: account.nickname },
    { label: COPY.facts.displayName, value: account.displayName ?? none },
    { label: COPY.facts.slug, value: account.slug ?? none },
    { label: COPY.facts.email, value: account.joinedByEmail ?? none },
    { label: COPY.facts.joinedBy, value: account.joinedByName ?? none },
    { label: COPY.facts.visibility, value: ACCOUNT_VISIBILITY_DISPLAY[resolveVisibility(account.visibility)].label },
    { label: COPY.facts.internal, value: account.internal ? COPY.facts.yes : COPY.facts.no },
    { label: COPY.facts.approval, value: ACCOUNT_APPROVAL_DISPLAY[resolveApproval(account.approvalStatus)] },
    { label: COPY.facts.approvedAt, value: formatDateTimeShort(account.approvedAt, none) },
    { label: COPY.facts.standing, value: standingLine(account) },
    {
      label: COPY.facts.inviteCode,
      value: account.hasInviteCode
        ? `${COPY.facts.inviteCodeSet} ${formatDateTimeShort(account.inviteCodeUpdatedAt, none)}`
        : COPY.facts.inviteCodeUnset,
    },
    { label: COPY.facts.wanikani, value: account.wkUsername ?? COPY.facts.notConnected },
    { label: COPY.facts.wanikaniLevel, value: account.wkLevel === null ? none : String(account.wkLevel) },
    { label: COPY.facts.ukLevel, value: String(account.ukLevel) },
    { label: COPY.facts.ukLevelFloor, value: String(account.ukLevelFloor) },
    {
      label: COPY.facts.placement,
      value: account.ukPlacedAt
        ? `${formatDateTimeShort(account.ukPlacedAt)} (${account.ukPlacementSource ?? none})`
        : none,
    },
    { label: COPY.facts.srsTheme, value: account.srsTheme ?? COPY.facts.defaultTheme },
    { label: COPY.facts.ageBand, value: account.ageBand ?? COPY.facts.unsaidAgeBand },
    { label: COPY.facts.jlpt, value: account.jlptStatus ?? none },
    { label: COPY.facts.xp, value: COPY.facts.xpLine(account.xp, account.xpIntoLevel, account.xpLevelSpan) },
    { label: COPY.facts.xpRank, value: COPY.facts.rankLine(account.xpRankName, account.xpLevel) },
    { label: COPY.facts.score, value: String(account.score) },
    { label: COPY.facts.pendingReviews, value: String(account.pendingReviews) },
    {
      label: COPY.facts.lastSynced,
      value: `${formatDateTimeShort(account.lastSyncedAt)} (${account.lastSyncStatus})`,
    },
    { label: COPY.facts.lastActivity, value: formatDateTimeShort(account.lastActivityAt, none) },
    { label: COPY.facts.created, value: formatDateTimeShort(account.createdAt) },
  ];
}

/** What the edit form starts holding. Empty strings where the column is null. */
export function editDraftFrom(account: AdminAccountDetail): AdminUserEditDraft {
  return {
    nickname: account.nickname,
    displayName: account.displayName ?? "",
    visibility: resolveVisibility(account.visibility),
    ageBand: account.ageBand ?? "",
  };
}

/**
 * Only what the admin actually changed.
 *
 * The route refuses an empty body with "Nothing to change", and sending the
 * untouched fields back would make every save look like an edit of all four in
 * whatever the next audit trail turns out to be. `null` is how a cleared
 * display name travels; an unchanged field is simply absent.
 */
export function editPatchFrom(
  draft: AdminUserEditDraft,
  account: AdminAccountDetail,
): Record<string, string | null> {
  const patch: Record<string, string | null> = {};
  const nickname = draft.nickname.trim();
  const displayName = draft.displayName.trim();

  if (nickname !== account.nickname) patch.nickname = nickname;
  if (displayName !== (account.displayName ?? "")) patch.displayName = displayName.length > 0 ? displayName : null;
  if (draft.visibility !== resolveVisibility(account.visibility)) patch.visibility = draft.visibility;
  if (draft.ageBand.length > 0 && draft.ageBand !== account.ageBand) patch.ageBand = draft.ageBand;

  return patch;
}

/** What a type's cap reads as beside the amount box. */
export function capLine(type: AdminXpTypeOption): string {
  return type.dailyCap === null ? COPY.xp.capNone : COPY.xp.capLine(type.dailyCap, type.earnedToday);
}

/**
 * The one consequence of an admin award worth saying out loud.
 *
 * The cap does not trim the award - that is the whole point of an override -
 * but the award still lands on the day's row for its kind, and the cap is read
 * off that row. So awarding past a cap spends the rest of this member's day for
 * that kind. Better said here than discovered by the member wondering why their
 * game earned nothing.
 */
export function capWarning(type: AdminXpTypeOption | null, amount: number): string | null {
  if (!type || type.dailyCap === null || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return type.earnedToday + amount > type.dailyCap ? COPY.xp.capWarning(type.label) : null;
}
