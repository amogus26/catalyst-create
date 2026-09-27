"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DOWNLOAD_URLS } from "@/lib/catalyst";

export type Os = "macos" | "windows" | "other";

/** Which computer this is, from the browser - "other" for phones, Linux and anything unsure. */
export function detectOs(): Os {
  if (typeof navigator === "undefined") return "other";
  const nav = navigator as Navigator & { userAgentData?: { platform?: string; mobile?: boolean } };
  if (nav.userAgentData?.mobile) return "other";
  const platform = (nav.userAgentData?.platform || nav.platform || "").toLowerCase();
  const agent = nav.userAgent.toLowerCase();
  if (/iphone|ipad|ipod|android/.test(agent)) return "other";
  if (platform.includes("mac") || agent.includes("mac os")) return "macos";
  if (platform.includes("win") || agent.includes("windows")) return "windows";
  return "other";
}

/** The OS once the page has hydrated - "other" during the server render, so nothing mismatches. */
export function useOs(): Os {
  const [os, setOs] = useState<Os>("other");
  useEffect(() => setOs(detectOs()), []);
  return os;
}

export const OS_LABEL: Record<Os, string> = { macos: "macOS", windows: "Windows", other: "Windows or macOS" };

/**
 * "Download for Windows & macOS". Every download button goes through here: straight to the installer
 * for this computer once [DOWNLOAD_URLS] has one, and to the Download page (which says what is and
 * isn't out yet) until then.
 */
export function DownloadButton({
  className = "",
  size = "big",
  compact = false,
}: {
  className?: string;
  size?: "big" | "small" | "normal";
  compact?: boolean;
}) {
  const os = useOs();
  const direct = os === "other" ? null : DOWNLOAD_URLS[os];
  // Named for both: Catalyst is for Windows and macOS alike, whichever this page is read on.
  const label = compact ? "Download" : "Download for Windows & macOS";
  const classes = `btn primary ${size === "normal" ? "" : size} ${className}`.trim();
  const icon = (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3v12m0 0-5-5m5 5 5-5M4 19h16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (direct) {
    return (
      <a className={classes} href={direct}>
        {icon}
        {label}
      </a>
    );
  }
  return (
    <Link className={classes} href={os === "other" ? "/download" : `/download#${os}`}>
      {icon}
      {label}
    </Link>
  );
}
