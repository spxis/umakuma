import type { QueueType } from "@/lib/domainConstants";
import type { LevelItem } from "@/lib/glyphTypes";

export type StudyQueueItem = LevelItem & {
  assignmentId: number;
  queueType: QueueType;
  isInjectedTrouble?: boolean;
  studyTags?: {
    favorite: boolean;
    trouble: boolean;
  };
};
