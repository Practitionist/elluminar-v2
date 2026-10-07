import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Elluminar v2 — Clean-Sheet Hexagonal Architecture",
  description:
    "Applied Mastery Platform powered by True Double-Entry Ledger Escrow, SAC 999293 India GST Engine, and Pluggable Multimodal Work Artifacts.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif",
          backgroundColor: "#090d16",
          color: "#f1f5f9",
        }}
      >
        {children}
      </body>
    </html>
  );
}
