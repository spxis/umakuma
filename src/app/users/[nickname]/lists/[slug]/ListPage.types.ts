import type { ListVisibility } from "@/lib/domainConstants";
import type { ListContributions } from "@/lib/listContributions";
import type { PendingProposal } from "@/lib/studyListContributions";
import type { StudyTag } from "@/lib/domainConstants";
import type { ListPageItem } from "@/lib/listPageItems";

/** What the list's page knows about the list, apart from its rows. */
export type ListPageList = {
  id: string;
  name: string;
  description: string | null;
  visibility: ListVisibility;
  contributions: ListContributions;
  archivedAt: string | null;
  /** Set for a built-in list, which is a tag rather than rows. */
  tag: StudyTag | null;
  createdAt: string;
  updatedAt: string;
  copyCount: number;
  shareCount: number;
  /** How many people keep this list without owning it. */
  subscriberCount: number;
  itemCount: number;
};

export type ListPageViewProps = {
  list: ListPageList;
  items: ListPageItem[];
  owner: { key: string; name: string };
  viewer: {
    isOwner: boolean;
    /** The viewer's own account, owner or not; null when not a member. */
    accountId: string | null;
    /** The viewer's own address segment, for the copy that lands on their shelf. */
    key: string | null;
    signedIn: boolean;
    subscribed: boolean;
  };
  /** The link to hand out, given only to the owner. */
  shareHref: string | null;
  /** This page's own address, for the sign-in that should come back here. */
  currentHref: string;
  /** The key the page was opened with, passed on to the copy and follow calls. */
  listKey: string | null;
  /** What others have suggested, for the owner; empty for everyone else. */
  proposals: PendingProposal[];
  /** Where a practice sheet is built for the viewer, or empty for a visitor. */
  practicePath: string;
};

export type ListViewerActionsProps = {
  listId: string;
  viewerAccountId: string;
  viewerKey: string;
  listKey: string | null;
  subscribed: boolean;
};

export type ListShareControlsProps = {
  listId: string;
  accountId: string;
  name: string;
  ownerKey: string;
  visibility: ListVisibility;
  contributions: ListContributions;
  shareHref: string;
};
