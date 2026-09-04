import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { PAGE_SHELL_PADDING } from "@/app/shared/pageShell";
import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { loadLadderCrosswalk } from "@/lib/ladder/ladderCrosswalkServer";
import { groupLadderByLevel } from "@/lib/ladder/ladderQuery";

import { MEMBER_PAGE_HEADERS } from "../dashboardPageHeaders";
import { loadUserPageShell } from "../lib/userPageShell";
import UmakumaExplorer from "./UmakumaExplorer";
import { UK_EXPLORER_PAGE } from "./umakumaExplorerPage";

/* Prisma-backed through the crosswalk's word lookup, and CI builds without a
   DATABASE_URL: this page is rendered per request, never at build time. */
export const dynamic = "force-dynamic";

/**
 * The third explorer.
 *
 * WaniKani's levels and the JLPT's lists each had a page here; the hundred
 * levels this site actually teaches had none, which made the curriculum the
 * one thing a member could not look at before committing to it.
 */
export default async function UmakumaExplorerPage({ params }: { params: Promise<{ nickname: string }> }) {
  const { nickname } = await params;
  const shell = await loadUserPageShell(nickname);
  const { rows } = await loadLadderCrosswalk();
  const initial = groupLadderByLevel(rows, KANJI_LADDER_LEVELS, 1);

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
        icon={MEMBER_PAGE_HEADERS.wanikani.icon}
        title={UK_EXPLORER_PAGE.title}
        subtitle={UK_EXPLORER_PAGE.subtitle}
        className="mb-3"
      />
      <UmakumaExplorer initial={{ ...initial, ladderLevels: KANJI_LADDER_LEVELS }} />
    </div>
  );
}
