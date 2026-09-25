import Link from "next/link";
import { contactText, LEGAL } from "@/lib/legal";

export const metadata = {
  title: "Terms of Service | Catalyst Client",
  description:
    "The rules for using Catalyst Client - the launcher, the client, Catalyst Designs, coins, the battle pass, redeem codes and community designs.",
};

const SECTIONS = [
  ["about", "What these terms cover"],
  ["age", "Who can use Catalyst"],
  ["minecraft", "Minecraft, Mojang and Microsoft"],
  ["licence", "Your licence to the software"],
  ["fair-play", "Servers and fair play"],
  ["accounts", "Accounts and security"],
  ["items", "Coins and virtual items"],
  ["purchases", "Purchases, subscriptions and refunds"],
  ["codes", "Redeem codes and gifts"],
  ["rewards", "Daily rewards, battle pass and events"],
  ["designs", "Community designs"],
  ["voting", "Voting and rounds"],
  ["rules", "Acceptable use"],
  ["reporting", "Reporting content and takedowns"],
  ["third-party", "Mods and other third-party services"],
  ["changes", "Changes to the service"],
  ["ending", "Suspension and ending"],
  ["liability", "Warranties and liability"],
  ["law", "Law and disputes"],
  ["general", "General"],
  ["contact", "Contact"],
] as const;

/**
 * The Terms of Service for all of Catalyst Client, not just this site: the launcher, the client mod,
 * Catalyst Designs, and the store inside the launcher. Written in plain language, with the short
 * version first. The facts it depends on (operator, contact, country) are in lib/legal.ts.
 */
