import type { ReactNode } from "react";

import ExampleSentences from "@/app/shared/ExampleSentences";
import { KANJI_PAGE_COPY } from "@/app/kanji/[character]/KanjiPage.constants";
import { stripHtml } from "@/app/users/[nickname]/level-explorer/lib/levelExplorerDisplayReadings";
import type { PublicSubject } from "@/lib/publicSubject";
import { SOURCE_KEYS, SOURCE_CREDIT_COPY } from "@/lib/sourceCredits";
import type { CatalogRelatedReference } from "@/lib/subjectCatalogDetails";
import { relatedGroupsForSubject } from "@/lib/subjectPageModel";
import type { ExampleSentence } from "@/lib/tatoebaSentences";

import MnemonicsBlock from "./MnemonicsBlock";
import RelatedGroupBlock from "./RelatedGroupBlock";
import SubjectBlock from "./SubjectBlock";
import SubjectIdentityBlock from "./SubjectIdentityBlock";
import { SUBJECT_PAGE_COPY } from "./SubjectPage.constants";
import { SUBJECT_SECTIONS, type SubjectSection } from "./subjectSectionAddress";

/**
 * The blocks of a radical or word page, declared once.
 *
 * The kanji page has its own list, because it draws things these do not - a
 * stroke animation, a dictionary entry - but the shape is the same and so are
 * the section names: the whole page draws every block, a section page draws
 * one, and both read this list, so the part cannot drift from the whole.
 *
 * Each block says whether this particular subject has anything under it. The
 * page leaves an empty one out, and the section address is a 404 rather than a
 * heading over nothing: WaniKani wrote no mnemonic for most subjects, and a
 * radical has no example sentences at all.
 */
export type SubjectSectionView = {
  subject: PublicSubject;
  /** What to draw: the characters, or a radical's name where it has none. */
  label: string;
  /** For a word: the other words built from its kanji. */
  neighbours: CatalogRelatedReference[];
  /** For a word: Tatoeba's sentences. A radical is never in one. */
  sentences: ExampleSentence[];
  /**
   * Where each part of this subject lives, for a title that links to its own
   * page. Absent on a section page, where the title would link to itself.
   */
  sectionHref?: (id: SubjectSection) => string;
};

export type SubjectSectionBlock = {
  id: SubjectSection;
  has: (view: SubjectSectionView) => boolean;
  render: (view: SubjectSectionView) => ReactNode;
};

/** WaniKani's two notes, as the shared block wants them. */
function mnemonicsOf(subject: PublicSubject): { meaning: string; reading: string } | null {
  const meaning = stripHtml(subject.meaningExplanation);
  const reading = stripHtml(subject.readingExplanation);
  return meaning || reading ? { meaning, reading } : null;
}

export const SUBJECT_SECTION_BLOCKS: readonly SubjectSectionBlock[] = [
  {
    id: SUBJECT_SECTIONS.meanings,
    /* What the subject is; there is no subject without it. */
    has: () => true,
    render: (view) => (
      <SubjectIdentityBlock
        identity={{
          label: view.label,
          subjectType: view.subject.subjectType,
          name: view.subject.meanings[0] ?? view.label,
          meanings: view.subject.meanings,
          readings: view.subject.readings,
          wkLevel: view.subject.wkLevel,
          ukLevel: view.subject.ukLevel ?? null,
          jlptLevel: view.subject.jlptLevel ?? null,
          /* Everything on the card is WaniKani's, for these two. */
          credited: true,
        }}
      />
    ),
  },
  {
    id: SUBJECT_SECTIONS.mnemonics,
    has: (view) => mnemonicsOf(view.subject) !== null,
    render: (view) => (
      <MnemonicsBlock
        mnemonics={mnemonicsOf(view.subject)}
        headingHref={view.sectionHref?.(SUBJECT_SECTIONS.mnemonics)}
      />
    ),
  },
  {
    id: SUBJECT_SECTIONS.related,
    has: (view) => relatedGroupsForSubject(view.subject, view.neighbours).length > 0,
    render: (view) => (
      <SubjectBlock
        heading={SUBJECT_PAGE_COPY.sectionTitles.related}
        headingHref={view.sectionHref?.(SUBJECT_SECTIONS.related)}
        credit={{ source: SOURCE_KEYS.wanikani, label: SOURCE_CREDIT_COPY.relations }}
      >
        {relatedGroupsForSubject(view.subject, view.neighbours).map((group, index) => (
          <RelatedGroupBlock key={group.id} group={group} showToggle={index === 0} />
        ))}
      </SubjectBlock>
    ),
  },
  {
    id: SUBJECT_SECTIONS.examples,
    has: (view) => view.sentences.length > 0,
    render: (view) => (
      <ExampleSentences
        sentences={view.sentences}
        heading={SUBJECT_PAGE_COPY.examples}
        headingHref={view.sectionHref?.(SUBJECT_SECTIONS.examples)}
        credit={KANJI_PAGE_COPY.sentenceCredit}
      />
    ),
  },
];

/** The blocks this subject actually has, in page order. */
export function subjectSectionsFor(view: SubjectSectionView): SubjectSectionBlock[] {
  return SUBJECT_SECTION_BLOCKS.filter((block) => block.has(view));
}
