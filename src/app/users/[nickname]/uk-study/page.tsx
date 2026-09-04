import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { PAGE_SHELL_PADDING } from "@/app/shared/pageShell";

import { MEMBER_PAGE_HEADERS } from "../dashboardPageHeaders";
import { loadUserPageShell } from "../lib/userPageShell";
import UkStudySession from "./UkStudySession";
import { UK_STUDY_COPY as copy } from "./UkStudy.constants";

/* Reads the member's own state on every request. */
export const dynamic = "force-dynamic";

/**
 * Doing the UmaKuma curriculum, rather than reading it.
 *
 * A separate page from the Study explorer on purpose, for now. That explorer
 * is built around two queue shapes - WaniKani's and an uploaded library's -
 * and a third source means auditing every branch of it. This ships the
 * capability while that stays a considered change rather than a rushed one.
 */
export default async function UkStudyPage({ params }: { params: Promise<{ nickname: string }> }) {
  const { nickname } = await params;
  const shell = await loadUserPageShell(nickname);

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
        icon={MEMBER_PAGE_HEADERS.profile.icon}
        title={copy.title}
        subtitle={copy.subtitle}
        className="mb-3"
      />
      <UkStudySession accountId={shell.account.id} />
    </div>
  );
}
