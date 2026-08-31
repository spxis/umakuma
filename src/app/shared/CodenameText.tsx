import { codenameKanji, type ReleaseCodename } from "@/lib/releaseCodenames";
import { noTranslate, noTranslateClass } from "./japaneseText";

type Props = {
  codename: ReleaseCodename;
  /** Inline runs in a text row; stacked is the compact header form. */
  layout?: "inline" | "stacked";
  className?: string;
};

/**
 * The one way a codename is written, everywhere one appears: the kana reading
 * beside the kanji, then the romaji and the English meaning. Surfaces share
 * this so the treatment cannot drift.
 *
 * Both scripts show rather than hiding the kanji in a tooltip, so a learner can
 * read the name and still see how it is written. A name already written in kana
 * (`ja` equal to `reading`) prints once instead of repeating itself.
 */
export default function CodenameText({ codename, layout = "inline", className = "" }: Props) {
  const kanjiTooltip = `${codename.ja} — ${codename.gloss}`;
  const kanji = codenameKanji(codename);

  if (layout === "stacked") {
    return (
      <span title={kanjiTooltip} className={`flex select-none flex-col items-end ${className}`.trim()}>
        <span lang="ja" translate="no" className={noTranslateClass("text-xs font-semibold tracking-widest text-foreground/35")}>
          「{codename.reading}」{kanji ? <> · {kanji}</> : null}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/25">
          {codename.romaji} · {codename.gloss}
        </span>
      </span>
    );
  }

  return (
    <span title={kanjiTooltip} className={`min-w-0 ${className}`.trim()}>
      <span lang="ja" {...noTranslate}>「{codename.reading}」{kanji ? <> · {kanji}</> : null}</span> {codename.romaji} · {codename.gloss}
    </span>
  );
}
