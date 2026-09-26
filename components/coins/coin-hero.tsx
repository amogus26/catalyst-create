"use client";

import dynamic from "next/dynamic";
import { DeferredScene } from "@/components/site/deferred-scene";
import { CoinMark } from "@/components/site/coin-mark";
import styles from "@/app/coins/coins.module.css";

function Poster() {
  return (
    <div className={styles.poster} aria-hidden="true">
      <CoinMark size={220} />
    </div>
  );
}

const CoinScene = dynamic(() => import("@/components/three/coin-scene"), { ssr: false, loading: () => <Poster /> });

export function CoinHero() {
  return (
    <div className={styles.coinStage}>
      <DeferredScene poster={<Poster />}>
        <CoinScene className={styles.coinCanvas} fallback={<Poster />} />
      </DeferredScene>
    </div>
  );
}
