import type { Metadata } from "next";
import { cookies } from "next/headers";
import AppFooter from "./AppFooter";
import { loadFooterModeChips } from "@/lib/featureFlagsServer";
import ClientApiActivityHint from "./ClientApiActivityHint";
import ClientErrorReporter from "./ClientErrorReporter";
import ViewGlyphModalHost from "./shared/ViewGlyphModalHost";
import XpToastHost from "./shared/XpToastHost";
import "./globals.css";
import { SITE_URL } from "@/lib/siteOrigin";
import {
  DEFAULT_JP_FONT,
  DEFAULT_THEME,
  DISPLAY_PREFERENCE_COOKIES,
  JP_FONT_MODES,
  readEnumCookie,
  THEME_MODES,
} from "@/lib/displayPreferenceCookie";

export const metadata: Metadata = {
  /* What a canonical link and a preview image are resolved against. */
  metadataBase: SITE_URL,
  title: "UmaKuma",
  description: "Family WaniKani leaderboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const modeChips = await loadFooterModeChips();

  /*
   * The look, drawn on the server so it is right on the first paint of every
   * page. These were hardcoded to light here and changed only in the browser,
   * by a control mounted on the profile page alone - so choosing Dark applied
   * to that page and no other, and did not survive a navigation.
   */
  const cookieStore = await cookies();
  const theme = readEnumCookie(
    cookieStore.get(DISPLAY_PREFERENCE_COOKIES.theme)?.value,
    THEME_MODES,
    DEFAULT_THEME,
  );
  const jpFont = readEnumCookie(
    cookieStore.get(DISPLAY_PREFERENCE_COOKIES.jpFont)?.value,
    JP_FONT_MODES,
    DEFAULT_JP_FONT,
  );

  return (
    /*
     * The page refuses machine translation, at the root.
     *
     * This was tried, removed on a theory, and put back when the theory was
     * tested and failed. The theory was the documented one: declare the
     * document English, declare each Japanese run `lang="ja"`, and a browser
     * will read it as English prose around Japanese islands and stop offering
     * to translate it into English. Every Japanese run does carry `lang="ja"`
     * now - it is correct, and a screen reader needs it to pronounce a reading
     * rather than spell the kanji out as English - but Chrome translated the
     * page anyway. "Always translate Japanese" is a sticky user preference,
     * and once it is set the page's own declarations do not get a vote.
     *
     * That leaves the damage this actually causes. Chrome runs every string
     * through a Japanese-to-English model, English included, and that is a
     * re-interpretation rather than a pass-through: "Writing practice" comes
     * back "First practice", "Number the rows" as "Number the Row",
     * "Shellfish" as "shellfish". Text that was already in the reader's
     * language is made worse, and there is no mechanism for "translate into
     * anything except the language I am already written in".
     *
     * So it refuses. The cost is that a Spanish or Japanese reader cannot use
     * Google Translate on the interface - which is a real cost, and the answer
     * to it is a locale layer serving translations we wrote, not a machine
     * re-interpreting a page that is half Japanese by design. The copy modules
     * are already shaped for that.
     */
    <html
      lang="en"
      translate="no"
      suppressHydrationWarning
      className="notranslate h-full overflow-x-clip antialiased"
      data-theme={theme}
      data-jp-font={jpFont}
    >
      <head>
        {/* Google honours its own tag as well as the attribute. */}
        <meta name="google" content="notranslate" />
        {/*
         * The textbook and brush faces the stroke-order panel draws a kanji
         * in. Fetched at runtime rather than bundled: the font files are
         * several megabytes each, and Google serves only the slices a page
         * uses. Swapped in when they arrive, so nothing waits on them.
         */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* The rule wants _document; this is the App Router root layout, which is every page. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Klee+One:wght@600&family=Yuji+Syuku&display=swap"
        />
      </head>
      <body className="min-h-full overflow-x-clip flex flex-col">
        <ClientErrorReporter />
        <ClientApiActivityHint />
        <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
        <AppFooter modeChips={modeChips} />
        <ViewGlyphModalHost />
        {/* Draws nothing until a member earns something. */}
        <XpToastHost />
      </body>
    </html>
  );
}
