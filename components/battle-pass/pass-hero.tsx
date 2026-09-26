"use client";

import dynamic from "next/dynamic";
import { DeferredScene } from "@/components/site/deferred-scene";
import { WingsArt } from "@/components/site/cosmetic-art";
import { RARITY, SEASON } from "@/lib/catalyst";
import styles from "@/app/battle-pass/pass.module.css";

function Poster() {
  return (
    <div className={styles.poster} aria-hidden="true">
      <WingsArt colors={[...SEASON.headlineColors]} id="pass-poster" />
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
          item={{ id: "emberfall-wings", kind: "wings", colors: [...SEASON.headlineColors], glow: RARITY.legendary.color }}
          fallback={<Poster />}
        />
      </DeferredScene>
    </div>
  );
}
