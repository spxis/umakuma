import Link from "next/link";

import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { SUBJECT_PAGE_COPY } from "@/app/shared/SubjectPage.constants";
import { subjectGlyphTone } from "@/app/shared/subjectListView";
import { SUBJECT_TYPES, SUBJECT_TYPE_DISPLAY } from "@/lib/domainConstants";
import { stripHtml } from "@/app/users/[nickname]/level-explorer/lib/levelExplorerDisplayReadings";
import type { CatalogRelatedReference } from "@/lib/subjectCatalogDetails";
import type { PublicSubject } from "@/lib/publicSubject";

/**
 * One subject, shown to whoever asked for it.
 *
 * The same panel serves the word page and the radical page, because they are
 * the same page over different subjects: a glyph, what it means, how it is
 * read, and what it connects to. Splitting them would be two places to forget
 * the level pill.
 *
 * Everything here comes from the catalogue, so nothing on it depends on the
 * reader having an account, a WaniKani level, or a level high enough to have
 * unlocked the subject. That last one is the whole reason these pages exist.
 */

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="subject-pill border border-line bg-surface text-foreground">{children}</span>
  );
}

/**
 * The kanji a word is built from, or the kanji a radical appears in.
 *
 * Linked by character, because a kanji is addressable by itself - every one of
 * them has a page, whether or not WaniKani teaches it.
 */
function RelatedKanji({
  heading,
  items,
}: {
  heading: string;
  items: CatalogRelatedReference[];
}) {
  const linkable = items.filter((item) => item.label.trim().length > 0);
  if (linkable.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{heading}</h2>
      <ul className="flex flex-wrap gap-2">
        {linkable.map((item) => (
          <li key={item.subjectId}>
            <Link
              href={`/kanji/${encodeURIComponent([...item.label][0] ?? item.label)}`}
              className="flex min-w-16 flex-col items-center gap-0.5 rounded-xl border border-line bg-surface px-3 py-2 transition hover:bg-surface-muted"
            >
              <span lang="ja" translate="no" className={`text-2xl font-black text-kanji ${JP_TEXT_CLASS}`}>
                {item.label}
              </span>
              {item.meaning ? (
                <span className="text-[11px] font-semibold text-foreground/65">{item.meaning}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SubjectDetailPanel({
  subject,
  label,
}: {
  subject: PublicSubject;
  /** What to draw: the characters, or a radical's name where it has none. */
  label: string;
}) {
  const display = SUBJECT_TYPE_DISPLAY[subject.subjectType];
  const meaningNote = stripHtml(subject.meaningExplanation);
  const readingNote = stripHtml(subject.readingExplanation);

  /*
   * A radical's amalgamations are the kanji it appears in; a word's components
   * are the kanji it is written with. Both read as "the kanji next door", so
   * they take the same shelf under different headings.
   */
  const relatedKanji =
    subject.subjectType === SUBJECT_TYPES.radical ? subject.usedInVocabulary : subject.componentKanji;
  const relatedHeading =
    subject.subjectType === SUBJECT_TYPES.radical ? SUBJECT_PAGE_COPY.usedIn : SUBJECT_PAGE_COPY.builtFrom;

  return (
    <>
      <section className="space-y-4 rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <p
            lang="ja"
            translate="no"
            className={`text-5xl font-black leading-none sm:text-6xl ${JP_TEXT_CLASS} ${subjectGlyphTone(
              subject.subjectType,
            )}`}
          >
            {label}
          </p>

          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="text-xl font-black text-foreground sm:text-2xl">
              {subject.meanings[0] ?? label}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill>{display.short}</Pill>
              <Pill>{SUBJECT_PAGE_COPY.level(subject.wkLevel)}</Pill>
              {subject.jlptLevel ? <Pill>{SUBJECT_PAGE_COPY.jlpt(subject.jlptLevel)}</Pill> : null}
            </div>
          </div>
        </div>

        {subject.meanings.length > 1 ? (
          <div className="space-y-1">
            <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
              {SUBJECT_PAGE_COPY.meanings}
            </h2>
            <p className="text-sm font-semibold text-foreground/80">{subject.meanings.join(", ")}</p>
          </div>
        ) : null}

        {subject.readings.length > 0 ? (
          <div className="space-y-1">
            <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
              {SUBJECT_PAGE_COPY.readings}
            </h2>
            <p lang="ja" translate="no" className={`text-base font-bold text-foreground ${JP_TEXT_CLASS}`}>
              {subject.readings.join("、")}
            </p>
          </div>
        ) : null}
      </section>

      {meaningNote || readingNote ? (
        <section className="space-y-3 rounded-3xl border border-line bg-surface p-5">
          {meaningNote ? (
            <div className="space-y-1">
              <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
                {SUBJECT_PAGE_COPY.meaningNote}
              </h2>
              <p className="text-sm font-semibold leading-relaxed text-foreground/80">{meaningNote}</p>
            </div>
          ) : null}

          {readingNote ? (
            <div className="space-y-1">
              <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
                {SUBJECT_PAGE_COPY.readingNote}
              </h2>
              <p className="text-sm font-semibold leading-relaxed text-foreground/80">{readingNote}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {relatedKanji.length > 0 ? (
        <section className="rounded-3xl border border-line bg-surface p-5">
          <RelatedKanji heading={relatedHeading} items={relatedKanji} />
        </section>
      ) : null}
    </>
  );
}
