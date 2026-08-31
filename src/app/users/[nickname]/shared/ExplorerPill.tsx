import type { ReactNode } from "react";
import type { SubjectType } from "@/lib/domainConstants";

import { NO_TRANSLATE_CLASS } from "@/app/shared/japaneseText";

import { subjectTypePillClass } from "../level-explorer/lib/levelExplorerDisplay";

/**
 * Pills carry codes, not sentences.
 *
 * What goes in one is a status, a level, an SRS stage, a subject type or a
 * count - "APPR - SRS 4", "N5", "L17", "(157)". None of it is prose, and a
 * translator handed it does two kinds of damage: it rewrites short words into
 * something that no longer fits the pill, and it respaces what is left, because
 * a label built from several JSX children is several text nodes with the gaps
 * between them up for grabs. That is how "JLPT N5" became "JLPTN5" and every
 * count became "( 157 )".
 *
 * So the whole pill family refuses translation at the primitive, rather than
 * each of the several dozen call sites remembering to.
 */

type ExplorerPillProps = {
  className?: string;
  children: ReactNode;
};

export function ExplorerPill({ className = "", children }: ExplorerPillProps) {
  return (
    <span translate="no" className={`${NO_TRANSLATE_CLASS} subject-pill whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}

type SubjectTypePillProps = {
  type: SubjectType;
  className?: string;
  children: ReactNode;
};

export function SubjectTypePill({ type, className = "", children }: SubjectTypePillProps) {
  return (
    <span translate="no" className={`${NO_TRANSLATE_CLASS} ${subjectTypePillClass(type)} whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}

export function NeutralPill({ className = "", children }: ExplorerPillProps) {
  return <ExplorerPill className={`border-line bg-surface text-foreground ${className}`}>{children}</ExplorerPill>;
}
