import type { Metadata } from "next";
import Link from "next/link";
import { CoinHero } from "@/components/coins/coin-hero";
import { CoinStack } from "@/components/coins/coin-stack";
import { CoinMark } from "@/components/site/coin-mark";
import { Hall } from "@/components/site/hall";
import { BannerIcon, CalendarIcon, CheckIcon, SparkIcon, TicketIcon } from "@/components/site/icons";
import { Counter, Reveal, Stagger, StaggerItem, Tilt } from "@/components/site/motion";
import {
  BEST_VALUE_PACK,
  CATALYST_PLUS,
  COIN_PACKS,
  DAILY_MONTH_COINS,
  DAILY_MONTH_MAX_COINS,
  ECONOMY,
  FREE_LANE_TOTAL,
  PREMIUM_LANE_TOTAL,
  SEASON,
  SHOP_ITEMS,
  YEAR_GIFT,
  coinsPerDollar,
  packBonus,
  usd,
} from "@/lib/catalyst";
import styles from "./coins.module.css";

export const metadata: Metadata = {
  title: "Coins",
  description: "Catalyst's coins: what they are, how to earn them by playing, what they buy, and the coin packs and Catalyst Plus coming to the launcher.",
};

const fmt = (n: number) => n.toLocaleString("en-US");

export default function CoinsPage() {
  const wingPrices = SHOP_ITEMS.filter((i) => i.kind === "wings" && i.price !== null).map((i) => i.price!);
  return (
    <>
      <section className={`page-top ${styles.top}`}>
        <Hall souls={22} tint="gold" />
        <div className={`wide ${styles.topGrid}`}>
          <Reveal className="band-head" amount={0}>
            <span className="kicker gold">Coins</span>
            <h1 className="display" style={{ fontSize: "clamp(46px, 7vw, 96px)" }}>
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
                  <Counter to={DAILY_MONTH_COINS} />
                </b>
                coins a month from daily rewards
              </span>
              <span>
                <b>
                  <Counter to={ECONOMY.wingPrices[0]} />
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
                <b className={styles.earnAmount}>{fmt(DAILY_MONTH_COINS)}</b>
                <h3>Daily rewards</h3>
                <p>
                  Open a card every day. A month of cards pays {fmt(DAILY_MONTH_COINS)} coins - up to{" "}
                  {fmt(DAILY_MONTH_MAX_COINS)} when the three lucky days land on the best days.
                </p>
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
                <b className={styles.earnAmount}>{fmt(YEAR_GIFT.coins)}</b>
                <h3>The year gift</h3>
                <p>Open every card of all twelve months and the {YEAR_GIFT.name} is yours: {YEAR_GIFT.contents}.</p>
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

      <section className="band tight" aria-labelledby="spend-title">
        <div className="wide">
          <Reveal className={`panel ${styles.spend}`}>
            <div>
              <span className="kicker blue">Spend</span>
              <h2 className="headline" id="spend-title">
                What coins buy.
              </h2>
              <p className="lede">
                Wings are the store&apos;s premium item, from {fmt(Math.min(...wingPrices))} to {fmt(Math.max(...wingPrices))} coins.
                Capes are coming - their prices aren&apos;t out yet.
              </p>
              <Link className="btn" href="/cosmetics">
                See the cosmetics in 3D
              </Link>
            </div>
            <ul className={styles.spendList}>
              {SHOP_ITEMS.filter((i) => i.kind === "wings").map((item) => (
                <li key={item.id}>
                  <span>{item.name}</span>
                  <span className="coin-price">
                    <CoinMark size={15} />
                    {fmt(item.price!)}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
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
