import type { ReleaseCodename } from "@/lib/releaseCodenames";

type Props = {
  codename: ReleaseCodename;
  /** Inline runs in a text row; stacked is the compact header form. */
  layout?: "inline" | "stacked";
  className?: string;
};

/**
 * The one way a codename is written, everywhere one appears: the kana reading
 * (learners can read it; the kanji hides in the tooltip), the romaji, and the
 * English meaning. Surfaces share this so the treatment cannot drift.
 */
export default function CodenameText({ codename, layout = "inline", className = "" }: Props) {
  const kanjiTooltip = `${codename.ja} — ${codename.gloss}`;

  if (layout === "stacked") {
    return (
      <span title={kanjiTooltip} className={`flex select-none flex-col items-end ${className}`.trim()}>
        <span lang="ja" className="text-xs font-semibold tracking-widest text-foreground/35">
          「{codename.reading}」
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/25">
          {codename.romaji} · {codename.gloss}
        </span>
      </span>
    );
  }

  return (
    <span title={kanjiTooltip} className={`min-w-0 ${className}`.trim()}>
      <span lang="ja">「{codename.reading}」</span> {codename.romaji} · {codename.gloss}
    </span>
  );
}
