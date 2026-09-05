/**
 * Every user-facing string on the admin's screen for one member.
 *
 * One module for the whole component group, Canadian spelling throughout, so
 * the locale layer has a single file to swap when there is one. Nothing here
 * is inline in a component.
 */
export const ADMIN_USER_DETAIL_COPY = {
  page: {
    title: "Member",
    subtitle: "Everything this account is, and everything an admin may do to it.",
    loading: "Loading this member...",
    loadFailed: "Could not load this member.",
    notFound: "There is no account with that id.",
    back: "All users",
  },

  facts: {
    heading: "The account",
    blurb: "Read-only. The WaniKani token is not shown anywhere: it is encrypted at rest and answers no admin question.",
    nickname: "Nickname",
    displayName: "Display name",
    slug: "Slug",
    email: "Email",
    joinedBy: "Invited by",
    visibility: "Visibility",
    internal: "Internal",
    approval: "Approval",
    approvedAt: "Approved",
    standing: "Standing",
    inviteCode: "Invite code",
    inviteCodeSet: "Set",
    inviteCodeUnset: "Not set",
    wanikani: "WaniKani",
    wanikaniLevel: "WaniKani level",
    ukLevel: "UmaKuma level",
    ukLevelFloor: "Level floor",
    placement: "Placed",
    srsTheme: "SRS theme",
    ageBand: "Age band",
    jlpt: "JLPT status",
    xp: "XP",
    xpRank: "Rank",
    score: "Score",
    pendingReviews: "Reviews due",
    lastSynced: "Last synced",
    lastActivity: "Last activity",
    created: "Created",
    none: "-",
    yes: "Yes",
    no: "No",
    notConnected: "Not connected",
    defaultTheme: "Default",
    unsaidAgeBand: "Not said (treated as the youngest)",
    enabled: "Enabled",
    disabledSince: (when: string) => `Disabled ${when}`,
    disabledBy: (who: string) => `by ${who}`,
    rankLine: (name: string, level: number) => `${name} (rank ${level})`,
    xpLine: (xp: number, into: number, span: number) =>
      span > 0 ? `${xp} XP - ${into} of ${span} into this rank` : `${xp} XP - top rank`,
  },

  edit: {
    heading: "Details",
    blurb:
      "The four an admin may change. The slug, the email and every WaniKani column stay put: the first is in every link anyone has shared, and the rest are the member's connection rather than ours to edit.",
    nickname: "Nickname",
    nicknameHint: "What admin surfaces call them. Two characters or more.",
    displayName: "Display name",
    displayNameHint: "What everyone else reads. Leave it empty to fall back to the nickname.",
    visibility: "Visibility",
    ageBand: "Age band",
    ageBandHint: "Decides which SRS themes may be offered. An empty band is treated as the youngest.",
    ageBandUnset: "Not said",
    save: "Save details",
    saving: "Saving...",
    nothingChanged: "Nothing has changed.",
    saved: "Details saved.",
    failed: "Could not save those details.",
  },

  xp: {
    heading: "Award XP",
    blurb:
      "A deliberate override: the daily cap does not trim it and a once-a-day award may be given again. It still lands on the day's row for its kind, so awarding a capped kind uses up what this member's own study can still earn of it today.",
    type: "Award",
    amount: "Amount",
    amountHint: "Starts at what the award is normally worth. Change it freely.",
    note: "Note (optional)",
    noteHint: "What this one was for. The member reads it on their history.",
    notePlaceholder: "e.g. turned up to the Saturday session",
    award: "Award XP",
    awarding: "Awarding...",
    retiredSuffix: "(retired)",
    capNone: "No daily cap.",
    capLine: (cap: number, earned: number) => `Daily cap ${cap} XP. Earned today: ${earned} XP.`,
    capWarning: (kind: string) =>
      `This takes the day's total for ${kind} past its cap, so this member earns nothing more of that kind today.`,
    empty: "No award types exist yet. Seed them before awarding anything.",
    confirmTitle: "Award XP",
    confirmDescription: (nickname: string, amount: number, label: string) =>
      `Scope: 1 account (${nickname}). Effect: ${amount} XP of "${label}", which may move their rank. Risk: additive and not reversible from this screen. Continue?`,
    confirmLabel: "Award it",
    awarded: (amount: number, xp: number) => `Awarded ${amount} XP. They now hold ${xp}.`,
    awardedRankUp: (amount: number, rank: string) => `Awarded ${amount} XP, and it moved them up to ${rank}.`,
    failed: "Could not award that XP.",
    recentHeading: "Recent XP",
    recentBlurb: "One row per kind per day, accumulated. An admin award joins the day's row rather than making its own.",
    recentEmpty: "Nothing earned yet.",
  },

  standing: {
    heading: "Standing",
    blurb:
      "Disabling switches the account off everywhere it matters: the study and game routes refuse it, the invite session is dropped, their page stops resolving and they leave every leaderboard. Approval is a separate decision - it answers whether they were ever let in.",
    approvalLabel: "Approval",
    disableReason: "Reason (optional)",
    disableReasonHint: "For the admin reading this account back in a month. The member never sees it.",
    disable: "Disable account",
    enable: "Enable account",
    working: "Working...",
    disabledNotice: (when: string) => `Disabled ${when}.`,
    disabledReasonLine: (reason: string) => `Reason: ${reason}`,
    disabledByLine: (who: string) => `Disabled by ${who}`,
    confirmDisableTitle: "Disable account",
    confirmDisableDescription: (nickname: string) =>
      `Scope: 1 account (${nickname}). Effect: they lose study, games, their page and every leaderboard until this is undone. Risk: reversible, and immediate. Continue?`,
    confirmDisableLabel: "Disable it",
    confirmEnableTitle: "Enable account",
    confirmEnableDescription: (nickname: string) =>
      `Scope: 1 account (${nickname}). Effect: full access returns and the reason on file is cleared. Risk: reversible. Continue?`,
    confirmEnableLabel: "Enable it",
    cancelLabel: "Cancel",
    disabled: "Account disabled.",
    enabled: "Account enabled.",
    failed: "Could not change that account's standing.",
    approvalSaved: "Approval updated.",
    approvalFailed: "Could not update approval.",
  },

  ladder: {
    heading: "Level floor",
    blurb:
      "The only stored input to the UmaKuma level; everything else is derived from it. It never goes down - a floor is what a placement test or an import bought.",
    floor: "Raise the floor to",
    raise: "Raise floor",
    raising: "Raising...",
    raised: (floor: number, level: number) => `Floor is ${floor}. They are now level ${level}.`,
    failed: "Could not raise that level floor.",
    confirmTitle: "Raise level floor",
    confirmDescription: (nickname: string, floor: number) =>
      `Scope: 1 account (${nickname}). Effect: floor rises to ${floor} and their level is re-derived. Risk: a floor cannot be lowered again. Continue?`,
    confirmLabel: "Raise it",
  },

  actions: {
    heading: "Things to do",
    blurb: "The per-account jobs, gathered here rather than spread across the list's overflow menu.",
    viewPage: "View their page",
    history: "Study history",
    refresh: "Refresh stats",
    refreshCooldown: "Synced under a minute ago",
    setInvite: "Set invite code",
    resetInvite: "Reset invite code",
    makeInternal: "Make internal",
    makeOrdinary: "Make ordinary",
    refreshed: "Stats refreshed.",
    refreshSkippedPrefix: "Skipped:",
    refreshFailed: "Could not refresh stats.",
    inviteGeneratedWithCode: (code: string) => `Invite code generated: ${code} (copied if permitted).`,
    inviteAssignFailed: "Could not assign an invite code.",
    inviteReset: "Invite code reset.",
    inviteResetFailed: "Could not reset that invite code.",
    internalOn: "Marked internal.",
    internalOff: "Marked ordinary.",
    internalFailed: "Could not change that member's kind.",
    confirmRefreshTitle: "Refresh stats",
    confirmRefreshDescription: (nickname: string) =>
      `Scope: 1 account (${nickname}). Time: usually under a minute. Risk: non-destructive stat refresh. Continue?`,
    confirmRefreshLabel: "Refresh",
    confirmSetInviteTitle: "Set invite code",
    confirmSetInviteDescription: (nickname: string) =>
      `Scope: 1 account (${nickname}). Effect: a new code, and the old one stops working. Risk: destructive to existing invite access. Continue?`,
    confirmSetInviteLabel: "Set it",
    confirmResetInviteTitle: "Reset invite code",
    confirmResetInviteDescription: (nickname: string) =>
      `Scope: 1 account (${nickname}). Effect: invite sign-in stops working until a new code is set. Risk: destructive. Continue?`,
    confirmResetInviteLabel: "Reset it",
  },
} as const;

/**
 * The shape of the screen, kept beside its copy so the group has one module
 * rather than two. Class names are not copy - they never reach a locale layer -
 * but they are the same kind of thing a component should not be spelling out
 * five times over, and every section here is the same card with the same field.
 */
export const ADMIN_USER_DETAIL_STYLES = {
  card: "rounded-2xl border border-line bg-surface p-4",
  heading: "text-sm font-black text-foreground",
  blurb: "mt-0.5 max-w-3xl text-[12px] font-semibold leading-relaxed text-foreground/70",
  label: "text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60",
  hint: "text-[11px] font-semibold text-foreground/60",
  field: "h-9 rounded-lg border border-line bg-surface px-3 text-sm text-foreground",
  button: "inline-flex h-9 items-center rounded-full px-4 text-[12px] font-black transition disabled:opacity-40",
  primaryButton: "bg-accent text-white hover:brightness-110",
  quietButton: "border border-line bg-surface text-foreground/80 hover:bg-surface-muted",
  dangerButton: "border border-rose-600 bg-surface text-rose-700 hover:bg-rose-50",
  warning: "mt-2 text-[12px] font-black text-amber-700",
  problem: "mt-2 text-[12px] font-black text-rose-600",
} as const;
