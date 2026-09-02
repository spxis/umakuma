import type { ListVisibility } from "@/lib/domainConstants";
import type { ListSubjectRow } from "@/lib/studySubjectItems";

/** What the list's page knows about the list, apart from its rows. */
export type ListPageList = {
  id: string;
  name: string;
  description: string | null;
  visibility: ListVisibility;
  createdAt: string;
  updatedAt: string;
  copyCount: number;
  shareCount: number;
  itemCount: number;
};

export type ListPageViewProps = {
  list: ListPageList;
  rows: ListSubjectRow[];
  owner: { key: string; name: string };
  viewer: { isOwner: boolean; accountId: string | null; signedIn: boolean };
  /** The link to hand out, given only to the owner. */
  shareHref: string | null;
  /** This page's own address, for the sign-in that should come back here. */
  currentHref: string;
};

export type ListShareControlsProps = {
  listId: string;
  accountId: string;
  name: string;
  ownerKey: string;
  visibility: ListVisibility;
  shareHref: string;
};
