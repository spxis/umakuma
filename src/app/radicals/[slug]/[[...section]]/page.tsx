import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";

import PublicPageHeader from "@/app/shared/PublicPageHeader";
import SubjectFilingBar from "@/app/shared/subject-page/SubjectFilingBar";
import SubjectSectionHeader from "@/app/shared/subject-page/SubjectSectionHeader";
import { SUBJECT_PAGE_COPY } from "@/app/shared/subject-page/SubjectPage.constants";
import {
  parseSubjectSection,
  subjectSectionHref,
  type SubjectSection,
} from "@/app/shared/subject-page/subjectSectionAddress";
import { filingStripIndex } from "@/app/shared/subject-page/subjectSectionLayout";
import { SUBJECT_SECTION_BLOCKS, subjectSectionsFor } from "@/app/shared/subject-page/subjectSections";
import UmaKumaPageBanner from "@/app/shared/UmaKumaPageBanner";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { authOptions } from "@/lib/auth";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { getPublicSubject, publicSubjectLabel } from "@/lib/publicSubject";
import { subjectPageHit } from "@/lib/subjectFiler";

type Props = { params: Promise<{ slug: string; section?: string[] }> };

/**
 * One radical at its own address, addressed by its name.
 *
 * By name and not by glyph, because WaniKani draws a good number of radicals
 * rather than writing them: those have no character at all, and a search row
 * for one shows "leaf" where a kanji row shows a character. An address built
 * from what the row displays would have been a request for a kanji that does
 * not exist.
 *
 * Each block of the page is also a page - `/radicals/leaf/related` is the
 * kanji built from it and nothing else - drawn from the same registry the
 * whole page draws from, and from the same one the word page uses.
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

/** The radical's own page, which every section of it points back at. */
function radicalHref(slug: string): string {
  return `/radicals/${encodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: raw, section: segments } = await params;
  const slug = decode(raw);
  const subject = await getPublicSubject(SUBJECT_TYPES.radical, slug);
  if (!subject) return { title: slug || "Radical" };

  const meaning = subject.meanings[0] ?? slug;
  const label = publicSubjectLabel(subject);
  const section = parseSubjectSection(segments);

  if (section && section !== "invalid") {
    const title = SUBJECT_PAGE_COPY.sectionTitles[section];
    return {
      title: `${label} · ${title}`,
      description: `${title} for the ${meaning} radical.`,
      /* The radical's own page is the one of record; this is a part of it. */
      alternates: { canonical: radicalHref(slug) },
    };
  }

  return {
    title: `${label} · ${meaning}`,
    description: `The ${meaning} radical, and the kanji built from it.`,
    alternates: { canonical: radicalHref(slug) },
  };
}

export default async function RadicalPage({ params }: Props) {
  const { slug: raw, section: segments } = await params;
  const slug = decode(raw);
  const section = parseSubjectSection(segments);
  if (section === "invalid") {
    notFound();
  }

  const subject = await getPublicSubject(SUBJECT_TYPES.radical, slug);
  if (!subject) {
    return <NotFound slug={slug} />;
  }

  const session = await getServerSession(authOptions);
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail: session?.user?.email?.trim().toLowerCase() ?? null,
    sessionName: session?.user?.name?.trim() ?? null,
  });
  const label = publicSubjectLabel(subject);

  /* A radical is never in an example sentence, and has no neighbouring words. */
  const view = {
    subject, label, neighbours: [], sentences: [],
    /*
     * Only when the whole subject is on the page. On a section page the title
     * would link to the page it is already on.
     */
    sectionHref: section ? undefined : (id: SubjectSection) => subjectSectionHref(radicalHref(slug), id),
  };
  const available = subjectSectionsFor(view);
  const shown = section ? available.filter((block) => block.id === section) : available;
  if (shown.length === 0) {
    notFound();
  }

  const filingAt = filingStripIndex(
    shown.map((block) => block.id),
    SUBJECT_SECTION_BLOCKS.map((block) => block.id),
    "related",
  );

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8 sm:px-6">
      <PublicPageHeader />
      <UmaKumaPageBanner variant="leaderboard" />

      {section ? (
        <SubjectSectionHeader
          base={radicalHref(slug)}
          label={label}
          section={section}
          available={available.map((block) => block.id)}
        />
      ) : null}

      {shown.map((block, index) => (
        <div key={block.id} className="space-y-5">
          {block.render(view)}
          {index === filingAt ? (
            <SubjectFilingBar
              hit={subjectPageHit(subject)}
              accountId={viewerMenuInfo?.accountId ?? null}
              label={label}
            />
          ) : null}
        </div>
      ))}

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
