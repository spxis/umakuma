"use client";

import Link from "next/link";

import { useUserBasePath } from "./userBasePath";
import { STUDY_TAG_LIST_COPY } from "./studyTagListsUi";
import { STUDY_TAGS, type StudyTag } from "@/lib/domainConstants";
import { slugForListTag } from "@/lib/studyListRules";

type Props = {
  accountId: string;
  /** Which list to open; the page offers the way to the others. */
  tag?: StudyTag;
  size?: "md" | "sm";
};

/**
 * The way to the Trouble and Favourites lists from wherever they are worth a
 * look: the game lobby before a Practice round, History, the explorers.
 *
 * A link to the list's page rather than a panel that opens over whatever you
 * were reading. There is one view of a list, and this is how you reach it.
 */
export default function StudyTagListsButton({ accountId, tag = STUDY_TAGS.trouble, size = "md" }: Props) {
  const base = useUserBasePath();
  if (!accountId || !base) return null;

  const shell = size === "md" ? "h-11 px-5 text-sm" : "h-9 px-4 text-xs";
  return (
    <Link
      href={`${base}/lists/${slugForListTag(tag)}`}
      className={`inline-flex shrink-0 cursor-pointer items-center rounded-full border border-line bg-surface font-black text-foreground transition hover:bg-surface-muted ${shell}`}
    >
      {STUDY_TAG_LIST_COPY.button}
    </Link>
  );
}
