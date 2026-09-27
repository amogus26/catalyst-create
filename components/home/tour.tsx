"use client";

import Image, { type StaticImageData } from "next/image";
import { useState } from "react";
import styles from "@/app/home.module.css";
import { Reveal } from "@/components/site/motion";
import { ScreenshotZoom, ZoomHit, type Shot } from "./screenshot-zoom";

export interface Chapter {
  key: string;
  kicker: string;
  title: string;
  text: string;
  points: string[];
  image: StaticImageData;
  alt: string;
}

/**
 * A tour of the real launcher, one page at a time, each screenshot as big as the window allows. The
 * screenshots are drawn by the launcher itself at 2.25x (its WebsiteShotsTest), shown at no more than
 * half their width - pixel-sharp on a Retina screen - and open full size when clicked.
 */
export function Tour({ id, chapters }: { id: string; chapters: Chapter[] }) {
  const [zoom, setZoom] = useState<Shot | null>(null);
  return (
    <div id={id} className={styles.chapters}>
      {chapters.map((c) => (
        <article key={c.key} className={styles.chapter}>
          <Reveal className={`wide ${styles.chapterHead}`}>
            <div>
              <span className="kicker">{c.kicker}</span>
              <h3 className="headline">{c.title}</h3>
            </div>
            <div>
              <p className="lede">{c.text}</p>
              <ul className={styles.tourPoints}>
                {c.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal className={styles.shotWrap} from="scale" amount={0.15}>
            <div className={styles.ambient} data-on="true" style={{ backgroundImage: `url(${c.image.blurDataURL})` }} aria-hidden="true" />
            <div className={styles.windowFrame}>
              <Image src={c.image} alt={c.alt} unoptimized placeholder="blur" />
              <ZoomHit label={c.alt} onOpen={() => setZoom(c)} />
            </div>
          </Reveal>
        </article>
      ))}
      <ScreenshotZoom shot={zoom} onClose={() => setZoom(null)} />
    </div>
  );
}
