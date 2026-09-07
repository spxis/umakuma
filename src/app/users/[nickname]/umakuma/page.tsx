import type { Metadata } from "next";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { PAGE_SHELL_PADDING } from "@/app/shared/pageShell";
import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { loadLadderCrosswalk } from "@/lib/ladder/ladderCrosswalkServer";
import { ladderLevelPage } from "@/lib/ladder/ladderLevelPage";
import { deriveLadderLevel } from "@/lib/uk/unLevelServer";
import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";

import { MEMBER_PAGE_HEADERS } from "../dashboardPageHeaders";
import { loadUserPageShell } from "../lib/userPageShell";
import UmakumaLevelBoard from "./UmakumaLevelBoard";
import { clampLadderLevel, UK_EXPLORER_PAGE } from "./umakumaAddress";

/* Prisma-backed through the crosswalk and the member's level, and CI builds
   without a DATABASE_URL: rendered per request, never at build time. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: `${UK_EXPLORER_PAGE.title} — UmaKuma` };

/**
 * The curriculum, opened where the reader is.
 *
 * It opened on an index instead: a card per level, four across, a hundred of
 * them, headed "All 100 levels". The argument for it was that a hundred levels
 * have a shape worth seeing before you pick one. John, looking at it: "The
 * original page we see with the All 100 Levels is NOT needed. It's weird. Use
 * the same template we have in WaniKani and JLPT Explorer."
 *
 * He is right, and the shape argument was answering the wrong question. The
 * other two explorers open on filters and results, because that is what an
 * explorer is - somewhere to look something up. A hundred cards is a table of
 * contents nobody scrolls, and the ladder's shape is what the curriculum
 * papers are for, which the foot of the page now links.
 *
 * So `/umakuma` is the explorer at the member's own level and `/umakuma/24` is
 * the explorer at level 24. Same page, same filters; the address only decides
 * where it opens.
 */
export default async function UmakumaLadderPage({ params }: { params: Promise<{ nickname: string }> }) {
  const { nickname } = await params;
  const shell = await loadUserPageShell(nickname);
  const [{ rows }, progress] = await Promise.all([
    loadLadderCrosswalk(),
    /* The UN level whoever is looking: this page browses the UN ladder. */
    deriveLadderLevel(shell.account.id, LADDER_STREAMS.un),
  ]);
  const page = ladderLevelPage(rows, KANJI_LADDER_LEVELS, clampLadderLevel(progress.level));

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
      <UmakumaLevelBoard
        nickname={decodeURIComponent(nickname)}
        group={page.group}
        levels={page.levels}
      />
    </div>
  );
}
