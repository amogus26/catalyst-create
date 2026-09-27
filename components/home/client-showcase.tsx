"use client";

import Image, { type StaticImageData } from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { useReducedMotionAfterMount } from "@/components/site/motion";
import { useRef } from "react";
import styles from "@/app/home.module.css";
import { SHOT_QUALITY } from "./tour";
import { CLIENT_MODULES, MODULE_CATEGORIES } from "@/lib/catalyst";

const CATEGORY_COLOUR: Record<string, string> = {
  HUD: "#4FA8E8",
  Visual: "#B36BFF",
  PvP: "#EC7580",
  World: "#5FBF87",
  Misc: "#F0B429",
};

/**
 * The client in three screenshots - the title screen, the Right Shift menu and the HUD editor - that
 * fan out from a stack as the section scrolls into view.
 */
export function ClientFan({ shots }: { shots: { image: StaticImageData; alt: string; label: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  // With reduced motion the three are simply laid out fanned, and stay so.
  const reduced = useReducedMotionAfterMount();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const spread = useTransform(scrollYProgress, [0, 1], reduced ? [1, 1] : [0, 1]);
  const left = { x: useTransform(spread, [0, 1], ["0%", "-34%"]), rotate: useTransform(spread, [0, 1], [0, -7]), y: useTransform(spread, [0, 1], ["4%", "10%"]) };
  const right = { x: useTransform(spread, [0, 1], ["0%", "34%"]), rotate: useTransform(spread, [0, 1], [0, 7]), y: useTransform(spread, [0, 1], ["4%", "10%"]) };
  const poses = [left, { x: "0%", rotate: 0, y: "0%" }, right];
  return (
    <div ref={ref} className={styles.fan}>
      {shots.map((shot, i) => (
        <motion.figure key={shot.label} className={styles.fanCard} style={poses[i]} data-pos={i}>
          <Image src={shot.image} alt={shot.alt} sizes="(min-width: 900px) 46vw, 90vw" quality={SHOT_QUALITY} placeholder="blur" />
          <figcaption>{shot.label}</figcaption>
        </motion.figure>
      ))}
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
