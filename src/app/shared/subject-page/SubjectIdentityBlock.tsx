import { glyphTextSizeClass } from "@/app/shared/glyphSizes";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import SubjectBlock from "@/app/shared/subject-page/SubjectBlock";
import { SUBJECT_PAGE_COPY } from "@/app/shared/subject-page/SubjectPage.constants";
import { subjectGlyphTone } from "@/app/shared/subjectListView";
import { SUBJECT_TYPE_DISPLAY } from "@/lib/domainConstants";
import { SOURCE_KEYS, SOURCE_CREDIT_COPY } from "@/lib/sourceCredits";
import { unLevelBadge, wkLevelBadge } from "@/lib/levelBadge";

/**
 * What a subject is: the glyph, what it means, how it is read.
 *
 * The same card opens the word, radical and kanji pages, because they are the
 * same page over different subjects, and splitting them would be three places
 * to forget the level pill. The kanji page opened with a bare line of text
 * instead and was the one page of the three that looked unfinished - the page
 * most readers arrive on, since it is what a shared link points at.
 *
 * Fed by plain values rather than a catalogue row, because a kanji is not one:
 * most of the ten thousand characters are outside WaniKani, and the identity
 * of one comes from the dictionary and the school tables. What the card draws
 * is the same either way.
 *
 * Nothing here depends on the reader having an account, a WaniKani level, or
 * a level high enough to have unlocked the subject. That last one is the whole
 * reason these pages exist.
 */

export type SubjectIdentity = {
  /** What to draw large: the characters, or a radical's name where it has none. */
  label: string;
  subjectType: string;
  /** The English heading. The primary meaning, in practice. */
  name: string;
  /** Every meaning, listed only when there is more than the heading already shows. */
  meanings: string[];
  readings: string[];
  /** Null where WaniKani does not teach the subject, which is most characters. */
  wkLevel: number | null;
  unLevel?: number | null;
  jlptLevel: number | null;
  /**
   * Whether WaniKani is behind what the card says.
   *
   * A licence condition rather than decoration, so it is drawn where it is
   * owed and left off where the words came from the dictionary instead - the
   * kanji page credits KANJIDIC on the block below this one.
   */
  credited: boolean;
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="subject-pill border border-line bg-surface text-foreground">
      {children}
    </span>
  );
}

export default function SubjectIdentityBlock({ identity }: { identity: SubjectIdentity }) {
  const { label, subjectType, name, meanings, readings, wkLevel, unLevel, jlptLevel, credited } = identity;
  const display = SUBJECT_TYPE_DISPLAY[subjectType as keyof typeof SUBJECT_TYPE_DISPLAY];

  return (
    <SubjectBlock
      className="shadow-sm"
      credit={
        credited
          ? { source: SOURCE_KEYS.wanikani, label: SOURCE_CREDIT_COPY.subjectData }
          : undefined
      }
    >
      <div className="flex flex-wrap items-center gap-4">
        <p
          lang="ja"
          translate="no"
          className={`font-black leading-none ${glyphTextSizeClass(label)} ${JP_TEXT_CLASS} ${subjectGlyphTone(
            subjectType,
          )}`}
        >
          {label}
        </p>

        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-xl font-black text-foreground sm:text-2xl">{name}</h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill>{display.short}</Pill>
            {/* No level pill for a character WaniKani never taught, which is most of them. */}
            {wkLevel === null ? null : <Pill>{wkLevelBadge(wkLevel)}</Pill>}
            {/* Ours beside theirs, and neither has to be hidden now that both
                say whose they are. A kanji WaniKani never teaches carries only
                the UK pill, which is exactly the case worth showing. */}
            {unLevel === null || unLevel === undefined ? null : <Pill>{unLevelBadge(unLevel)}</Pill>}
            {jlptLevel ? <Pill>{SUBJECT_PAGE_COPY.jlpt(jlptLevel)}</Pill> : null}
          </div>
        </div>
      </div>

      {meanings.length > 1 ? (
        <div className="space-y-1">
          <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
            {SUBJECT_PAGE_COPY.meanings}
          </h2>
          <p className="text-sm font-semibold text-foreground/80">
            {meanings.join(", ")}
          </p>
        </div>
      ) : null}

      {readings.length > 0 ? (
        <div className="space-y-1">
          <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
            {SUBJECT_PAGE_COPY.readings}
          </h2>
          <p
            lang="ja"
            translate="no"
            className={`text-base font-bold text-foreground ${JP_TEXT_CLASS}`}
          >
            {readings.join("、")}
          </p>
        </div>
      ) : null}
    </SubjectBlock>
  );
}
