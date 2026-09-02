import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import WanikaniRequiredNotice from "@/app/shared/WanikaniRequiredNotice";
import { PAGE_SHELL_PADDING } from "@/app/shared/pageShell";
import { MEMBER_CAPABILITIES } from "@/lib/memberCapabilities";
import { prisma } from "@/lib/prisma";

import { DASHBOARD_PAGE_HEADERS } from "../dashboardPageHeaders";
import ExplorerTabs from "../ExplorerTabs";
import { loadExplorerPage } from "../lib/explorerPage";
import { loadUserPageShell } from "../lib/userPageShell";
import { CONNECT_COPY } from "../wanikani/connectCopy";

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
  const header = DASHBOARD_PAGE_HEADERS.learn;

  /*
   * Study is the one WaniKani-shaped page that is not only WaniKani's. An
   * uploaded library carries its own items and its own review schedule, in
   * this app's own tables, so a member with one has a queue here whether or
   * not they have a token. A member with neither has nothing to study, and
   * used to be told so in red above a filter panel over an empty list.
   */
  const customLibraries = shell.account.hasWanikani
    ? 0
    : await prisma.customStudyLibrary.count({ where: { accountId: shell.account.id } });
  const hasSource = shell.account.hasWanikani || customLibraries > 0;

  const explorer = hasSource ? await loadExplorerPage(shell.userKey, await searchParams, "study") : null;

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
        <ExplorerTabs
          {...explorer}
          initialTab="study"
          viewedWkUsername={shell.userKey}
          hasWanikani={shell.account.hasWanikani}
        />
      ) : (
        <WanikaniRequiredNotice
          capability={MEMBER_CAPABILITIES.studyQueue}
          userKey={shell.userKey}
          secondaryAction={{
            label: CONNECT_COPY.gateAddLibrary,
            href: `/users/${encodeURIComponent(shell.userKey)}/libraries`,
          }}
        />
      )}
    </div>
  );
}
