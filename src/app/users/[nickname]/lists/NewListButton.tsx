"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { STUDY_LIST_LIMITS } from "@/lib/studyListRules";

/**
 * Starting a list here, rather than only out on an explorer.
 *
 * Every list had to begin as a selection: choose characters somewhere, then
 * save them under a name. That is one honest way to build one, but it is not
 * the way somebody starts "kanji I keep losing" - they name the thing first
 * and fill it as they meet them. The page is called Your lists and had no way
 * to make one, which is the sort of gap that reads as the page being broken.
 *
 * A list may now be empty, so this needs nothing but a name.
 */
export default function NewListButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/study/${accountId}/lists`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? STUDY_LIST_COPY.saveFailed);
        return;
      }

      setName("");
      setNaming(false);
      router.refresh();
    } catch {
      setError(STUDY_LIST_COPY.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  if (!naming) {
    return (
      <button
        type="button"
        onClick={() => setNaming(true)}
        className="inline-flex h-8 items-center rounded-full bg-accent px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
      >
        {STUDY_LIST_COPY.newList}
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void create();
          if (event.key === "Escape") setNaming(false);
        }}
        maxLength={STUDY_LIST_LIMITS.nameLength}
        placeholder={STUDY_LIST_COPY.namePlaceholder}
        aria-label={STUDY_LIST_COPY.nameLabel}
        className="h-8 w-48 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-foreground"
      />
      <button
        type="button"
        onClick={() => void create()}
        disabled={saving || name.trim().length === 0}
        className="inline-flex h-8 items-center rounded-full bg-accent px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? STUDY_LIST_COPY.saving : STUDY_LIST_COPY.confirmSave}
      </button>
      <button
        type="button"
        onClick={() => setNaming(false)}
        className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60 hover:text-foreground"
      >
        {STUDY_LIST_COPY.cancel}
      </button>
      {error ? <span className="text-[11px] font-semibold text-rose-600">{error}</span> : null}
    </span>
  );
}
