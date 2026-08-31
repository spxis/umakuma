import type { Metadata } from "next";
import AppFooter from "./AppFooter";
import { loadFooterModeChips } from "@/lib/featureFlagsServer";
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
  const modeChips = await loadFooterModeChips();

  return (
    /*
     * `lang="en"` is the truth about this document and is load-bearing.
     *
     * It briefly carried `translate="no"` as well, which stopped the damage and
     * cost too much: it also stops a Spanish or Japanese speaker translating
     * the interface, which is a thing they should be able to do. The reason
     * Chrome ignored this attribute was that the Japanese on the page was not
     * declared as Japanese, so a page of kanji simply read as Japanese and it
     * offered to translate the whole thing into English - pushing the English
     * through a Japanese-to-English model on the way.
     *
     * The Japanese runs carry `lang="ja"` now, so the document reads as what it
     * is: English prose around declared-Japanese islands, each of which also
     * refuses translation. The chrome stays translatable; the subject does not.
     */
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
        <AppFooter modeChips={modeChips} />
        <StudyTagListsModal />
        <ViewGlyphModalHost />
      </body>
    </html>
  );
}
