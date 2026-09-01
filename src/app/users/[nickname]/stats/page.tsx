import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { PAGE_SHELL_PADDING } from "@/app/shared/pageShell";

import { DASHBOARD_PAGE_HEADERS } from "../dashboardPageHeaders";
import { loadLevelProgress } from "../lib/levelProgress";
import { loadUserPageShell } from "../lib/userPageShell";
import UserStatsPanels from "./UserStatsPanels";

/**
 * Progress at a glance: the snapshot, the item spread, and per-level progress.
 *
 * A real route. It is the one page that genuinely wants the whole level
 * computation, which is why that work being unconditional on the shared page
 * went unnoticed for so long - it was never wrong here, only everywhere else.
 */
export default async function UserStatsPage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const { nickname } = await params;
  const shell = await loadUserPageShell(nickname);
  const progress = await loadLevelProgress(shell.userKey);
  const header = DASHBOARD_PAGE_HEADERS.stats;

  return (
    <div className={PAGE_SHELL_PADDING}>
      <AppTopMenuRow
        viewerMenuInfo={shell.viewerMenuInfo}
        primaryWkUsername={shell.userKey}
        accountId={shell.account.id}
        showAdminActions={shell.viewerIsAdmin}
        lastSyncedAt={shell.account.lastSyncedAt.toISOString()}
        lastActivityAt={shell.account.lastActivityAt?.toISOString() ?? null}
        className="mb-2"
      />
      <MemberPageHeader
        icon={header.icon}
        title={header.title}
        subtitle={header.subtitle}
        className="mb-3"
      />
      <UserStatsPanels accountId={shell.account.id} progress={progress} />
    </div>
  );
}
