"use client";

import dynamic from "next/dynamic";
import { DeferredScene } from "@/components/site/deferred-scene";
import styles from "@/app/home.module.css";

/** The still the 3D hero is captured as - shown while it loads, and instead of it without WebGL. */
function Poster() {
  return (
    <div className={styles.poster} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/stills/hero.webp" alt="" width={1094} height={1246} decoding="async" />
    </div>
  );
}

const HeroScene = dynamic(() => import("@/components/three/hero-scene"), { ssr: false, loading: () => <Poster /> });

export function HeroStage() {
  return (
    <div className={styles.stageWrap}>
      <DeferredScene poster={<Poster />}>
        <HeroScene className={styles.scene} fallback={<Poster />} />
      </DeferredScene>
      <span className={`${styles.floatTag} ${styles.tagWings}`}>
        <b>Void Butterfly Wings</b>
        <em>Hatched where the End begins.</em>
      </span>
    </div>
  );
}
