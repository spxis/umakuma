"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { kanjiToAddFromWords } from "@/app/shared/splitVocabulary";
import { mergeListItems } from "@/app/shared/mergeListItems";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import type { StudyListItemRef } from "@/lib/studyListRules";

/**
 * A word, taken apart into the kanji it is written with.
 *
 * A member saves 成功 to this week's list and then wants 成 and 功 on it as
 * well - the word is what they met, the characters are what they have to learn
 * - and the only way to do that was to find each one in an explorer and add it
 * by hand.
 *
 * Only what is missing is added, and the button says how many that is before
 * it is pressed: "Split · 3" over a set whose other kanji are already here
 * tells the member what the press will do rather than reporting it afterwards.
 * Nothing to add means no button, which is the same rule the rest of this bar
 * follows.
 */
export default function SplitVocabularyButton({
  accountId,
  listId,
  words,
  existing,
  onSplit,
}: {
  accountId: string;
  listId: string;
  /** The chosen words, as they are written. */
  words: string[];
  /** What the list holds now, so nothing is added twice. */
  existing: StudyListItemRef[];
  onSplit: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toAdd = kanjiToAddFromWords(words, existing);
  if (toAdd.length === 0) return null;

  async function split() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/study/${accountId}/lists`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: listId, items: mergeListItems(existing, toAdd) }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? STUDY_LIST_COPY.splitFailed);
        return;
      }
      onSplit();
      /* The page draws the list from the server, so the new kanji arrive with it. */
      router.refresh();
    } catch {
      setError(STUDY_LIST_COPY.splitFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => void split()}
        disabled={busy}
        title={STUDY_LIST_COPY.splitHint}
        className="inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/70 transition hover:bg-surface-muted disabled:opacity-60"
      >
        {busy ? STUDY_LIST_COPY.splitting : `${STUDY_LIST_COPY.split} · ${toAdd.length}`}
      </button>
      {error ? <span className="text-[11px] font-semibold text-rose-600">{error}</span> : null}
    </span>
  );
}
