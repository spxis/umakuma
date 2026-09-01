import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { KanjiDetailPanel } from "@/app/shared/KanjiDetailModal";
import UmaKumaPageBanner from "@/app/shared/UmaKumaPageBanner";
import { displayReading, readingsForGrade } from "@/app/users/[nickname]/grades/gradeExplorerView";
import { getSchoolGradeKanjiByCharacter } from "@/lib/schoolGrades";
import { getKanjiDictionaryAttribution, getKanjiDictionaryEntry } from "@/lib/kanjiDictionary";
import { fetchSentencesForKanji } from "@/lib/tatoebaSentences";

import KanjiDictionaryDetail from "./KanjiDictionaryDetail";
import KanjiSentences from "./KanjiSentences";

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
      ? `Stroke order and readings for ${character} (${meaning}).`
      : `Stroke order for ${character}.`,
  };
}

/**
 * A single kanji at its own address, so one can be sent to somebody.
 *
 * Public: it carries no member data, only the character, and a link that asks
 * the recipient to sign in first is not a link worth sending.
 */
export default async function KanjiPage({ params }: Props) {
  const character = firstCharacter((await params).character);
  if (!character) {
    notFound();
  }

  const entry = getSchoolGradeKanjiByCharacter(character);
  const readings = entry ? readingsForGrade(entry) : null;

  /*
   * The school catalogue covers what schools teach; the dictionary covers the
   * rest, which is most of what a shared link points at. Where both know the
   * character the curated grade entry leads, because its meanings are written
   * for a learner rather than transcribed from a reference.
   */
  const dictionary = getKanjiDictionaryEntry(character);
  const sentences = await fetchSentencesForKanji(character);
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
      <UmaKumaPageBanner variant="leaderboard" />

      <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <KanjiDetailPanel
          kanji={character}
          grade={entry?.grade ?? dictionary?.grade ?? undefined}
          summary={summary}
        />
      </section>

      {dictionary ? (
        <KanjiDictionaryDetail entry={dictionary} attribution={getKanjiDictionaryAttribution()} />
      ) : null}

      <KanjiSentences sentences={sentences} />

      <p className="text-center text-sm">
        <Link href="/" className="font-bold text-accent underline underline-offset-2">
          UmaKuma
        </Link>
      </p>
    </main>
  );
}
