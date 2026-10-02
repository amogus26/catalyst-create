"use client";

import dynamic from "next/dynamic";
import { DeferredScene } from "@/components/site/deferred-scene";
import styles from "@/app/home.module.css";

/** The still the 3D picture is captured as - shown while it loads, and instead of it without WebGL. */
function Poster() {
  return (
    <div className={styles.ctaPoster} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/stills/cta-stoneheart.webp" alt="" width={1000} height={1000} loading="lazy" decoding="async" />
    </div>
  );
}

const CtaScene = dynamic(() => import("@/components/three/cta-scene"), { ssr: false, loading: () => <Poster /> });

/** The home page's last picture, live: the Stoneheart set on an everyday player. */
export function CtaStage() {
  return (
    <div className={styles.ctaStage}>
      <DeferredScene poster={<Poster />}>
        <CtaScene className={styles.ctaScene} fallback={<Poster />} />
      </DeferredScene>
    </div>
  );
}
