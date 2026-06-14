"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import AppTopMenuRow from "../shared/AppTopMenuRow";
import SegmentedControl from "../shared/SegmentedControl";
import type { ViewerMenuInfo } from "../users/[nickname]/UserDashboardTabs.types";
import AdminCampaignManager from "./AdminCampaignManager";
import AdminControlRoom from "./AdminControlRoom";
import AdminDataWorkspaceSection from "./AdminDataWorkspaceSection";
import type { AdminControlRoomProps } from "./AdminControlRoom.types";
import type { CampaignRecord } from "./AdminCampaignManager.types";
import AdminFeedbackProvider, { useAdminFeedback } from "./AdminFeedbackProvider";
import type { AdminSessionStatus } from "./AdminPage.types";
import AdminStudyHistory from "./AdminStudyHistory";
import AdminUsersPanel from "./AdminUsersPanel";
import AdminWorkspaceHeader from "./AdminWorkspaceHeader";
import type { AdminOperationsScopeResponse } from "./AdminOperationsScope.types";
import AdminReadingEntriesClient from "./reading-entries/AdminReadingEntriesClient";
import {
  ADMIN_WORKSPACE_COOKIE_KEY,
  ADMIN_WORKSPACE_COOKIE_MAX_AGE_SECONDS,
  type AdminWorkspaceTab,
  routeForAdminWorkspaceTab,
} from "./AdminWorkspaceTabs";

type AdminWorkspacePageProps = {
  activeTab: AdminWorkspaceTab;
  initialDataCatalog?: "wk" | "jlpt";
  initialSession?: AdminSessionStatus;
  initialCampaigns?: CampaignRecord[];
};

export default function AdminWorkspacePage({
  activeTab,
  initialDataCatalog,
  initialSession,
  initialCampaigns = [],
}: AdminWorkspacePageProps) {
  return (
    <AdminFeedbackProvider>
      <AdminWorkspacePageContent
        activeTab={activeTab}
        initialDataCatalog={initialDataCatalog}
        initialSession={initialSession}
        initialCampaigns={initialCampaigns}
      />
    </AdminFeedbackProvider>
  );
}

