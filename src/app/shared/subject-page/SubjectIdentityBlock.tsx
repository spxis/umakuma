import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import SubjectBlock from "@/app/shared/subject-page/SubjectBlock";
import { SUBJECT_PAGE_COPY } from "@/app/shared/subject-page/SubjectPage.constants";
import { subjectGlyphTone } from "@/app/shared/subjectListView";
import { SUBJECT_TYPE_DISPLAY } from "@/lib/domainConstants";
import type { PublicSubject } from "@/lib/publicSubject";
import { SOURCE_KEYS, SOURCE_CREDIT_COPY } from "@/lib/sourceCredits";

/**
 * What a subject is: the glyph, what it means, how it is read.
 *
 * The same block serves the word page and the radical page, because they are
 * the same page over different subjects, and splitting them would be two
 * places to forget the level pill. What the subject connects to and what
 * WaniKani wrote about it are blocks of their own, listed beside this one in
 * `subjectSections.tsx` and shared with the kanji page.
 *
 * Everything here comes from the catalogue, so nothing on it depends on the
 * reader having an account, a WaniKani level, or a level high enough to have
 * unlocked the subject. That last one is the whole reason these pages exist.
 */

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="subject-pill border border-line bg-surface text-foreground">
      {children}
    </span>
  );
}

export default function SubjectIdentityBlock({
  subject,
  label,
}: {
  subject: PublicSubject;
  /** What to draw: the characters, or a radical's name where it has none. */
  label: string;
}) {
  const display = SUBJECT_TYPE_DISPLAY[subject.subjectType];

  return (
    <SubjectBlock
      className="shadow-sm"
      credit={{
        source: SOURCE_KEYS.wanikani,
        label: SOURCE_CREDIT_COPY.subjectData,
      }}
    >
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
            {subject.jlptLevel ? (
              <Pill>{SUBJECT_PAGE_COPY.jlpt(subject.jlptLevel)}</Pill>
            ) : null}
          </div>
        </div>
      </div>

      {subject.meanings.length > 1 ? (
        <div className="space-y-1">
          <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
            {SUBJECT_PAGE_COPY.meanings}
          </h2>
          <p className="text-sm font-semibold text-foreground/80">
            {subject.meanings.join(", ")}
          </p>
        </div>
      ) : null}

      {subject.readings.length > 0 ? (
        <div className="space-y-1">
          <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
            {SUBJECT_PAGE_COPY.readings}
          </h2>
          <p
            lang="ja"
            translate="no"
            className={`text-base font-bold text-foreground ${JP_TEXT_CLASS}`}
          >
            {subject.readings.join("、")}
          </p>
        </div>
      ) : null}
    </SubjectBlock>
  );
}
