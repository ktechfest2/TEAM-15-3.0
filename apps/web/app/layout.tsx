import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";
import { DemoStrip, DraftNote, Masthead, SectionBar, SkipLink, TabBar } from "../components/shell";

export const viewport = { themeColor: "#0e8374" };

export const metadata = {
  applicationName: "VOTE-GUARD 360",
  title: "VOTE-GUARD 360",
  description: "An independent voter guide and evidence layer for polling-unit result sheets. Prototype, not INEC.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SkipLink />
          <DemoStrip />
          <Masthead />
          <SectionBar />
          <DraftNote />
          <main id="main" tabIndex={-1}>{children}</main>
          <TabBar />
        </Providers>
      </body>
    </html>
  );
}
