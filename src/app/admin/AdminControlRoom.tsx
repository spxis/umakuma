import type { AdminControlRoomProps } from "./AdminControlRoom.types";
import AdminPanelHeader from "./AdminPanelHeader";

async function startGoogleSignIn(callbackPath: string, prompt?: "select_account") {
  try {
    const { signIn } = await import("next-auth/react");
    await signIn("google", { callbackUrl: callbackPath }, prompt ? { prompt } : undefined);
  } catch {
    const callbackUrl = encodeURIComponent(callbackPath);
    const promptQuery = prompt ? `&prompt=${encodeURIComponent(prompt)}` : "";
    window.location.assign(`/api/auth/signin/google?callbackUrl=${callbackUrl}${promptQuery}`);
  }
}

export default function AdminControlRoom({
  viewMode = "all",
  nickname,
  token,
  sessionAuthorized,
  checkingSession,
  googleConfigured,
  signedIn,
  emailAllowed,
  userName,
  userEmail,
  loading,
  jlptRefreshing,
  jlptEnriching,
  operationScope,
  onSetNickname,
  onSetToken,
  onAddAccount,
  onCompleteGoogleSignOut,
  onRefreshAll,
  onRefreshJlptList,
  onEnrichJlptKanji,
}: AdminControlRoomProps) {
  const showAccountActions = viewMode !== "jlpt";
  const showJlptActions = viewMode !== "accounts";

  return (
    <section className="rounded-2xl border border-line bg-surface/90 p-5 shadow-sm">
      <AdminPanelHeader
        label="Account operations"
        title="Admin panel"
        description="Manage family accounts, rotate tokens, and push fresh stats to the leaderboard."
      />
      <p className="mt-2 text-xs text-foreground/65">Admin access requires Google OAuth and allowlisted emails.</p>

      {googleConfigured ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void startGoogleSignIn("/admin", "select_account");
            }}
            className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-4 text-xs font-bold uppercase tracking-widest text-slate-800 transition hover:bg-surface-muted"
          >
            Sign in with Google
          </button>
          <button
            type="button"
            onClick={onCompleteGoogleSignOut}
            className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-4 text-xs font-bold uppercase tracking-widest text-slate-800 transition hover:bg-surface-muted"
          >
            Sign out completely
          </button>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-line bg-surface-muted px-4 py-3 text-sm text-foreground/75">
        <p className="font-semibold">{signedIn ? `Signed in: ${userName ?? "Google user"}` : "Not signed in"}</p>
        <p className="mt-1 text-xs">{userEmail ?? "No Google account in session."}</p>
        {!checkingSession && signedIn && !emailAllowed ? (
          <p className="mt-2 text-xs font-semibold text-amber-700">
            This Google account is not on admin allowlist.
          </p>
        ) : null}
      </div>

      {sessionAuthorized ? (
        <form onSubmit={onAddAccount} className="mt-7 space-y-4">
          <p className="rounded-2xl border border-line bg-surface-muted px-4 py-3 text-xs font-semibold text-slate-600">
            {checkingSession
              ? "Checking admin session..."
              : "Admin unlocked by allowlisted Google account."}
          </p>

          {showAccountActions ? (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-foreground/65">
                  Family nickname
                </span>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={32}
                  value={nickname}
                  onChange={(event) => onSetNickname(event.target.value)}
                  className="w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-base text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  placeholder="e.g. John"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-foreground/65">
                  WaniKani API token
                </span>
                <input
                  type="password"
                  required
                  value={token}
                  onChange={(event) => onSetToken(event.target.value)}
                  className="w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-base text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  placeholder="Paste personal token"
                />
              </label>

              <div className="grid gap-3 pt-1 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-5 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save account
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={onRefreshAll}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-bold uppercase tracking-widest text-slate-800 transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Refresh all stats
                </button>
              </div>
            </>
          ) : null}

          {showJlptActions ? (
            <div className="grid gap-3 pt-1 sm:grid-cols-2">
              <button
                type="button"
                disabled={loading || jlptRefreshing || jlptEnriching}
                onClick={onRefreshJlptList}
                className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-bold uppercase tracking-widest text-slate-800 transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {jlptRefreshing ? "Refreshing JLPT..." : "Refresh JLPT List"}
              </button>
              <button
                type="button"
                disabled={loading || jlptRefreshing || jlptEnriching}
                onClick={onEnrichJlptKanji}
                className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-bold uppercase tracking-widest text-slate-800 transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {jlptEnriching ? "Enriching JLPT..." : "Enrich JLPT Data"}
              </button>
            </div>
          ) : null}

          <div className="rounded-xl border border-line bg-surface px-3 py-3 text-xs text-foreground/70">
            <p className="font-bold uppercase tracking-[0.08em] text-foreground/60">Action scope</p>
            {showAccountActions ? (
              <>
                <p className="mt-1">
                  Save account: touches 1 account row (upsert/update), usually under 1 minute, non-destructive.
                </p>
                <p className="mt-1">
                  Refresh all stats: touches about {operationScope?.counts.accountsTotal ?? "-"} accounts, about {operationScope?.estimates.refreshAllMinutes ?? "-"} minute(s), non-destructive.
                </p>
              </>
            ) : null}
            {showJlptActions ? (
              <>
                <p className="mt-1">
                  Refresh JLPT list: touches about {operationScope?.counts.jlptTotal ?? "-"} JLPT rows, about {operationScope?.estimates.jlptRefreshMinutes ?? "-"} minute(s), destructive and additive (can remove stale rows and add new rows).
                </p>
                <p className="mt-1">
                  Enrich JLPT data: touches up to {operationScope?.estimates.jlptEnrichBatchSize ?? "-"} rows per run, about 1 to 3 minute(s) per batch, additive updates only.
                  Remaining batches: {operationScope?.estimates.jlptEnrichRemainingBatches ?? "-"}.
                </p>
              </>
            ) : null}
          </div>

        </form>
      ) : (
        <div className="mt-7 rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-slate-700">
          Admin tools hidden. Sign in with an allowlisted Google account.
        </div>
      )}
    </section>
  );
}
