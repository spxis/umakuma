"use client";

import { openStudyTagLists, type StudyTagListPayload } from "@/lib/studyTagLists";
import { STUDY_TAG_LIST_COPY } from "./studyTagListsUi";

type Props = {
  accountId: string;
  /** Which list opens first; the panel always offers both. */
  tag?: StudyTagListPayload["tag"];
  size?: "md" | "sm";
};

/**
 * Opens the Trouble and Favorites panel from wherever the lists are worth a
 * look: the game lobby before a Practice round, the History page, the explorers.
 */
export default function StudyTagListsButton({ accountId, tag, size = "md" }: Props) {
  if (!accountId) return null;

  const shell = size === "md" ? "h-11 px-5 text-sm" : "h-9 px-4 text-xs";
  return (
    <button
      type="button"
      onClick={() => openStudyTagLists({ accountId, tag })}
      className={`inline-flex shrink-0 cursor-pointer items-center rounded-full border border-line bg-surface font-black text-foreground transition hover:bg-surface-muted ${shell}`}
    >
      {STUDY_TAG_LIST_COPY.button}
    </button>
  );
}
