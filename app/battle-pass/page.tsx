import type { Metadata } from "next";
import Link from "next/link";
import { PassHero } from "@/components/battle-pass/pass-hero";
import { PassTrack } from "@/components/battle-pass/track";
import { CoinMark } from "@/components/site/coin-mark";
import { Hall } from "@/components/site/hall";
import { Counter, Reveal, Stagger, StaggerItem, Tilt } from "@/components/site/motion";
import { PixelSprite } from "@/components/site/pixel-sprite";
import {
  FREE_LANE_TOTAL,
  PASS_TIERS,
  PREMIUM_LANE_TOTAL,
  QUESTS,
  QUEST_XP_PER_DAY,
  SEASON,
  SEASON_MAX_XP,
  usd,
} from "@/lib/catalyst";
import styles from "./pass.module.css";

export const metadata: Metadata = {
  title: `Battle pass - Season ${SEASON.number}: ${SEASON.name}`,
  description: `${SEASON.levels} levels of rewards earned through daily quests, ending in the ${SEASON.headline}. ${usd(SEASON.priceCents)} in the Catalyst launcher.`,
};

export default function BattlePassPage() {
  const capes = PASS_TIERS.filter((t) => t.premium?.kind === "cape").length;
  const days = Math.ceil(SEASON_MAX_XP / QUEST_XP_PER_DAY);
  return (
    <>
      <section className={`page-top ${styles.top}`}>
        <Hall souls={26} tint="ember" />
        <div className={`wide ${styles.topGrid}`}>
          <Reveal className="band-head" amount={0}>
            <span className="kicker" style={{ color: "#ffb27a" }}>
              Battle pass · Season {SEASON.number}
            </span>
            <h1 className="display" style={{ fontSize: "clamp(46px, 7vw, 96px)" }}>
              <span className={styles.emberText}>{SEASON.name}.</span>
            </h1>
            <p className="lede">
              {SEASON.levels} levels, earned by playing: daily quests fill the bar, every level pays out, and the last one is
              the {SEASON.headline}.
            </p>
            <div className={styles.buy}>
              <span className={styles.price}>{usd(SEASON.priceCents)}</span>
              <span className={styles.soon} aria-disabled="true">
                Buy in the launcher · soon
              </span>
            </div>
            <ul className={styles.heroFacts}>
              <li>
                <b>
                  <Counter to={SEASON.levels} />
                </b>
                levels
              </li>
              <li>
                <b>
                  <Counter to={capes} />
                </b>
                capes for pass holders
              </li>
              <li>
                <b>
                  <Counter to={FREE_LANE_TOTAL + PREMIUM_LANE_TOTAL} />
                </b>
                coins across both lanes
              </li>
            </ul>
          </Reveal>
          <PassHero />
        </div>
      </section>

      <section className="band tight" aria-labelledby="xp-title">
        <div className="wide">
          <Reveal className="band-head">
            <span className="kicker" style={{ color: "#ffb27a" }}>
              How it levels
            </span>
            <h2 className="headline" id="xp-title">
              Play, and the bar fills.
            </h2>
            <p className="lede">
              XP comes from the day&apos;s quests, which start over at midnight. Levels 1 to {SEASON.earlyLevels} take{" "}
              {SEASON.earlyLevelXp} XP each, the rest {SEASON.lateLevelXp} - {SEASON_MAX_XP.toLocaleString("en-US")} XP in all, so
              about {days} days of full quests reach the end.
            </p>
          </Reveal>
          <Stagger className={styles.quests}>
            {QUESTS.map((quest, i) => (
              <StaggerItem key={quest.title}>
                <Tilt className={`panel ${styles.quest}`}>
                  <span className={styles.questNo}>{String(i + 1).padStart(2, "0")}</span>
                  <b>{quest.title}</b>
                  <span className={styles.xp}>+{quest.xp} XP</span>
                  {i === 1 && <small>Opens once the first hour is claimed</small>}
                </Tilt>
              </StaggerItem>
            ))}
            <StaggerItem>
              <div className={`panel ${styles.quest} ${styles.questTotal}`}>
                <span className={styles.questNo}>Σ</span>
                <b>A full day</b>
                <span className={styles.xp}>+{QUEST_XP_PER_DAY} XP</span>
              </div>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      <section className={styles.trackBand} aria-labelledby="track-title">
        <div className="wide">
          <Reveal className="band-head">
            <span className="kicker" style={{ color: "#ffb27a" }}>
              Every level
            </span>
            <h2 className="headline" id="track-title">
              {SEASON.levels} levels, two lanes.
            </h2>
            <p className="lede">
              Everyone gets the free lane: {FREE_LANE_TOTAL} coins over the season. Pass holders get a cosmetic every fifth
              level - capes, a choice of hat or gauntlet at 25, the wings at {SEASON.levels} - and {PREMIUM_LANE_TOTAL} coins
              between.
            </p>
          </Reveal>
        </div>
        <PassTrack />
      </section>

      <section className="band tight" aria-labelledby="pick-title">
        <div className="wide">
          <Reveal>
            <div className={styles.pick}>
              <div>
                <span className="kicker gold">Level 25</span>
                <h2 className="headline" id="pick-title">
                  Your pick: hat or gauntlet.
                </h2>
                <p className="lede">Halfway through the season, pass holders choose one - the Ember hat or the Ember gauntlet.</p>
              </div>
              <div className={styles.pickArt}>
                <span>
                  <PixelSprite name="Ember hat" size={120} />
                  <b>Ember hat</b>
                </span>
                <em>or</em>
                <span>
                  <PixelSprite name="Ember gauntlet" size={120} />
                  <b>Ember gauntlet</b>
                </span>
              </div>
            </div>
          </Reveal>
          <p className="note" style={{ marginTop: 20 }}>
            <b>Preview.</b>&nbsp;This is Season {SEASON.number} as the launcher shows it today. The pass can&apos;t be bought yet
            - when it can, it will be {usd(SEASON.priceCents)} in the launcher. Its coins are always less than the price would buy
            (<CoinMark size={13} /> {(FREE_LANE_TOTAL + PREMIUM_LANE_TOTAL).toLocaleString("en-US")}), so it&apos;s never a cheap way to
            buy coins. <Link href="/coins">More about coins</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
