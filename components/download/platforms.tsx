"use client";

import styles from "@/app/download/download.module.css";
import { useOs, type Os } from "@/components/site/download-button";
import { AppleIcon, DownloadIcon, WindowsIcon } from "@/components/site/icons";
import { DOWNLOAD_URLS } from "@/lib/catalyst";

const PLATFORMS: { os: Exclude<Os, "other">; name: string; icon: React.ReactNode; file: string }[] = [
  { os: "windows", name: "Windows", icon: <WindowsIcon size={34} />, file: "Installer (.msi)" },
  { os: "macos", name: "macOS", icon: <AppleIcon size={34} />, file: "Disk image (.dmg)" },
];

/**
 * One card per computer, the reader's own first and lit. Each links straight to its installer once
 * [DOWNLOAD_URLS] has one; until then it says plainly that the first build isn't out.
 */
export function Platforms() {
  const os = useOs();
  const ordered = os === "macos" ? [...PLATFORMS].reverse() : PLATFORMS;
  return (
    <div className={styles.platforms}>
      {ordered.map((p) => {
        const url = DOWNLOAD_URLS[p.os];
        const mine = p.os === os;
        return (
          <article key={p.os} id={p.os} className={`${styles.platform} ${mine ? styles.mine : ""}`}>
            {mine && <span className={styles.yours}>Your computer</span>}
            <span className={styles.platformIcon}>{p.icon}</span>
            <h2>Catalyst for {p.name}</h2>
            <p className={styles.file}>{p.file}</p>
            {url ? (
              <a className="btn primary big" href={url}>
                <DownloadIcon size={18} />
                Download
              </a>
            ) : (
              <span className={styles.notYet} aria-disabled="true">
                Not out yet
              </span>
            )}
          </article>
        );
      })}
    </div>
  );
}
