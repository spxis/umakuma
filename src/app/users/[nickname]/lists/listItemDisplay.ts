import { LIST_ITEM_KINDS, LIST_ITEM_KIND_DISPLAY, LIST_ITEM_KIND_VALUES, type ListItemKind } from "@/lib/domainConstants";
import { countByKind, type StudyListItemRef } from "@/lib/studyListRules";

/**
 * How a list's items read on a card and in an editor.
 *
 * The preview is the items themselves rather than a count, because the
 * question a parent has is "what is in Week 3". Kanji run together the way a
 * sheet does; words and radicals get a space so 水曜日 is not read as three
 * kanji.
 */
export function previewText(items: StudyListItemRef[]): string {
  let text = "";
  let previous: ListItemKind | null = null;
  for (const item of items) {
    const glue = previous === null ? "" : previous === LIST_ITEM_KINDS.kanji && item.kind === LIST_ITEM_KINDS.kanji ? "" : " ";
    text += glue + item.key;
    previous = item.kind;
  }
  return text;
}

/** The colour an item's kind carries everywhere else on the site. */
export function itemToneClass(kind: ListItemKind): string {
  switch (kind) {
    case LIST_ITEM_KINDS.radical:
      return "text-radical";
    case LIST_ITEM_KINDS.kanji:
      return "text-kanji";
    case LIST_ITEM_KINDS.vocabulary:
      return "text-vocabulary";
    default:
      return "text-foreground";
  }
}

/** The kinds a list holds, with counts, in display order - for chips. */
export function kindChips(items: StudyListItemRef[]): { kind: ListItemKind; label: string; count: number }[] {
  const counts = countByKind(items);
  return LIST_ITEM_KIND_VALUES.flatMap((kind) => {
    const count = counts[kind] ?? 0;
    return count > 0 ? [{ kind, label: LIST_ITEM_KIND_DISPLAY[kind].plural, count }] : [];
  });
}
