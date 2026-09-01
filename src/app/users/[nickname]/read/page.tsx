import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { PAGE_SHELL_PADDING } from "@/app/shared/pageShell";

import { DASHBOARD_PAGE_HEADERS } from "../dashboardPageHeaders";
import { loadUserPageShell } from "../lib/userPageShell";
import UserReadingSignoffSection from "../UserReadingSignoffSection";

/**
 * Reading challenges and daily check-ins.
 *
 * A real route. This was `/users/:nickname?dashboard=read` behind a rewrite,
 * sharing one 474-line page with Study, both explorers, Stats and News - which
 * meant opening this page loaded every level snapshot on the account, each one
 * carrying that level's subjects, to render a table of yen totals.
 *
 * It needs an account id. That is the whole of it.
 */
export default async function UserReadPage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const { nickname } = await params;
  const shell = await loadUserPageShell(nickname);
  const header = DASHBOARD_PAGE_HEADERS.read;

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
      <UserReadingSignoffSection accountId={shell.account.id} />
    </div>
  );
}
