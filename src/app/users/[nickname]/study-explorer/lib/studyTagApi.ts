export async function updateStudyTag(
  accountId: string,
  subjectId: number,
  tag: "favorite" | "trouble",
  enabled: boolean,
): Promise<boolean> {
  try {
    const response = await fetch(`/api/study/${accountId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, tag, enabled }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
