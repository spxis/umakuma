import AdminWorkspacePage from "../AdminWorkspacePage";
import { getAdminWorkspaceInitialSession } from "../adminWorkspaceServerState";

export default async function AdminWkCatalogPage() {
  const initialSession = await getAdminWorkspaceInitialSession();

  return <AdminWorkspacePage activeTab="catalog" initialSession={initialSession} />;
}
