import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import WanikaniRequiredNotice from "@/app/shared/WanikaniRequiredNotice";
import { PAGE_SHELL_PADDING } from "@/app/shared/pageShell";
import { MEMBER_CAPABILITIES } from "@/lib/memberCapabilities";

import { DASHBOARD_PAGE_HEADERS } from "../dashboardPageHeaders";
import { loadLevelProgress } from "../lib/levelProgress";
import { loadUserPageShell } from "../lib/userPageShell";
import { CONNECT_COPY } from "../wanikani/connectCopy";
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
  const header = DASHBOARD_PAGE_HEADERS.stats;
  /*
   * Every figure on this page mirrors a WaniKani one, so without a connection
   * it is a wall of zeros - and the level progress panel read that as a
   * finished level, telling a member who had never started that they had
   * passed the gate. The whole level computation is skipped with it.
   */
  const progress = shell.account.hasWanikani ? await loadLevelProgress(shell.userKey) : null;

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
      {progress ? (
        <UserStatsPanels accountId={shell.account.id} progress={progress} />
      ) : (
        <WanikaniRequiredNotice
          capability={MEMBER_CAPABILITIES.wanikaniProgress}
          userKey={shell.userKey}
          secondaryAction={{
            label: CONNECT_COPY.gateHistory,
            href: `/users/${encodeURIComponent(shell.userKey)}/history`,
          }}
        />
      )}
    </div>
  );
}
