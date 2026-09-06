import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import ViewerPreviewBar from "@/app/shared/board/ViewerPreviewBar";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import PublicPageHeader from "@/app/shared/PublicPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { viewerAddress } from "@/app/shared/viewerAddress";
import { DASHBOARD_PAGE_HEADERS } from "@/app/users/[nickname]/dashboardPageHeaders";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { isViewerPreview, viewerKind } from "@/lib/accountListing";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { CURRICULUM_PAPERS_URL } from "@/lib/ladder/curriculumPapers";
import { rankingFormulaText } from "@/lib/ladder/rankingWeights";
import { rankingWeights } from "@/lib/ladder/rankingWeightsServer";

import LadderBoardRows from "../LadderBoardRows";
import { LADDER_BOARD_COPY as copy } from "../ladderBoardCopy";
import { ladderBoardPath, ladderBoardTabs, streamFromPath } from "../lib/ladderAddress";
import { rankLadderBoard } from "../lib/ladderBoard";
import { loadLadderBoard } from "../lib/ladderBoardServer";

/* Prisma-backed, and CI builds with no database to prerender against. */
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ stream?: string[] }>;
  searchParams: Promise<{ as?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const stream = streamFromPath((await params).stream);
  if (stream === undefined) return {};
  return {
    title: `${stream === null ? copy.title : copy.streamTitle(stream)} — UmaKuma`,
    description: stream === null ? copy.subtitle : copy.streamSubtitle(stream),
  };
}

/**
 * Who is climbing the UmaKuma curriculum, on either path.
 *
 * John: "there will be 2 boards obviously since people can choose 2 paths...
 * so a full leaderboard, and then one filtered to the Path."
 *
 * **Two boards cost barely more than one, because the counts are shared.**
 * `UkSrsState` is keyed by subject and both ladders order the same 2,235
 * kanji, so learned, passed and burned are identical either way - only which
 * level is counted differs. One count query, two level columns, one
 * `rankingScore`, three addresses.
 *
 * On the board of everyone each member is scored on their *own* path, because
 * ranking a UG member by their UN level would rank them on a ladder they have
 * never climbed. The score itself is the tunable one from `rankingWeights`,
 * which an admin retunes from the site - so the formula is printed from the
 * same object it is computed from and cannot go stale.
 */
export default async function LadderBoardPage({ params, searchParams }: PageProps) {
  const stream = streamFromPath((await params).stream);
  if (stream === undefined) notFound();

  const { as } = await searchParams;
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const isAdmin = isAdminEmail(viewerEmail);
  const address = viewerAddress(viewerMenuInfo);
  const [accounts, weights] = await Promise.all([
    loadLadderBoard(viewerKind({ isAdmin, hasAccount: Boolean(address), previewAs: as })),
    rankingWeights(),
  ]);
  const entries = rankLadderBoard(accounts, weights, stream);
  const viewer = { isAdmin, address, accountId: viewerMenuInfo?.accountId ?? null };

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <PublicPageHeader />
      <main className={`${PAGE_WIDTH.reading} space-y-4`}>
        <nav className="flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap admin-tab-scroll">
          {ladderBoardTabs().map((tab) => (
            <Link
              key={tab.label}
              href={ladderBoardPath(tab.stream)}
              aria-current={tab.stream === stream ? "page" : undefined}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] transition ${
                tab.stream === stream
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-surface text-foreground/70 hover:bg-surface-muted"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <ViewerPreviewBar
          isAdmin={isAdmin}
          previewAs={isViewerPreview(as) ? as : null}
          path={ladderBoardPath(stream)}
        />

        <MemberPageHeader
          icon={DASHBOARD_PAGE_HEADERS.stats.icon}
          title={stream === null ? copy.title : copy.streamTitle(stream)}
          subtitle={stream === null ? copy.subtitle : copy.streamSubtitle(stream)}
          actions={
            <a
              href={CURRICULUM_PAPERS_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-black text-foreground hover:text-accent"
            >
              {copy.papers}
            </a>
          }
        />

        <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold leading-relaxed text-foreground/75">{copy.streamsNote}</p>
          {/* Printed from the weights it is computed from, so retuning the
              board from the admin screen cannot leave this sentence lying. */}
          <p className="mt-2 text-xs font-semibold text-foreground/60">
            {copy.formulaLabel}: {rankingFormulaText(weights, {
              level: "Level",
              learned: "Learned",
              passed: "Passed",
              burned: "Burned",
            })}
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <h2 className="border-b border-line px-4 py-3 text-lg font-black text-foreground">
            {copy.count(entries.length)}
          </h2>
          {entries.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-base font-black text-foreground">{copy.empty}</p>
              <p className="mt-1 text-sm font-semibold text-foreground/70">{copy.emptyHint}</p>
            </div>
          ) : (
            <LadderBoardRows entries={entries} viewer={viewer} />
          )}
        </section>
      </main>
    </div>
  );
}
