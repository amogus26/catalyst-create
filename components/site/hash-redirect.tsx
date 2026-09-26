"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** The sections that were on the home page before it became the Catalyst site. */
const DESIGN_SECTIONS = new Set(["#vote", "#gallery", "#submit", "#showcase"]);

/**
 * Old links like `/#vote` pointed at sections of the Designs page when it was the home page. A
 * #fragment never reaches the server, so the home page sends them on itself: `/#vote` becomes
 * `/designs#vote` before anything else happens.
 */
export function HashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const hash = window.location.hash;
    if (DESIGN_SECTIONS.has(hash)) router.replace(`/designs${hash === "#showcase" ? "#gallery" : hash}`);
  }, [router]);
  return null;
}
