import Link from "next/link";
import { Logo } from "@/components/logo";
import { GAME_VERSION, LOADER } from "@/lib/catalyst";

/** The foot of every page: where everything is, and the legal line. */
export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wide">
        <div className="foot-grid">
          <div className="about">
            <Link href="/" className="brand">
              <Logo size={26} />
              <span>Catalyst</span>
            </Link>
            <p>
              A launcher and client for Minecraft {GAME_VERSION} with {LOADER}: mods, modules, cosmetics and
              rewards in one app.
            </p>
          </div>
          <nav aria-label="Catalyst">
            <h2>Catalyst</h2>
            <ul>
              <li><Link href="/#features">Features</Link></li>
              <li><Link href="/download">Download</Link></li>
              <li><Link href="/download#notes">Release notes</Link></li>
            </ul>
          </nav>
          <nav aria-label="Store">
            <h2>Store</h2>
            <ul>
              <li><Link href="/cosmetics">Cosmetics</Link></li>
              <li><Link href="/coins">Coins</Link></li>
              <li><Link href="/battle-pass">Battle pass</Link></li>
              <li><Link href="/redeem">Redeem a code</Link></li>
            </ul>
          </nav>
          <nav aria-label="Community">
            <h2>Community</h2>
            <ul>
              <li><Link href="/designs">Designs</Link></li>
              <li><Link href="/designs#submit">Submit a cape</Link></li>
              <li><Link href="/designs#vote">Vote</Link></li>
            </ul>
          </nav>
          <nav aria-label="Legal">
            <h2>Legal</h2>
            <ul>
              <li><Link href="/terms">Terms of Service</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/admin">Reviewers</Link></li>
            </ul>
          </nav>
        </div>
        <div className="legal">
          {/* Mojang's usage guidelines ask for this line on the website, prominently - keep it. */}
          <span>Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.</span>
          <span>Minecraft is a trademark of Mojang Synergies AB.</span>
        </div>
      </div>
    </footer>
  );
}
