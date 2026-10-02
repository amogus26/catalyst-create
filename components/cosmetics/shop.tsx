"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import styles from "@/app/cosmetics/cosmetics.module.css";
import { CapeArt, WingsArt } from "@/components/site/cosmetic-art";
import { DeferredScene } from "@/components/site/deferred-scene";
import { RARITY, SHOP_ITEMS, salePrice, type ShopItem } from "@/lib/catalyst";
import { CoinMark } from "@/components/site/coin-mark";

type Filter = "all" | "wings" | "gauntlet" | "cape";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "wings", label: "Wings" },
  { id: "gauntlet", label: "Gauntlets" },
  { id: "cape", label: "Capes" },
];

const KIND_LABEL: Record<ShopItem["kind"], string> = { wings: "wings", gauntlet: "gauntlet", cape: "cape" };

/** An item's picture: its model's rendered still, or - for capes, drawn from their colours - the cape. */
function Art({ item, id }: { item: ShopItem; id: string }) {
  if (item.picture) {
    // eslint-disable-next-line @next/next/no-img-element -- a small transparent still, served as it is
    return <img src={item.picture} alt="" width={560} height={560} loading="lazy" decoding="async" draggable={false} />;
  }
  return item.kind === "wings" ? <WingsArt colors={item.colors} id={id} /> : <CapeArt colors={item.colors} id={id} />;
}

/** The viewer's stand-in while the 3D loads, or without WebGL: the item's own art, big. */
function ViewerPoster({ item }: { item: ShopItem }) {
  return (
    <div className={styles.viewerPoster} aria-hidden="true">
      <Art item={item} id={`poster-${item.id}`} />
    </div>
  );
}

const ViewerScene = dynamic(() => import("@/components/three/viewer-scene"), { ssr: false });

export function Price({ item, big = false }: { item: ShopItem; big?: boolean }) {
  const now = salePrice(item);
  if (now === null) return <span className={styles.noPrice}>Price not out yet</span>;
  return (
    <span className={`coin-price ${big ? styles.priceBig : ""}`}>
      <CoinMark size={big ? 20 : 15} />
      {now.toLocaleString("en-US")}
      {now !== item.price && <s>{item.price!.toLocaleString("en-US")}</s>}
    </span>
  );
}

/**
 * The store: the picked item on a wide banner in its rarity's light, worn in 3D, and every item below
 * on a clean grid - pick one and the banner wears it. Buying happens in the launcher; the button says
 * so.
 */
export function CosmeticsShop() {
  const [filter, setFilter] = useState<Filter>("all");
  const [picked, setPicked] = useState<ShopItem>(SHOP_ITEMS[0]);
  const items = SHOP_ITEMS.filter((item) => filter === "all" || item.kind === filter);
  const rarity = RARITY[picked.rarity];

  function pick(item: ShopItem) {
    setPicked(item);
    // On a phone the banner is off screen by now: bring it back so the pick is seen.
    const banner = document.getElementById("store-banner");
    if (banner && banner.getBoundingClientRect().bottom < 80) banner.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={styles.store}>
      <div id="store-banner" className={styles.banner} style={{ ["--glow" as string]: rarity.color }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={picked.id}
            className={styles.bannerInfo}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.3 }}
          >
            <span className={styles.bannerTag} style={{ color: rarity.color }}>
              {picked.tag?.kind === "deal" ? `${picked.tag.percentOff}% off · ` : picked.tag?.kind === "new" ? "New · " : ""}
              {rarity.label} {KIND_LABEL[picked.kind]}
            </span>
            <h2>{picked.name}</h2>
            <p className={styles.lore}>&ldquo;{picked.lore}&rdquo;</p>
            <Price item={picked} big />
            <div className={styles.bannerActions}>
              <Link className="btn primary" href="/download">
                Get it in the launcher
              </Link>
              <span className={styles.where}>Store → Cosmetics, with coins</span>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className={styles.viewer} aria-label="3D preview" role="img">
          <DeferredScene poster={<ViewerPoster item={picked} />}>
            <ViewerScene
              className={styles.viewerCanvas}
              item={{ id: picked.id, kind: picked.kind, colors: picked.colors, model: picked.model, glow: rarity.color }}
              fallback={<ViewerPoster item={picked} />}
            />
          </DeferredScene>
          <span className={styles.dragHint} aria-hidden="true">
            Drag to turn
          </span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="Show">
          {FILTERS.map((f) => {
            const count = SHOP_ITEMS.filter((item) => f.id === "all" || item.kind === f.id).length;
            return (
              <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
                <span>{count}</span>
              </button>
            );
          })}
        </div>
        <span className={styles.toolbarNote}>Prices in coins · pick one to try it on</span>
      </div>

      <motion.ul layout className={styles.grid}>
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const r = RARITY[item.rarity];
            const on = item.id === picked.id;
            return (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  type="button"
                  className={`${styles.card} ${on ? styles.cardOn : ""}`}
                  style={{ ["--rarity" as string]: r.color }}
                  aria-pressed={on}
                  onClick={() => pick(item)}
                >
                  <span className={styles.cardArt}>
                    <Art item={item} id={`card-${item.id}`} />
                    {item.tag?.kind === "new" && <span className={styles.badge}>New</span>}
                    {item.tag?.kind === "deal" && <span className={`${styles.badge} ${styles.badgeDeal}`}>-{item.tag.percentOff}%</span>}
                  </span>
                  <span className={styles.cardBody}>
                    <b>{item.name}</b>
                    <span className={styles.cardRarity}>{r.label}</span>
                    <Price item={item} />
                  </span>
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
