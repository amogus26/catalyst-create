"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { Logo } from "@/components/logo";
import { DownloadButton } from "./download-button";

const LINKS = [
  { href: "/#features", label: "Features", match: null },
  { href: "/cosmetics", label: "Cosmetics", match: "/cosmetics" },
  { href: "/coins", label: "Coins", match: "/coins" },
  { href: "/battle-pass", label: "Battle pass", match: "/battle-pass" },
  { href: "/designs", label: "Designs", match: "/designs" },
  { href: "/redeem", label: "Redeem", match: "/redeem" },
] as const;

/**
 * The bar over every page: the logo, the pages, and Download. It is clear over the top of a page and
 * turns to frosted glass once the page moves under it, with a thin line along its foot that fills as
 * you read. Below 980px the links fold into a menu.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const meter = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A page change closes the menu.
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes it too.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = (match: string | null) => (match && pathname?.startsWith(match) ? "page" : undefined);

  return (
    <header className={`top${scrolled ? " scrolled" : ""}${open ? " open" : ""}`}>
      <div className="wide top-inner">
        <Link href="/" className="brand">
          <Logo size={30} />
          <span>Catalyst</span>
          <small>Client</small>
        </Link>
        <nav className="top-nav" aria-label="Site">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} aria-current={current(link.match)}>
              {link.label}
            </Link>
          ))}
        </nav>
        <DownloadButton className="top-cta" size="small" compact />
        <button
          type="button"
          className="menu-button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
        </button>
      </div>
      <div className="mobile-sheet" id="mobile-menu">
        <div className="wide">
          <nav aria-label="Site">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} aria-current={current(link.match)}>
                {link.label}
                <span aria-hidden="true">›</span>
              </Link>
            ))}
            <Link href="/download">
              Download
              <span aria-hidden="true">›</span>
            </Link>
          </nav>
        </div>
      </div>
      <motion.div className="scroll-meter" style={{ scaleX: meter }} aria-hidden="true" />
    </header>
  );
}
