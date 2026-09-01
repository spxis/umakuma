import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { PAGE_SHELL_PADDING } from "@/app/shared/pageShell";

import { DASHBOARD_PAGE_HEADERS } from "../dashboardPageHeaders";
import { loadUserPageShell } from "../lib/userPageShell";
import UserReadPanel from "../UserReadPanel";
import { getNewsDevSampleUrls, resolveInitialReadTab } from "../userReadConfig";

/**
 * The news reader, levelled against what the member knows.
 *
 * A real route. It needs the member's WaniKani level to decide which kanji to
 * mark as known, and nothing else - so it no longer pays for the level
 * snapshots, the item spread and the per-level progress the shared page
 * computed for whichever tab happened to be showing.
 */
export default async function UserNewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ nickname: string }>;
  searchParams: Promise<{ read?: string }>;
}) {
  const { nickname } = await params;
  const shell = await loadUserPageShell(nickname);
  const header = DASHBOARD_PAGE_HEADERS.news;

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
      <UserReadPanel
        userWkLevel={shell.account.wkLevel}
        devSampleUrls={getNewsDevSampleUrls()}
        initialTab={resolveInitialReadTab(await searchParams)}
      />
    </div>
  );
}
