import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { PAGE_SHELL_PADDING } from "@/app/shared/pageShell";
import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { loadLadderCrosswalk } from "@/lib/ladder/ladderCrosswalkServer";
import { ladderLevelPage } from "@/lib/ladder/ladderLevelPage";

import { MEMBER_PAGE_HEADERS } from "../../dashboardPageHeaders";
import { loadUserPageShell } from "../../lib/userPageShell";
import UmakumaLevelBoard from "../UmakumaLevelBoard";
import { parseLadderLevel, UK_EXPLORER_PAGE } from "../umakumaAddress";

/* Prisma-backed through the crosswalk's word lookup, and CI builds without a
   DATABASE_URL: this page is rendered per request, never at build time. */
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ nickname: string; level: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { level } = await params;
  const wanted = parseLadderLevel(level);
  return { title: wanted ? `UmaKuma level ${wanted} — UmaKuma` : UK_EXPLORER_PAGE.title };
}

/**
 * One level of the curriculum, at its own address.
 *
 * The third explorer, brought into line with the other two. It paged ten
 * levels at a time behind a single URL, drew its own tiles, and offered no way
 * to link to a level or come back to one. Now it reads like `/grades/[grade]`
 * does: a level to an address, a picker for the rest, and the shared subject
 * list underneath so a kanji here looks like a kanji everywhere else.
 */
export default async function UmakumaLevelPage({ params }: PageProps) {
  const { nickname, level } = await params;
  const wanted = parseLadderLevel(level);
  if (wanted === null) notFound();

  const shell = await loadUserPageShell(nickname);
  const { rows } = await loadLadderCrosswalk();
  const page = ladderLevelPage(rows, KANJI_LADDER_LEVELS, wanted);

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
