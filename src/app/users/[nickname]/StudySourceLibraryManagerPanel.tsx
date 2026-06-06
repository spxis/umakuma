"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import StudySourceLibraryItemsManager from "./StudySourceLibraryItemsManager";
import {
  CUSTOM_LIBRARY_AI_PROMPT,
  SAMPLE_CUSTOM_LIBRARY_JSON,
} from "./StudySourceControls.constants";

type UploadedLibraryMeta = {
  name: string | null;
  source: string | null;
  language: string | null;
  itemCount: number | null;
};

type CustomLibraryRow = {
  id: string;
  name: string;
  itemCount: number;
  isActive: boolean;
};

type Props = {
  accountId: string;
  wkUsername: string;
};

export default function StudySourceLibraryManagerPanel({ accountId, wkUsername }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [draftLibraryId, setDraftLibraryId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameMessage, setRenameMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadedLibraryMeta, setUploadedLibraryMeta] = useState<UploadedLibraryMeta | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const librariesPath = useMemo(() => `/api/custom-study/${accountId}/libraries`, [accountId]);

  const { data, mutate, isLoading } = useSWR<{ libraries: CustomLibraryRow[] }>(
    librariesPath,
    async (url: string) => {
      const response = await fetch(url, { cache: "no-store" });
      const payload = (await response.json()) as { libraries?: CustomLibraryRow[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load custom libraries.");
      }

      return { libraries: payload.libraries ?? [] };
    },
    { revalidateOnFocus: true },
  );

  const libraries = useMemo(() => data?.libraries ?? [], [data?.libraries]);
  const selectedLibrary = libraries.find((library) => library.id === draftLibraryId) ?? null;

  useEffect(() => {
    if (libraries.length === 0) {
      setDraftLibraryId(null);
      return;
    }

    if (draftLibraryId && libraries.some((library) => library.id === draftLibraryId)) {
      return;
    }

    const fallback = libraries.find((library) => library.isActive) ?? libraries[0];
    setDraftLibraryId(fallback?.id ?? null);
  }, [draftLibraryId, libraries]);

  useEffect(() => {
    setRenameDraft(selectedLibrary?.name ?? "");
  }, [selectedLibrary?.id, selectedLibrary?.name]);

  async function selectLibrary(nextLibraryId: string): Promise<void> {
    const response = await fetch(librariesPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libraryId: nextLibraryId }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Could not select custom library.");
    }

    await mutate();
  }

  async function renameLibrary(): Promise<void> {
    if (!draftLibraryId) {
      setRenameMessage("Choose a library first.");
      return;
    }

    const trimmedName = renameDraft.trim();
    if (!trimmedName) {
      setRenameMessage("Library name cannot be empty.");
      return;
    }

    setIsRenaming(true);
    setRenameMessage(null);
    try {
      const response = await fetch(librariesPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libraryId: draftLibraryId, name: trimmedName }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not rename library.");
      }

      await mutate();
      setRenameMessage("Library renamed.");
    } catch (error) {
      setRenameMessage(error instanceof Error ? error.message : "Could not rename library.");
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleUploadFile(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    setUploadMessage(null);
    setUploadedLibraryMeta(null);
    setIsUploading(true);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const response = await fetch(`/api/custom-study/${accountId}/libraries/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: parsed }),
      });
      const payload = (await response.json()) as {
        error?: string;
        name?: string;
        source?: string | null;
        language?: string | null;
        itemCount?: number;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not import custom library.");
      }

      await mutate();
      setUploadMessage("Custom library uploaded.");
      setUploadedLibraryMeta({
        name: payload.name ?? null,
        source: payload.source ?? null,
        language: payload.language ?? null,
        itemCount: typeof payload.itemCount === "number" ? payload.itemCount : null,
      });

      const normalizedName = payload.name?.trim();
      const uploadedLibrary = normalizedName
        ? (data?.libraries ?? []).find((library) => library.name.trim() === normalizedName)
        : null;
      if (uploadedLibrary?.id) {
        setDraftLibraryId(uploadedLibrary.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not import custom library.";
      setUploadMessage(message);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function handleLibraryDeleted(): void {
    const remaining = libraries.filter((library) => library.id !== draftLibraryId);
    const fallback = remaining.find((library) => library.isActive) ?? remaining[0] ?? null;
    setDraftLibraryId(fallback?.id ?? null);
    void mutate();
  }

  async function handleSetActiveLibrary(): Promise<void> {
    if (!draftLibraryId) {
      setRenameMessage("Choose a library first.");
      return;
    }

    setRenameMessage(null);
    try {
      await selectLibrary(draftLibraryId);
      setRenameMessage("Active library updated.");
    } catch (error) {
      setRenameMessage(error instanceof Error ? error.message : "Could not select custom library.");
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <h1 className="text-2xl font-black text-foreground">Libraries</h1>
        <p className="mt-1 text-sm text-foreground/70">Upload, rename, activate, and prune your custom study libraries.</p>
        <p className="mt-1 text-xs text-foreground/60">Signed in as {wkUsername}</p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-black text-foreground">Choose library</h2>
        <p className="mt-1 text-sm text-foreground/70">Set which custom library is active for study mode.</p>

        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-1">
            <label htmlFor="library-manager-select" className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Library</label>
            <select
              id="library-manager-select"
              value={draftLibraryId ?? ""}
              onChange={(event) => {
                setDraftLibraryId(event.target.value || null);
                setRenameMessage(null);
              }}
              className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-foreground"
              disabled={isLoading || libraries.length === 0}
            >
              {libraries.length === 0 ? <option value="">No custom libraries yet</option> : null}
              {libraries.map((library) => (
                <option key={library.id} value={library.id}>
                  {library.name} ({library.itemCount}){library.isActive ? " • active" : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              void handleSetActiveLibrary();
            }}
            disabled={!draftLibraryId || isLoading}
            className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-surface px-4 text-xs font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Set active library
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-black text-foreground">Rename library</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-1">
            <label htmlFor="library-manager-rename" className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Library name</label>
            <input
              id="library-manager-rename"
              value={renameDraft}
              onChange={(event) => {
                setRenameDraft(event.target.value);
                setRenameMessage(null);
              }}
              className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-foreground"
              placeholder="Custom library name"
              disabled={!selectedLibrary}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              void renameLibrary();
            }}
            disabled={!selectedLibrary || isRenaming}
            className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-surface px-4 text-xs font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRenaming ? "Saving..." : "Save name"}
          </button>
        </div>
        {renameMessage ? <p className="mt-2 text-sm text-foreground/70">{renameMessage}</p> : null}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-black text-foreground">Upload custom library</h2>
        <div className="mt-3 space-y-3">
          <div className="overflow-x-auto rounded-xl border border-line bg-black/[0.04] p-3">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Sample custom library JSON</p>
            <pre className="mt-2 text-[11px] leading-relaxed text-foreground/85">{SAMPLE_CUSTOM_LIBRARY_JSON}</pre>
          </div>
          <div className="rounded-xl border border-dashed border-line bg-black/[0.03] p-3">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">AI prompt</p>
            <p className="mt-2 text-[11px] leading-relaxed text-foreground/85 whitespace-pre-wrap">{CUSTOM_LIBRARY_AI_PROMPT}</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              void handleUploadFile(event);
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-surface px-4 text-xs font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? "Uploading..." : "Upload JSON"}
          </button>

          {uploadMessage ? <p className="text-sm text-foreground/70">{uploadMessage}</p> : null}
          {uploadedLibraryMeta ? (
            <div className="rounded-xl border border-line bg-black/[0.03] px-3 py-2 text-xs text-foreground/80">
              <p className="font-semibold text-foreground">Uploaded library metadata</p>
              <p>Name: {uploadedLibraryMeta.name ?? "Unknown"}</p>
              <p>Source: {uploadedLibraryMeta.source ?? "Unknown"}</p>
              <p>Language: {uploadedLibraryMeta.language ?? "Unknown"}</p>
              <p>Items: {typeof uploadedLibraryMeta.itemCount === "number" ? uploadedLibraryMeta.itemCount : "Unknown"}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-black text-foreground">Manage items</h2>
        <p className="mt-1 text-sm text-foreground/70">Select a library and remove items or the whole library with confirmations.</p>

        <div className="mt-3">
          <StudySourceLibraryItemsManager
            accountId={accountId}
            libraryId={draftLibraryId}
            libraryName={selectedLibrary?.name ?? null}
            onLibrariesChanged={() => mutate()}
            onLibraryDeleted={handleLibraryDeleted}
          />
        </div>
      </div>
    </section>
  );
}