export default function TermsPage() {
  return (
    <div className="shell">
      <article className="prose">
        <h1>Terms of Service</h1>
        <p className="updated">Last updated {LEGAL.lastUpdated}</p>

        <div className="summary">
          <b>The short version</b>
          <ul>
            <li>Catalyst is a fan-made client for Minecraft. It is not made or approved by Mojang or Microsoft.</li>
            <li>Play fair: follow the rules of every server you join.</li>
            <li>Coins and cosmetics are a licence to use them in Catalyst - they have no cash value.</li>
            <li>Designs you submit stay yours, but you let us show them and, if they win, turn them into cosmetics.</li>
            <li>Your legal rights as a consumer are never reduced by these terms.</li>
          </ul>
        </div>

        <nav className="toc" aria-label="Contents">
          <b>Contents</b>
          <ol>
            {SECTIONS.map(([id, title]) => (
              <li key={id}>
                <a href={`#${id}`}>{title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <h2 id="about">1. What these terms cover</h2>
        <p>
          These terms are an agreement between you and {LEGAL.operator} (&quot;we&quot;, &quot;us&quot;). They
          cover everything under the Catalyst Client name: the Catalyst launcher, the Catalyst client
          mod, the Catalyst Designs website, and the store, coins, battle pass, daily rewards and
          redeem codes inside the launcher (together, &quot;Catalyst&quot;).
        </p>
        <p>
          By installing, opening or using any part of Catalyst you agree to these terms and to
          our <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use Catalyst.
        </p>

        <h2 id="age">2. Who can use Catalyst</h2>
        <p>
          You must be at least {LEGAL.minimumAge} years old. If you are under {LEGAL.consentAge} (or
          under the age of majority where you live), a parent or legal guardian must agree to these
          terms for you and must approve any purchase. Parents and guardians are responsible for how
          their child uses Catalyst.
        </p>

        <h2 id="minecraft">3. Minecraft, Mojang and Microsoft</h2>
        <p>
          Catalyst is <strong>not an official Minecraft product</strong> and is not approved by or
          associated with Mojang or Microsoft. &quot;Minecraft&quot; is a trademark of Mojang Synergies AB.
        </p>
        <p>
          To play you need your own genuine Minecraft: Java Edition account, and you must follow the{" "}
          <a href="https://www.minecraft.net/eula" rel="noreferrer">Minecraft End User License Agreement</a>{" "}
          and Mojang&apos;s usage guidelines, as well as these terms. Nothing in Catalyst gives you
          access to Minecraft itself, and nothing we sell affects gameplay in a way the Minecraft EULA
          does not allow - Catalyst cosmetics are visual only.
        </p>

        <h2 id="licence">4. Your licence to the software</h2>
        <p>
          We give you a personal, non-exclusive, non-transferable, revocable licence to install and use
          the Catalyst launcher and client for your own non-commercial use, as long as you follow these
          terms. We (and our licensors) keep all rights in Catalyst, its code, artwork, logos and names.
        </p>
        <p>You must not, unless the law expressly allows it:</p>
        <ul>
          <li>copy, sell, rent, sublicense or redistribute Catalyst, or pass off a modified copy as ours;</li>
          <li>reverse engineer, decompile or disassemble it, except where the law gives you that right;</li>
          <li>remove or change any copyright, trademark or other notice;</li>
          <li>get around any limit or protection in Catalyst, or use it to spread malware;</li>
          <li>use it to build a competing product, or to scrape or overload our services.</li>
        </ul>
        <p>
          Open-source parts of Catalyst, and third-party libraries we include, stay under their own
          licences, which win over this section where they conflict.
        </p>

        <h2 id="fair-play">5. Servers and fair play</h2>
        <p>
          Catalyst&apos;s modules are made to change how the game looks and feels on your own screen.
          Every server sets its own rules about which client modifications are allowed. You are
          responsible for following the rules of each server you join and for any consequences - a
          server may kick or ban players using features it does not allow, and we cannot undo that.
        </p>
        <p>
          Do not use Catalyst to cheat, to gain an unfair advantage a server forbids, or to harm other
          players. We may switch features off on servers that ask us to, and may suspend people who
          use Catalyst to break server rules.
        </p>

        <h2 id="accounts">6. Accounts and security</h2>
        <p>
          You sign in to Minecraft through Microsoft&apos;s own sign-in page; we never see your
          Microsoft password. The launcher keeps its sign-in tokens on your computer. Keep your
          computer and account secure - you are responsible for what happens through them. Tell us
          straight away if you think someone else is using your account or items.
        </p>

        <h2 id="items">7. Coins and virtual items</h2>
        <p>
          Catalyst has virtual items: coins, cosmetics (such as capes, wings and hats), battle pass
          rewards, and code exclusives. When you earn, buy or redeem one, you get a{" "}
          <strong>limited, personal, revocable licence to use it inside Catalyst</strong> - you do not
          own it.
        </p>
        <ul>
          <li>Virtual items have <strong>no real-world value</strong> and cannot be exchanged for money.</li>
          <li>They cannot be sold, traded or transferred outside the ways Catalyst itself offers.</li>
          <li>Coins can only be spent on items in the Catalyst store.</li>
          <li>
            We may change, rebalance or retire items and prices. If we permanently stop offering a paid
            item you bought, we will give you a fair alternative or refund where the law requires it.
          </li>
          <li>
            Until accounts are linked to a server, items and coins are stored on your own computer and
            can be lost if you delete the launcher&apos;s data. We cannot restore items stored only on
            your device.
          </li>
        </ul>

        <h2 id="purchases">8. Purchases, subscriptions and refunds</h2>
        <p>
          Paid features (coin packs, the battle pass and Catalyst Plus) are shown in the launcher
          before payments open. When they open, these rules apply:
        </p>
        <ul>
          <li>
            Prices are shown before you pay and include any taxes we are required to charge. Payments
            are handled by a payment provider; we never see or store your full card details.
          </li>
          <li>
            <strong>Right of withdrawal (EU and UK consumers):</strong> you normally have 14 days to
            withdraw from an online purchase. For digital content supplied straight away - coins,
            items, the battle pass - you will be asked to agree that delivery starts immediately and
            to confirm you lose this right once it has. Anything not yet delivered can still be
            withdrawn from.
          </li>
          <li>
            <strong>Catalyst Plus</strong> is a monthly subscription that renews automatically until
            you cancel. You can cancel at any time; it stays active until the end of the period you
            paid for. We will tell you before a price change takes effect, and you can cancel before
            it applies.
          </li>
          <li>
            Except where the law requires otherwise, purchases are final. This never affects your
            statutory rights - for example if something you paid for does not work as described.
          </li>
          <li>Chargebacks or payment fraud may lead to the items bought being removed.</li>
        </ul>

        <h2 id="codes">9. Redeem codes and gifts</h2>
        <ul>
          <li>
            A redeem code gives the reward it was issued for (coins, a sale, an item or an exclusive).
            Codes have no cash value and cannot be exchanged for money.
          </li>
          <li>
            Each code can be used a set number of times (usually once) and may have a last day. The
            launcher needs an internet connection to redeem a code.
          </li>
          <li>
            Codes may only be obtained from us or from people we authorise. Selling codes, or buying
            them from anyone else, is not allowed.
          </li>
          <li>
            We may cancel codes that were leaked, stolen, generated without permission or obtained by
            fraud, and remove what they gave.
          </li>
          <li>
            Gifting coins to another player will open once accounts exist; until then it is shown but
            not available.
          </li>
        </ul>

        <h2 id="rewards">10. Daily rewards, battle pass and events</h2>
        <p>
          Daily rewards, battle pass levels, quests and events are extras we may change, pause or end.
          Rewards are virtual items under section 7. Progress is tracked by the launcher and may be
          reset if it was gained by tampering, automation or exploiting a bug.
        </p>

        <h2 id="designs">11. Community designs</h2>
        <p>
          On Catalyst Designs you can submit designs (&quot;submissions&quot;) and a display name.
          You keep the copyright in your work. By submitting you:
        </p>
        <ul>
          <li>confirm it is your own original work, or that you have every right needed to submit it;</li>
          <li>
            give us a worldwide, non-exclusive, royalty-free licence to store, review, show, adapt (for
            example resize or recolour) and publish it on our website and channels, and - if it is
            picked - to turn it into a cosmetic and distribute it to players in Catalyst, for free or as
            a paid item;
          </li>
          <li>agree we will credit your display name where practical, and that you may ask us to stop crediting you;</li>
          <li>
            understand that you are not owed payment unless we agree it with you in writing for a
            particular round.
          </li>
        </ul>
        <p>
          Every submission is checked by a person before it appears. We may decline or remove any
          submission at any time, including after approval. You can ask us to remove your submission
          from the website at any time; a design already released as a cosmetic may stay available to
          players who have it.
        </p>

        <h2 id="voting">12. Voting and rounds</h2>
        <p>
          Voting is free and needs no purchase. Votes are counted once per browser and are a guide for
          the team, not a binding result - we choose which designs become cosmetics. Any prize for a
          round is described with that round. Manipulating votes (scripts, multiple browsers on
          purpose, paid votes) can disqualify a design.
        </p>

        <h2 id="rules">13. Acceptable use</h2>
        <p>Do not submit, share or do anything through Catalyst that:</p>
        <ul>
          <li>is illegal, or promotes illegal acts;</li>
          <li>contains hate symbols or attacks people for who they are;</li>
          <li>is sexually explicit, or sexualises minors in any way;</li>
          <li>shows graphic violence or gore;</li>
          <li>harasses, threatens or impersonates anyone, or reveals someone&apos;s private information;</li>
          <li>infringes someone else&apos;s copyright, trademark or other rights;</li>
          <li>contains malware, or tries to break, overload or get around the security of our services.</li>
        </ul>

        <h2 id="reporting">14. Reporting content and takedowns</h2>
        <p>
          If you think something on Catalyst is illegal or infringes your rights, tell us at{" "}
          {contactText()} with: where it is, why you believe it is illegal or infringing, your name and
          email, and a statement that your report is accurate and made in good faith. We will look at
          every report promptly and let you know what we decided.
        </p>
        <p>
          If we remove or restrict something you submitted, we will tell you why where we can, and you
          can ask us to review the decision by replying to us.
        </p>

        <h2 id="third-party">15. Mods and other third-party services</h2>
        <p>
          The launcher can show and install mods from Modrinth. Those mods are made by other people and
          come under their own licences and terms - we do not make, check or support them, and we are
          not responsible for what they do. Install mods at your own risk. Other services Catalyst uses,
          like Microsoft sign-in, are covered by their providers&apos; own terms.
        </p>

        <h2 id="changes">16. Changes to the service and these terms</h2>
        <p>
          Catalyst is actively developed. We may add, change or remove features, and may pause the
          service for maintenance. We may update these terms; if a change matters, we will tell you in
          the launcher or on this site before it applies. If you keep using Catalyst after it applies,
          you accept the new terms; if you do not accept them, stop using Catalyst (and cancel any
          subscription).
        </p>

        <h2 id="ending">17. Suspension and ending</h2>
        <p>
          You can stop using Catalyst at any time by uninstalling it. We may suspend or end your access
          if you seriously or repeatedly break these terms, if the law requires it, or to protect other
          players or our services. Where reasonable we will warn you first and tell you why. Sections
          that by their nature should last (such as the design licence, liability and law) continue
          after these terms end.
        </p>

        <h2 id="liability">18. Warranties and liability</h2>
        <p>
          We work hard to make Catalyst reliable, but it is provided &quot;as is&quot; and &quot;as available&quot;
          as far as the law allows. We do not promise it will be uninterrupted, error-free, or work
          with every mod, server or computer.
        </p>
        <p>
          We are not liable for losses that were not foreseeable, for loss of data you could have
          backed up, for actions taken by servers you play on, or for third-party mods. Our total
          liability to you for any claim is limited to the amount you paid us in the 12 months before
          it arose.
        </p>
        <p>
          <strong>Nothing in these terms limits liability that cannot be limited by law</strong> -
          including for death or personal injury caused by negligence, for fraud, or for your statutory
          rights as a consumer, such as the right to digital content that works as described.
        </p>

        <h2 id="law">19. Law and disputes</h2>
        <p>
          These terms are governed by the law of {LEGAL.country}. If you are a consumer, you also keep
          the protection of the mandatory laws of the country you live in, and you can bring a claim in
          the courts there. Please contact us first - most problems can be solved quickly. Consumers
          may also use an out-of-court dispute resolution body where one is available.
        </p>

        <h2 id="general">20. General</h2>
        <p>
          If any part of these terms turns out to be invalid, the rest still applies. If we do not
          enforce a right straight away, we have not given it up. You may not transfer your rights
          under these terms; we may transfer ours to someone who takes over Catalyst, without reducing
          your rights. These terms and the Privacy Policy are the whole agreement between us about
          Catalyst.
        </p>

        <h2 id="contact">21. Contact</h2>
        <p>
          Questions, reports or complaints: {contactText()}.
        </p>
      </article>
    </div>
  );
}
