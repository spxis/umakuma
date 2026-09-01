import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { formatDateShort } from "@/lib/timeFormat";

import AdminPageNav from "../../AdminPageNav";
import { ARTICLES_COPY } from "../Articles.constants";
import { findArticle, readingMinutes } from "../articles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = findArticle((await params).slug);
  return { title: article ? `${article.title} — UmaKuma` : ARTICLES_COPY.title };
}

/** One article, read at a width prose is comfortable at. */
export default async function AdminArticlePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;

  if (!isAdminEmail(viewerEmail)) {
    notFound();
  }

  const article = findArticle((await params).slug);
  if (!article) {
    notFound();
  }

  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const { Body } = article;

  return (
    <div className="relative px-2 py-1.5 sm:px-6 sm:py-4 lg:px-8">
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <main className="relative w-full space-y-3">
        <AppTopMenuRow
          viewerMenuInfo={viewerMenuInfo}
          showAdminActions={true}
          className="mb-2"
          subNav={<AdminPageNav activeTab="articles" />}
        />

        <article className="mx-auto w-full max-w-3xl space-y-6 rounded-2xl border border-line bg-surface px-5 py-6 sm:px-8 sm:py-8">
          <header className="space-y-2">
            <Link
              href="/admin/articles"
              className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent hover:underline"
            >
              ← {ARTICLES_COPY.back}
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {article.title}
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60">
              {ARTICLES_COPY.published} {formatDateShort(article.publishedAt)} ·{" "}
              {readingMinutes(article.words)} {ARTICLES_COPY.readingTime}
            </p>
          </header>

          <Body />
        </article>
      </main>
    </div>
  );
}
