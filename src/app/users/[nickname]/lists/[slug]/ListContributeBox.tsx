"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { LIST_CONTRIBUTIONS, type ListContributions } from "@/lib/listContributions";
import { STUDY_LIST_LIMITS, itemsFromText } from "@/lib/studyListRules";

/**
 * Adding to somebody else's list, from its page.
 *
 * One field, the same reading as the owner's editor: a run of kanji one by
 * one, anything with kana as a word. What happens next is the list's rule -
 * an open list takes it at once, a locked one turns it into a proposal with
 * the note beside it - and the box says which before the member types.
 */
export default function ListContributeBox({
  listId,
  viewerAccountId,
  listKey,
  contributions,
}: {
  listId: string;
  viewerAccountId: string;
  listKey: string | null;
  contributions: ListContributions;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = contributions === LIST_CONTRIBUTIONS.open;

  async function send() {
    const additions = itemsFromText(text);
    if (additions.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/study/${viewerAccountId}/lists/contributions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listId, key: listKey, additions, note: note.trim() || null }),
      });
      const body = (await response.json().catch(() => null)) as { applied?: number; proposed?: number; error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? STUDY_LIST_COPY.contributeFailed);
        return;
      }
      setText("");
      setNote("");
      setMessage(
        (body?.applied ?? 0) > 0
          ? STUDY_LIST_COPY.contributedApplied(body?.applied ?? 0)
          : STUDY_LIST_COPY.contributedProposed(body?.proposed ?? 0),
      );
      router.refresh();
    } catch {
      setError(STUDY_LIST_COPY.contributeFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-3 sm:p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
        {open ? STUDY_LIST_COPY.contributeOpenHeading : STUDY_LIST_COPY.contributeLockedHeading}
      </p>
      <p className="mt-1 text-xs font-semibold text-foreground/60">
        {open ? STUDY_LIST_COPY.contributeOpenHint : STUDY_LIST_COPY.contributeLockedHint}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void send();
            }
          }}
          placeholder={STUDY_LIST_COPY.addPlaceholder}
          aria-label={STUDY_LIST_COPY.addLabel}
          lang="ja"
          className="h-8 min-w-0 flex-1 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-foreground"
        />
        {!open ? (
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={STUDY_LIST_LIMITS.noteLength}
            placeholder={STUDY_LIST_COPY.proposalNotePlaceholder}
            aria-label={STUDY_LIST_COPY.proposalNotePlaceholder}
            className="h-8 min-w-0 flex-1 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-foreground"
          />
        ) : null}
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || itemsFromText(text).length === 0}
          className="inline-flex h-8 shrink-0 items-center rounded-full bg-accent px-3 text-[11px] font-black uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {open ? STUDY_LIST_COPY.add : STUDY_LIST_COPY.propose}
        </button>
      </div>
      {message ? <p className="mt-2 text-[11px] font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-2 text-[11px] font-semibold text-rose-600">{error}</p> : null}
    </section>
  );
}
