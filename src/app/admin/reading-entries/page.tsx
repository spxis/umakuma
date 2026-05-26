import AdminWorkspacePage from "../AdminWorkspacePage";
import { getAdminWorkspaceInitialSession } from "../adminWorkspaceServerState";

export default async function AdminReadingEntriesPage() {
  const initialSession = await getAdminWorkspaceInitialSession();

  return <AdminWorkspacePage activeTab="readingEntries" initialSession={initialSession} />;
}
