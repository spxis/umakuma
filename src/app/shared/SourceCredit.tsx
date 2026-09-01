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
  className = "",
}: {
  credit: Credit;
  /** What was taken: "Meanings and readings from", "Stroke shapes from". */
  label: string;
  className?: string;
}) {
  return (
    <p className={`text-[11px] font-semibold text-foreground/60 ${className}`}>
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
