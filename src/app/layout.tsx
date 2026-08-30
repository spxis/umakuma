import type { Metadata } from "next";
import AppFooter from "./AppFooter";
import { loadFooterModeChips } from "@/lib/featureFlagsServer";
import { loadViewerIsAdmin } from "@/lib/viewerAdmin";
import ClientApiActivityHint from "./ClientApiActivityHint";
import ClientErrorReporter from "./ClientErrorReporter";
import StudyTagListsModal from "./shared/StudyTagListsModal";
import ViewGlyphModalHost from "./shared/ViewGlyphModalHost";
import "./globals.css";

export const metadata: Metadata = {
  title: "UmaKuma",
  description: "Family WaniKani leaderboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [modeChips, viewerIsAdmin] = await Promise.all([loadFooterModeChips(), loadViewerIsAdmin()]);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full overflow-x-clip antialiased"
      data-theme="light"
      data-jp-font="sans"
    >
      <body className="min-h-full overflow-x-clip flex flex-col">
        <ClientErrorReporter />
        <ClientApiActivityHint />
        <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
        <AppFooter modeChips={modeChips} isAdmin={viewerIsAdmin} />
        <StudyTagListsModal />
        <ViewGlyphModalHost />
      </body>
    </html>
  );
}
