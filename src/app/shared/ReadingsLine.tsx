import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { READING_KIND_DISPLAY, type ReadingKind } from "@/lib/domainConstants";
import { formatReading, romajiForReading } from "@/lib/readingDisplay";

/**
 * One kind of reading, labelled in both languages, written in the right script.
 *
 * "On readings" alone teaches nothing; "On readings 音読み" is the word a
 * student meets on a test, so it is there every time. On readings come out in
 * katakana and kun in hiragana, as every dictionary writes them. The romaji
 * beside each reading is for the reader still weak in kana; it appears where
 * there is room for it and steps aside on a phone, where the kana are the
 * thing that fits.
 *
 * Every surface that labels readings draws through here - the dictionary
 * block, the grade cards, the JLPT detail - so the label cannot be spelled two
 * ways and the script cannot differ between pages.
 */
export default function ReadingsLine({
  kind,
  readings,
  showRomaji = true,
  layout = "block",
}: {
  kind: ReadingKind;
  readings: string[];
  showRomaji?: boolean;
  /** `inline` puts the label and the readings on one line, for a card row. */
  layout?: "block" | "inline";
}) {
  if (readings.length === 0) return null;
  const display = READING_KIND_DISPLAY[kind];

  return (
    <div className={layout === "inline" ? "flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5" : "space-y-0.5"}>
      <span className="inline-flex shrink-0 items-baseline gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
        {display.label}
        <span
          lang="ja"
          translate="no"
          title={display.romaji}
          className={`rounded-full border border-line bg-surface-muted px-1.5 py-px text-[10px] font-bold normal-case tracking-normal text-foreground/70 ${JP_TEXT_CLASS}`}
        >
          {display.ja}
        </span>
      </span>
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {readings.map((reading, index) => {
          const written = formatReading(kind, reading);
          const romaji = showRomaji ? romajiForReading(written) : null;
          return (
            <span key={`${written}-${index}`} className="inline-flex items-baseline gap-1">
              <span lang="ja" translate="no" className={`text-sm font-semibold text-foreground ${JP_TEXT_CLASS}`}>
                {written}
              </span>
              {romaji ? (
                <span className="hidden text-[11px] font-semibold text-foreground/60 sm:inline">{romaji}</span>
              ) : null}
            </span>
          );
        })}
      </span>
    </div>
  );
}
