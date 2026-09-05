"use client";
import type { StudySource } from "@/app/users/[nickname]/study-explorer/lib/studyExplorerTypes";

import type { Snapshot, SrsFilter } from "../../explorerTypes";
import LevelExplorerController from "./LevelExplorerController";

type Props = {
  accountId: string;
  isActive?: boolean;
  explorerTitle: string;
  onOpenStudySourceManager: () => void;
  explorerSource: StudySource;
  customLibraryId: string | null;
  maxLevel: number;
  accountPendingReviews: number;
  levelItemCountsByLevel: Record<number, number>;
  initialSnapshot: Snapshot;
  initialSrsFilter?: SrsFilter;
  showEnglish?: boolean;
  canToggleEnglish?: boolean;
  onToggleShowEnglish?: () => void;
  studyMode?: boolean;
};

export default function LevelExplorerScreen(props: Props) {
  return <LevelExplorerController {...props} />;
}
