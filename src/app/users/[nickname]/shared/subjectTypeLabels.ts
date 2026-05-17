import { SUBJECT_TYPE_DISPLAY, type SubjectType } from "@/lib/domainConstants";

export type ExplorerSubjectType = SubjectType;

export function subjectTypeShortLabel(type: ExplorerSubjectType): string {
  return SUBJECT_TYPE_DISPLAY[type].short;
}

export function subjectTypeFilterLabel(type: ExplorerSubjectType): string {
  return SUBJECT_TYPE_DISPLAY[type].filter;
}

export function subjectTypePluralLabel(type: ExplorerSubjectType): string {
  return SUBJECT_TYPE_DISPLAY[type].plural;
}