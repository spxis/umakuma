import { SOURCE_CREDITS, type SourceCredit as Credit } from "@/lib/sourceCredits";

const LINK = "underline decoration-dotted underline-offset-2 hover:text-foreground/70";

/**
 * Who a page's content came from.
 *
 * Four sources are borrowed here and each drew its own credit: Tatoeba under
 * the sentences, KanjiVG under the strokes, KANJIDIC2 under the dictionary
 * facts, and WaniKani under nothing at all - the largest borrowing of the four
 * and the only one that went uncredited. Four copies of the same paragraph is
 * also four chances for one of them to drift out of a licence condition.
 *
 * One component draws all four now, so a new surface that shows borrowed
 * content credits it by using the thing that renders it rather than by
 * somebody remembering to. Every link leaves the site, so every link says so.
 */
export default function SourceCredit({
  credit,
  label,
  variant = "foot",
  className = "",
}: {
  credit: Credit;
  /** What was taken: "Meanings and readings from", "Stroke shapes from". */
  label: string;
  /**
   * `foot` is the one style a section's credit takes: a rule across the full
   * width, centred, small - the stroke-order panel had it first and every
   * other section had its own left-aligned line at its own size. `inline` is
   * only for the stroke animation, which draws inside another surface and
   * has no edge of its own to put a rule on.
   */
  variant?: "foot" | "inline";
  className?: string;
}) {
  const shape =
    variant === "foot"
      ? "border-t border-line px-5 py-2 text-center text-[10px]"
      : "text-[11px]";
  return (
    <p className={`${shape} font-semibold text-foreground/60 ${className}`}>
      {label}{" "}
      <a href={credit.url} target="_blank" rel="noreferrer noopener" className={LINK}>
        {credit.source}
      </a>
      {/* A source under its own terms rather than a public licence names no
        * licence, and must not be made to look as though it granted one. */}
      {credit.licence ? (
        <>
          {" "}
          <a href={credit.licenceUrl} target="_blank" rel="noreferrer noopener" className={LINK}>
            ({credit.licence})
          </a>
        </>
      ) : null}
    </p>
  );
}

export { SOURCE_CREDITS };
