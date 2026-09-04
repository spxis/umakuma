import type { ReactNode } from "react";
import Link from "next/link";

import ExampleSentences from "@/app/shared/ExampleSentences";
import { KanjiDetailPanel, type KanjiDetailSummary } from "@/app/shared/KanjiDetailModal";
import MnemonicsBlock from "@/app/shared/subject-page/MnemonicsBlock";
import RadicalPartsBlock from "@/app/shared/subject-page/RadicalPartsBlock";
import RelatedGroupBlock from "@/app/shared/subject-page/RelatedGroupBlock";
import SubjectBlock from "@/app/shared/subject-page/SubjectBlock";
import UsedInWordsBlock from "@/app/shared/subject-page/UsedInWordsBlock";
import { SOURCE_KEYS, SOURCE_CREDIT_COPY } from "@/lib/sourceCredits";
import type { KanjiDictionaryAttribution, KanjiDictionaryEntry } from "@/lib/kanjiDictionary.types";
import type { RadicalPart } from "@/lib/radicalSearchServer";
import type { KanjiPage } from "@/lib/subjectPage";

import KanjiDictionaryDetail from "./KanjiDictionaryDetail";
import { KANJI_PAGE_COPY } from "./KanjiPage.constants";
import { SUBJECT_PAGE_COPY } from "@/app/shared/subject-page/SubjectPage.constants";
import {
  SUBJECT_SECTIONS,
  type SubjectSection,
} from "@/app/shared/subject-page/subjectSectionAddress";

/**
 * The blocks of a kanji page, declared once.
 *
 * The whole page draws all of them and a section page draws one, from this
 * list either way - so `/kanji/魔` and `/kanji/魔/stroke` cannot drift into two
 * renderings of the same thing. Adding a block here puts it on both.
 *
 * Each block says whether this particular character has anything under it. The
 * page uses that to leave an empty block out, and the section page uses it to
 * answer 404: there is genuinely nothing at `/kanji/魔/mnemonics` when
 * WaniKani never wrote one, and an address that renders an empty page is worse
 * than one that says it is not there.
 */
export type KanjiSectionView = {
  character: string;
  grade?: number;
  summary?: KanjiDetailSummary;
  dictionary: KanjiDictionaryEntry | null;
  dictionaryAttribution: KanjiDictionaryAttribution | null;
  /** What RADKFILE says this character is written with; empty where it has no entry. */
  parts: RadicalPart[];
  /** True when one section is drawn on its own, with no page header above it. */
  alone: boolean;
  /**
   * The reader's own practice sheet with this character picked, or null for
   * a visitor, who has no sheet - the same answer the list cards give.
   */
  worksheetHref: string | null;
  /**
   * Where each part of this subject lives, for a title that links to its own
   * page. Absent on a section page, where the title would link to itself.
   */
  sectionHref?: (id: SubjectSection) => string;
  page: KanjiPage;
};

export type KanjiSectionBlock = {
  id: SubjectSection;
  has: (view: KanjiSectionView) => boolean;
  render: (view: KanjiSectionView) => ReactNode;
};

export const KANJI_SECTION_BLOCKS: readonly KanjiSectionBlock[] = [
  {
    id: SUBJECT_SECTIONS.stroke,
    /* KanjiVG covers what the page can draw, and the panel says so itself when it does not. */
    has: () => true,
    render: (view) => (
      <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        {/* The page above says what the character is; a section page has no
          * such header, so the card keeps its own line there. */}
        <KanjiDetailPanel
          kanji={view.character}
          grade={view.grade}
          summary={view.summary}
          showSummaryLine={view.alone}
          titleHref={view.sectionHref?.(SUBJECT_SECTIONS.stroke)}
          actions={
            /*
             * Named for where it goes: the same practice sheet a list prints,
             * with this one character picked and the page filled to work at
             * it. Print is on the sheet, like everywhere else.
             */
            view.worksheetHref ? (
              <Link
                href={view.worksheetHref}
                className="inline-flex h-8 items-center justify-center rounded-full border border-line bg-surface px-3 text-[10px] font-black uppercase tracking-[0.12em] text-foreground/60 transition hover:bg-surface-muted hover:text-foreground"
              >
                {KANJI_PAGE_COPY.worksheet}
              </Link>
            ) : null
          }
        />
      </section>
    ),
  },
  {
    id: SUBJECT_SECTIONS.meanings,
    has: (view) => view.dictionary !== null,
    render: (view) =>
      view.dictionary ? (
        <KanjiDictionaryDetail
          entry={view.dictionary}
          attribution={view.dictionaryAttribution}
          jlptLevel={view.page.jlptLevel}
          heisigKeyword={view.page.heisigKeyword}
          headingHref={view.sectionHref?.(SUBJECT_SECTIONS.meanings)}
        />
      ) : null,
  },
  {
    id: SUBJECT_SECTIONS.words,
    has: (view) => view.page.words.length > 0,
    render: (view) => (
      <UsedInWordsBlock words={view.page.words} headingHref={view.sectionHref?.(SUBJECT_SECTIONS.words)} />
    ),
  },
  /*
   * Beside Related, not up by the stroke chart.
   *
   * Both answer the same question from different books: RADKFILE lists the
   * shapes a character is written with, and WaniKani's Built from lists the
   * radicals it teaches it as. They were a scroll apart with the meanings and
   * every compound between them, so a reader comparing the two had to hold one
   * of them in their head.
   */
  {
    id: SUBJECT_SECTIONS.parts,
    /* RADKFILE covers 6,355 characters, so plenty have no entry at all. */
    has: (view) => view.parts.length > 0,
    render: (view) => (
      <RadicalPartsBlock parts={view.parts} headingHref={view.sectionHref?.(SUBJECT_SECTIONS.parts)} />
    ),
  },
  {
    id: SUBJECT_SECTIONS.related,
    has: (view) => view.page.related.length > 0,
    render: (view) => (
      <SubjectBlock
        heading={SUBJECT_PAGE_COPY.sectionTitles.related}
        headingHref={view.sectionHref?.(SUBJECT_SECTIONS.related)}
        credit={{ source: SOURCE_KEYS.wanikani, label: SOURCE_CREDIT_COPY.relations }}
      >
        {view.page.related.map((group, index) => (
          <RelatedGroupBlock key={group.id} group={group} showToggle={index === 0} />
        ))}
      </SubjectBlock>
    ),
  },
  {
    id: SUBJECT_SECTIONS.mnemonics,
    has: (view) => Boolean(view.page.mnemonics?.meaning || view.page.mnemonics?.reading),
    render: (view) => (
      <MnemonicsBlock mnemonics={view.page.mnemonics} headingHref={view.sectionHref?.(SUBJECT_SECTIONS.mnemonics)} />
    ),
  },
  {
    id: SUBJECT_SECTIONS.examples,
    has: (view) => view.page.sentences.length > 0,
    render: (view) => (
      <ExampleSentences
        sentences={view.page.sentences}
        heading={KANJI_PAGE_COPY.examples}
        headingHref={view.sectionHref?.(SUBJECT_SECTIONS.examples)}
        credit={KANJI_PAGE_COPY.sentenceCredit}
      />
    ),
  },
];

/** The blocks this character actually has, in page order. */
export function kanjiSectionsFor(view: KanjiSectionView): KanjiSectionBlock[] {
  return KANJI_SECTION_BLOCKS.filter((block) => block.has(view));
}
