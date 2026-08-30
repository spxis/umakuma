"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import ModalShell from "@/app/shared/ModalShell";
import SegmentedControl from "@/app/shared/SegmentedControl";
import StudyTagListsBody from "@/app/shared/StudyTagListsBody";
import { MODAL_LAYERS } from "@/app/shared/modalLayers";
import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import {
  SUBJECT_VIEW_MODES,
  SUBJECT_VIEW_MODE_VALUES,
  type SubjectViewMode,
} from "@/app/shared/subjectListView";
import { updateStudyTag } from "@/app/users/[nickname]/study-explorer/lib/studyTagApi";
import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";
import { STUDY_TAGS, STUDY_TAG_VALUES, type StudyTag } from "@/lib/domainConstants";
import {
  STUDY_TAG_LIST_EVENT,
  type StudyTagListItem,
  type StudyTagListPayload,
} from "@/lib/studyTagLists";
import { openViewGlyphViewer } from "@/lib/viewGlyphViewer";
import { STUDY_TAG_LIST_COPY, STUDY_TAG_LIST_LABELS } from "./studyTagListsUi";

/** Toggling a tag anywhere in the app announces itself, so the panel can refresh. */
const STUDY_TAGS_UPDATED_EVENT = "wr:study-tags-updated";

/** The chosen density outlives the panel, which opens and closes constantly. */
const VIEW_MODE_STORAGE_KEY = "wr:study-tag-lists:view-mode";

/**
 * The Trouble and Favorites lists, floating over whatever the player is doing.
 *
 * Mounted once for the whole app and opened by event, so a Practice lobby, the
 * History page and either explorer all reach the same panel. Picking an item
 * hands the visible list to the glyph viewer, which stacks above this panel and
 * can walk the list from there.
 */
export default function StudyTagListsModal() {
  const [payload, setPayload] = useState<StudyTagListPayload | null>(null);
  const [tag, setTag] = useState<StudyTag>(STUDY_TAGS.trouble);
  const [items, setItems] = useState<StudyTagListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  /**
   * Read straight from storage: the panel renders nothing until an event opens
   * it, which is always well after hydration, so there is no server render of
   * the toggle for this to disagree with.
   */
  const [viewMode, setViewMode] = useState<SubjectViewMode>(() =>
    getStoredEnum(VIEW_MODE_STORAGE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.grid));

  const accountId = payload?.accountId ?? "";

  const changeViewMode = useCallback((next: SubjectViewMode) => {
    setViewMode(next);
    setStoredEnum(VIEW_MODE_STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<StudyTagListPayload>).detail;
      if (!detail?.accountId) return;
      setPayload(detail);
      setTag(detail.tag ?? STUDY_TAGS.trouble);
      setSearch("");
      setItems(null);
      setError(null);
      setRefreshKey((value) => value + 1);
    };

    window.addEventListener(STUDY_TAG_LIST_EVENT, onOpen);
    return () => window.removeEventListener(STUDY_TAG_LIST_EVENT, onOpen);
  }, []);

  const closePanel = useCallback(() => {
    setPayload(null);
    setItems(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    void fetch(`/api/study/${accountId}/tags/items`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as { items?: StudyTagListItem[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? STUDY_TAG_LIST_COPY.loadError);
        setItems(body.items ?? []);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : STUDY_TAG_LIST_COPY.loadError);
        setItems([]);
      });
    return () => controller.abort();
  }, [accountId, refreshKey]);

  useEffect(() => {
    if (!accountId) return;
    const onTagsUpdated = () => setRefreshKey((value) => value + 1);
    window.addEventListener(STUDY_TAGS_UPDATED_EVENT, onTagsUpdated);
    return () => window.removeEventListener(STUDY_TAGS_UPDATED_EVENT, onTagsUpdated);
  }, [accountId]);

  const counts = useMemo(() => ({
    [STUDY_TAGS.trouble]: (items ?? []).filter((item) => item.studyTags.trouble).length,
    [STUDY_TAGS.favorite]: (items ?? []).filter((item) => item.studyTags.favorite).length,
  }), [items]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (items ?? [])
      .filter((item) => item.studyTags[tag])
      .filter((item) => term.length === 0
        || item.characters.includes(term)
        || item.meanings.some((meaning) => meaning.toLowerCase().includes(term)));
  }, [items, search, tag]);

  const removeTag = useCallback(async (item: StudyTagListItem) => {
    setItems((current) => (current ?? []).map((entry) => (
      entry.subjectId === item.subjectId
        ? { ...entry, studyTags: { ...entry.studyTags, [tag]: false } }
        : entry
    )));
    const saved = await updateStudyTag(accountId, item.subjectId, tag, false);
    if (!saved) setRefreshKey((value) => value + 1);
  }, [accountId, tag]);

  if (!accountId) return null;

  return (
    <ModalShell
      onClose={closePanel}
      layer={MODAL_LAYERS.lists}
      label={STUDY_TAG_LIST_COPY.title}
      closeOnBackdrop
      height="list"
      panelClassName="flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_20px_65px_rgba(0,0,0,0.42)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-muted px-3 py-2.5 sm:px-4">
        <h2 className="truncate text-sm font-black uppercase tracking-widest text-foreground/80 sm:text-base">
          {STUDY_TAG_LIST_COPY.title}
        </h2>
        <button
          type="button"
          onClick={closePanel}
          aria-label={STUDY_TAG_LIST_COPY.close}
          className="h-8 shrink-0 cursor-pointer rounded-full border border-line bg-surface px-3 text-xs font-bold text-foreground hover:bg-surface-muted sm:h-9 sm:text-sm"
        >
          X
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
        <SegmentedControl
          ariaLabel={STUDY_TAG_LIST_COPY.title}
          size="md"
          value={tag}
          onChange={setTag}
          options={STUDY_TAG_VALUES.map((value) => ({
            value,
            label: `${STUDY_TAG_LIST_LABELS[value]} · ${counts[value]}`,
          }))}
        />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={STUDY_TAG_LIST_COPY.searchPlaceholder}
          aria-label={STUDY_TAG_LIST_COPY.searchPlaceholder}
          className="h-9 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-sm font-bold text-foreground"
        />
        <SubjectViewModeToggle value={viewMode} onChange={changeViewMode} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {error ? (
          <p className="py-10 text-center text-sm font-bold text-red-700">{error}</p>
        ) : items === null ? (
          <p className="py-10 text-center text-sm font-bold text-foreground/60">{STUDY_TAG_LIST_COPY.loading}</p>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-sm font-bold text-foreground/60">
            {counts[tag] === 0 ? STUDY_TAG_LIST_COPY.empty[tag] : STUDY_TAG_LIST_COPY.noMatches}
          </p>
        ) : (
          <StudyTagListsBody
            items={visible}
            viewMode={viewMode}
            onOpen={(index) => openViewGlyphViewer({
              items: visible,
              startIndex: index,
              accountId,
              title: STUDY_TAG_LIST_LABELS[tag],
            })}
            onRemove={(item) => void removeTag(item)}
          />
        )}
      </div>
    </ModalShell>
  );
}
