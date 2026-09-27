"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import styles from "@/app/battle-pass/pass.module.css";
import { CapeArt, WingsArt } from "@/components/site/cosmetic-art";
import { CoinMark } from "@/components/site/coin-mark";
import { PixelSprite } from "@/components/site/pixel-sprite";
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
          <WingsArt colors={reward.colors} id={`tier-${level}`} />
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
 * Every level of the season on one track. On a wide screen the track is pinned and scrolling down
 * slides it sideways, level 1 to 50, with a line of ember light filling behind. On a phone (or with
 * reduced motion) it is an ordinary sideways-scrolling row.
 */
export function PassTrack() {
  const reduced = useReducedMotion();
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 901px)");
    const update = () => setPinned(query.matches && !reduced);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [reduced]);
  return pinned ? <PinnedTrack /> : <ScrollingTrack />;
}

function LaneLabels() {
  return (
    <div className={styles.laneLabels} aria-hidden="true">
      <span />
      <span>Free</span>
      <span>Pass</span>
    </div>
  );
}

function ScrollingTrack() {
  return (
    <div className={styles.trackScroll}>
      <LaneLabels />
      <ol className={styles.track} aria-label="Battle pass levels">
        {PASS_TIERS.map((tier) => (
          <Tier key={tier.level} tier={tier} />
        ))}
      </ol>
    </div>
  );
}

function PinnedTrack() {
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const [distance, setDistance] = useState(0);
  const { scrollYProgress } = useScroll({ target: outer, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  const fill = useTransform(scrollYProgress, [0, 1], [0.02, 1]);
  useEffect(() => {
    const measure = () => {
      const t = track.current;
      if (t) setDistance(Math.max(0, t.scrollWidth - window.innerWidth + 64));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return (
    <div ref={outer} className={styles.pinOuter} style={{ height: `calc(100vh + ${distance}px)` }}>
      <div className={styles.pinSticky}>
        <div className={styles.trackWindow}>
          <LaneLabels />
          <motion.div className={styles.trackLine} style={{ scaleX: fill }} aria-hidden="true" />
          <motion.ol ref={track} className={styles.track} style={{ x }} aria-label="Battle pass levels">
            {PASS_TIERS.map((tier) => (
              <Tier key={tier.level} tier={tier} />
            ))}
          </motion.ol>
        </div>
      </div>
    </div>
  );
}
