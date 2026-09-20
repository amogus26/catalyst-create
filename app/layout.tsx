import type { Metadata } from "next";
import { Inter, Silkscreen } from "next/font/google";
import Link from "next/link";
import { usingDevStore } from "@/lib/store";
import "./globals.css";

/**
 * The launcher sets no font family at all - it takes the platform's sans and draws its own pixel
 * face (`MinecraftText`) for headline moments. So there is no typeface to inherit, only that idea:
 * Inter carries the text, and the pixel face appears on the wordmark and nowhere else.
 */
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
    "Submit a cape design for Catalyst Client and vote on everyone else's. Every submission is reviewed by a person before it appears.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Decided from the environment rather than by building a store: this layout is rendered for
  // every page, including during `next build`, and building the store there is neither wanted nor
  // safe (see lib/store/index.ts).
  const devStore = usingDevStore();

  return (
    <html lang="en" className={`${inter.variable} ${silkscreen.variable}`}>
      <body>
        {devStore && (
          <div className="dev-banner">
            Local dev store: submissions live in <code>.localstore/</code> on this machine only. Set
            the Supabase environment variables to use the real database.
          </div>
        )}
        <header className="site-header">
          <div className="inner">
            <Link href="/" className="brand">
              <span className="mark" aria-hidden="true" />
              Catalyst <span className="gold">Designs</span>
            </Link>
            <nav>
              <Link href="/#submit">Submit</Link>
              <Link href="/#vote">Vote</Link>
              <Link href="/#showcase">Showcase</Link>
              <Link href="/terms">Terms</Link>
            </nav>
          </div>
        </header>
        <main className="shell">{children}</main>
        <footer className="site-footer">
          <div className="inner">
            <p>
              Community cosmetic designs for Catalyst Client. Every submission is looked at by a person
              before it is shown here.
            </p>
            <p className="tiny">
              <Link href="/terms">Terms &amp; Privacy</Link>
              <span className="dot">·</span>
              <Link href="/admin">Reviewer sign-in</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
