import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";

import PublicPageHeader from "@/app/shared/PublicPageHeader";
import SubjectFilingBar from "@/app/shared/subject-page/SubjectFilingBar";
import UmaKumaPageBanner from "@/app/shared/UmaKumaPageBanner";
import { displayReading, readingsForGrade } from "@/app/users/[nickname]/grades/gradeExplorerView";
import { authOptions } from "@/lib/auth";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { getKanjiDictionaryAttribution, getKanjiDictionaryEntry } from "@/lib/kanjiDictionary";
import { getSchoolGradeKanjiByCharacter } from "@/lib/schoolGrades";
import { subjectPageHit } from "@/lib/subjectFiler";
import { loadKanjiPage } from "@/lib/subjectPage";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";

import { SUBJECT_PAGE_COPY } from "@/app/shared/subject-page/SubjectPage.constants";
import SubjectSectionHeader from "@/app/shared/subject-page/SubjectSectionHeader";
import { kanjiPageHref, parseSubjectSection } from "@/app/shared/subject-page/subjectSectionAddress";
import { filingStripIndex } from "@/app/shared/subject-page/subjectSectionLayout";

import { KANJI_PAGE_COPY } from "../KanjiPage.constants";
import { summaryLine } from "@/lib/kanjiSummaryLine";
import SubjectPageHeading from "@/app/shared/subject-page/SubjectPageHeading";
import { radicalPartsOf } from "@/lib/radicalSearchServer";

import { KANJI_SECTION_BLOCKS, kanjiSectionsFor, type KanjiSectionView } from "../kanjiSections";

type Props = { params: Promise<{ character: string; section?: string[] }> };

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
  const { character: raw, section: segments } = await params;
  const character = firstCharacter(raw);
  if (!character) return { title: "Kanji" };

  const section = parseSubjectSection(segments);
  const entry = getSchoolGradeKanjiByCharacter(character);
  /* A shared link previews as its title, so the dictionary answers for the
   * characters the school catalogue has never heard of. */
  const meaning = entry?.primaryMeaning ?? getKanjiDictionaryEntry(character)?.primaryMeaning ?? null;

  /*
   * The character leads the title, because a link pasted into a chat is read
   * as its preview. "何 · what" says what was shared; "UmaKuma" does not - and
   * on a section page the part shared leads instead of the meaning.
   */
  if (section && section !== "invalid") {
    const title = SUBJECT_PAGE_COPY.sectionTitles[section];
    return {
      title: `${character} · ${title}`,
      description: `${title} for ${character}${meaning ? ` (${meaning})` : ""}.`,
      /*
       * The character's own page is the real one.
       *
       * Six sections across ten thousand characters is sixty thousand pages
       * that each hold a fraction of what the whole page holds, which is the
       * shape a search engine treats as padding. These addresses exist to be
       * sent to somebody, not to compete with the page they are part of.
       */
      alternates: { canonical: kanjiPageHref(character) },
    };
  }

  return {
    title: meaning ? `${character} · ${meaning}` : character,
    description: meaning
      ? `Readings, compounds and stroke order for ${character} (${meaning}).`
      : `Stroke order for ${character}.`,
    alternates: { canonical: kanjiPageHref(character) },
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
 * Each of those blocks is also a page: `/kanji/魔/stroke` is the stroke order
 * on its own, for sending to somebody who asked about that and not about the
 * rest. Both come from one list of blocks, so the part cannot drift from the
 * whole.
 *
 * Public, and the same for every reader: it carries the character and nothing
 * about anyone's account, so a member copying the address sends what they saw
 * and the page stays cacheable. A member's own study state is a block for a
 * later release, not a reason to make this address vary by viewer.
 */
export default async function KanjiPage({ params }: Props) {
  const { character: raw, section: segments } = await params;
  const character = firstCharacter(raw);
  if (!character) {
    notFound();
  }

  const section = parseSubjectSection(segments);
  if (section === "invalid") {
    notFound();
  }

  const entry = getSchoolGradeKanjiByCharacter(character);
  const readings = entry ? readingsForGrade(entry) : null;
  const dictionary = getKanjiDictionaryEntry(character);
  const page = await loadKanjiPage(character);
  const session = await getServerSession(authOptions);
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail: session?.user?.email?.trim().toLowerCase() ?? null,
    sessionName: session?.user?.name?.trim() ?? null,
  });

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

  const view: KanjiSectionView = {
    character,
    grade: entry?.grade ?? dictionary?.grade ?? undefined,
    summary,
    dictionary,
    dictionaryAttribution: getKanjiDictionaryAttribution(),
    parts: radicalPartsOf(character),
    alone: section !== null,
    page,
  };

  const available = kanjiSectionsFor(view);
  /*
   * A section this character has nothing under is a 404 rather than an empty
   * page: WaniKani wrote no mnemonic for most characters, and an address that
   * renders a heading and nothing else is worth neither reading nor sharing.
   */
  const shown = section ? available.filter((block) => block.id === section) : available;
  if (shown.length === 0) {
    notFound();
  }

  const filingAt = filingStripIndex(
    shown.map((block) => block.id),
    KANJI_SECTION_BLOCKS.map((block) => block.id),
    "stroke",
  );

  const filing = (
    <SubjectFilingBar
      hit={subjectPageHit({
        subjectType: SUBJECT_TYPES.kanji,
        characters: character,
        slug: character,
        subjectId: page.wkSubjectId,
      })}
      accountId={viewerMenuInfo?.accountId ?? null}
      label={character}
    />
  );

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8 sm:px-6">
      <PublicPageHeader />
      <UmaKumaPageBanner variant="leaderboard" />

      {/* The whole page names its character; a single section keeps the
        * section header instead, which already says which character it is. */}
      {section ? null : <SubjectPageHeading label={character} line={summaryLine(summary)} />}

      {section ? (
        <SubjectSectionHeader
          base={kanjiPageHref(character)}
          label={character}
          section={section}
          available={available.map((block) => block.id)}
        />
      ) : null}

      {shown.map((block, index) => (
        <div key={block.id} className="space-y-5">
          {block.render(view)}
          {index === filingAt ? filing : null}
        </div>
      ))}

      <p className="text-center text-sm">
        <Link href="/" className="font-bold text-accent underline underline-offset-2">
          {KANJI_PAGE_COPY.backHome}
        </Link>
      </p>
    </main>
  );
}
