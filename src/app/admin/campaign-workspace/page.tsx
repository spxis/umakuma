import AdminWorkspacePage from "../AdminWorkspacePage";
import { getAdminWorkspaceInitialCampaigns, getAdminWorkspaceInitialSession } from "../adminWorkspaceServerState";

export default async function AdminCampaignWorkspacePage() {
  const initialSession = await getAdminWorkspaceInitialSession();
  const initialCampaigns = await getAdminWorkspaceInitialCampaigns(initialSession);

  return (
    <AdminWorkspacePage
      activeTab="campaigns"
      initialSession={initialSession}
      initialCampaigns={initialCampaigns}
    />
  );
}
