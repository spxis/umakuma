import type { StudyTag } from "@/lib/domainConstants";
import type { StudyQueueItem } from "../lib/studyExplorerTypes";
import { glyphTextSizeClass } from "@/app/shared/glyphSizes";
import GlyphMetadataBadges from "../../shared/GlyphMetadataBadges";
import GlyphTagOverlay from "../../shared/GlyphTagOverlay";

type Props = {
  item: StudyQueueItem;
  fontFamily: string;
  studyTags?: { favorite: boolean; trouble: boolean; burned?: boolean };
  onToggleStudyTag?: (tag: StudyTag) => void;
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
      <GlyphMetadataBadges level={item.wkLevel} unLevel={item.unLevel} successRate={item.successRate} />
      {onToggleStudyTag ? (
        <GlyphTagOverlay
          subjectType={item.subjectType}
          studyTags={studyTags ?? { favorite: false, trouble: false, burned: false }}
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
