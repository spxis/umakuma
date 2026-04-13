export type ExplorerSubjectType = "radical" | "kanji" | "vocabulary";

const SUBJECT_TYPE_LABELS: Record<
  ExplorerSubjectType,
  { short: string; filter: string; plural: string }
> = {
  radical: {
    short: "RADICAL",
    filter: "radical",
    plural: "Radicals",
  },
  kanji: {
    short: "KANJI",
    filter: "kanji",
    plural: "Kanji",
  },
  vocabulary: {
    short: "VOCAB",
    filter: "vocab",
    plural: "Vocab",
  },
};

export function subjectTypeShortLabel(type: ExplorerSubjectType): string {
  return SUBJECT_TYPE_LABELS[type].short;
}

export function subjectTypeFilterLabel(type: ExplorerSubjectType): string {
  return SUBJECT_TYPE_LABELS[type].filter;
}

export function subjectTypePluralLabel(type: ExplorerSubjectType): string {
  return SUBJECT_TYPE_LABELS[type].plural;
}