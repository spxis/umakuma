import type { Metadata } from "next";
import { Archivo_Black, Noto_Sans_JP, Noto_Serif_JP, Space_Grotesk } from "next/font/google";
import AppFooter from "./AppFooter";
import ClientErrorReporter from "./ClientErrorReporter";
import ViewGlyphModalHost from "./shared/ViewGlyphModalHost";
import "./globals.css";

const bodySans = Space_Grotesk({
  variable: "--font-body-sans",
  subsets: ["latin"],
});

const displaySans = Archivo_Black({
  variable: "--font-display-sans",
  weight: "400",
  subsets: ["latin"],
});

const jpSans = Noto_Sans_JP({
  variable: "--font-jp-sans",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const jpSerif = Noto_Serif_JP({
  variable: "--font-jp-serif",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UmaKuma",
  description: "Family WaniKani leaderboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bodySans.variable} ${displaySans.variable} ${jpSans.variable} ${jpSerif.variable} h-full overflow-x-clip antialiased`}
      data-theme="light"
      data-jp-font="sans"
    >
      <body className="min-h-full overflow-x-clip flex flex-col">
        <ClientErrorReporter />
        <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
        <AppFooter />
        <ViewGlyphModalHost />
      </body>
    </html>
  );
}
