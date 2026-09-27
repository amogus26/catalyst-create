"use client";

import Image, { type StaticImageData } from "next/image";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import styles from "@/app/home.module.css";
import { SHOT_QUALITY, ScreenshotZoom, ZoomHit, type Shot } from "./screenshot-zoom";

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
 * A tour of the real app, one screen at a time. On a wide screen the window stays pinned while the
 * page scrolls past it: each stretch of scroll is one chapter, the words change beside it and the
 * screenshot changes inside it, and the pills (or the keyboard) jump straight to a chapter. On a
 * phone, or with reduced motion, the chapters are simply listed one under another.
 */
export function Tour({ id, chapters, label }: { id: string; chapters: Chapter[]; label: string }) {
  const reduced = useReducedMotion();
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 901px)");
    const update = () => setPinned(query.matches && !reduced);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [reduced]);
  return pinned ? <PinnedTour id={id} chapters={chapters} label={label} /> : <ListedTour id={id} chapters={chapters} />;
}

function PinnedTour({ id, chapters, label }: { id: string; chapters: Chapter[]; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<Shot | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setIndex(Math.min(chapters.length - 1, Math.max(0, Math.floor(value * chapters.length))));
  });
  // The window rises into place as it arrives. Flat on purpose: anything in a 3D transform is drawn
  // soft, and these are screenshots people read.
  const lift = useTransform(scrollYProgress, [0, 0.12], [60, 0]);
  const fill = useTransform(scrollYProgress, [0, 1], [0, 1]);

  function go(i: number) {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const step = (el.offsetHeight - window.innerHeight) / chapters.length;
    window.scrollTo({ top: top + step * i + step * 0.5, behavior: "smooth" });
  }

  const chapter = chapters[index];
  return (
    <div ref={ref} id={id} className={styles.tour} style={{ height: `${chapters.length * 85 + 100}vh` }}>
      <div className={styles.tourSticky}>
        <div className={`${styles.tourWide} ${styles.tourGrid}`}>
          <div className={styles.tourCopy}>
            <AnimatePresence mode="wait">
              <motion.div
                key={chapter.key}
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                className={styles.tourText}
              >
                <span className="kicker">{chapter.kicker}</span>
                <h3 className="headline">{chapter.title}</h3>
                <p className="lede">{chapter.text}</p>
                <ul className={styles.tourPoints}>
                  {chapter.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
            <div className={styles.tourNav} role="tablist" aria-label={label}>
              {chapters.map((c, i) => (
                <button
                  key={c.key}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  className={i === index ? styles.pillOn : styles.pill}
                  onClick={() => go(i)}
                >
                  {c.kicker}
                </button>
              ))}
            </div>
            <div className={styles.tourMeter} aria-hidden="true">
              <motion.span style={{ scaleX: fill }} />
            </div>
          </div>
          <motion.div className={styles.window} style={{ y: lift }}>
            {/* The screenshot itself, blurred, as the light behind it - from the tiny blur placeholder,
                so it costs nothing to load. */}
            {chapters.map((c, i) => (
              <div
                key={c.key}
                className={styles.ambient}
                data-on={i === index}
                style={{ backgroundImage: `url(${c.image.blurDataURL})` }}
                aria-hidden="true"
              />
            ))}
            <div className={styles.windowFrame}>
              {chapters.map((c, i) => (
                <motion.div
                  key={c.key}
                  className={styles.windowShot}
                  initial={false}
                  animate={{ opacity: i === index ? 1 : 0, scale: i === index ? 1 : 1.035 }}
                  transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                  aria-hidden={i !== index}
                >
                  <Image src={c.image} alt={c.alt} sizes="(min-width: 901px) 72vw, 100vw" quality={SHOT_QUALITY} placeholder="blur" />
                </motion.div>
              ))}
              <ZoomHit label={chapter.alt} onOpen={() => setZoom(chapter)} />
            </div>
          </motion.div>
          <ScreenshotZoom shot={zoom} onClose={() => setZoom(null)} />
        </div>
      </div>
    </div>
  );
}

function ListedTour({ id, chapters }: { id: string; chapters: Chapter[] }) {
  const [zoom, setZoom] = useState<Shot | null>(null);
  return (
    <div id={id} className={`wide ${styles.tourList}`}>
      {chapters.map((c) => (
        <article key={c.key} className={styles.tourItem}>
          <div className={styles.tourText}>
            <span className="kicker">{c.kicker}</span>
            <h3 className="headline">{c.title}</h3>
            <p className="lede">{c.text}</p>
            <ul className={styles.tourPoints}>
              {c.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          <div className={styles.windowFrame}>
            <Image src={c.image} alt={c.alt} sizes="100vw" quality={SHOT_QUALITY} placeholder="blur" />
            <ZoomHit label={c.alt} onOpen={() => setZoom(c)} />
          </div>
        </article>
      ))}
      <ScreenshotZoom shot={zoom} onClose={() => setZoom(null)} />
    </div>
  );
}
