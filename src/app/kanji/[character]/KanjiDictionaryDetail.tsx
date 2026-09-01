import type { KanjiDictionaryAttribution, KanjiDictionaryEntry } from "@/lib/kanjiDictionary.types";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";

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
}: {
  entry: KanjiDictionaryEntry;
  attribution: KanjiDictionaryAttribution | null;
}) {
  return (
    <section className="space-y-3 rounded-3xl border border-line bg-surface p-5">
      <Row label={KANJI_PAGE_COPY.meanings} value={entry.meanings.join(", ")} />
      <Readings label={KANJI_PAGE_COPY.onReadings} readings={entry.readings.on} />
      <Readings label={KANJI_PAGE_COPY.kunReadings} readings={entry.readings.kun} />
      <Readings label={KANJI_PAGE_COPY.nameReadings} readings={entry.readings.nanori} />

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
        {entry.jlptOld ? <Fact label={KANJI_PAGE_COPY.jlptOld} value={`N${entry.jlptOld}`} /> : null}
      </dl>

      {/* Share-alike: the credit is a licence condition, not decoration. */}
      {attribution ? (
        <p className="pt-1 text-[11px] font-semibold text-foreground/45">
          {KANJI_PAGE_COPY.dictionaryCredit}{" "}
          <a
            href={attribution.url}
            className="underline decoration-dotted underline-offset-2 hover:text-foreground/70"
          >
            {attribution.source}
          </a>{" "}
          <a
            href={attribution.licenceUrl}
            className="underline decoration-dotted underline-offset-2 hover:text-foreground/70"
          >
            ({attribution.licence})
          </a>
        </p>
      ) : null}
    </section>
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
      <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/45">{label}</h2>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Readings({ label, readings }: { label: string; readings: string[] }) {
  if (readings.length === 0) return null;
  return (
    <div>
      <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/45">{label}</h2>
      <p lang="ja" translate="no" className={`text-sm font-semibold text-foreground ${JP_TEXT_CLASS}`}>
        {readings.map((reading) => reading.replace(/\./g, "")).join("、")}
      </p>
    </div>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-full border border-line bg-surface-muted px-3 py-1">
      <dt className="inline text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/45">
        {label}{" "}
      </dt>
      <dd className="inline text-xs font-bold text-foreground">
        {value}
        {hint ? <span className="font-semibold text-foreground/45"> {hint}</span> : null}
      </dd>
    </div>
  );
}
