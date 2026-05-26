import AdminWorkspacePage from "../AdminWorkspacePage";
import { getAdminWorkspaceInitialSession } from "../adminWorkspaceServerState";

export default async function AdminUsersPage() {
  const initialSession = await getAdminWorkspaceInitialSession();

  return <AdminWorkspacePage activeTab="users" initialSession={initialSession} />;
}
