import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "./nav";

export const viewport = { themeColor: "#12304a" };

export const metadata = {
  applicationName: "VOTE-GUARD 360",
  title: "VOTE-GUARD 360",
  description: "An independent evidence layer for polling-unit result sheets. Demo data only.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <div className="demo-banner">DEMO DATA · independent evidence layer, not an INEC system</div>
        <Providers>
          <Nav />
          <main id="main" tabIndex={-1}>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
