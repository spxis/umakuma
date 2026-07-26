import type { StudyQueueItem } from "../lib/studyExplorerTypes";
import GlyphTagOverlay from "../../shared/GlyphTagOverlay";

type Props = {
  item: StudyQueueItem;
  bulkModeEnabled: boolean;
  onToggleStudyTag: (subjectId: number, tag: "favorite" | "trouble", enabled: boolean) => void;
};

export default function StudyCardTagOverlay({ item, bulkModeEnabled, onToggleStudyTag }: Props) {
  if (bulkModeEnabled) {
    return undefined;
  }

  return (
    <GlyphTagOverlay
      subjectType={item.subjectType}
      studyTags={item.studyTags ?? { favorite: false, trouble: false }}
      onToggleStudyTag={(tag) => {
        onToggleStudyTag(item.subjectId, tag, !(item.studyTags?.[tag] ?? false));
      }}
    />
  );
}
