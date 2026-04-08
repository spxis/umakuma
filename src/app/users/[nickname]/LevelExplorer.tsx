"use client";

import type { Snapshot, SrsFilter } from "./explorerTypes";
import LevelExplorerScreen from "./LevelExplorerScreen";

type Props = {
  accountId: string;
  maxLevel: number;
  initialSnapshot: Snapshot;
  initialSrsFilter?: SrsFilter;
  showEnglish?: boolean;
};

export default function LevelExplorer(props: Props) {
  return <LevelExplorerScreen {...props} />;
}
