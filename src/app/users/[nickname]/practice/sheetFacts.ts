import type { KanjiSheetFacts } from "@/lib/kanjiSheetFacts";

import { SHEET_FACT_COPY } from "./practiceCopy";

/**
 * The short labels a worksheet row wears, in a fixed order.
 *
 * Grade, then the test, then the level: broadest first, because a student
 * reading down a column of them is placing the character rather than reading a
 * sentence. Nothing is printed for a fact nobody knows, so a character in none
 * of the three keeps a short line instead of three empty boxes.
 *
 * School years 7 and up are not years - 8 is secondary and 9 is the name
 * register - so those print the band they belong to rather than a grade that
 * would be wrong. The band is only worth saying where there is no year.
 */
export function sheetFactLabels(facts: KanjiSheetFacts | undefined): string[] {
  if (!facts) return [];

  const labels: string[] = [];
  if (facts.schoolGrade !== null) labels.push(SHEET_FACT_COPY.grade(facts.schoolGrade));
  else if (facts.band) labels.push(facts.band);
  if (facts.jlpt !== null) labels.push(SHEET_FACT_COPY.jlpt(facts.jlpt));
  if (facts.wkLevel !== null) labels.push(SHEET_FACT_COPY.wanikani(facts.wkLevel));
  return labels;
}
