"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/battle-pass/pass.module.css";
import { CapeArt, WingsArt } from "@/components/site/cosmetic-art";
import { CoinMark } from "@/components/site/coin-mark";
import { PixelSprite } from "@/components/site/pixel-sprite";
import { ArrowIcon } from "@/components/site/icons";
import { PASS_TIERS, levelCost, type PassReward } from "@/lib/catalyst";

function Reward({ reward, level }: { reward: PassReward | null; level: number }) {
  if (!reward) {
    return (
      <span className={styles.empty}>
        <span className="visually-hidden">No reward</span>
      </span>
    );
  }
  switch (reward.kind) {
    case "coins":
      return (
        <span className={styles.coins}>
          <CoinMark size={18} />
          {reward.amount}
        </span>
      );
    case "cape":
      return (
        <span className={styles.item} title={reward.name}>
          <CapeArt colors={reward.colors} id={`tier-${level}`} />
          <em>{reward.name}</em>
        </span>
      );
    case "wings":
      return (
        <span className={styles.item} title={reward.name}>
          {reward.picture ? (
            // eslint-disable-next-line @next/next/no-img-element -- the wings' own render
            <img src={reward.picture} alt="" width={560} height={560} loading="lazy" decoding="async" />
          ) : (
            <WingsArt colors={reward.colors} id={`tier-${level}`} />
          )}
          <em>{reward.name}</em>
        </span>
      );
    case "choice":
      return (
        <span className={styles.item} title={`${reward.name}: ${reward.options.join(" or ")}`}>
          <span className={styles.choice}>
            {reward.options.map((option) => (
              <PixelSprite key={option} name={option} size={34} />
            ))}
          </span>
          <em>{reward.options.join(" or ")}</em>
        </span>
      );
  }
}

function Tier({ tier }: { tier: (typeof PASS_TIERS)[number] }) {
  const milestone = tier.level % 5 === 0;
  return (
    <li className={`${styles.tier} ${milestone ? styles.milestone : ""} ${tier.level === 50 ? styles.finale : ""}`}>
      <span className={styles.level}>
        <b>{tier.level}</b>
        <small>{levelCost(tier.level)} XP</small>
      </span>
      <span className={styles.lane} data-lane="free">
        <Reward reward={tier.free} level={tier.level} />
      </span>
      <span className={styles.lane} data-lane="pass">
        <Reward reward={tier.premium} level={tier.level} />
      </span>
    </li>
  );
}

/**
 * Every level of the season on one row that scrolls sideways - swipe, shift-scroll, or the arrows,
 * which move it about a screen at a time. It sits in the page like anything else, so what comes next
 * stays in view.
 */
export function PassTrack() {
  const scroller = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const page = (direction: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className={styles.trackWrap} data-start={edge.start} data-end={edge.end}>
      <div className={`wide ${styles.trackBar}`}>
        <span className={styles.laneKey}>
          <i data-lane="free" /> Free
          <i data-lane="pass" /> Pass
        </span>
        <span className={styles.arrows}>
          <button type="button" onClick={() => page(-1)} disabled={edge.start} aria-label="Earlier levels">
            <ArrowIcon size={18} />
          </button>
          <button type="button" onClick={() => page(1)} disabled={edge.end} aria-label="Later levels">
            <ArrowIcon size={18} />
          </button>
        </span>
      </div>
      <div ref={scroller} className={styles.trackScroll}>
        <ol className={styles.track} aria-label="Battle pass levels">
          {PASS_TIERS.map((tier) => (
            <Tier key={tier.level} tier={tier} />
          ))}
        </ol>
      </div>
    </div>
  );
}
