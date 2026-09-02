import { SOURCE_CREDITS, SOURCE_CREDIT_COPY } from "@/lib/sourceCredits";

import SubjectBlock from "./SubjectBlock";
import { SUBJECT_PAGE_COPY } from "./SubjectPage.constants";

/**
 * WaniKani's two mnemonics, where it teaches the subject.
 *
 * Somebody's writing rather than a fact about the character, so it sits in its
 * own block under its own credit and is simply absent for the characters
 * WaniKani never wrote about - which is most of them.
 */
export default function MnemonicsBlock({
  mnemonics,
}: {
  mnemonics: { meaning: string; reading: string } | null;
}) {
  if (!mnemonics || (!mnemonics.meaning && !mnemonics.reading)) return null;

  return (
    <SubjectBlock credit={{ source: SOURCE_CREDITS.wanikani, label: SOURCE_CREDIT_COPY.mnemonics }}>
      {mnemonics.meaning ? (
        <div className="space-y-1">
          <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
            {SUBJECT_PAGE_COPY.meaningNote}
          </h2>
          <p className="text-sm font-semibold leading-relaxed text-foreground/80">{mnemonics.meaning}</p>
        </div>
      ) : null}
      {mnemonics.reading ? (
        <div className="space-y-1">
          <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
            {SUBJECT_PAGE_COPY.readingNote}
          </h2>
          <p className="text-sm font-semibold leading-relaxed text-foreground/80">{mnemonics.reading}</p>
        </div>
      ) : null}
    </SubjectBlock>
  );
}
