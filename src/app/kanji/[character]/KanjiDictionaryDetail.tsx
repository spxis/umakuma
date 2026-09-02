import type { KanjiDictionaryAttribution, KanjiDictionaryEntry } from "@/lib/kanjiDictionary.types";
import ReadingsLine from "@/app/shared/ReadingsLine";
import { READING_KINDS } from "@/lib/domainConstants";
import SubjectBlock from "@/app/shared/subject-page/SubjectBlock";
import { SOURCE_KEYS } from "@/lib/sourceCredits";

import { KANJI_PAGE_COPY } from "./KanjiPage.constants";

/**
 * What the dictionary knows about one character.
 *
 * The page used to show only what the school-grade catalogue held, so the
 * 7,400 characters outside the school curriculum arrived with a drawing and
 * nothing to read - which is most of what a shared link points at. This is the
 * rest: every meaning, every reading, the readings only names use, and the
 * numbers that place the character.
 */
export default function KanjiDictionaryDetail({
  entry,
  attribution,
  jlptLevel = null,
  heisigKeyword = null,
}: {
  entry: KanjiDictionaryEntry;
  attribution: KanjiDictionaryAttribution | null;
  /**
   * What the JLPT table adds that the dictionary does not. Only these two:
   * its strokes, frequency and grade repeat KANJIDIC's, and a fact printed
   * twice under two headings reads as two facts.
   */
  jlptLevel?: number | null;
  heisigKeyword?: string | null;
}) {
  return (
    <SubjectBlock
      credit={
        /* Share-alike: the credit is a licence condition, not decoration. */
        attribution ? { source: SOURCE_KEYS.kanjidic2, label: KANJI_PAGE_COPY.dictionaryCredit } : undefined
      }
    >
      <Row label={KANJI_PAGE_COPY.meanings} value={entry.meanings.join(", ")} />
      <ReadingsLine kind={READING_KINDS.on} readings={entry.readings.on} />
      <ReadingsLine kind={READING_KINDS.kun} readings={entry.readings.kun} />
      <ReadingsLine kind={READING_KINDS.nanori} readings={entry.readings.nanori} />

      <dl className="flex flex-wrap gap-2 pt-1">
        {entry.strokeCount ? (
          <Fact label={KANJI_PAGE_COPY.strokes} value={String(entry.strokeCount)} />
        ) : null}
        {entry.grade ? <Fact label={KANJI_PAGE_COPY.grade} value={gradeLabel(entry.grade)} /> : null}
        {entry.frequencyRank ? (
          <Fact
            label={KANJI_PAGE_COPY.frequency}
            value={`#${entry.frequencyRank}`}
            hint={KANJI_PAGE_COPY.frequencyHint}
          />
        ) : null}
        {jlptLevel ? <Fact label={KANJI_PAGE_COPY.jlpt} value={`N${jlptLevel}`} /> : null}
        {/* The pre-2010 level, only where the current one is unknown. */}
        {!jlptLevel && entry.jlptOld ? <Fact label={KANJI_PAGE_COPY.jlptOld} value={`N${entry.jlptOld}`} /> : null}
        {heisigKeyword ? <Fact label={KANJI_PAGE_COPY.heisig} value={heisigKeyword} /> : null}
      </dl>
    </SubjectBlock>
  );
}

/** Elementary years are the ones a reader recognises; 8 and 9-10 are lists. */
function gradeLabel(grade: number): string {
  if (grade <= 6) return KANJI_PAGE_COPY.gradeElementary(grade);
  return grade >= 9 ? KANJI_PAGE_COPY.gradeJinmeiyo : KANJI_PAGE_COPY.gradeJoyo;
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{label}</h2>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-full border border-line bg-surface-muted px-3 py-1">
      <dt className="inline text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60">
        {label}{" "}
      </dt>
      <dd className="inline text-xs font-bold text-foreground">
        {value}
        {hint ? <span className="font-semibold text-foreground/60"> {hint}</span> : null}
      </dd>
    </div>
  );
}
