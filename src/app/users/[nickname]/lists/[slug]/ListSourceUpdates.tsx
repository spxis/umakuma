"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import SubjectPill from "@/app/shared/SubjectPill";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import type { ListItemKind } from "@/lib/domainConstants";

import { itemToneClass } from "../listItemDisplay";

/**
 * What the list this one was copied from has gained since.
 *
 * A copy is a snapshot, and the person it came from keeps adding. Following
 * instead would mean no longer owning what you are looking at, and copying
 * again would lose whatever you had changed - so a copy asks its source what
 * is new and takes across only what its owner wants.
 *
 * Item by item, because that is the whole point: somebody who copied a class
 * list and dropped half of it does not want the half back, and a single Take
 * all would be the same as re-copying. Each item is a button that takes just
 * itself; Take all is there for the common case of agreeing with everything.
 *
 * Silent when there is nothing new, which is almost always. A list that says
 * "0 new" every time it is opened is a list that has learned to be ignored.
 */
type Offered = { kind: ListItemKind; key: string; glyph: string; meaning: string };

type Answer = { reachable: boolean; name: string | null; owner?: string | null; added: Offered[] };

export default function ListSourceUpdates({ accountId, listId }: { accountId: string; listId: string }) {
  const router = useRouter();
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/study/${accountId}/lists/${listId}/source`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Answer | null) => {
        if (live && data) setAnswer(data);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [accountId, listId]);

  async function take(items?: Offered[]) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/study/${accountId}/lists/${listId}/source`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(items ? { items: items.map(({ kind, key }) => ({ kind, key })) } : {}),
      });
      if (!response.ok) return;
      setAnswer((held) =>
        held ? { ...held, added: items ? held.added.filter((one) => !items.includes(one)) : [] } : held,
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  /* Nothing to say: no source, nothing new, or a source gone quiet. */
  if (!answer || !answer.reachable || answer.added.length === 0) return null;

  return (
    <section className="rounded-2xl border border-accent/30 bg-accent/5 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-accent">
          {STUDY_LIST_COPY.sourceHeading}
        </p>
        <p className="text-xs font-semibold text-foreground/75">
          {STUDY_LIST_COPY.sourceAdded(answer.added.length, answer.name ?? "")}
        </p>
        <button
          type="button"
          onClick={() => void take()}
          disabled={busy}
          className="ml-auto inline-flex h-8 items-center rounded-full bg-accent px-3 text-[11px] font-black uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {STUDY_LIST_COPY.sourceTakeAll}
        </button>
      </div>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {answer.added.map((item) => (
          <li key={`${item.kind}:${item.key}`}>
            <SubjectPill
              glyph={item.glyph}
              subjectType={item.kind}
              meaning={item.meaning}
              reading={null}
              tone={itemToneClass(item.kind)}
              size="sm"
              label={`${STUDY_LIST_COPY.sourceTakeOne} ${item.glyph}`}
              onClick={() => void take([item])}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