function AdminWorkspacePageContent({
  activeTab,
  initialDataCatalog,
  initialSession,
  initialCampaigns = [],
}: AdminWorkspacePageProps) {
  const router = useRouter();
  const { showToast, confirmAction } = useAdminFeedback();
  const [nickname, setNickname] = useState("");
  const [token, setToken] = useState("");
  const hasInitialSession = Boolean(initialSession);
  const [sessionAuthorized, setSessionAuthorized] = useState(Boolean(initialSession?.authorized));
  const [checkingSession, setCheckingSession] = useState(!hasInitialSession);
  const [googleConfigured, setGoogleConfigured] = useState(Boolean(initialSession?.googleConfigured));
  const [signedIn, setSignedIn] = useState(Boolean(initialSession?.signedIn));
  const [emailAllowed, setEmailAllowed] = useState(Boolean(initialSession?.emailAllowed));
  const [userName, setUserName] = useState<string | null>(initialSession?.user?.name ?? null);
  const [userEmail, setUserEmail] = useState<string | null>(initialSession?.user?.email ?? null);
  const [userWkUsername, setUserWkUsername] = useState<string | null>(initialSession?.user?.wkUsername ?? null);
  const [loading, setLoading] = useState(false);
  const [dataCatalogView, setDataCatalogView] = useState<"wk" | "jlpt">(initialDataCatalog ?? "wk");
  const [jlptRefreshing, setJlptRefreshing] = useState(false);
  const [jlptEnriching, setJlptEnriching] = useState(false);
  const [operationScope, setOperationScope] = useState<AdminOperationsScopeResponse | null>(null);

  const viewerMenuInfo: ViewerMenuInfo | null = signedIn
    ? {
        provider: "google",
        name: userName?.trim() || userEmail?.split("@")[0] || "Google user",
        email: userEmail,
        wkUsername: userWkUsername,
        isAdmin: emailAllowed,
      }
    : null;

  useEffect(() => {
    document.cookie = [
      `${ADMIN_WORKSPACE_COOKIE_KEY}=${activeTab}`,
      "Path=/admin",
      `Max-Age=${ADMIN_WORKSPACE_COOKIE_MAX_AGE_SECONDS}`,
      "SameSite=Lax",
    ].join("; ");
  }, [activeTab]);

  useEffect(() => {
    async function getAdminSessionStatus() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const data = (await response.json()) as AdminSessionStatus;
        setSessionAuthorized(Boolean(data.authorized));
        setGoogleConfigured(Boolean(data.googleConfigured));
        setSignedIn(Boolean(data.signedIn));
        setEmailAllowed(Boolean(data.emailAllowed));
        setUserName(data.user?.name ?? null);
        setUserEmail(data.user?.email ?? null);
        setUserWkUsername((previous) => data.user?.wkUsername ?? previous);
      } finally {
        if (!hasInitialSession) {
          setCheckingSession(false);
        }
      }
    }

    void getAdminSessionStatus().catch(() => {
      if (!hasInitialSession) {
        setCheckingSession(false);
      }
    });
  }, [hasInitialSession]);

  useEffect(() => {
    setDataCatalogView(initialDataCatalog ?? "wk");
  }, [initialDataCatalog]);

  useEffect(() => {
    async function loadOperationScope() {
      if (checkingSession || !sessionAuthorized) {
        setOperationScope(null);
        return;
      }

      try {
        const response = await fetch("/api/admin/operations-scope", { cache: "no-store" });
        const payload = (await response.json()) as AdminOperationsScopeResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not load operation scope.");
        }

        setOperationScope(payload);
      } catch {
        setOperationScope(null);
      }
    }

    void loadOperationScope();
  }, [checkingSession, sessionAuthorized]);

  async function completeGoogleSignOut() {
    const accepted = await confirmAction({
      title: "Sign out of admin",
      description:
        "This will end your current Google admin session in this browser and return you to the signout flow. Continue?",
      confirmLabel: "Sign out",
      cancelLabel: "Cancel",
      tone: "neutral",
    });

    if (!accepted) {
      return;
    }

    setLoading(true);
    window.location.href = "/signout?callbackUrl=/admin&clearAdmin=1";
  }

  async function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accepted = await confirmAction({
      title: "Save account",
      description:
        "Scope: 1 account row. Time: usually under 1 minute. Risk: non-destructive upsert/update. This stores nickname and API token, and can update an existing matching account. Continue?",
      confirmLabel: "Save account",
      cancelLabel: "Cancel",
      tone: "danger",
    });

    if (!accepted) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nickname, token }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to add account.");
      }

      setNickname("");
      setToken("");
      showToast({ tone: "success", message: "Account saved." });
    } catch (error) {
      showToast({ tone: "error", message: error instanceof Error ? error.message : "Could not save account." });
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    const accepted = await confirmAction({
      title: "Refresh all stats",
      description:
        `Scope: about ${operationScope?.counts.accountsTotal ?? "-"} accounts. Time: about ${operationScope?.estimates.refreshAllMinutes ?? "-"} minute(s). Risk: non-destructive stat refresh. This may trigger many upstream API calls. Continue?`,
      confirmLabel: "Refresh all",
      cancelLabel: "Cancel",
      tone: "danger",
    });

    if (!accepted) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/leaderboard/refresh", {
        method: "POST",
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Refresh failed.");
      }

      showToast({ tone: "success", message: "Leaderboard refreshed." });
    } catch (error) {
      showToast({ tone: "error", message: error instanceof Error ? error.message : "Could not refresh leaderboard." });
    } finally {
      setLoading(false);
    }
  }

  async function refreshJlptList() {
    const accepted = await confirmAction({
      title: "Refresh JLPT list",
      description:
        `Scope: about ${operationScope?.counts.jlptTotal ?? "-"} JLPT rows. Time: about ${operationScope?.estimates.jlptRefreshMinutes ?? "-"} minute(s). Risk: destructive and additive. This can overwrite levels, insert new rows, and remove stale rows not in the latest source. Continue?`,
      confirmLabel: "Refresh JLPT",
      cancelLabel: "Cancel",
      tone: "danger",
    });

    if (!accepted) {
      return;
    }

    setJlptRefreshing(true);

    try {
      const response = await fetch("/api/jlpt/refresh", {
        method: "POST",
      });

      const data = (await response.json()) as { error?: string; count?: number };
      if (!response.ok) {
        throw new Error(data.error ?? "JLPT list refresh failed.");
      }

      showToast({ tone: "success", message: `JLPT list refreshed (${data.count ?? 0} records).` });
    } catch (error) {
      showToast({ tone: "error", message: error instanceof Error ? error.message : "Could not refresh JLPT list." });
    } finally {
      setJlptRefreshing(false);
    }
  }

  async function enrichJlptKanji() {
    const accepted = await confirmAction({
      title: "Enrich JLPT data",
      description:
        `Scope: up to ${operationScope?.estimates.jlptEnrichBatchSize ?? 250} rows this run, remaining missing rows ${operationScope?.counts.jlptMissingEnrichment ?? "-"}. Time: about 1 to 3 minute(s) per batch. Risk: non-destructive additive updates to enrichment fields. Continue?`,
      confirmLabel: "Run enrichment",
      cancelLabel: "Cancel",
      tone: "danger",
    });

    if (!accepted) {
      return;
    }

    setJlptEnriching(true);

    try {
      const response = await fetch("/api/jlpt/enrich", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: 250, onlyMissing: true }),
      });

      const data = (await response.json()) as {
        error?: string;
        processed?: number;
        updated?: number;
        failed?: number;
        remaining?: number;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "JLPT enrichment failed.");
      }

      showToast({
        tone: "success",
        message: `JLPT enriched chunk processed=${data.processed ?? 0}, updated=${data.updated ?? 0}, failed=${data.failed ?? 0}, remaining=${data.remaining ?? 0}.`,
      });
    } catch (error) {
      showToast({ tone: "error", message: error instanceof Error ? error.message : "Could not enrich JLPT data." });
    } finally {
      setJlptEnriching(false);
    }
  }

  const controlRoomProps: Omit<AdminControlRoomProps, "viewMode"> = {
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
    onSetNickname: setNickname,
    onSetToken: setToken,
    onAddAccount: addAccount,
    onCompleteGoogleSignOut: () => {
      void completeGoogleSignOut();
    },
    onRefreshAll: () => {
      void refreshAll();
    },
    onRefreshJlptList: () => {
      void refreshJlptList();
    },
    onEnrichJlptKanji: () => {
      void enrichJlptKanji();
    },
  };

  return (
    <div className="relative overflow-hidden px-2 py-1.5 sm:px-6 sm:py-4 lg:px-8">
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <main className="relative w-full space-y-3">
        <AppTopMenuRow
          viewerMenuInfo={viewerMenuInfo}
          showAdminActions={true}
          className="mb-2"
        />

        <section className="w-full overflow-x-auto lg:flex lg:justify-end">
          <SegmentedControl<AdminWorkspaceTab>
            ariaLabel="Admin workspace tabs"
            asTabs
            size="sm"
            value={activeTab}
            onChange={(nextTab) => {
              router.push(routeForAdminWorkspaceTab(nextTab));
            }}
            options={[
              { value: "operations", label: "Accounts" },
              { value: "data", label: "Data" },
              { value: "campaigns", label: "Campaigns" },
              { value: "history", label: "History" },
              { value: "users", label: "Users" },
              { value: "readingEntries", label: "Check-ins" },
            ]}
          />
        </section>

        <AdminWorkspaceHeader
          checkingSession={checkingSession}
          sessionAuthorized={sessionAuthorized}
          signedIn={signedIn}
          emailAllowed={emailAllowed}
          userEmail={userEmail}
          userName={userName}
        />

        {checkingSession ? (
          <section className="rounded-xl border border-line bg-surface-muted px-4 py-3">
            <p className="text-sm font-semibold text-foreground/75">Checking admin session...</p>
          </section>
        ) : null}

        {!checkingSession && !sessionAuthorized ? (
          <section className="rounded-xl border border-line bg-surface-muted px-4 py-3">
            <p className="text-sm font-semibold text-foreground/75">
              Admin tools are hidden until you sign in with an allowlisted Google account. Open Accounts to sign in or switch account.
            </p>
          </section>
        ) : null}

        {activeTab === "operations" ? (
          <section id="admin-operations" className="space-y-3">
            <div className="rounded-xl border border-line bg-surface/70 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/60">Accounts</p>
              <p className="mt-1 text-sm text-foreground/70">Sign in, add family accounts, and run leaderboard refresh actions.</p>
            </div>
            <AdminControlRoom
              viewMode="accounts"
              {...controlRoomProps}
            />
          </section>
        ) : null}

        {activeTab === "data" ? (
          <AdminDataWorkspaceSection
            dataCatalogView={dataCatalogView}
            onChangeDataCatalogView={setDataCatalogView}
            sessionAuthorized={sessionAuthorized}
            checkingSession={checkingSession}
            controlRoomProps={controlRoomProps}
          />
        ) : null}

        {activeTab === "campaigns" ? (
          <section className="space-y-3">
            <div className="rounded-xl border border-line bg-surface/70 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/60">Campaigns</p>
              <p className="mt-1 text-sm text-foreground/70">Edit campaign rules and run payout simulations.</p>
            </div>
            <AdminCampaignManager
              sessionAuthorized={sessionAuthorized}
              checkingSession={checkingSession}
              initialCampaigns={initialCampaigns}
            />
          </section>
        ) : null}

        {activeTab === "history" ? (
          <section id="admin-history" className="space-y-3">
            <div className="rounded-xl border border-line bg-surface/70 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/60">History</p>
              <p className="mt-1 text-sm text-foreground/70">Review, edit, or remove study submissions in one place.</p>
            </div>
            <AdminStudyHistory sessionAuthorized={sessionAuthorized} />
          </section>
        ) : null}

        {activeTab === "users" ? (
          <section id="admin-users" className="space-y-3">
            <div className="rounded-xl border border-line bg-surface/70 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/60">Users</p>
              <p className="mt-1 text-sm text-foreground/70">Manage accounts, refreshes, invite codes, and user history.</p>
            </div>
            <AdminUsersPanel
              sessionAuthorized={sessionAuthorized}
              checkingSession={checkingSession}
              viewerEmail={userEmail}
            />
          </section>
        ) : null}

        {activeTab === "readingEntries" ? (
          <section id="admin-reading-entries" className="space-y-3">
            <div className="rounded-xl border border-line bg-surface/70 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/60">Check-ins</p>
              <p className="mt-1 text-sm text-foreground/70">Browse and edit reading submissions across all members.</p>
            </div>
            <AdminReadingEntriesClient
              embedded
              sessionAuthorized={sessionAuthorized}
              checkingSession={checkingSession}
            />
          </section>
        ) : null}

      </main>
    </div>
  );
}
