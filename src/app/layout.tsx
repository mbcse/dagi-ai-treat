import type { ReactNode } from "react";

import "@/styles/globals.css";
import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";

import "@rainbow-me/rainbowkit/styles.css";
import { Providers } from "./providers";

const open_sans = Open_Sans({ subsets: ["latin"] });
import "@coinbase/onchainkit/styles.css";

export const metadata: Metadata = {
  title: "TokenTreat",
  applicationName: "TokenTreat",
  description: "Create coupons/cards and treat the world with tokens",
  authors: {
    name: "Mohit",
    url: "",
  },
  icons: "favicon.svg",
  manifest: "site.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={open_sans.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
