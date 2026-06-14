import { updateStudyTag } from "./studyTagApi";

type ToggleParams = {
  accountId: string;
  subjectId: number;
  tag: "favorite" | "trouble";
  enabled: boolean;
  mutateQueue: () => Promise<unknown>;
  onSaved?: () => void;
};

export async function toggleStudyTagAndRefresh({
  accountId,
  subjectId,
  tag,
  enabled,
  mutateQueue,
  onSaved,
}: ToggleParams): Promise<void> {
  if (!(await updateStudyTag(accountId, subjectId, tag, enabled))) {
    return;
  }

  onSaved?.();

  window.dispatchEvent(new CustomEvent("wr:study-tags-updated", { detail: { accountId, subjectId } }));
  await mutateQueue();
}
