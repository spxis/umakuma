import type { StudyTag } from "@/lib/domainConstants";
import { useCallback } from "react";
import { toggleStudyTagAndRefresh } from "./studyTagToggle";
import type { StudyQueueItem } from "./studyExplorerTypes";

type MutateQueue = () => Promise<unknown>;
type SetLoadedItems = React.Dispatch<React.SetStateAction<StudyQueueItem[]>>;

export function useStudyCardTagToggle(
  accountId: string,
  mutateQueue: MutateQueue,
  setLoadedItems: SetLoadedItems,
) {
  return useCallback(
    (subjectId: number, tag: StudyTag, enabled: boolean) => {
      void toggleStudyTagAndRefresh({
        accountId,
        subjectId,
        tag,
        enabled,
        mutateQueue,
        onSaved: () => {
          setLoadedItems((prev) =>
            prev.map((item) =>
              item.subjectId === subjectId
                ? {
                    ...item,
                    studyTags: {
                      favorite: item.studyTags?.favorite ?? false,
                      trouble: item.studyTags?.trouble ?? false,
                      burned: item.studyTags?.burned ?? false,
                      [tag]: enabled,
                    },
                  }
                : item,
            ),
          );
        },
      });
    },
    [accountId, mutateQueue, setLoadedItems],
  );
}
