"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  CUSTOM_LIBRARY_NAME_MAX_LENGTH,
  CUSTOM_LIBRARY_NAME_MIN_LENGTH,
  getCustomLibraryNameValidationMessage,
  sanitizeCustomLibraryNameInput,
} from "@/lib/customStudy/customLibraryNameValidation";
import { CUSTOM_LIBRARY_AI_PROMPT, SAMPLE_CUSTOM_LIBRARY_JSON } from "./StudySourceControls.constants";
import StudySourceLibraryItemsManager from "./StudySourceLibraryItemsManager";
import type { StudySource } from "./study-explorer/lib/studyExplorerTypes";
type CustomLibraryRow = {
  id: string;
  name: string;
  itemCount: number;
  isActive: boolean;
};
const DROPDOWN_WANIKANI_VALUE = "";
type UploadedLibraryMeta = { fileName: string; libraryName: string; externalKey: string; importedCount: number; createdCount: number; updatedCount: number; removedCount: number };
type Props = {
  accountId: string;
  studySource: StudySource;
  onSetStudySource: (next: StudySource) => void;
  customLibraryId: string | null;
  onSetCustomLibraryId: (next: string | null) => void;
  onActiveLibraryNameChange?: (name: string | null) => void;
  openRequestId?: number;
};
export default function StudySourceControls({
  accountId,
  studySource,
  onSetStudySource,
  customLibraryId,
  onSetCustomLibraryId,
  onActiveLibraryNameChange,
  openRequestId,
}: Props) {
  const previousOpenRequestRef = useRef<number | undefined>(openRequestId);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingCustomSelection, setPendingCustomSelection] = useState(false);
  const [draftLibraryId, setDraftLibraryId] = useState<string | null>(customLibraryId);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameMessage, setRenameMessage] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadedLibraryMeta, setUploadedLibraryMeta] = useState<UploadedLibraryMeta | null>(null);
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

  useEffect(() => {
    const libraries = data?.libraries ?? [];
    const activeLibrary = libraries.find((library) => library.id === customLibraryId)
      ?? libraries.find((library) => library.isActive)
      ?? libraries[0]
      ?? null;
    onActiveLibraryNameChange?.(activeLibrary?.name ?? null);
  }, [customLibraryId, data?.libraries, onActiveLibraryNameChange]);

  useEffect(() => {
    if (isModalOpen) {
      return;
    }

    const libraries = data?.libraries ?? [];
    const activeLibrary = libraries.find((library) => library.id === customLibraryId)
      ?? libraries.find((library) => library.isActive)
      ?? libraries[0]
      ?? null;
    setDraftLibraryId(activeLibrary?.id ?? null);
  }, [customLibraryId, data?.libraries, isModalOpen]);

  useEffect(() => {
    const libraries = data?.libraries ?? [];
    const selectedLibrary = libraries.find((library) => library.id === draftLibraryId) ?? null;
    setRenameDraft(selectedLibrary?.name ?? "");
  }, [draftLibraryId, data?.libraries]);

  useEffect(() => {
    if (openRequestId === undefined) {
      return;
    }

    if (previousOpenRequestRef.current === openRequestId) {
      return;
    }

    previousOpenRequestRef.current = openRequestId;
    const libraries = data?.libraries ?? [];
    const activeLibraryId = libraries.find((library) => library.isActive)?.id ?? libraries[0]?.id ?? null;
    const resolvedCurrentLibraryId = customLibraryId ?? activeLibraryId;
    setDraftLibraryId(studySource === "custom" ? resolvedCurrentLibraryId : null);
    setPendingCustomSelection(studySource !== "custom");
    setUploadMessage(null);
    setUploadedLibraryMeta(null);
    setRenameMessage(null);
    setIsModalOpen(true);
  }, [customLibraryId, data?.libraries, openRequestId, studySource]);

  async function selectLibrary(nextLibraryId: string): Promise<void> {
    onSetCustomLibraryId(nextLibraryId);
    setUploadMessage(null);
    setRenameMessage(null);

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

  async function renameLibrary(nextName: string): Promise<void> {
    if (!draftLibraryId) {
      setRenameMessage("Choose a library before renaming.");
      return;
    }

    const trimmedName = nextName.trim();
    const validationMessage = getCustomLibraryNameValidationMessage(trimmedName);
    if (validationMessage) {
      setRenameMessage(validationMessage);
      return;
    }

    setIsRenaming(true);
    setRenameMessage(null);

    try {
      const response = await fetch(librariesPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libraryId: draftLibraryId,
          name: trimmedName,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not rename custom library.");
      }

      setRenameMessage("Library name updated.");
      await mutate();
    } catch (error) {
      setRenameMessage(error instanceof Error ? error.message : "Could not rename custom library.");
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleUploadFile(file: File): Promise<void> {
    setIsUploading(true);
    setUploadMessage(null);
    setUploadedLibraryMeta(null);
    setRenameMessage(null);

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
        summary?: { importedCount?: number; createdCount?: number; updatedCount?: number; removedCount?: number };
        library?: { id?: string; externalKey?: string; name?: string };
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Could not import custom library.");
      }

      if (body.library?.id) {
        setDraftLibraryId(body.library.id);
        onSetCustomLibraryId(body.library.id);
      }

      setUploadMessage(`Imported ${body.summary?.importedCount ?? 0} items.`);
      setUploadedLibraryMeta({
        fileName: file.name,
        libraryName: body.library?.name ?? "Custom library",
        externalKey: body.library?.externalKey ?? "Unknown",
        importedCount: body.summary?.importedCount ?? 0,
        createdCount: body.summary?.createdCount ?? 0,
        updatedCount: body.summary?.updatedCount ?? 0,
        removedCount: body.summary?.removedCount ?? 0,
      });
      await mutate();
    } catch (error) {
      setUploadedLibraryMeta(null);
      setUploadMessage(error instanceof Error ? error.message : "Could not import custom library.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const libraries = data?.libraries ?? [];
  const activeLibraryId = libraries.find((library) => library.isActive)?.id ?? libraries[0]?.id ?? null;
  const currentCustomLibraryId = customLibraryId ?? activeLibraryId;
  const currentSelectionId = studySource === "custom"
    ? (currentCustomLibraryId ?? DROPDOWN_WANIKANI_VALUE)
    : DROPDOWN_WANIKANI_VALUE;
  const draftSelectionId = draftLibraryId ?? DROPDOWN_WANIKANI_VALUE;
  const selectedLibrary = libraries.find((library) => library.id === draftLibraryId) ?? null;
  const selectedLibraryName = selectedLibrary?.name ?? null;
  const trimmedRenameDraft = renameDraft.trim();
  const renameValidationMessage = getCustomLibraryNameValidationMessage(trimmedRenameDraft);
  const isSelectionDirty = draftSelectionId !== currentSelectionId;
  const isRenameDirty = Boolean(
    draftLibraryId
      && selectedLibraryName
      && trimmedRenameDraft
      && trimmedRenameDraft !== selectedLibraryName,
  );
  const isModalDirty = isSelectionDirty || isRenameDirty;
  const isRenameAllowed = Boolean(
    selectedLibraryName
      && trimmedRenameDraft
      && trimmedRenameDraft !== selectedLibraryName
      && !renameValidationMessage,
  );
  const isApplyDisabled = isUploading || !draftLibraryId || draftLibraryId === DROPDOWN_WANIKANI_VALUE;

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape") {
        return;
      }

      // Capture Escape at the modal level so external window handlers
      // cannot close this modal when it has unsaved edits.
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (isModalDirty) {
        return;
      }

      event.preventDefault();

      setPendingCustomSelection(false);
      setIsModalOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isModalDirty, isModalOpen]);

  async function applySelectedLibrary(): Promise<void> {
    if (!draftLibraryId || draftLibraryId === DROPDOWN_WANIKANI_VALUE) {
      onSetStudySource("wanikani");
      setPendingCustomSelection(false);
      setIsModalOpen(false);
      return;
    }

    try {
      await selectLibrary(draftLibraryId);
      onSetStudySource("custom");
      setPendingCustomSelection(false);
      setIsModalOpen(false);
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Could not select custom library.");
    }
  }

  function closeCustomLibraryModal(): void {
    setPendingCustomSelection(false);
    setIsModalOpen(false);
  }

  function handleLibraryDeleted(fallbackActiveLibraryId: string | null): void {
    setUploadedLibraryMeta(null);
    setUploadMessage("Library deleted.");
    setDraftLibraryId(fallbackActiveLibraryId);
    onSetCustomLibraryId(fallbackActiveLibraryId);

    if (!fallbackActiveLibraryId) {
      onSetStudySource("wanikani");
    }
  }

  return (
    <>
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

      {isModalOpen ? (
        <div className="fixed inset-0 z-10020 flex items-center justify-center bg-black/45 p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-study-library-modal-title"
            className="flex max-h-[75vh] min-h-115 w-[min(92vw,56rem)] min-w-[320px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_20px_55px_rgba(8,16,36,0.28)] sm:min-h-130"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h3 id="custom-study-library-modal-title" className="text-lg font-black text-foreground">Custom study library</h3>
                <p className="text-sm text-foreground/70">Choose one library for your custom study queue.</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="space-y-2">
                <label htmlFor="custom-library-select" className="block text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Library</label>
                <select
                  id="custom-library-select"
                  value={draftLibraryId ?? ""}
                  onChange={(event) => {
                    setDraftLibraryId(event.target.value || null);
                    setUploadMessage(null);
                    setRenameMessage(null);
                  }}
                  className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-foreground"
                  disabled={isLoading || libraries.length === 0}
                >
                  <option value={DROPDOWN_WANIKANI_VALUE}>WaniKani (default)</option>
                  <option disabled>──────────</option>
                  {libraries.map((library) => (
                    <option key={library.id} value={library.id}>
                      {library.name} ({library.itemCount})
                    </option>
                  ))}
                  {libraries.length === 0 ? <option disabled>No custom libraries yet</option> : null}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="custom-library-name" className="block text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Display name</label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    id="custom-library-name"
                    type="text"
                    value={renameDraft}
                    onChange={(event) => {
                      const rawValue = event.target.value;
                      const sanitizedValue = sanitizeCustomLibraryNameInput(rawValue);
                      setRenameDraft(sanitizedValue);
                      if (rawValue !== sanitizedValue) {
                        setRenameMessage("Use letters, numbers, spaces, hyphens, or underscores.");
                        return;
                      }
                      setRenameMessage(null);
                    }}
                    minLength={CUSTOM_LIBRARY_NAME_MIN_LENGTH}
                    maxLength={CUSTOM_LIBRARY_NAME_MAX_LENGTH}
                    placeholder="Library name"
                    disabled={!draftLibraryId}
                    className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-foreground placeholder:text-foreground/45 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void renameLibrary(renameDraft);
                    }}
                    disabled={!isRenameAllowed || isRenaming}
                    className="inline-flex h-10 min-w-28 items-center justify-center rounded-xl border border-line bg-surface px-4 text-xs font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-36"
                  >
                    {isRenaming ? "Saving..." : "Save name"}
                  </button>
                </div>
                <p className="text-[11px] font-medium text-foreground/55">
                  {trimmedRenameDraft.length}/{CUSTOM_LIBRARY_NAME_MAX_LENGTH} (min {CUSTOM_LIBRARY_NAME_MIN_LENGTH})
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Upload JSON</p>
                <p className="text-xs text-foreground/65">
                  Use the sample below as your template. Levels must be contiguous from 1 to your highest level with no gaps.
                </p>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Sample JSON file</p>
                <pre className="max-h-56 overflow-auto rounded-xl border border-line bg-surface px-3 py-2 text-[11px] leading-5 text-foreground/85">
                  {SAMPLE_CUSTOM_LIBRARY_JSON}
                </pre>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-surface px-4 text-xs font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading ? "Importing..." : "Upload JSON"}
                </button>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Prompt for AI</p>
                <textarea
                  readOnly
                  value={CUSTOM_LIBRARY_AI_PROMPT}
                  className="h-24 w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-xs text-foreground/80"
                />
              </div>

              <StudySourceLibraryItemsManager
                accountId={accountId}
                libraryId={draftLibraryId}
                libraryName={selectedLibraryName}
                onLibrariesChanged={mutate}
                onLibraryDeleted={handleLibraryDeleted}
              />

              {renameMessage ? <p className="text-sm text-foreground/70">{renameMessage}</p> : null}
              {!renameMessage && draftLibraryId && renameValidationMessage ? <p className="text-sm text-foreground/70">{renameValidationMessage}</p> : null}
              {uploadMessage ? <p className="text-sm text-foreground/70">{uploadMessage}</p> : null}
              {uploadedLibraryMeta ? (
                <div className="space-y-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-foreground/75">
                  <p className="font-bold text-foreground">Uploaded library</p>
                  <p>Name: {uploadedLibraryMeta.libraryName}</p>
                  <p>Key: {uploadedLibraryMeta.externalKey}</p>
                  <p>File: {uploadedLibraryMeta.fileName}</p>
                  <p>
                    Items: {uploadedLibraryMeta.importedCount} ({uploadedLibraryMeta.createdCount} new, {uploadedLibraryMeta.updatedCount} updated, {uploadedLibraryMeta.removedCount} removed)
                  </p>
                </div>
              ) : null}
              {pendingCustomSelection && libraries.length === 0 ? (
                <p className="text-sm text-foreground/70">Upload a JSON file to create your first custom library.</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-line px-5 py-4">
              <button
                type="button"
                onClick={closeCustomLibraryModal}
                className="inline-flex h-9 w-full items-center justify-center rounded-full border border-line bg-surface px-4 text-xs font-bold uppercase tracking-[0.08em] text-foreground hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void applySelectedLibrary();
                }}
                disabled={isApplyDisabled}
                className="inline-flex h-9 w-full items-center justify-center rounded-full border border-accent bg-accent px-4 text-xs font-bold uppercase tracking-[0.08em] text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Use selected library
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
