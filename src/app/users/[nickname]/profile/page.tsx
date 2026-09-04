import { MEMBER_PAGE_HEADERS } from "../dashboardPageHeaders";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import DisplayPreferences from "@/app/shared/DisplayPreferences";
import { DISPLAY_PREFERENCES_COPY } from "@/app/shared/displayPreferencesCopy";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { resolveDisplayName } from "@/lib/accountIdentity";
import { accountUrlKeyWhere } from "@/lib/accountLookup";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { certificateSummary, toCertificates } from "@/lib/jlptCertificates";
import { prisma } from "@/lib/prisma";
import { loadProfileGameStats } from "@/lib/profileStats";
import { formatDateTimeShort } from "@/lib/timeFormat";
import { hasWanikaniConnection } from "@/lib/wanikaniConnection";

import { canViewUserPage, resolveViewerMenuInfo } from "../userPageAuth";
import JlptCertificates from "./JlptCertificates";
import { wanikaniFact } from "./profileFacts";
import type { AgeBand } from "@/lib/srs/ageBand";
import { memberTheme } from "@/lib/srs/srsThemeServer";

import ProfileForm from "./ProfileForm";
import ThemePicker from "./ThemePicker";
import { JLPT_STATUS_LABELS, PROFILE_COPY } from "./profileCopy";

type PageProps = { params: Promise<{ nickname: string }> };

