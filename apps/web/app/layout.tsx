import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "VOTE-GUARD 360",
  description: "An independent evidence layer for polling-unit result sheets. Demo data only.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="demo-banner">DEMO DATA · independent evidence layer, not an INEC system</div>
        <header className="top">
          <Link href="/">VOTE-GUARD 360</Link>
          <nav>
            <Link href="/">Explore</Link>
            <Link href="/capture">Capture</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
