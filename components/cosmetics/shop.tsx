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

type Filter = "all" | "wings" | "cape";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "wings", label: "Wings" },
  { id: "cape", label: "Capes" },
];

function Art({ item, id }: { item: ShopItem; id: string }) {
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
 * The shop, the way the launcher's Cosmetics tab lays it out: a filter, the items as cards in their
 * rarity's light, and - here - a 3D viewer that wears whichever card is picked. Buying happens in the
 * launcher; the button says so.
 */
export function CosmeticsShop() {
  const [filter, setFilter] = useState<Filter>("all");
  const [picked, setPicked] = useState<ShopItem>(SHOP_ITEMS[0]);
  const items = SHOP_ITEMS.filter((item) => filter === "all" || item.kind === filter);
  const rarity = RARITY[picked.rarity];
  return (
    <div className={styles.shop}>
      <aside className={styles.viewerCol} aria-label="3D preview">
        <div className={styles.viewer} style={{ ["--glow" as string]: rarity.color }}>
          <DeferredScene poster={<ViewerPoster item={picked} />}>
            <ViewerScene
              className={styles.viewerCanvas}
              item={{ id: picked.id, kind: picked.kind, colors: picked.colors, glow: rarity.color }}
              fallback={<ViewerPoster item={picked} />}
            />
          </DeferredScene>
          <span className={styles.dragHint} aria-hidden="true">
            Drag to turn
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={picked.id}
            className={`panel ${styles.detail}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.detailHead}>
              <div>
                <span className="tag" style={{ color: rarity.color }}>
                  {rarity.label} {picked.kind === "wings" ? "wings" : "cape"}
                </span>
                <h2>{picked.name}</h2>
              </div>
              <Price item={picked} big />
            </div>
            <p className={styles.lore}>&ldquo;{picked.lore}&rdquo;</p>
            <div className={styles.detailActions}>
              <Link className="btn primary" href="/download">
                Get it in the launcher
              </Link>
              <span className={styles.where}>Store → Cosmetics, with coins</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </aside>

      <div className={styles.gridCol}>
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
        <motion.ul layout className={styles.grid}>
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const r = RARITY[item.rarity];
              const on = item.id === picked.id;
              return (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.3 }}
                >
                  <button
                    type="button"
                    className={`${styles.card} ${on ? styles.cardOn : ""}`}
                    style={{ ["--rarity" as string]: r.color }}
                    aria-pressed={on}
                    onClick={() => setPicked(item)}
                  >
                    <span className={styles.cardArt}>
                      <Art item={item} id={`card-${item.id}`} />
                    </span>
                    <span className={styles.cardTags}>
                      {item.tag?.kind === "new" && <span className="tag solid" style={{ background: "#37d3c4" }}>New</span>}
                      {item.tag?.kind === "deal" && (
                        <span className="tag solid" style={{ background: "#f0b429" }}>
                          -{item.tag.percentOff}%
                        </span>
                      )}
                      <span className="tag" style={{ color: r.color, marginLeft: "auto" }}>
                        {r.label}
                      </span>
                    </span>
                    <span className={styles.cardBody}>
                      <b>{item.name}</b>
                      <Price item={item} />
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      </div>
    </div>
  );
}
