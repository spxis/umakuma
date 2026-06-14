import { useEffect } from "react";

type MutateQueue = () => Promise<unknown>;

export function useStudyTagSync(mutateQueue: MutateQueue): void {
  useEffect(() => {
    const onTagsUpdated = () => {
      void mutateQueue();
    };
    window.addEventListener("wr:study-tags-updated", onTagsUpdated);
    return () => window.removeEventListener("wr:study-tags-updated", onTagsUpdated);
  }, [mutateQueue]);
}
