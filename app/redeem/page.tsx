import type { Metadata } from "next";
import Link from "next/link";
import { CodeTyper } from "@/components/redeem/code-typer";
import { CoinMark } from "@/components/site/coin-mark";
import { Hall } from "@/components/site/hall";
import { LockIcon, SparkIcon, TicketIcon } from "@/components/site/icons";
import { Reveal, Stagger, StaggerItem, Tilt } from "@/components/site/motion";
import { CODE_FORMAT } from "@/lib/catalyst";
import styles from "./redeem.module.css";

export const metadata: Metadata = {
  title: "Redeem a code",
  description: "How Catalyst codes work: CATL-XXXX-XXXX-XXXX, redeemed in the launcher for coins, a sale on wings, a free item or a code-only exclusive.",
};

/**
 * How codes work. Deliberately no form: a code is redeemed in the launcher, which sends it with that
 * install's id so each install can only use a code once (app/api/codes/redeem). A web form would skip
 * that - and would also give a guessing script somewhere to aim.
 */
export default function RedeemPage() {
  return (
    <>
      <section className="page-top">
        <Hall souls={18} tint="gold" />
        <div className={`wide ${styles.top}`}>
          <Reveal className="band-head" amount={0}>
            <span className="kicker gold">Redeem codes</span>
            <h1 className="display" style={{ fontSize: "clamp(44px, 6.6vw, 88px)" }}>
              Got a <span className="gold-text">code?</span>
            </h1>
            <p className="lede">
              Codes come from giveaways, events and streams. Each one gives something - coins, a sale, an item, or
              something the shop never sells - and it&apos;s redeemed inside the launcher.
            </p>
          </Reveal>
          <Reveal from="right" delay={0.1} amount={0}>
            <div className={styles.dialog} aria-label="An illustration of the launcher's Redeem a code window">
              <div className={styles.dialogHead}>
                <TicketIcon size={20} />
                <b>Redeem a code</b>
              </div>
              <div className={styles.field}>
                <CodeTyper code={CODE_FORMAT.example} className={styles.code} />
                <span className={styles.caret} aria-hidden="true" />
              </div>
              <div className={styles.dialogFoot}>
                <span>Example code - not a real one</span>
                <span className={styles.fakeButton}>Redeem</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="band tight" aria-labelledby="where-title">
        <div className="wide">
          <Reveal className="band-head">
            <span className="kicker gold">Where</span>
            <h2 className="headline" id="where-title">
              Three steps, in the launcher.
            </h2>
          </Reveal>
          <Stagger as="ol" className={styles.steps}>
            <StaggerItem as="li" className={`panel ${styles.step}`}>
              <span className={styles.no}>1</span>
              <h3>Open the Store</h3>
              <p>
                In the launcher, open the <b>Store</b> and go to the <b>Coins</b> tab - or click your coins at the top of the
                window.
              </p>
            </StaggerItem>
            <StaggerItem as="li" className={`panel ${styles.step}`}>
              <span className={styles.no}>2</span>
              <h3>Press Redeem code</h3>
              <p>It opens the gold Redeem a code window.</p>
            </StaggerItem>
            <StaggerItem as="li" className={`panel ${styles.step}`}>
              <span className={styles.no}>3</span>
              <h3>Type it in</h3>
              <p>
                The dashes and capitals don&apos;t matter - the launcher tidies it up. It checks the code online and adds the
                reward straight away.
              </p>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      <section className="band tight" aria-labelledby="format-title">
        <div className="wide">
          <Reveal className={`panel ${styles.format}`}>
            <div>
              <span className="kicker gold">The format</span>
              <h2 className="headline" id="format-title">
                CATL, then three fours.
              </h2>
              <p className="lede">{CODE_FORMAT.alphabetNote}</p>
            </div>
            <div className={styles.anatomy} aria-hidden="true">
              <span className={styles.part}>
                <b>CATL</b>
                <em>always</em>
              </span>
              <i>-</i>
              <span className={styles.part}>
                <b>7KQ4</b>
                <em>4</em>
              </span>
              <i>-</i>
              <span className={styles.part}>
                <b>M9XH</b>
                <em>4</em>
              </span>
              <i>-</i>
              <span className={styles.part}>
                <b>3TRE</b>
                <em>4</em>
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="band tight" aria-labelledby="gives-title">
        <div className="wide">
          <Reveal className="band-head">
            <span className="kicker gold">What codes give</span>
            <h2 className="headline" id="gives-title">
              One of four things.
            </h2>
          </Reveal>
          <Stagger className={styles.gives}>
            <StaggerItem>
              <Tilt className={`panel ${styles.give}`}>
                <span className={styles.giveIcon}>
                  <CoinMark size={30} />
                </span>
                <h3>Coins</h3>
                <p>Added to your balance at once.</p>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.give}`}>
                <span className={styles.giveIcon}>%</span>
                <h3>A sale on wings</h3>
                <p>A discount on wings for a number of days - it shows as a deal in Cosmetics.</p>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.give}`}>
                <span className={styles.giveIcon}>
                  <SparkIcon />
                </span>
                <h3>A shop item, free</h3>
                <p>One of the shop&apos;s wings or capes, yours to wear.</p>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.give}`}>
                <span className={styles.giveIcon}>
                  <LockIcon />
                </span>
                <h3>An exclusive</h3>
                <p>
                  Something the shop never sells. <Link href="/cosmetics#exclusive-title">See the locked ones</Link>.
                </p>
              </Tilt>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      <section className="band tight" aria-labelledby="rules-title">
        <div className="wide">
          <Reveal className={`panel ${styles.rules}`}>
            <h2 className="headline" id="rules-title" style={{ fontSize: "clamp(26px, 3vw, 38px)" }}>
              The small print.
            </h2>
            <ul>
              <li>A code works as many times as it was made for - often once, sometimes for a whole stream&apos;s viewers. When it&apos;s used up, it stops.</li>
              <li>Each launcher can redeem a code once.</li>
              <li>Some codes have a last day. Codes can also be cancelled, for example if one leaks.</li>
              <li>
                Codes are only redeemed in the launcher - there&apos;s no form for them on this site, and nobody from Catalyst
                will ask you for yours.
              </li>
            </ul>
          </Reveal>
        </div>
      </section>
    </>
  );
}
