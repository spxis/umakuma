import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import WanikaniRequiredNotice from "@/app/shared/WanikaniRequiredNotice";
import { PAGE_SHELL_PADDING } from "@/app/shared/pageShell";
import { MEMBER_CAPABILITIES } from "@/lib/memberCapabilities";

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
  const header = DASHBOARD_PAGE_HEADERS.wk;
  /*
   * Asked before the explorer is loaded, not after. Without a connection there
   * is nothing for `loadExplorerPage` to find - it drew sixty empty levels and
   * a JLPT mix of five zeros - and the work it does to find that out is the
   * whole level computation.
   */
  const explorer = shell.account.hasWanikani
    ? await loadExplorerPage(shell.userKey, await searchParams, "level")
    : null;

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
      {explorer ? (
        <ExplorerTabs {...explorer} initialTab="level" viewedWkUsername={shell.userKey} />
      ) : (
        <WanikaniRequiredNotice
          capability={MEMBER_CAPABILITIES.wanikaniLibrary}
          userKey={shell.userKey}
          secondaryAction={{
            label: DASHBOARD_PAGE_HEADERS.jlpt.title,
            href: `/users/${encodeURIComponent(shell.userKey)}/jlpt-explorer`,
          }}
        />
      )}
    </div>
  );
}
