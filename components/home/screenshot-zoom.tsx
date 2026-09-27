"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef } from "react";
import styles from "@/app/home.module.css";

export type Shot = { image: StaticImageData; alt: string };

/**
 * A screenshot at full size, over a blur of the page - opened by clicking one. On a Retina screen it
 * shows at the app's real size, one screenshot pixel to one screen pixel; Escape or a click outside
 * closes it.
 */
export function ScreenshotZoom({ shot, onClose }: { shot: Shot | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (shot && dialog && !dialog.open) dialog.showModal();
  }, [shot]);
  if (!shot) return null;
  return (
    <dialog
      ref={ref}
      className={styles.zoom}
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && ref.current?.close()}
      aria-label={shot.alt}
    >
      <Image src={shot.image} alt={shot.alt} unoptimized />
      <button type="button" className={styles.zoomClose} onClick={() => ref.current?.close()} aria-label="Close">
        ×
      </button>
    </dialog>
  );
}

/** The see-through button over a screenshot that opens it big. */
export function ZoomHit({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button type="button" className={styles.zoomHit} onClick={onOpen} aria-label={`Enlarge: ${label}`}>
      <span aria-hidden="true">Click to enlarge</span>
    </button>
  );
}
