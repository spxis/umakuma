import type { Metadata } from "next";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { PAGE_SHELL_PADDING } from "@/app/shared/pageShell";
import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { loadLadderCrosswalk } from "@/lib/ladder/ladderCrosswalkServer";
import { deriveUnLevel } from "@/lib/uk/unLevelServer";

import { MEMBER_PAGE_HEADERS } from "../dashboardPageHeaders";
import { loadUserPageShell } from "../lib/userPageShell";
import UmakumaLadderIndex from "./UmakumaLadderIndex";
import { clampLadderLevel, UK_EXPLORER_PAGE } from "./umakumaAddress";

/* Prisma-backed through the crosswalk and the member's level, and CI builds
   without a DATABASE_URL: rendered per request, never at build time. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: `${UK_EXPLORER_PAGE.title} — UmaKuma` };

/**
 * The curriculum itself, which is a real thing to look at.
 *
 * `/umakuma` is the ladder and `/umakuma/23` is a level of it. It could have
 * redirected to a level the way `/grades` does, and that would make the
 * collection a fiction - the address would name something the site does not
 * have. A hundred levels have a shape worth seeing before you pick one.
 */
export default async function UmakumaLadderPage({ params }: { params: Promise<{ nickname: string }> }) {
  const { nickname } = await params;
  const shell = await loadUserPageShell(nickname);
  const [{ levels }, progress] = await Promise.all([
    loadLadderCrosswalk(),
    deriveUnLevel(shell.account.id),
  ]);

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
      <UmakumaLadderIndex
        nickname={decodeURIComponent(nickname)}
        levels={levels.slice(0, KANJI_LADDER_LEVELS)}
        current={clampLadderLevel(progress.level)}
      />
    </div>
  );
}
