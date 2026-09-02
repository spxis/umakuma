import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";

import ExampleSentences from "@/app/shared/ExampleSentences";
import PublicPageHeader from "@/app/shared/PublicPageHeader";
import SubjectFilingBar from "@/app/shared/subject-page/SubjectFilingBar";
import SubjectDetailPanel from "@/app/shared/SubjectDetailPanel";
import { SUBJECT_PAGE_COPY } from "@/app/shared/subject-page/SubjectPage.constants";
import UmaKumaPageBanner from "@/app/shared/UmaKumaPageBanner";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { KANJI_PAGE_COPY } from "@/app/kanji/[character]/KanjiPage.constants";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { authOptions } from "@/lib/auth";
import { getPublicSubject, getWordNeighbours, publicSubjectLabel } from "@/lib/publicSubject";
import { subjectPageHit } from "@/lib/subjectFiler";
import { fetchSentencesForWord } from "@/lib/tatoebaSentences";

type Props = { params: Promise<{ word: string }> };

/**
 * One word at its own address.
 *
 * Search found 水泡 - Foam, level 46 - and selecting it opened the library
 * explorer, which said "No item matched 水泡". The explorer is built from the
 * member's own levels and stops at theirs, so for a member on level 17 there
 * was no level 46 for the word to appear in and no filter that would have
 * helped. A word needs a page of its own, and this is it.
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const word = decode((await params).word);
  const subject = await getPublicSubject(SUBJECT_TYPES.vocabulary, word);
  if (!subject) return { title: word || "Vocabulary" };

  const label = publicSubjectLabel(subject);
  const meaning = subject.meanings[0] ?? null;

  /* The word leads, because a link pasted into a chat is read as its preview. */
  return {
    title: meaning ? `${label} · ${meaning}` : label,
    description: meaning ? `Readings and meaning for ${label} (${meaning}).` : `The word ${label}.`,
  };
}

export default async function VocabularyPage({ params }: Props) {
  const word = decode((await params).word);
  const subject = await getPublicSubject(SUBJECT_TYPES.vocabulary, word);

  if (!subject) {
    return <NotFound word={word} />;
  }

  const label = publicSubjectLabel(subject);
  const [sentences, neighbours] = await Promise.all([fetchSentencesForWord(label), getWordNeighbours(subject)]);

  const session = await getServerSession(authOptions);
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail: session?.user?.email?.trim().toLowerCase() ?? null,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8 sm:px-6">
      <PublicPageHeader />
      <UmaKumaPageBanner variant="leaderboard" />

      <SubjectDetailPanel subject={subject} label={label} neighbours={neighbours} />

      <SubjectFilingBar
        hit={subjectPageHit(subject)}
        accountId={viewerMenuInfo?.accountId ?? null}
        label={label}
      />

      <ExampleSentences
        sentences={sentences}
        heading={SUBJECT_PAGE_COPY.examples}
        credit={KANJI_PAGE_COPY.sentenceCredit}
      />

      <p className="text-center text-sm">
        <Link href="/" className="font-bold text-accent underline underline-offset-2">
          UmaKuma
        </Link>
      </p>
    </main>
  );
}

/*
 * Said plainly rather than as a 404. Somebody arrives here from a search
 * result or a shared link, and "Nothing here by that name" with a way back to
 * search is more use than the browser's own not-found page.
 */
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
