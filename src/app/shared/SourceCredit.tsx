import Link from "next/link";

import { SOURCE_CREDITS, sourcePath, type SourceKey } from "@/lib/sourceCredits";

const LINK = "underline decoration-dotted underline-offset-2 hover:text-foreground/70";
/** The one shape a section's credit takes: a rule across the full width. */
const FOOT = "border-t border-line px-5 py-2 text-center text-[10px]";

/**
 * Several credits under one rule.
 *
 * A block fed by two sources names both, and stacking two feet would draw two
 * rules where the page has one everywhere else. The style stays here rather
 * than at the call site for the reason the single credit does: there is one
 * way a section credits its source, and it is this file's to decide.
 */
export function SourceCredits({
  credits,
  className = "",
}: {
  credits: readonly { source: SourceKey; label: string }[];
  className?: string;
}) {
  if (credits.length === 0) return null;
  return (
    <div className={`${FOOT} ${className}`}>
      {credits.map((credit) => (
        <p key={credit.source} className="font-semibold text-foreground/60">
          <Line source={credit.source} label={credit.label} />
        </p>
      ))}
    </div>
  );
}

function Line({ source, label }: { source: SourceKey; label: string }) {
  const credit = SOURCE_CREDITS[source];
  return (
    <>
      {label}{" "}
      <Link href={sourcePath(source)} className={LINK}>
        {credit.source}
      </Link>
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
    </>
  );
}

/**
 * Who a page's content came from.
 *
 * Six sources are borrowed here and each used to draw its own credit: Tatoeba
 * under the sentences, KanjiVG under the strokes, KANJIDIC2 under the
 * dictionary facts, and WaniKani under nothing at all - the largest borrowing
 * of the six and the only one that went uncredited. One component draws all of
 * them now, so a new surface that shows borrowed content credits it by using
 * the thing that renders it rather than by somebody remembering to.
 *
 * The name links to our own page about the source - what we hold from it and
 * when it was last brought in - and that page links out. The licence, where
 * there is one, links straight to its text, because a licence is a condition
 * and not ours to paraphrase.
 */
export default function SourceCredit({
  source,
  label,
  variant = "foot",
  className = "",
}: {
  source: SourceKey;
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
  const shape = variant === "foot" ? FOOT : "text-[11px]";
  return (
    <p className={`${shape} font-semibold text-foreground/60 ${className}`}>
      <Line source={source} label={label} />
    </p>
  );
}
