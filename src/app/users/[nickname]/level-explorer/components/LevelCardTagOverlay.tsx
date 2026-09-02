import type { StudyTag } from "@/lib/domainConstants";
import type { LevelItem } from "../../explorerTypes";
import GlyphTagOverlay from "../../shared/GlyphTagOverlay";

type Props = {
  item: LevelItem;
  bulkModeEnabled: boolean;
  onToggleStudyTag: (subjectId: number, tag: StudyTag, enabled: boolean) => void;
};

export default function LevelCardTagOverlay({ item, bulkModeEnabled, onToggleStudyTag }: Props) {
  if (bulkModeEnabled) {
    return undefined;
  }

  return (
    <GlyphTagOverlay
      subjectType={item.subjectType}
      studyTags={item.studyTags ?? { favorite: false, trouble: false, burned: false }}
      onToggleStudyTag={(tag) => {
        onToggleStudyTag(item.subjectId, tag, !(item.studyTags?.[tag] ?? false));
      }}
    />
  );
}
