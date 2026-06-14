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
    (subjectId: number, tag: "favorite" | "trouble", enabled: boolean) => {
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
                      favorite: tag === "favorite" ? enabled : (item.studyTags?.favorite ?? false),
                      trouble: tag === "trouble" ? enabled : (item.studyTags?.trouble ?? false),
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
