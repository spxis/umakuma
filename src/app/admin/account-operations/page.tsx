import AdminWorkspacePage from "../AdminWorkspacePage";
import { getAdminWorkspaceInitialSession } from "../adminWorkspaceServerState";

export default async function AdminAccountOperationsPage() {
  const initialSession = await getAdminWorkspaceInitialSession();

  return <AdminWorkspacePage activeTab="operations" initialSession={initialSession} />;
}
