import type { LevelItem } from "../../explorerTypes";
import GlyphTagOverlay from "../../shared/GlyphTagOverlay";

type Props = {
  item: LevelItem;
  bulkModeEnabled: boolean;
  onToggleStudyTag: (subjectId: number, tag: "favorite" | "trouble", enabled: boolean) => void;
};

export default function LevelCardTagOverlay({ item, bulkModeEnabled, onToggleStudyTag }: Props) {
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
