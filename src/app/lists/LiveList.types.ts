import type { ListSubjectRow } from "@/lib/studySubjectItems";

/** What the page of a list nobody owns knows about it. */
export type LiveListViewProps = {
  live: { key: string; name: string; description: string; itemCount: number };
  rows: ListSubjectRow[];
  viewer: { accountId: string | null; key: string | null; signedIn: boolean; following: boolean };
  /** The viewer's own burned subjects, so the list can hide what they know. */
  burnedIds: number[];
};

export type LiveListActionsProps = {
  liveKey: string;
  viewerAccountId: string;
  viewerKey: string;
  following: boolean;
};
