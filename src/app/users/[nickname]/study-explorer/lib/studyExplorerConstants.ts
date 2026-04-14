export const STUDY_QUEUE_MODE_REVIEW = "review" as const;
export const STUDY_QUEUE_MODE_LESSON = "lesson" as const;
export const STUDY_QUEUE_MODES = [STUDY_QUEUE_MODE_REVIEW, STUDY_QUEUE_MODE_LESSON] as const;
export type StudyQueueMode = (typeof STUDY_QUEUE_MODES)[number];

export const STUDY_SRS_FILTER_ALL = "all" as const;
export const STUDY_STATUS_LOCKED = "locked" as const;
export const STUDY_STATUS_APPRENTICE = "apprentice" as const;
export const STUDY_STATUS_GURU = "guru" as const;
export const STUDY_STATUS_MASTER = "master" as const;
export const STUDY_STATUS_ENLIGHTENED = "enlightened" as const;

export const STUDY_SRS_FILTERS = [
  STUDY_SRS_FILTER_ALL,
  STUDY_STATUS_LOCKED,
  STUDY_STATUS_APPRENTICE,
  STUDY_STATUS_GURU,
  STUDY_STATUS_MASTER,
  STUDY_STATUS_ENLIGHTENED,
] as const;

export const STUDY_REVIEW_SRS_FILTERS = [
  STUDY_SRS_FILTER_ALL,
  STUDY_STATUS_APPRENTICE,
  STUDY_STATUS_GURU,
  STUDY_STATUS_MASTER,
  STUDY_STATUS_ENLIGHTENED,
] as const;
