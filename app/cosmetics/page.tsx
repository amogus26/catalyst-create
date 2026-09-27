import type { Metadata } from "next";
import Link from "next/link";
import { CosmeticsShop } from "@/components/cosmetics/shop";
import { CapeArt, WingsArt } from "@/components/site/cosmetic-art";
import { Hall } from "@/components/site/hall";
import { LockIcon } from "@/components/site/icons";
import { Reveal, Stagger, StaggerItem, Tilt } from "@/components/site/motion";
import { PixelSprite } from "@/components/site/pixel-sprite";
import { CATALYST_PLUS, PASS_TIERS, SEASON, SHOP_ITEMS } from "@/lib/catalyst";
import styles from "./cosmetics.module.css";

export const metadata: Metadata = {
  title: "Cosmetics",
  description: `Wings and capes for Catalyst Client, in 3D: ${SHOP_ITEMS.map((i) => i.name).join(", ")}. Bought with coins in the launcher.`,
};

type Earned = { name: string; from: string; art: { kind: "wings" | "cape"; colors: string[] } | { kind: "sprite" } };

/**
 * What the battle pass and Catalyst Plus give - never sold in the shop. The daily calendar's cosmetics
 * are left out on purpose: finding out what a card holds is the point of opening it.
 */
function earned(): Earned[] {
  const pass: Earned[] = PASS_TIERS.flatMap<Earned>((tier) => {
    const r = tier.premium;
    if (!r || r.kind === "coins") return [];
    if (r.kind === "choice") return r.options.map((option) => ({ name: option, from: `Battle pass · level ${tier.level} pick`, art: { kind: "sprite" as const } }));
    return [{ name: r.name, from: `Battle pass · level ${tier.level}`, art: { kind: r.kind, colors: r.colors } }];
  });
  const plus: Earned[] = ["Plus hat", "Plus gauntlet", "Plus name tag badge"].map((name) => ({ name, from: CATALYST_PLUS.name, art: { kind: "sprite" } }));
  return [...pass, ...plus];
}

export default function CosmeticsPage() {
  const rewards = earned();
  return (
    <>
      <section className="page-top">
        <Hall souls={20} tint="teal" />
        <div className="wide" style={{ position: "relative", zIndex: 1 }}>
          <Reveal className="band-head" amount={0}>
            <span className="kicker blue">Cosmetics</span>
            <h1 className="display" style={{ fontSize: "clamp(2.625rem, 6vw, 5rem)" }}>
              Wear something <span className="shine-text">rare.</span>
            </h1>
            <p className="lede">
              Wings and capes, worn in the client and shown here in 3D. Pick one to try it on, drag to turn it round -
              then find it in the launcher&apos;s Store.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="wide" aria-label="The shop">
        <CosmeticsShop />
        <p className={`note ${styles.preview}`}>
          <b>Store preview.</b>&nbsp;These are the items and prices in the launcher&apos;s Store today. Coins can&apos;t be bought
          yet - when they can, it will be in the launcher, never on this site.
        </p>
      </section>

      <section className="band" aria-labelledby="earn-title">
        <div className="wide">
          <Reveal className="band-head">
            <span className="kicker gold">Earn them</span>
            <h2 className="headline" id="earn-title">
              Some things can&apos;t be bought.
            </h2>
            <p className="lede">
              These come from playing: the Season {SEASON.number} battle pass and {CATALYST_PLUS.name}. None of them are
              in the shop - and the daily calendar has more, which you find by opening its cards.
            </p>
          </Reveal>
          <Stagger className={styles.earnGrid}>
            {rewards.map((r) => (
              <StaggerItem key={r.name}>
                <Tilt className={`panel ${styles.earnCard}`} max={6}>
                  <span className={styles.earnArt}>
                    {r.art.kind === "sprite" ? (
                      <PixelSprite name={r.name} size={56} />
                    ) : r.art.kind === "wings" ? (
                      <WingsArt colors={r.art.colors} id={`earn-${r.name}`} />
                    ) : (
                      <CapeArt colors={r.art.colors} id={`earn-${r.name}`} />
                    )}
                  </span>
                  <b>{r.name}</b>
                  <span className={styles.earnFrom}>{r.from}</span>
                </Tilt>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="band tight" aria-labelledby="exclusive-title">
        <div className="wide">
          <Reveal className="band-head">
            <span className="kicker">Code exclusives</span>
            <h2 className="headline" id="exclusive-title">
              Locked until you have the code.
            </h2>
            <p className="lede">
              Some cosmetics never go on sale. They come from codes handed out at events and giveaways - each one is
              revealed when it&apos;s redeemed.
            </p>
          </Reveal>
          <Stagger className={styles.lockedGrid}>
            {["cape", "wings", "cape"].map((kind, i) => (
              <StaggerItem key={i}>
                <Link href="/redeem" className={styles.locked}>
                  <span className={styles.lockedArt} aria-hidden="true">
                    {kind === "wings" ? <WingsArt colors={["#2B3547", "#161C27"]} id={`locked-${i}`} /> : <CapeArt colors={["#2B3547", "#161C27"]} id={`locked-${i}`} />}
                    <span className={styles.lockBadge}>
                      <LockIcon size={20} />
                    </span>
                  </span>
                  <b>???</b>
                  <span>Redeem a code to unlock</span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
}
