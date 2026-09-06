import type { ListVisibility } from "@/lib/domainConstants";
import type { ListContributions } from "@/lib/listContributions";
import type { PendingProposal } from "@/lib/studyListContributions";
import type { StudyTag } from "@/lib/domainConstants";
import type { ListPageItem } from "@/lib/listPageItems";
import type { ListGradeFacts } from "@/lib/listGradeServer";
import type { MemberStandings } from "@/lib/listProgress";
import type { ListItemSort } from "@/lib/listItemOrder";
import type { SubjectViewMode } from "@/app/shared/subjectListView";
import type { SubjectSelection } from "@/app/shared/useSubjectSelection";

import type { SrsStatusCounts, SrsStatusFilter } from "../../shared/SrsStatusFilterGroup";
import type { ListTypeCounts, ListTypeFilter } from "./listPageFilters";

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
  /** Copied from another list, so it has somewhere to ask what is new. */
  hasSource: boolean;
  /** When the owner marked it done, or null while it is still being worked. */
  studiedAt: string | null;
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
  /** Who else is on this list and how far along, or null when nobody is. */
  progress: { members: MemberStandings[]; trackable: number; untracked: number } | null;
  /** How far the reader has got with what is on it; null when nothing is tracked. */
  grade: ListGradeFacts | null;
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

/**
 * The row of controls over a list.
 *
 * Every field is either what a control shows or what it does; nothing here
 * knows about the list, the viewer or the account. That is deliberate - the
 * row is drawn once and the page decides who may see which control, so a
 * control cannot quietly grow a second rule about who it is for.
 */
export type ListPageControlsProps = {
  typeFilter: ListTypeFilter;
  onTypeFilter: (next: ListTypeFilter) => void;
  typeCounts: ListTypeCounts;
  srsFilter: SrsStatusFilter;
  onSrsFilter: (next: SrsStatusFilter) => void;
  srsCounts: SrsStatusCounts;
  search: string;
  onSearch: (next: string) => void;
  /** What the list holds, offered as the reader types. */
  searchOptions: Array<{ value: string; label: string }>;
  hideBurned: boolean;
  burnedInView: number;
  showHideBurned: boolean;
  canEdit: boolean;
  editing: boolean;
  onEditing: (next: boolean) => void;
  /** The sheet this list prints to, or null where there is nothing to print. */
  worksheetHref: string | null;
  sort: ListItemSort;
  onSort: (next: ListItemSort) => void;
  reversed: boolean;
  onReversed: (next: boolean) => void;
  showSort: boolean;
  selection: SubjectSelection;
  showSelection: boolean;
  viewMode: SubjectViewMode;
  onViewMode: (next: SubjectViewMode) => void;
};
