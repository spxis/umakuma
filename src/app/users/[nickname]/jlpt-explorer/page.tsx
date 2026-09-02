import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { PAGE_SHELL_PADDING } from "@/app/shared/pageShell";

import { DASHBOARD_PAGE_HEADERS } from "../dashboardPageHeaders";
import ExplorerTabs from "../ExplorerTabs";
import { loadExplorerPage } from "../lib/explorerPage";
import { loadUserPageShell } from "../lib/userPageShell";

/**
 * A real route. This explorer used to be one of three mounted together inside
 * `ExplorerTabs`, with two hidden by CSS, behind a rewrite that served the
 * shared dashboard page. Only this one is built now.
 */
export default async function UserExplorerPage({
  params,
  searchParams,
}: {
  params: Promise<{ nickname: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { nickname } = await params;
  const shell = await loadUserPageShell(nickname);
  const explorer = await loadExplorerPage(shell.userKey, await searchParams, "jlpt");
  const header = DASHBOARD_PAGE_HEADERS.jlpt;

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
      <ExplorerTabs
        {...explorer}
        initialTab="jlpt"
        viewedWkUsername={shell.userKey}
        hasWanikani={shell.account.hasWanikani}
      />
    </div>
  );
}
