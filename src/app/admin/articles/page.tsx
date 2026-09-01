import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { formatDateShort } from "@/lib/timeFormat";

import AdminPageNav from "../AdminPageNav";
import AdminWorkspaceHeader from "../AdminWorkspaceHeader";
import { ARTICLES_COPY } from "./Articles.constants";
import { listArticles, readingMinutes } from "./articles";

export const dynamic = "force-dynamic";

/**
 * Written notes on the work, kept inside the site rather than beside it.
 *
 * These were being handed over as links to pages hosted elsewhere, which put
 * them outside the repo, outside admin and outside version control - three
 * places they belong. An article is a component in this folder, so it ships
 * with the code it describes and cannot drift from the site's own type and
 * colour.
 */
export default async function AdminArticlesPage() {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;

  if (!isAdminEmail(viewerEmail)) {
    notFound();
  }

  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const articles = listArticles();

  return (
    <div className="relative overflow-hidden px-2 py-1.5 sm:px-6 sm:py-4 lg:px-8">
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <main className="relative w-full space-y-3">
        <AppTopMenuRow
          viewerMenuInfo={viewerMenuInfo}
          showAdminActions={true}
          className="mb-2"
          subNav={<AdminPageNav activeTab="articles" />}
        />

        <AdminWorkspaceHeader
          checkingSession={false}
          sessionAuthorized={true}
          signedIn={true}
          emailAllowed={true}
          userEmail={session?.user?.email ?? null}
          userName={session?.user?.name ?? null}
          title={ARTICLES_COPY.title}
          description={ARTICLES_COPY.subtitle}
        />

        {articles.length === 0 ? (
          <p className="rounded-2xl border border-line bg-surface-muted p-5 text-sm font-semibold text-foreground/70">
            {ARTICLES_COPY.empty}
          </p>
        ) : (
          <ul className="mx-auto w-full max-w-4xl divide-y divide-line/60 overflow-hidden rounded-2xl border border-line bg-surface">
            {articles.map((article) => (
              <li key={article.slug}>
                <Link
                  href={`/admin/articles/${article.slug}`}
                  className="block px-5 py-4 transition hover:bg-surface-muted/60"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60">
                    {formatDateShort(article.publishedAt)} · {readingMinutes(article.words)}{" "}
                    {ARTICLES_COPY.readingTime}
                  </p>
                  <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">
                    {article.title}
                  </h2>
                  <p className="mt-1 max-w-[68ch] text-sm text-foreground/70">{article.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
