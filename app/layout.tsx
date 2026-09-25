import type { Metadata } from "next";
import { Inter, Silkscreen } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { usingDevStore } from "@/lib/store";
import "./globals.css";

/** Inter carries the text; the pixel face - the launcher's own voice - only labels things. */
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });
const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "Catalyst Designs",
  description:
    "Design capes and other cosmetics for Catalyst Client, and vote on everyone else's. Every design is checked by a person before it appears.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // From the environment rather than by building a store - this renders during `next build` too
  // (see lib/store/index.ts).
  const devStore = usingDevStore();

  return (
    <html lang="en" className={`${inter.variable} ${silkscreen.variable}`}>
      <body>
        {devStore && (
          <div className="dev-banner">
            Local dev store - data lives in <code>.localstore/</code> on this machine only.
          </div>
        )}
        <header className="site-header">
          <div className="inner">
            <Link href="/" className="brand">
              <Logo size={30} />
              <span>
                Catalyst <span className="gold">Designs</span>
              </span>
            </Link>
            <nav aria-label="Site">
              <Link href="/#vote">Vote</Link>
              <Link href="/#gallery">Gallery</Link>
              <Link href="/#submit" className="optional">
                Submit
              </Link>
              <Link href="/terms" className="optional">
                Terms
              </Link>
            </nav>
            <Link href="/#submit" className="button primary small header-cta">
              Submit a design
            </Link>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="inner">
            <div>
              <Link href="/" className="brand">
                <Logo size={24} />
                <span>
                  Catalyst <span className="gold">Designs</span>
                </span>
              </Link>
              <p style={{ marginTop: 10 }}>Community cosmetics for Catalyst Client.</p>
            </div>
            <nav aria-label="Footer">
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/admin">Reviewers</Link>
            </nav>
            <p className="legal">
              Not an official Minecraft product. Not approved by or associated with Mojang or
              Microsoft. Minecraft is a trademark of Mojang Synergies AB.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
