"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import type { StudySource } from "./study-explorer/lib/studyExplorerTypes";

type CustomLibraryRow = {
  id: string;
  name: string;
  itemCount: number;
  isActive: boolean;
};

type Props = {
  accountId: string;
  studySource: StudySource;
  onSetStudySource: (next: StudySource) => void;
  customLibraryId: string | null;
  onSetCustomLibraryId: (next: string | null) => void;
  showSourceTabs?: boolean;
  showCustomActions?: boolean;
};

function sourceButtonClass(active: boolean): string {
  return active
    ? "inline-flex h-8 items-center justify-center rounded-full border border-accent bg-accent px-4 text-xs font-bold uppercase tracking-[0.1em] text-white"
    : "inline-flex h-8 items-center justify-center rounded-full px-4 text-xs font-bold uppercase tracking-[0.1em] text-foreground hover:bg-surface-muted";
}

export default function StudySourceControls({
  accountId,
  studySource,
  onSetStudySource,
  customLibraryId,
  onSetCustomLibraryId,
  showSourceTabs = true,
  showCustomActions = true,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
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

  useEffect(() => {
    const libraries = data?.libraries ?? [];
    if (libraries.length === 0) {
      onSetCustomLibraryId(null);
      return;
    }

    if (customLibraryId && libraries.some((library) => library.id === customLibraryId)) {
      return;
    }

    const activeLibrary = libraries.find((library) => library.isActive) ?? libraries[0];
    onSetCustomLibraryId(activeLibrary?.id ?? null);
  }, [customLibraryId, data?.libraries, onSetCustomLibraryId]);

  async function selectLibrary(nextLibraryId: string): Promise<void> {
    onSetCustomLibraryId(nextLibraryId);
    setUploadMessage(null);
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

  async function handleUploadFile(file: File): Promise<void> {
    setIsUploading(true);
    setUploadMessage(null);

    try {
      const text = await file.text();
      const payload = JSON.parse(text) as unknown;
      const response = await fetch(`/api/custom-study/${accountId}/libraries/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const body = (await response.json()) as {
        error?: string;
        summary?: { importedCount?: number };
        library?: { id?: string; name?: string };
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Could not import custom library.");
      }

      if (body.library?.id) {
        onSetCustomLibraryId(body.library.id);
      }

      setUploadMessage(`Imported ${body.summary?.importedCount ?? 0} items.`);
      await mutate();
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Could not import custom library.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  const libraries = data?.libraries ?? [];
  const showCustomControls = showCustomActions && studySource === "custom";

  if (!showSourceTabs && !showCustomControls) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2">
      {showSourceTabs ? (
        <div className="inline-flex shrink-0 items-center rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Study source">
          <button
            type="button"
            role="tab"
            aria-selected={studySource === "wanikani"}
            onClick={() => onSetStudySource("wanikani")}
            className={sourceButtonClass(studySource === "wanikani")}
          >
            WaniKani
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={studySource === "custom"}
            onClick={() => onSetStudySource("custom")}
            className={sourceButtonClass(studySource === "custom")}
          >
            Custom
          </button>
        </div>
      ) : null}

      {showCustomControls ? (
        <>
          <select
            value={customLibraryId ?? ""}
            onChange={(event) => {
              void selectLibrary(event.target.value);
            }}
            className="h-8 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-foreground"
            disabled={isLoading || libraries.length === 0}
            aria-label="Custom library"
          >
            {libraries.length === 0 ? (
              <option value="">No libraries yet</option>
            ) : (
              libraries.map((library) => (
                <option key={library.id} value={library.id}>
                  {library.name} ({library.itemCount})
                </option>
              ))
            )}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (file) {
                void handleUploadFile(file);
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex h-8 items-center justify-center rounded-full border border-line bg-surface px-4 text-xs font-bold uppercase tracking-widest text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? "Importing..." : "Upload JSON"}
          </button>
          {uploadMessage ? <span className="text-xs font-medium text-foreground/70">{uploadMessage}</span> : null}
        </>
      ) : null}
    </div>
  );
}
