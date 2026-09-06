import { SUBJECT_TYPES } from "./domainConstants";
import { gradeRadicalLevel, gradeVocabularyLevel, gradePlacement } from "./gradeLadder";
import { kanjiPlacement, radicalLevel, vocabularyLevel } from "./kanjiLadder";
import { getSchoolGradeKanjiByCharacter } from "./schoolGrades";

/**
 * Every ladder a subject sits on.
 *
 * A level is a question with several answers - WaniKani's, our two, the JLPT's
 * band, the year a Japanese child is taught it - and a list that knew only
 * WaniKani's left the lane blank for anything WaniKani never taught. That is
 * the majority of what a member can put on a list: the JLPT explorer teaches
 * 2,211 kanji and WaniKani has 2,027 of them.
 *
 * Read on the server, where the ladder files already live. They are a megabyte
 * between them and belong nowhere near a bundle.
 */
export type SubjectLadderLevels = {
  /** Ours, ordered by the exam. */
  unLevel: number | null;
  /** Ours, ordered by Japanese school year. */
  ugLevel: number | null;
  /** 1-6 for kyōiku, 8 for the rest of jōyō, null where the catalogue is silent. */
  schoolGrade: number | null;
};

export function subjectLadderLevels(subject: {
  subjectType: string;
  characters: string;
  /** WaniKani's id, which is how both ladders key a word. */
  subjectId: number | null;
}): SubjectLadderLevels {
  if (subject.subjectType === SUBJECT_TYPES.vocabulary) {
    return {
      unLevel: subject.subjectId === null ? null : vocabularyLevel(subject.subjectId),
      ugLevel: subject.subjectId === null ? null : gradeVocabularyLevel(subject.subjectId),
      schoolGrade: null,
    };
  }

  if (subject.subjectType === SUBJECT_TYPES.radical) {
    return {
      unLevel: radicalLevel(subject.characters),
      ugLevel: gradeRadicalLevel(subject.characters),
      schoolGrade: null,
    };
  }

  return {
    unLevel: kanjiPlacement(subject.characters)?.level ?? null,
    ugLevel: gradePlacement(subject.characters)?.level ?? null,
    /*
     * The grade catalogue rather than the ladder's own copy: the ladder holds
     * the grade it ordered by, and the catalogue is what a member is shown on
     * the grade pages. One source for the number in both places.
     */
    schoolGrade: getSchoolGradeKanjiByCharacter(subject.characters)?.grade ?? null,
  };
}
