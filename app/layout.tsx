import type { Metadata } from "next";
import Link from "next/link";
import { usingDevStore } from "@/lib/store";
import "./globals.css";

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
    <html lang="en">
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
              Community cape designs for Catalyst Client. Every submission is looked at by a person
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
