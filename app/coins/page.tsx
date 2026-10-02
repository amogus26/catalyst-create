import type { Metadata } from "next";
import Link from "next/link";
import { CoinHero } from "@/components/coins/coin-hero";
import { CoinStack } from "@/components/coins/coin-stack";
import { CoinMark } from "@/components/site/coin-mark";
import { Hall } from "@/components/site/hall";
import { BannerIcon, CalendarIcon, CheckIcon, SparkIcon, TicketIcon } from "@/components/site/icons";
import { Counter, Reveal, Stagger, StaggerItem, Tilt } from "@/components/site/motion";
import { BEST_VALUE_PACK, CATALYST_PLUS, COIN_PACKS, coinsPerDollar, ECONOMY, FREE_LANE_TOTAL, packBonus, PREMIUM_LANE_TOTAL, SEASON, SHOP_ITEMS, usd } from "@/lib/catalyst";
import styles from "./coins.module.css";

export const metadata: Metadata = {
  title: "Coins",
  description: "Catalyst's coins: what they are, how to earn them by playing, what they buy, and the coin packs and Catalyst Plus coming to the launcher.",
};

const fmt = (n: number) => n.toLocaleString("en-US");

export default function CoinsPage() {
  return (
    <>
      <section className={`page-top ${styles.top}`}>
        <Hall souls={22} tint="gold" />
        <div className={`wide ${styles.topGrid}`}>
          <Reveal className="band-head" amount={0}>
            <span className="kicker gold">Coins</span>
            <h1 className="display" style={{ fontSize: "clamp(2.875rem, 7vw, 6rem)" }}>
              <span className="gold-text">Coins.</span>
              <br />
              Earn them, spend them.
            </h1>
            <p className="lede">
              Coins are Catalyst&apos;s currency - about a cent each. Play and they come to you every day; spend them on wings
              and whatever the store brings next.
            </p>
            <div className={styles.topFacts}>
              <span>
                <b>
                  <Counter to={COIN_PACKS.length} />
                </b>
                coin packs, from {fmt(COIN_PACKS[0].coins)} coins
              </span>
              <span>
                <b>
                  <Counter to={Math.min(...SHOP_ITEMS.filter((item) => item.kind === "wings" && item.price !== null).map((item) => item.price!))} />
                </b>
                coins for the cheapest wings
              </span>
            </div>
          </Reveal>
          <CoinHero />
        </div>
      </section>

      <section className="band tight" aria-labelledby="earn-title">
        <div className="wide">
          <Reveal className="band-head">
            <span className="kicker gold">Earn</span>
            <h2 className="headline" id="earn-title">
              Coins come from playing.
            </h2>
            <p className="lede">No purchase needed for any of these - they&apos;re what the launcher pays out today.</p>
          </Reveal>
          <Stagger className={styles.earnGrid}>
            <StaggerItem>
              <Tilt className={`panel ${styles.earn}`}>
                <span className={styles.earnIcon}>
                  <CalendarIcon />
                </span>
                <b className={styles.earnAmount}>Every day</b>
                <h3>Daily rewards</h3>
                <p>Open a card every day for coins - and now and then something more. What&apos;s in each card is a surprise.</p>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.earn}`}>
                <span className={styles.earnIcon}>
                  <BannerIcon />
                </span>
                <b className={styles.earnAmount}>{fmt(FREE_LANE_TOTAL)}</b>
                <h3>Battle pass</h3>
                <p>
                  Everyone gets {ECONOMY.freeLaneCoins} coins every fifth level of the season. Pass holders get{" "}
                  {fmt(PREMIUM_LANE_TOTAL)} more on the way.
                </p>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.earn}`}>
                <span className={styles.earnIcon}>
                  <SparkIcon />
                </span>
                <b className={styles.earnAmount}>Special wings</b>
                <h3>For opening every card of the year</h3>
                <p>Open every daily card of all twelve months and you get special wings - only for players who open them all.</p>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.earn}`}>
                <span className={styles.earnIcon}>
                  <TicketIcon />
                </span>
                <b className={styles.earnAmount}>Codes</b>
                <h3>Redeem codes</h3>
                <p>
                  Codes from giveaways, events and streams can carry coins.{" "}
                  <Link href="/redeem">How to redeem one</Link>.
                </p>
              </Tilt>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      <section className="band" aria-labelledby="packs-title">
        <div className="wide">
          <Reveal className="band-head">
            <span className="kicker gold">Coin packs</span>
            <h2 className="headline" id="packs-title">
              Or top up.
            </h2>
            <p className="lede">
              The packs on the launcher&apos;s Coins shelf. The bigger the pack, the more coins per dollar - the bonus is
              counted against the starter pack&apos;s rate.
            </p>
          </Reveal>
          <Stagger className={styles.packs}>
            {COIN_PACKS.map((pack, tier) => {
              const best = pack === BEST_VALUE_PACK;
              const bonus = packBonus(pack);
              return (
                <StaggerItem key={pack.coins}>
                  <Tilt className={`${styles.pack} ${best ? styles.packBest : ""}`} max={6}>
                    {best && <span className={styles.bestBadge}>Best value</span>}
                    <div className={styles.packArt}>
                      <CoinStack tier={tier} />
                    </div>
                    <b className={styles.packCoins}>
                      <CoinMark size={22} />
                      {fmt(pack.coins)}
                    </b>
                    <span className={styles.packBonus}>{bonus > 0 ? `Includes ${fmt(bonus)} bonus coins` : "The starter rate"}</span>
                    <span className={styles.packRate}>{Math.round(coinsPerDollar(pack))} coins per dollar</span>
                    <span className={styles.packPrice}>{usd(pack.priceCents)}</span>
                    <span className={styles.soon} aria-disabled="true">
                      In the launcher · soon
                    </span>
                  </Tilt>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      <section className="band tight" aria-labelledby="plus-title">
        <div className="wide">
          <Reveal>
            <div className={styles.plus}>
              <div>
                <span className="kicker" style={{ color: "#c9a6ff" }}>
                  Membership
                </span>
                <h2 className="headline" id="plus-title">
                  {CATALYST_PLUS.name}
                </h2>
                <p className={styles.plusPrice}>
                  <b>{usd(CATALYST_PLUS.priceCents)}</b> / {CATALYST_PLUS.period}
                </p>
                <span className={styles.soon} aria-disabled="true">
                  Coming to the launcher
                </span>
              </div>
              <ul className={styles.plusList}>
                {CATALYST_PLUS.benefits.map((benefit) => (
                  <li key={benefit}>
                    <CheckIcon size={18} />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <p className="note gold" style={{ marginTop: 20 }}>
            <b>No payments here.</b>&nbsp;Nothing on this site takes money or card details. Coin packs, the {SEASON.name} pass and{" "}
            {CATALYST_PLUS.name} will be bought in the launcher once payments open - see the{" "}
            <Link href="/terms#purchases">Terms</Link> for how purchases will work.
          </p>
        </div>
      </section>
    </>
  );
}
