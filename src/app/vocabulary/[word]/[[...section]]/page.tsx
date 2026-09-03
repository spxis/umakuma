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
import { getPublicSubject, getWordNeighbours, publicSubjectLabel } from "@/lib/publicSubject";
import { subjectPageHit } from "@/lib/subjectFiler";
import { fetchSentencesForWord } from "@/lib/tatoebaSentences";

type Props = { params: Promise<{ word: string; section?: string[] }> };

/**
 * One word at its own address.
 *
 * Search found 水泡 - Foam, level 46 - and selecting it opened the library
 * explorer, which said "No item matched 水泡". The explorer is built from the
 * member's own levels and stops at theirs, so for a member on level 17 there
 * was no level 46 for the word to appear in and no filter that would have
 * helped. A word needs a page of its own, and this is it.
 *
 * Each block of it is also a page - `/vocabulary/水泡/examples` is the
 * sentences and nothing else - from the registry the radical page draws from
 * too, so the two cannot answer differently.
 *
 * Public, like the kanji page: it holds the catalogue's description of a word
 * and nothing about anyone's account, so it answers the same for a member, a
 * visitor, and a link pasted into a chat.
 */
function decode(raw: string): string {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

/** The word's own page, which every section of it points back at. */
function wordHref(word: string): string {
  return `/vocabulary/${encodeURIComponent(word)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { word: raw, section: segments } = await params;
  const word = decode(raw);
  const subject = await getPublicSubject(SUBJECT_TYPES.vocabulary, word);
  if (!subject) return { title: word || "Vocabulary" };

  const label = publicSubjectLabel(subject);
  const meaning = subject.meanings[0] ?? null;
  const section = parseSubjectSection(segments);

  if (section && section !== "invalid") {
    const title = SUBJECT_PAGE_COPY.sectionTitles[section];
    return {
      title: `${label} · ${title}`,
      description: `${title} for ${label}${meaning ? ` (${meaning})` : ""}.`,
      /* The word's own page is the one of record; this is a part of it. */
      alternates: { canonical: wordHref(word) },
    };
  }

  /* The word leads, because a link pasted into a chat is read as its preview. */
  return {
    title: meaning ? `${label} · ${meaning}` : label,
    description: meaning ? `Readings and meaning for ${label} (${meaning}).` : `The word ${label}.`,
    alternates: { canonical: wordHref(word) },
  };
}

export default async function VocabularyPage({ params }: Props) {
  const { word: raw, section: segments } = await params;
  const word = decode(raw);
  const section = parseSubjectSection(segments);
  if (section === "invalid") {
    notFound();
  }

  const subject = await getPublicSubject(SUBJECT_TYPES.vocabulary, word);
  if (!subject) {
    return <NotFound word={word} />;
  }

  const label = publicSubjectLabel(subject);
  const [sentences, neighbours] = await Promise.all([
    fetchSentencesForWord(label),
    getWordNeighbours(subject),
  ]);

  const session = await getServerSession(authOptions);
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail: session?.user?.email?.trim().toLowerCase() ?? null,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const view = {
    subject, label, neighbours, sentences,
    /*
     * Only when the whole subject is on the page. On a section page the title
     * would link to the page it is already on.
     */
    sectionHref: section ? undefined : (id: SubjectSection) => subjectSectionHref(wordHref(word), id),
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
          base={wordHref(word)}
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

function NotFound({ word }: { word: string }) {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8 sm:px-6">
      <PublicPageHeader />
      <UmaKumaPageBanner variant="leaderboard" />

      <section className="space-y-2 rounded-3xl border border-line bg-surface p-5">
        <h1 className="text-xl font-black text-foreground">{SUBJECT_PAGE_COPY.notFoundTitle}</h1>
        <p className="text-sm font-semibold text-foreground/70">{SUBJECT_PAGE_COPY.notFoundWord}</p>
        <p className="text-sm">
          <Link
            href={`/search?query=${encodeURIComponent(word)}`}
            className="font-bold text-accent underline underline-offset-2"
          >
            {SUBJECT_PAGE_COPY.backToSearch}
          </Link>
        </p>
      </section>
    </main>
  );
}
