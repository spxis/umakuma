import AdminWorkspacePage from "../AdminWorkspacePage";
import { getAdminWorkspaceInitialSession } from "../adminWorkspaceServerState";

export default async function AdminSubmissionHistoryPage() {
  const initialSession = await getAdminWorkspaceInitialSession();

  return <AdminWorkspacePage activeTab="history" initialSession={initialSession} />;
}
