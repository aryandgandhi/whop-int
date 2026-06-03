import type { Metadata } from "next";
import { Theme } from "@whop/react/components";
import { Providers } from "./providers";
import "@whop/react/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whop Marketplace",
  description: "Post tasks, fund a reward pool, and get work done.",
};

// Standalone app: we use frosted-ui's Theme for the Whop look (design tokens,
// accent color, dark mode) without booting the Whop iframe SDK.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Theme accentColor="orange" grayColor="sand">
          <Providers>{children}</Providers>
        </Theme>
      </body>
    </html>
  );
}
