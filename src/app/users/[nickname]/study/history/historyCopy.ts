import type { StudySource } from "@/app/users/[nickname]/study-explorer/lib/studyExplorerTypes";

/** What the History page calls itself, in one map for the locale layer. */
export const HISTORY_PAGE_COPY = {
  title: "History",
  subtitle: (nickname: string) => `Study attempt history for ${nickname}.`,
  /*
   * The heading names the record being read. Three sources keep three
   * records, and a page that said only "Study attempts" over WaniKani's left
   * a member who had just studied on our ladder sure their reviews were lost.
   */
  attempts: {
    umakuma: "Study attempts · UmaKuma",
    wanikani: "Study attempts · WaniKani",
    custom: "Study attempts · Library",
  } satisfies Record<StudySource, string>,
} as const;
