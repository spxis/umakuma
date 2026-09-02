import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ExampleSentences from "@/app/shared/ExampleSentences";
import { KanjiDetailPanel } from "@/app/shared/KanjiDetailModal";
import PublicPageHeader from "@/app/shared/PublicPageHeader";
import MnemonicsBlock from "@/app/shared/subject-page/MnemonicsBlock";
import RelatedGroupBlock from "@/app/shared/subject-page/RelatedGroupBlock";
import SubjectBlock from "@/app/shared/subject-page/SubjectBlock";
import UsedInWordsBlock from "@/app/shared/subject-page/UsedInWordsBlock";
import UmaKumaPageBanner from "@/app/shared/UmaKumaPageBanner";
import { displayReading, readingsForGrade } from "@/app/users/[nickname]/grades/gradeExplorerView";
import { getKanjiDictionaryAttribution, getKanjiDictionaryEntry } from "@/lib/kanjiDictionary";
import { getSchoolGradeKanjiByCharacter } from "@/lib/schoolGrades";
import { SOURCE_CREDITS, SOURCE_CREDIT_COPY } from "@/lib/sourceCredits";
import { loadKanjiPage } from "@/lib/subjectPage";

import KanjiDictionaryDetail from "./KanjiDictionaryDetail";
import { KANJI_PAGE_COPY } from "./KanjiPage.constants";

type Props = { params: Promise<{ character: string }> };

/** One character, and nothing else. Everything past the first is ignored. */
function firstCharacter(raw: string): string | null {
  const decoded = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();

  const characters = [...decoded.trim()];
  return characters.length > 0 ? characters[0]! : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const character = firstCharacter((await params).character);
  if (!character) return { title: "Kanji" };

  const entry = getSchoolGradeKanjiByCharacter(character);
  /* A shared link previews as its title, so the dictionary answers for the
   * characters the school catalogue has never heard of. */
  const meaning = entry?.primaryMeaning ?? getKanjiDictionaryEntry(character)?.primaryMeaning ?? null;

  /*
   * The character leads the title, because a link pasted into a chat is read
   * as its preview. "何 · what" says what was shared; "UmaKuma" does not.
   */
  return {
    title: meaning ? `${character} · ${meaning}` : character,
    description: meaning
      ? `Readings, compounds and stroke order for ${character} (${meaning}).`
      : `Stroke order for ${character}.`,
  };
}

/**
 * A single kanji at its own address: the page every search result lands on.
 *
 * Built as an ordered list of blocks, each fed by one source and each drawing
 * nothing when it has nothing. The dictionary answers for all ten thousand
 * characters, the JLPT table adds the compounds for the two thousand the
 * exams cover, and WaniKani adds its radicals, look-alikes, vocabulary and
 * mnemonics for the two thousand it teaches. A character WaniKani has never
 * heard of still gets a complete page; one it teaches gets a better one.
 *
 * Public, and the same for every reader: it carries the character and nothing
 * about anyone's account, so a member copying the address sends what they saw
 * and the page stays cacheable. A member's own study state is a block for a
 * later release, not a reason to make this address vary by viewer.
 */
export default async function KanjiPage({ params }: Props) {
  const character = firstCharacter((await params).character);
  if (!character) {
    notFound();
  }

  const entry = getSchoolGradeKanjiByCharacter(character);
  const readings = entry ? readingsForGrade(entry) : null;
  const dictionary = getKanjiDictionaryEntry(character);
  const page = await loadKanjiPage(character);

  /*
   * The school catalogue covers what schools teach; the dictionary covers the
   * rest, which is most of what a shared link points at. Where both know the
   * character the curated grade entry leads, because its meanings are written
   * for a learner rather than transcribed from a reference.
   */
  const summary = entry
    ? {
        meaning: entry.primaryMeaning ?? null,
        on: (readings?.on ?? []).map(displayReading),
        kun: (readings?.kun ?? []).map(displayReading),
      }
    : dictionary
      ? {
          meaning: dictionary.primaryMeaning,
          on: dictionary.readings.on.map(displayReading),
          kun: dictionary.readings.kun.map(displayReading),
        }
      : undefined;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8 sm:px-6">
      <PublicPageHeader />
      <UmaKumaPageBanner variant="leaderboard" />

      <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <KanjiDetailPanel
          kanji={character}
          grade={entry?.grade ?? dictionary?.grade ?? undefined}
          summary={summary}
        />
      </section>

      {dictionary ? (
        <KanjiDictionaryDetail
          entry={dictionary}
          attribution={getKanjiDictionaryAttribution()}
          jlptLevel={page.jlptLevel}
          heisigKeyword={page.heisigKeyword}
        />
      ) : null}

      <UsedInWordsBlock words={page.words} />

      {page.related.length > 0 ? (
        <SubjectBlock credit={{ source: SOURCE_CREDITS.wanikani, label: SOURCE_CREDIT_COPY.relations }}>
          {page.related.map((group) => (
            <RelatedGroupBlock key={group.id} group={group} />
          ))}
        </SubjectBlock>
      ) : null}

      <MnemonicsBlock mnemonics={page.mnemonics} />

      <ExampleSentences
        sentences={page.sentences}
        heading={KANJI_PAGE_COPY.examples}
        credit={KANJI_PAGE_COPY.sentenceCredit}
      />

      <p className="text-center text-sm">
        <Link href="/" className="font-bold text-accent underline underline-offset-2">
          {KANJI_PAGE_COPY.backHome}
        </Link>
      </p>
    </main>
  );
}
