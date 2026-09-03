import { glyphTextSizeClass } from "@/app/shared/glyphSizes";
import type { StudyTag } from "@/lib/domainConstants";
import type { LevelItem } from "../../explorerTypes";
import { useGlyphFontPreference } from "@/lib/glyphFontPreference";
import {
  ReadingWithPronunciation,
  englishSubtitleForDisplay,
  formatNextReviewBadge,
  glyphHasReading,
  glyphSubtitleForDisplay,
  isNewGlyphWithinHours,
  typeGlyphBoxClass,
} from "../lib/levelExplorerDisplay";
import { ReviewTimingChip } from "../../shared/StatusSrsChip";
import { LEVEL_EXPLORER_TEXT } from "./LevelExplorer.constants";
import GlyphMetadataBadges from "../../shared/GlyphMetadataBadges";
import GlyphTagOverlay from "../../shared/GlyphTagOverlay";
import GlyphStatusChipRow from "../../shared/GlyphStatusChipRow";

type Props = {
  selectedItem: LevelItem;
  studyMode: boolean;
  isStudyHidden: boolean;
  showEnglishForGlyphSubtitle: boolean;
  canToggleEnglish: boolean;
  showEnglish: boolean;
  onToggleShowEnglish: (() => void) | null;
  onTogglePeek: (() => void) | null;
  studyTags?: { favorite: boolean; trouble: boolean; burned?: boolean };
  onToggleStudyTag?: ((tag: StudyTag) => void) | null;
};

export default function LevelExplorerDetailGlyphBox({
  selectedItem,
  studyMode,
  isStudyHidden,
  showEnglishForGlyphSubtitle,
  canToggleEnglish,
  showEnglish,
  onToggleShowEnglish,
  onTogglePeek,
  studyTags,
  onToggleStudyTag,
}: Props) {
  const { fontFamily, toggle: toggleGlyphFont } = useGlyphFontPreference();
  const nextReviewBadge = formatNextReviewBadge(selectedItem.availableAt);
  const usesStudyPeekToggle = studyMode && Boolean(onTogglePeek);
  const canRenderEyeToggle = usesStudyPeekToggle || Boolean(onToggleShowEnglish);
  const eyeToggleTitle = usesStudyPeekToggle
    ? (isStudyHidden ? LEVEL_EXPLORER_TEXT.peek : LEVEL_EXPLORER_TEXT.hidePeek)
    : canToggleEnglish
      ? (showEnglish ? LEVEL_EXPLORER_TEXT.hideEnglish : LEVEL_EXPLORER_TEXT.showEnglish)
      : LEVEL_EXPLORER_TEXT.hintsHidden;
  const isEyeOn = usesStudyPeekToggle ? !isStudyHidden : showEnglish;

  const glyphChipControls = (
    <>
      {isNewGlyphWithinHours(selectedItem) ? (
        <span className="subject-pill border-emerald-300 bg-emerald-100 text-emerald-800">NEW</span>
      ) : null}
      {nextReviewBadge ? <ReviewTimingChip label={nextReviewBadge.label} className={nextReviewBadge.className} /> : null}
      {canRenderEyeToggle ? (
        <button
          type="button"
          onClick={() => {
            if (usesStudyPeekToggle) {
              onTogglePeek?.();
              return;
            }
            onToggleShowEnglish?.();
          }}
          disabled={usesStudyPeekToggle ? false : !canToggleEnglish}
          className="subject-pill inline-flex cursor-pointer items-center justify-center border-line bg-surface text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          title={eyeToggleTitle}
          aria-label={eyeToggleTitle}
        >
          {isEyeOn ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
              <path d="M4 4l16 16" />
            </svg>
          )}
        </button>
      ) : null}
      <button
        type="button"
        onClick={toggleGlyphFont}
        className="subject-pill inline-flex cursor-pointer items-center justify-center border-line bg-surface text-foreground hover:bg-surface-muted"
        title="Font"
        aria-label="Font"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none">
          <text x="6.3" y="14.1" fontSize="12.6" fontWeight="700" fill="currentColor" textAnchor="middle">A</text>
          <text x="17.0" y="17.7" fontSize="13.4" fontWeight="700" fill="currentColor" textAnchor="middle">あ</text>
        </svg>
      </button>
    </>
  );

  return (
    <div
      className={`group/explorer-card relative flex min-w-0 flex-1 rounded-2xl border pt-12 sm:min-w-64 ${
        glyphHasReading(selectedItem)
          ? "min-h-[8rem] flex-col items-center justify-center px-4 pb-3"
          : "min-h-[8rem] items-center justify-center px-4 pb-3"
      } ${typeGlyphBoxClass(selectedItem.subjectType)}`}
    >
      <GlyphMetadataBadges level={selectedItem.wkLevel} successRate={selectedItem.successRate} />
      {onToggleStudyTag ? (
        <GlyphTagOverlay
          subjectType={selectedItem.subjectType}
          studyTags={studyTags ?? { favorite: false, trouble: false, burned: false }}
          onToggleStudyTag={onToggleStudyTag}
        />
      ) : null}
      <GlyphStatusChipRow item={selectedItem}>{glyphChipControls}</GlyphStatusChipRow>
      <div>
        <p style={{ fontFamily }} className={`text-center font-black leading-none text-current ${glyphTextSizeClass(selectedItem.characters)}`}>
          {selectedItem.characters}
        </p>
        {(() => {
          if (studyMode && isStudyHidden) {
            return <p className="mt-1 w-full text-center text-sm font-semibold text-foreground/60">...</p>;
          }

          const subtitle = studyMode
            ? glyphSubtitleForDisplay(selectedItem)
            : showEnglishForGlyphSubtitle
              ? englishSubtitleForDisplay(selectedItem)
              : glyphSubtitleForDisplay(selectedItem);

          if (!subtitle) {
            return null;
          }

          return (
            <p className="mt-1 w-full text-center text-sm font-semibold text-foreground/85">
              <ReadingWithPronunciation reading={subtitle} />
            </p>
          );
        })()}
      </div>
    </div>
  );
}
