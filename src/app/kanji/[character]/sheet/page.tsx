import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import PublicPageHeader from "@/app/shared/PublicPageHeader";
import SourceCredit from "@/app/shared/SourceCredit";
import SubjectPageHeading from "@/app/shared/subject-page/SubjectPageHeading";
import { displayReading, readingsForGrade } from "@/app/users/[nickname]/grades/gradeExplorerView";
import { getKanjiDictionaryEntry } from "@/lib/kanjiDictionary";
import { summaryLine } from "@/lib/kanjiSummaryLine";
import { getSchoolGradeKanjiByCharacter } from "@/lib/schoolGrades";
import { SOURCE_CREDIT_COPY, SOURCE_KEYS } from "@/lib/sourceCredits";
import { getStrokeOrder } from "@/lib/strokeOrder";

import { KANJI_PAGE_COPY } from "../KanjiPage.constants";
import KanjiPracticeSheet from "./KanjiPracticeSheet";
import { KANJI_SHEET_COPY } from "./kanjiSheetCopy";

/**
 * One character as a sheet of paper.
 *
 * A static segment rather than a section of the character page: the page is a
 * stack of cards to read and this is a thing to print, and the two want
 * opposite layouts. `/kanji/X/sheet` beats the optional catch-all beside it,
 * so the sections keep their addresses.
 *
 * Public, like the character page it hangs off. A parent printing a sheet for
 * a child has no reason to be signed in first.
 */
type PageProps = { params: Promise<{ character: string }> };

function decode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const character = decode((await params).character);
  return { title: `${character} — ${KANJI_SHEET_COPY.practiceHeading}` };
}

export default async function KanjiSheetPage({ params }: PageProps) {
  const character = decode((await params).character);

  const entryFromGrade = getSchoolGradeKanjiByCharacter(character);
  const dictionary = getKanjiDictionaryEntry(character);
  const strokes = getStrokeOrder(character, entryFromGrade?.grade ?? dictionary?.grade ?? undefined);

  /* No strokes, no sheet: the steps are the whole reason this page exists. */
  if (!strokes) {
    notFound();
  }

  const readings = entryFromGrade ? readingsForGrade(entryFromGrade) : null;
  const summary = entryFromGrade
    ? {
        meaning: entryFromGrade.primaryMeaning ?? null,
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
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8 sm:px-6 print:max-w-none print:px-0 print:py-0">
      {/* The chrome is for the screen; paper gets the character and the squares. */}
      <div className="print:hidden">
        <PublicPageHeader />
      </div>

      <SubjectPageHeading label={character} line={summaryLine(summary)} />

      <p className="text-sm text-foreground/60 print:hidden">{KANJI_SHEET_COPY.hint}</p>

      <KanjiPracticeSheet
        entry={{
          kanji: character,
          meaning: summary?.meaning ?? null,
          on: summary?.on ?? [],
          kun: summary?.kun ?? [],
          strokes: strokes.strokes,
          strokeCount: strokes.strokeCount,
          viewBox: strokes.viewBox,
        }}
      />

      <div className="print:hidden">
        <SourceCredit source={SOURCE_KEYS.kanjivg} label={SOURCE_CREDIT_COPY.strokes} />
        <p className="mt-4 text-center text-sm">
          <Link
            href={`/kanji/${encodeURIComponent(character)}`}
            className="font-bold text-accent underline underline-offset-2"
          >
            {KANJI_SHEET_COPY.back}
          </Link>
          {" · "}
          <Link href="/" className="font-bold text-accent underline underline-offset-2">
            {KANJI_PAGE_COPY.backHome}
          </Link>
        </p>
      </div>
    </main>
  );
}
