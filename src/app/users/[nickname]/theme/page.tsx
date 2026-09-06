import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { THEME_PAGE_COPY } from "@/app/shared/themeCopy";
import { accountUrlKeyWhere } from "@/lib/accountLookup";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AgeBand } from "@/lib/srs/ageBand";
import { memberTheme } from "@/lib/srs/srsThemeServer";

import { MEMBER_PAGE_HEADERS } from "../dashboardPageHeaders";
import { canViewUserPage, resolveViewerMenuInfo } from "../userPageAuth";
import ThemeStagesPanel from "./ThemeStagesPanel";

/* Prisma-backed, and CI builds with no database to prerender against. */
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ nickname: string }> };

/**
 * A member's theme, on a page of its own.
 *
 * The profile already said which theme was on and let it be changed, but that
 * is a settings row: it has no room to say what the theme *is*, and the header
 * strip that now links here needs somewhere to land that is about the theme
 * rather than about the account. So the ten stages, the five tiers and the
 * browser live here, and the profile keeps the summary and the same door into
 * the same modal.
 *
 * Owner-only, the way XP and Study history are, through the same
 * `canViewUserPage` check — a theme is a preference on somebody's account, not
 * something the family reads about each other.
 */
export default async function UserThemePage({ params }: PageProps) {
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
      id: true,
      slug: true,
      wkUsername: true,
      ageBand: true,
      lastSyncedAt: true,
      lastActivityAt: true,
    },
  });

  if (!account) {
    notFound();
  }

  if (
    !canViewUserPage({
      viewerEmail,
      viewerMenuInfo,
      targetWkUsername: account.wkUsername ?? "",
      targetSlug: account.slug,
    })
  ) {
    redirect("/join?access=denied");
  }

  const { theme, choices } = await memberTheme(account.id);
  const address = account.slug ?? account.wkUsername ?? "";

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

      <main className={`${PAGE_WIDTH.reading} space-y-4`}>
        <MemberPageHeader
          icon={MEMBER_PAGE_HEADERS.profile.icon}
          title={THEME_PAGE_COPY.title}
          subtitle={THEME_PAGE_COPY.subtitle(theme.name)}
          actions={
            <Link
              href={`/users/${encodeURIComponent(address)}/settings`}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-black text-foreground hover:text-accent"
            >
              {THEME_PAGE_COPY.profile}
            </Link>
          }
        />

        <ThemeStagesPanel
          accountId={account.id}
          initialTheme={theme}
          initialChoices={choices}
          initialAgeBand={(account.ageBand as AgeBand | null) ?? null}
        />
      </main>
    </div>
  );
}
