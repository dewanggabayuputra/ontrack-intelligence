/**
 * Root Layout
 */

import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/layout/AppShell";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "OnTrack - Project Intelligence",
  description: "Enterprise project intelligence platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
