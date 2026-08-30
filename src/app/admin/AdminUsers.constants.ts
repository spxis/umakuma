/**
 * Shared copy for the admin Users group: the Manage accounts panel, its table,
 * the per-row actions menu, and the add-user modal. Every user-facing string
 * for the group lives here (Canadian spelling), so the group stays i18n-ready.
 */
export const ADMIN_USERS_COPY = {
  panel: {
    label: "Users",
    title: "Manage accounts",
    description:
      "Open a member's page in one click; each row's menu covers refreshes, invite codes, and history.",
    checkingSession: "Checking admin session...",
    signedOut: "Admin tools are hidden. Sign in with an allowlisted Google account.",
    empty: "No accounts yet.",
    loadFailed: "Could not load account list.",
  },
  toolbar: {
    addUser: "Add user",
    refreshAllStats: "Refresh all stats",
  },
  table: {
    user: "User",
    level: "Level",
    due: "Due",
    joined: "Joined",
    sync: "Sync",
    inviteCode: "Invite Code",
    actions: "Actions",
    meBadge: "Me",
    levelPrefix: "Lv",
    joinedByPrefix: "by",
    inviteNotSet: "Not set",
    inviteSetPrefix: "Set",
    copyCode: "Copy",
    pageSize: "Page size",
    paginationItemLabel: "accounts",
  },
  lock: {
    fallback: "Locked",
    clearing: "Lock clearing",
    remaining: (seconds: number) => `Locked ${seconds}s`,
  },
  rowActions: {
    openAsUser: "Open as user",
    menuButton: (nickname: string) => `More actions for ${nickname}`,
    refresh: "Refresh stats",
    refreshCooldown: "Synced under a minute ago",
    setInvite: "Set invite code",
    resetInvite: "Reset invite code",
    history: "View history",
  },
  confirm: {
    refreshTitle: "Refresh user",
    refreshDescription: (nickname: string) =>
      `Scope: 1 account (${nickname}). Time: usually under 1 minute. Risk: non-destructive stat refresh. Continue?`,
    refreshConfirmLabel: "Refresh user",
    setInviteTitle: "Set invite code",
    setInviteDescription: (nickname: string) =>
      `Scope: 1 account (${nickname}). Time: immediate. Risk: destructive replacement of previous invite access plus additive creation of a new code. Continue?`,
    setInviteConfirmLabel: "Set invite code",
    resetInviteTitle: "Reset invite code",
    resetInviteDescription: (nickname: string) =>
      `Scope: 1 account (${nickname}). Time: immediate. Risk: destructive removal of current invite access until a new code is generated. Continue?`,
    resetInviteConfirmLabel: "Reset invite",
    refreshAllTitle: "Refresh all stats",
    refreshAllDescription: (accountsTotal: string, minutes: string) =>
      `Scope: about ${accountsTotal} accounts. Time: about ${minutes} minute(s). Risk: non-destructive stat refresh. Continue?`,
    refreshAllConfirmLabel: "Refresh all",
    cancelLabel: "Cancel",
    fallbackNickname: "this user",
    fallbackScopeCount: "-",
  },
  toasts: {
    refreshed: "User refreshed.",
    refreshSkippedPrefix: "Skipped:",
    refreshFailed: "Could not refresh user.",
    inviteGenerated: "Invite code generated.",
    inviteGeneratedWithCode: (code: string) => `Invite code generated: ${code} (copied if permitted).`,
    inviteAssignFailed: "Could not assign invite code.",
    inviteReset: "Invite code reset.",
    inviteResetFailed: "Could not reset invite code.",
  },
  addModal: {
    label: "Users",
    title: "Add user",
    description: "Add a family account with nickname and WaniKani API token.",
    nicknameLabel: "Family nickname",
    nicknamePlaceholder: "e.g. John",
    tokenLabel: "WaniKani API token",
    tokenPlaceholder: "Paste personal token",
    cancel: "Cancel",
    save: "Save user",
  },
} as const;
