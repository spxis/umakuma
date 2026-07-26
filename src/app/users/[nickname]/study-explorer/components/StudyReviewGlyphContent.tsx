import type { StudyQueueItem } from "../lib/studyExplorerTypes";
import { glyphTextSizeClass } from "../../level-explorer/lib/levelExplorerDisplay";
import GlyphMetadataBadges from "../../shared/GlyphMetadataBadges";
import GlyphTagOverlay from "../../shared/GlyphTagOverlay";

type Props = {
  item: StudyQueueItem;
  fontFamily: string;
  studyTags?: { favorite: boolean; trouble: boolean };
  onToggleStudyTag?: (tag: "favorite" | "trouble") => void;
  className?: string;
};

export default function StudyReviewGlyphContent({
  item,
  fontFamily,
  studyTags,
  onToggleStudyTag,
  className = "",
}: Props) {
  return (
    <>
      <GlyphMetadataBadges level={item.wkLevel} successRate={item.successRate} />
      {onToggleStudyTag ? (
        <GlyphTagOverlay
          subjectType={item.subjectType}
          studyTags={studyTags ?? { favorite: false, trouble: false }}
          onToggleStudyTag={onToggleStudyTag}
        />
      ) : null}
      <p
        style={{ fontFamily }}
        className={`${className} pointer-events-none relative z-[1] text-center font-black leading-none text-current ${glyphTextSizeClass(item.characters)}`}
      >
        {item.characters}
      </p>
    </>
  );
}