function Fact({
  label,
  value,
  hint,
  action,
}: {
  label: string;
  value: string;
  hint?: string;
  /** A fact that is also a door: WaniKani says Not connected and offers the page that fixes it. */
  action?: { label: string; href: string };
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-muted p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-foreground/60">{hint}</p> : null}
      {action ? (
        <Link href={action.href} className="mt-1 inline-block text-[11px] font-black text-accent hover:underline">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export default async function UserProfilePage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const { nickname } = await params;
  const account = await prisma.account.findFirst({
    where: accountUrlKeyWhere(decodeURIComponent(nickname)),
    select: {
      id: true, nickname: true, slug: true, displayName: true, visibility: true, wkUsername: true, wkLevel: true,
      jlptStatus: true, srsTheme: true, ageBand: true,
      jlptCertificates: { select: { id: true, system: true, level: true, year: true } },
      lastSyncedAt: true, lastActivityAt: true,
      tokenEncrypted: true, tokenIv: true, tokenTag: true,
    },
  });

  if (!account) {
    notFound();
  }

  /* Resolved here so the card arrives drawn: the theme decides its own
     heading and every rung shown, and a spinner in a settings page for
     data we already have is a worse first frame. */
  const memberThemeChoices = await memberTheme(account.id);
  if (!canViewUserPage({
      viewerEmail,
      viewerMenuInfo,
      targetWkUsername: account.wkUsername ?? "",
      targetSlug: account.slug,
    })) {
    redirect("/join?access=denied");
  }

  const games = await loadProfileGameStats(account.id);
  const name = resolveDisplayName(account);
  const wanikani = wanikaniFact({
    connected: hasWanikaniConnection(account),
    wkLevel: account.wkLevel,
    address: account.slug ?? account.wkUsername ?? "",
  });

  /*
   * The card leads with the hardest certificate held and says how many others
   * there are. A member with none falls back to what they said about the test.
   */
  const certificates = toCertificates(account.jlptCertificates);
  const jlpt =
    certificateSummary(certificates) ?? JLPT_STATUS_LABELS[account.jlptStatus ?? ""] ?? PROFILE_COPY.jlptNone;

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <AppTopMenuRow
        viewerMenuInfo={viewerMenuInfo}
        primaryWkUsername={account.wkUsername ?? account.slug}
        accountId={account.id}
        showAdminActions={isAdminEmail(viewerEmail)}
        lastSyncedAt={account.lastSyncedAt?.toISOString() ?? null}
        lastActivityAt={account.lastActivityAt?.toISOString() ?? null}
        className="mb-4"
      />

      {/* The form reads in a column; the navigation above it spans the page. */}
      <div className={PAGE_WIDTH.reading}>

      <MemberPageHeader
        icon={MEMBER_PAGE_HEADERS.profile.icon}
        title={name}
        subtitle={PROFILE_COPY.heading}
        className="mb-4"
      />

      <section className="mb-4 grid gap-2 sm:grid-cols-3">
        <Fact label={PROFILE_COPY.address} value={`/${account.slug ?? account.wkUsername ?? ""}`} hint={PROFILE_COPY.addressHint} />
        {/* Connected is a question about the token, not about a level: a
            level can be left behind by a connection that was removed, and a
            new connection has none until its first sync lands. */}
        <Fact label={wanikani.label} value={wanikani.value} hint={wanikani.hint} action={wanikani.action} />
        <Fact label={PROFILE_COPY.jlpt} value={jlpt} />
      </section>

      <section className="mb-4 rounded-2xl border border-line bg-surface p-5">
        <ProfileForm accountId={account.id} displayName={account.displayName} visibility={account.visibility} />
      </section>

      {/* Themes save on their own too, and the picker owns its whole card. */}
      <div className="mb-4">
        <ThemePicker
          accountId={account.id}
          initialTheme={memberThemeChoices.theme}
          initialChoices={memberThemeChoices.choices}
          initialAgeBand={(account.ageBand as AgeBand | null) ?? null}
        />
      </div>

      {/* Certificates save on their own, so they sit outside the form's Save. */}
      <section className="mb-4 rounded-2xl border border-line bg-surface p-5">
        <JlptCertificates accountId={account.id} certificates={certificates} status={account.jlptStatus} />
      </section>

      {/* Display sits with the rest of the account rather than in the menu. */}
      <section className="mb-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
          {DISPLAY_PREFERENCES_COPY.heading}
        </h2>
        <DisplayPreferences />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">{PROFILE_COPY.games}</h2>
          {games.totalRuns > 0 ? (
            <p className="text-xs font-semibold text-foreground/60">
              {games.totalRuns} {PROFILE_COPY.gamesRuns.toLowerCase()} · {PROFILE_COPY.gamesTotals}{" "}
              {games.overallAccuracy !== null ? `${games.overallAccuracy}%` : PROFILE_COPY.notPlayed}
            </p>
          ) : null}
        </div>

        {games.byKind.length === 0 ? (
          <p className="text-sm font-semibold text-foreground/60">{PROFILE_COPY.gamesEmpty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">
                  <th className="pb-2">{PROFILE_COPY.gamesKind}</th>
                  <th className="pb-2 text-right">{PROFILE_COPY.gamesRuns}</th>
                  <th className="pb-2 text-right">{PROFILE_COPY.gamesBest}</th>
                  <th className="pb-2 text-right">{PROFILE_COPY.gamesStreak}</th>
                  <th className="pb-2 text-right">{PROFILE_COPY.gamesAccuracy}</th>
                  <th className="pb-2 text-right">{PROFILE_COPY.gamesLast}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {games.byKind.map((stat) => (
                  <tr key={stat.kind}>
                    <td className="py-2 font-bold text-foreground">{stat.label}</td>
                    <td className="py-2 text-right tabular-nums text-foreground/75">{stat.runs}</td>
                    <td className="py-2 text-right tabular-nums font-bold text-foreground">{stat.bestScore.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums text-foreground/75">{stat.bestStreak}</td>
                    <td className="py-2 text-right tabular-nums text-foreground/75">
                      {stat.accuracy !== null ? `${stat.accuracy}%` : PROFILE_COPY.notPlayed}
                    </td>
                    <td className="py-2 text-right text-xs text-foreground/60">
                      {stat.lastPlayedAt ? formatDateTimeShort(stat.lastPlayedAt, PROFILE_COPY.notPlayed) : PROFILE_COPY.notPlayed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
