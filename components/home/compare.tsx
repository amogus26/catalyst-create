"use client";

import Image, { type StaticImageData } from "next/image";
import { animate, useInView } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useReducedMotionAfterMount } from "@/components/site/motion";
import styles from "@/app/home.module.css";

type Shot = { image: StaticImageData; alt: string; label: string; accent?: boolean };

/**
 * Two screenshots of the same moment, one over the other, and a line to drag between them: [left] shows
 * on the left of the line, [right] on the right. Drag anywhere on the picture (a
 * vertical swipe still scrolls the page), or focus the handle and use the arrow keys. The first time it
 * is seen it sweeps once each way, so it is plain there is something to drag - unless the reader asked
 * for less motion, or has already taken hold of it.
 */
export function Compare({ left, right }: { left: Shot; right: Shot }) {
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const touched = useRef(false);
  const [split, setSplit] = useState(50);
  const inView = useInView(frame, { once: true, amount: 0.6 });
  const reduced = useReducedMotionAfterMount();

  useEffect(() => {
    if (!inView || reduced || touched.current) return;
    const sweep = animate(50, [50, 70, 32, 50], {
      duration: 2.6,
      delay: 0.3,
      ease: "easeInOut",
      onUpdate: (value) => {
        if (!touched.current) setSplit(value);
      },
    });
    return () => sweep.stop();
  }, [inView, reduced]);

  function moveTo(clientX: number) {
    const box = frame.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    setSplit(Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100)));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    touched.current = true;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    moveTo(event.clientX);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 2;
    const next: Record<string, number> = {
      ArrowLeft: split - step,
      ArrowDown: split - step,
      ArrowRight: split + step,
      ArrowUp: split + step,
      PageDown: split - 10,
      PageUp: split + 10,
      Home: 0,
      End: 100,
    };
    if (!(event.key in next)) return;
    event.preventDefault();
    touched.current = true;
    setSplit(Math.min(100, Math.max(0, next[event.key])));
  }

  const shown = Math.round(split);
  return (
    <div
      ref={frame}
      className={styles.compare}
      style={{ ["--split" as string]: `${split}%` }}
      onPointerDown={onPointerDown}
      onPointerMove={(event) => dragging.current && moveTo(event.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <Image className={styles.compareImage} src={right.image} alt={right.alt} sizes="(max-width: 1280px) 100vw, 1240px" unoptimized draggable={false} />
      <div className={styles.compareLeft} aria-hidden={shown === 0 ? true : undefined}>
        <Image className={styles.compareImage} src={left.image} alt={left.alt} sizes="(max-width: 1280px) 100vw, 1240px" unoptimized draggable={false} />
      </div>
      <span className={styles.compareLabel} data-side="left" data-accent={left.accent} data-hidden={split < 16}>
        {left.label}
      </span>
      <span className={styles.compareLabel} data-side="right" data-accent={right.accent} data-hidden={split > 84}>
        {right.label}
      </span>
      <div
        className={styles.compareHandle}
        role="slider"
        tabIndex={0}
        aria-label={`${left.label} or ${right.label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown}
        aria-valuetext={`${shown}% ${left.label}, ${100 - shown}% ${right.label}`}
        onKeyDown={onKeyDown}
      >
        <span aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
          </svg>
        </span>
      </div>
    </div>
  );
}
