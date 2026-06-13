"use client";

import Link from "next/link";
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
  viewedWkUsername: string;
  studySource: StudySource;
  onSetStudySource: (next: StudySource) => void;
  customLibraryId: string | null;
  onSetCustomLibraryId: (next: string | null) => void;
  onActiveLibraryNameChange?: (name: string | null) => void;
  openRequestId?: number;
};

const DROPDOWN_WANIKANI_VALUE = "";

export default function StudySourceControls({
  accountId,
  viewedWkUsername,
  studySource,
  onSetStudySource,
  customLibraryId,
  onSetCustomLibraryId,
  onActiveLibraryNameChange,
  openRequestId,
}: Props) {
  const previousOpenRequestRef = useRef<number | undefined>(openRequestId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftLibraryId, setDraftLibraryId] = useState<string | null>(customLibraryId);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);

  const librariesPath = useMemo(() => `/api/custom-study/${accountId}/libraries`, [accountId]);
  const manageLibrariesHref = `/users/${encodeURIComponent(viewedWkUsername)}/libraries`;

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
  const hasLoadedLibraries = data !== undefined;

  useEffect(() => {
    if (!hasLoadedLibraries) {
      return;
    }

    if (libraries.length === 0) {
      onSetCustomLibraryId(null);
      if (studySource === "custom") {
        onSetStudySource("wanikani");
      }
      return;
    }

    if (customLibraryId && libraries.some((library) => library.id === customLibraryId)) {
      return;
    }

    if (customLibraryId && studySource === "custom") {
      onSetCustomLibraryId(null);
      onSetStudySource("wanikani");
      return;
    }

    const activeLibrary = libraries.find((library) => library.isActive) ?? libraries[0];
    onSetCustomLibraryId(activeLibrary?.id ?? null);
  }, [customLibraryId, hasLoadedLibraries, libraries, onSetCustomLibraryId, onSetStudySource, studySource]);

  useEffect(() => {
    if (!hasLoadedLibraries) {
      return;
    }

    const activeLibrary = libraries.find((library) => library.id === customLibraryId)
      ?? libraries.find((library) => library.isActive)
      ?? libraries[0]
      ?? null;
    onActiveLibraryNameChange?.(activeLibrary?.name ?? null);
  }, [customLibraryId, hasLoadedLibraries, libraries, onActiveLibraryNameChange]);

  useEffect(() => {
    if (isModalOpen) {
      return;
    }

    const activeLibrary = libraries.find((library) => library.id === customLibraryId)
      ?? libraries.find((library) => library.isActive)
      ?? libraries[0]
      ?? null;
    queueMicrotask(() => {
      setDraftLibraryId(activeLibrary?.id ?? null);
    });
  }, [customLibraryId, isModalOpen, libraries]);

  useEffect(() => {
    if (openRequestId === undefined) {
      return;
    }

    if (previousOpenRequestRef.current === openRequestId) {
      return;
    }

    previousOpenRequestRef.current = openRequestId;
    const activeLibraryId = libraries.find((library) => library.isActive)?.id ?? libraries[0]?.id ?? null;
    const resolvedCurrentLibraryId = customLibraryId ?? activeLibraryId;
    queueMicrotask(() => {
      setDraftLibraryId(studySource === "custom" ? resolvedCurrentLibraryId : null);
      setSelectionMessage(null);
      setIsModalOpen(true);
    });
  }, [customLibraryId, libraries, openRequestId, studySource]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setIsModalOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isModalOpen]);

  async function selectLibrary(nextLibraryId: string): Promise<void> {
    onSetCustomLibraryId(nextLibraryId);

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

  async function applySelectedLibrary(): Promise<void> {
    setSelectionMessage(null);

    if (!draftLibraryId || draftLibraryId === DROPDOWN_WANIKANI_VALUE) {
      onSetStudySource("wanikani");
      setIsModalOpen(false);
      return;
    }

    try {
      await selectLibrary(draftLibraryId);
      onSetStudySource("custom");
      setIsModalOpen(false);
    } catch (error) {
      setSelectionMessage(error instanceof Error ? error.message : "Could not select custom library.");
    }
  }

  const hasCustomLibraries = libraries.length > 0;

  return (
    <>
      {isModalOpen ? (
        <div className="fixed inset-0 z-10020 flex items-center justify-center bg-black/45 p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-study-library-loader-title"
            className="flex max-h-[75vh] min-h-90 w-[min(92vw,42rem)] min-w-[320px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_20px_55px_rgba(8,16,36,0.28)] sm:min-h-100"
          >
            <div className="border-b border-line px-5 py-4">
              <h3 id="custom-study-library-loader-title" className="text-lg font-black text-foreground">Change study library</h3>
              <p className="text-sm text-foreground/70">Select the source used by your study queue.</p>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="space-y-2">
                <label htmlFor="custom-library-select" className="block text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Library</label>
                <select
                  id="custom-library-select"
                  value={draftLibraryId ?? ""}
                  onChange={(event) => {
                    setDraftLibraryId(event.target.value || null);
                    setSelectionMessage(null);
                  }}
                  className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-foreground"
                  disabled={isLoading}
                >
                  <option value={DROPDOWN_WANIKANI_VALUE}>WaniKani (default)</option>
                  <option disabled>──────────</option>
                  {libraries.map((library) => (
                    <option key={library.id} value={library.id}>
                      {library.name} ({library.itemCount})
                    </option>
                  ))}
                  {!hasCustomLibraries ? <option disabled>No custom libraries yet</option> : null}
                </select>
              </div>

              <div className="rounded-xl border border-line bg-surface px-3 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Library manager</p>
                <p className="mt-1 text-xs text-foreground/70">Upload and manage libraries on the dedicated libraries page.</p>
                <Link
                  href={manageLibrariesHref}
                  onClick={() => setIsModalOpen(false)}
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted"
                >
                  Open libraries page
                </Link>
              </div>

              {selectionMessage ? <p className="text-sm text-foreground/70">{selectionMessage}</p> : null}
              {!hasCustomLibraries ? (
                <p className="text-sm text-foreground/70">No custom library found. Upload one from the libraries page first.</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-line px-5 py-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="inline-flex h-9 w-full items-center justify-center rounded-full border border-line bg-surface px-4 text-xs font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void applySelectedLibrary();
                }}
                disabled={isLoading}
                className="inline-flex h-9 w-full items-center justify-center rounded-full border border-accent bg-accent px-4 text-xs font-bold uppercase tracking-[0.08em] text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Use library
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
