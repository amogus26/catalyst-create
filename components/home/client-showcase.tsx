"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotionAfterMount } from "@/components/site/motion";
import styles from "@/app/home.module.css";
import { CLIENT_MODULES, MODULE_CATEGORIES } from "@/lib/catalyst";

const CATEGORY_COLOUR: Record<string, string> = {
  HUD: "#4FA8E8",
  Visual: "#B36BFF",
  PvP: "#EC7580",
  World: "#5FBF87",
  Misc: "#F0B429",
};

/** Where the video's frames are: the module menu scrolling from Damage Numbers down to Shulker Preview. */
const VIDEO = "/video/modules.mp4";
const POSTER = "/video/modules-poster.webp";

/**
 * The Right Shift menu, filmed scrolling through every module. On a wide screen the video is pinned
 * and the page's scroll drives it - scroll down and the menu scrolls down, scroll back and it goes
 * back. On a phone it simply plays on a loop; with reduced motion it stays still and has controls.
 */
export function ModuleVideo() {
  const outer = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotionAfterMount();
  const [mode, setMode] = useState<"scrub" | "loop" | "still">("still");

  useEffect(() => {
    if (reduced) return setMode("still");
    const query = window.matchMedia("(min-width: 901px)");
    const update = () => setMode(query.matches ? "scrub" : "loop");
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [reduced]);

  // Scrub: the pinned stretch of page maps onto the video, start to end.
  useEffect(() => {
    const el = outer.current;
    const v = video.current;
    if (mode !== "scrub" || !el || !v) return;
    v.pause();
    let frame = 0;
    const seek = () => {
      frame = 0;
      if (!v.duration) return;
      const rect = el.getBoundingClientRect();
      const travel = el.offsetHeight - window.innerHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / travel));
      v.currentTime = progress * (v.duration - 0.05);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(seek);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    v.addEventListener("loadedmetadata", seek);
    seek();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      v.removeEventListener("loadedmetadata", seek);
    };
  }, [mode]);

  useEffect(() => {
    const v = video.current;
    if (mode === "loop" && v) v.play().catch(() => {});
  }, [mode]);

  return (
    <div ref={outer} className={mode === "scrub" ? styles.videoPin : styles.videoPlain}>
      <div className={styles.videoSticky}>
        <div className={styles.videoStage}>
          <div className={styles.ambient} data-on="true" style={{ backgroundImage: `url(${POSTER})` }} aria-hidden="true" />
          <video
            ref={video}
            className={styles.video}
            src={VIDEO}
            poster={POSTER}
            muted
            playsInline
            loop={mode === "loop"}
            preload={mode === "scrub" ? "auto" : "metadata"}
            controls={mode === "still"}
            aria-label={`The Right Shift menu scrolling through all ${CLIENT_MODULES.length} modules - Damage Numbers, CPS, FPS, Zoom, Minimap, Custom Sky and the rest`}
          />
        </div>
        {mode === "scrub" && <p className={styles.videoHint}>Keep scrolling - that&apos;s every module</p>}
      </div>
    </div>
  );
}

/**
 * Every module's name, in rows that drift sideways - one row per couple of categories, in the
 * category's colour. Hovering a row pauses it; with reduced motion the rows stand still and wrap.
 */
export function ModuleMarquee() {
  const rows = [
    CLIENT_MODULES.filter((m) => m.category === "HUD" || m.category === "PvP"),
    CLIENT_MODULES.filter((m) => m.category === "World" || m.category === "Visual"),
    CLIENT_MODULES.filter((m) => m.category === "Misc"),
  ];
  return (
    <div className={styles.marquee} aria-label={`All ${CLIENT_MODULES.length} modules`}>
      {rows.map((row, r) => (
        <div key={r} className={styles.marqueeRow} data-reverse={r % 2 === 1}>
          <ul className={styles.marqueeTrack}>
            {[...row, ...row].map((module, i) => (
              <li key={`${module.name}-${i}`} aria-hidden={i >= row.length} title={module.description}>
                <i style={{ background: CATEGORY_COLOUR[module.category] }} />
                {module.name}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className={styles.legend}>
        {MODULE_CATEGORIES.map((category) => (
          <span key={category}>
            <i style={{ background: CATEGORY_COLOUR[category] }} />
            {category} {CLIENT_MODULES.filter((m) => m.category === category).length}
          </span>
        ))}
      </p>
    </div>
  );
}
