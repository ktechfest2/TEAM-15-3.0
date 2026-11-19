import type { ReactNode } from "react";

export const metadata = {
  title: "VOTE-GUARD 360",
  description: "An independent evidence layer for polling-unit result sheets. Demo data only.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f6f9f8", color: "#14212b" }}>
        <div style={{ background: "#fff4e0", color: "#8a4b08", fontSize: 13, fontWeight: 700, textAlign: "center", padding: "6px 12px" }}>
          DEMO DATA · independent evidence layer, not an INEC system
        </div>
        {children}
      </body>
    </html>
  );
}
