"use client";

import Image, { type StaticImageData } from "next/image";
import { useState } from "react";
import styles from "@/app/home.module.css";
import { SHOT_QUALITY, ScreenshotZoom, ZoomHit, type Shot } from "./screenshot-zoom";
import { CLIENT_MODULES, MODULE_CATEGORIES } from "@/lib/catalyst";

const CATEGORY_COLOUR: Record<string, string> = {
  HUD: "#4FA8E8",
  Visual: "#B36BFF",
  PvP: "#EC7580",
  World: "#5FBF87",
  Misc: "#F0B429",
};

/**
 * The client in three screenshots - the title screen, the Right Shift menu and the HUD editor - one at
 * a time and big enough to read, on a blur of itself. The tabs switch between them.
 */
export function ClientViews({ shots }: { shots: { image: StaticImageData; alt: string; label: string }[] }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<Shot | null>(null);
  return (
    <div className={styles.views}>
      <div className={styles.viewTabs} role="tablist" aria-label="The client">
        {shots.map((shot, i) => (
          <button
            key={shot.label}
            type="button"
            role="tab"
            id={`client-tab-${i}`}
            aria-selected={i === index}
            aria-controls="client-view"
            className={i === index ? styles.pillOn : styles.pill}
            onClick={() => setIndex(i)}
          >
            {shot.label}
          </button>
        ))}
      </div>
      <div className={styles.viewStage} id="client-view" role="tabpanel" aria-labelledby={`client-tab-${index}`}>
        {shots.map((shot, i) => (
          <div
            key={shot.label}
            className={styles.ambient}
            data-on={i === index}
            style={{ backgroundImage: `url(${shot.image.blurDataURL})` }}
            aria-hidden="true"
          />
        ))}
        <div className={styles.viewFrame} style={{ aspectRatio: `${shots[index].image.width} / ${shots[index].image.height}` }}>
          {shots.map((shot, i) => (
            <Image
              key={shot.label}
              src={shot.image}
              alt={i === index ? shot.alt : ""}
              aria-hidden={i !== index}
              data-on={i === index}
              sizes="(min-width: 901px) 72rem, 100vw"
              quality={SHOT_QUALITY}
              placeholder="blur"
            />
          ))}
          <ZoomHit label={shots[index].alt} onOpen={() => setZoom(shots[index])} />
        </div>
      </div>
      <ScreenshotZoom shot={zoom} onClose={() => setZoom(null)} />
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
