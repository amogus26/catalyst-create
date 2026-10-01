import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { PointerLight } from "@/components/site/pointer-light";
import { CLIENT_MODULES } from "@/lib/catalyst";
import { usingDevStore } from "@/lib/store";
import "./globals.css";
import "./site.css";

/** Inter carries the text, Space Grotesk the headings, and JetBrains Mono the small labels. */
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap", variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "600"], display: "swap", variable: "--font-label" });

export const metadata: Metadata = {
  metadataBase: new URL("https://catalystclient.net"),
  title: {
    default: "Catalyst Client - Minecraft, set up for you",
    template: "%s · Catalyst Client",
  },
  description:
    `Catalyst is a Minecraft launcher and client in one: it installs your mods and keeps them updated, adds ${CLIENT_MODULES.length} modules, and brings cosmetics, a battle pass and daily rewards.`,
  openGraph: {
    type: "website",
    siteName: "Catalyst Client",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Catalyst Client" }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#080c12",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // From the environment rather than by building a store - this renders during `next build` too
  // (see lib/store/index.ts).
  const devStore = usingDevStore();

  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable} ${mono.variable}`}>
      <head>
        {/* Without JavaScript nothing fades in, so anything waiting to fade in is simply shown. */}
        <noscript>
          <style>{`[style*="opacity:0"]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body>
        <PointerLight />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {devStore && (
          <div className="dev-banner">
            Local dev store - data lives in <code>.localstore/</code> on this machine only.
          </div>
        )}
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
