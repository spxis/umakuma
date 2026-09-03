"use client";

import { useEffect, useState } from "react";

import type { JlptWordExample } from "@/lib/jlptTypes";

import { JLPT_EXPLORER_TEXT } from "../components/JlptExplorer.constants";
import type { KanjiStats } from "../components/JlptExplorerContent.types";

/**
 * What the open kanji's panel needs and the list does not carry.
 *
 * Two fetches with the same shape and the same trap. Both belong to one kanji,
 * both outlive the selection that started them when a member arrows down the
 * list, and both used to be able to show the previous kanji's answer under the
 * new kanji's glyph. Each result is stored beside the thing it belongs to and
 * compared on the way out, so a mismatch reads as loading rather than as the
 * last answer - and nothing is set synchronously inside an effect to clear it.
 */

type WordsState = { kanji: string; examples: JlptWordExample[] | null; failed: boolean };
type StatsState = { subjectId: number; history: KanjiStats | null; failed: boolean };

export type SelectedKanjiDetails = {
  /**
   * The compounds. Null is loading, not none.
   *
   * They used to arrive with the page: every one of the 2,211 rows carried its
   * own, 9.8MB of a 10.5MB payload, so that the one open panel could show them.
   */
  wordExamples: JlptWordExample[] | null;
  wordExamplesError: boolean;
  kanjiStats: KanjiStats | null;
  kanjiStatsLoading: boolean;
  kanjiStatsError: string | null;
};

export function useSelectedKanjiDetails({
  accountId,
  kanji,
  subjectId,
}: {
  accountId: string;
  /** The selected item's own character, or null when nothing is open. */
  kanji: string | null;
  /** Its WaniKani subject, when the member's account teaches this character. */
  subjectId: number | null;
}): SelectedKanjiDetails {
  const [words, setWords] = useState<WordsState>({ kanji: "", examples: null, failed: false });
  const [stats, setStats] = useState<StatsState>({ subjectId: 0, history: null, failed: false });

  useEffect(() => {
    if (!kanji) return;

    let current = true;
    fetch(`/api/jlpt/${encodeURIComponent(kanji)}/words`)
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as { words: JlptWordExample[] };
      })
      .then((payload) => {
        if (current) setWords({ kanji, examples: payload.words ?? [], failed: false });
      })
      .catch(() => {
        if (current) setWords({ kanji, examples: null, failed: true });
      });

    /* A member arrowing down the list outruns the network; the last one wins. */
    return () => {
      current = false;
    };
  }, [kanji]);

  /*
   * The account id is the one the page was given. It used to be read out of
   * `window.location`, whose first segment after /users/ is the member's
   * nickname or slug and never their account id, so every request answered 404
   * and Show review stats could not fill in.
   */
  useEffect(() => {
    if (!subjectId) return;

    let current = true;
    fetch(`/api/study/${accountId}/subjects/${subjectId}/history?refresh=1`)
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as { history?: KanjiStats };
      })
      .then((payload) => {
        if (current) setStats({ subjectId, history: payload.history ?? null, failed: false });
      })
      .catch(() => {
        if (current) setStats({ subjectId, history: null, failed: true });
      });

    return () => {
      current = false;
    };
  }, [accountId, subjectId]);

  const wordsAreThisKanji = words.kanji === kanji;
  const statsAreThisSubject = subjectId !== null && stats.subjectId === subjectId;

  return {
    wordExamples: wordsAreThisKanji ? words.examples : null,
    wordExamplesError: wordsAreThisKanji && words.failed,
    kanjiStats: statsAreThisSubject ? stats.history : null,
    /* A kanji WaniKani never taught has no history to wait for. */
    kanjiStatsLoading: subjectId !== null && !statsAreThisSubject,
    kanjiStatsError:
      statsAreThisSubject && stats.failed ? JLPT_EXPLORER_TEXT.statsError : null,
  };
}
