import type { Metadata } from "next";
import Link from "next/link";

import PublicPageHeader from "@/app/shared/PublicPageHeader";
import SubjectDetailPanel from "@/app/shared/SubjectDetailPanel";
import { SUBJECT_PAGE_COPY } from "@/app/shared/subject-page/SubjectPage.constants";
import UmaKumaPageBanner from "@/app/shared/UmaKumaPageBanner";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { getPublicSubject, publicSubjectLabel } from "@/lib/publicSubject";

type Props = { params: Promise<{ slug: string }> };

/**
 * One radical at its own address, addressed by its name.
 *
 * By name and not by glyph, because WaniKani draws a good number of radicals
 * rather than writing them: those have no character at all, and a search row
 * for one shows "leaf" where a kanji row shows a character. An address built
 * from what the row displays would have been a request for a kanji that does
 * not exist.
 *
 * Public for the same reason the word page is: it describes a radical, not a
 * member, so it can answer for one above the reader's level.
 */
function decode(raw: string): string {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decode((await params).slug);
  const subject = await getPublicSubject(SUBJECT_TYPES.radical, slug);
  if (!subject) return { title: slug || "Radical" };

  const meaning = subject.meanings[0] ?? slug;
  const label = publicSubjectLabel(subject);

  return {
    title: `${label} · ${meaning}`,
    description: `The ${meaning} radical, and the kanji built from it.`,
  };
}

export default async function RadicalPage({ params }: Props) {
  const slug = decode((await params).slug);
  const subject = await getPublicSubject(SUBJECT_TYPES.radical, slug);

  if (!subject) {
    return <NotFound slug={slug} />;
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8 sm:px-6">
      <PublicPageHeader />
      <UmaKumaPageBanner variant="leaderboard" />

      <SubjectDetailPanel subject={subject} label={publicSubjectLabel(subject)} />

      <p className="text-center text-sm">
        <Link href="/" className="font-bold text-accent underline underline-offset-2">
          UmaKuma
        </Link>
      </p>
    </main>
  );
}

function NotFound({ slug }: { slug: string }) {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8 sm:px-6">
      <PublicPageHeader />
      <UmaKumaPageBanner variant="leaderboard" />

      <section className="space-y-2 rounded-3xl border border-line bg-surface p-5">
        <h1 className="text-xl font-black text-foreground">{SUBJECT_PAGE_COPY.notFoundTitle}</h1>
        <p className="text-sm font-semibold text-foreground/70">{SUBJECT_PAGE_COPY.notFoundRadical}</p>
        <p className="text-sm">
          <Link
            href={`/search?query=${encodeURIComponent(slug)}`}
            className="font-bold text-accent underline underline-offset-2"
          >
            {SUBJECT_PAGE_COPY.backToSearch}
          </Link>
        </p>
      </section>
    </main>
  );
}
