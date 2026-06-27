import type { ReactNode } from "react";
import type { SubjectType } from "@/lib/domainConstants";

import { subjectTypePillClass } from "../level-explorer/lib/levelExplorerDisplay";

type ExplorerPillProps = {
  className?: string;
  children: ReactNode;
};

export function ExplorerPill({ className = "", children }: ExplorerPillProps) {
  return <span className={`subject-pill whitespace-nowrap ${className}`}>{children}</span>;
}

type SubjectTypePillProps = {
  type: SubjectType;
  className?: string;
  children: ReactNode;
};

export function SubjectTypePill({ type, className = "", children }: SubjectTypePillProps) {
  return <span className={`${subjectTypePillClass(type)} whitespace-nowrap ${className}`}>{children}</span>;
}

export function NeutralPill({ className = "", children }: ExplorerPillProps) {
  return <ExplorerPill className={`border-line bg-surface text-foreground ${className}`}>{children}</ExplorerPill>;
}
