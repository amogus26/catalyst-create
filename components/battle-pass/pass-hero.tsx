"use client";

import dynamic from "next/dynamic";
import { DeferredScene } from "@/components/site/deferred-scene";
import { RARITY, SEASON } from "@/lib/catalyst";
import styles from "@/app/battle-pass/pass.module.css";

function Poster() {
  return (
    <div className={styles.poster} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- the wings' own render, served as it is */}
      <img src={SEASON.headlinePicture} alt="" width={560} height={560} decoding="async" />
    </div>
  );
}

const ViewerScene = dynamic(() => import("@/components/three/viewer-scene"), { ssr: false, loading: () => <Poster /> });

/** The season's headline reward, worn: the Emberfall Wings on our player, turned by hand. */
export function PassHero() {
  return (
    <div className={styles.stage}>
      <DeferredScene poster={<Poster />}>
        <ViewerScene
          className={styles.canvas}
          item={{ id: "emberfall-wings", kind: "wings", colors: [...SEASON.headlineColors], model: SEASON.headlineModel, glow: RARITY.legendary.color }}
          fallback={<Poster />}
        />
      </DeferredScene>
    </div>
  );
}
