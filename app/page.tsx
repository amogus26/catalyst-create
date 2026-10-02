import Link from "next/link";
import compareCatalyst from "@/assets/screens/compare-catalyst.webp";
import compareMinecraft from "@/assets/screens/compare-minecraft.webp";
import launcherControls from "@/assets/screens/launcher-controls.webp";
import launcherHome from "@/assets/screens/launcher-home.webp";
import launcherMods from "@/assets/screens/launcher-mods.webp";
import launcherPass from "@/assets/screens/launcher-pass.webp";
import { ModuleMarquee, ModuleVideo } from "@/components/home/client-showcase";
import { Compare } from "@/components/home/compare";
import { HeroStage } from "@/components/home/hero-stage";
import { Tour, type Chapter } from "@/components/home/tour";
import { WingsArt } from "@/components/site/cosmetic-art";
import { DownloadButton } from "@/components/site/download-button";
import { Hall } from "@/components/site/hall";
import { HashRedirect } from "@/components/site/hash-redirect";
import { CtaStage } from "@/components/home/cta-stage";
import { ModInstall } from "@/components/home/mod-install";
import {
  ArrowIcon,
  BoxIcon,
  CheckIcon,
  GridIcon,
  LockIcon,
  PlayIcon,
  ShieldCheckIcon,
  UserIcon,
  WindowsIcon,
  AppleIcon,
  SparkIcon,
} from "@/components/site/icons";
import { Counter, Reveal, Stagger, StaggerItem, Tilt } from "@/components/site/motion";
import { PixelSprite } from "@/components/site/pixel-sprite";
import {
  CLIENT_MODULES,
  COIN_PACKS,
  GAME_VERSION,
  LOADER,
  PREINSTALLED_MODS,
  SEASON,
  SHOP_ITEMS,
  SIGN_IN,
  SKY_SHADERS,
  THEME_PRESETS,
  usd,
} from "@/lib/catalyst";
import styles from "./home.module.css";

const LAUNCHER_CHAPTERS: Chapter[] = [
  {
    key: "home",
    kicker: "Home",
    title: "Everything starts on Home.",
    text: "Launch in one click, and see your play stats, the latest news and today's reward on the way. Stuck? Catalyst Bot answers right there.",
    points: ["Launch with the version you picked", "Play stats, news and your daily reward", "Customise moves, resizes and recolours every piece"],
    image: launcherHome,
    alt: "The Catalyst launcher's Home page: the Launch button, Catalyst Bot, play stats, latest news and the daily reward",
  },
  {
    key: "mods",
    kicker: "Mods",
    title: "Mods in one click.",
    text: "Search Modrinth and CurseForge from inside the launcher. Every install is checked against your profile first and brings the mods it needs along with it.",
    points: ["Search, sort and filter by category", "Dependencies installed for you, hashes checked", "Updates in one click - installs from CurseForge are next"],
    image: launcherMods,
    alt: "The launcher's Mods page listing Modrinth mods such as Fabric API, Sodium and Iris Shaders, with Install buttons",
  },
  {
    key: "controls",
    kicker: "Controls",
    title: "Sounds of your own.",
    text: "Swap the game's hit and block sounds for your own .ogg files, or pick ready-made ones - and give the inventory a background.",
    points: ["Hit, block place and block break sounds", "Ready-made sounds, one click to use", "A picture behind your inventory"],
    image: launcherControls,
    alt: "The launcher's Controls page with custom sound slots and ready-made sounds",
  },
  {
    key: "pass",
    kicker: "Battle pass",
    title: "Level up as you play.",
    text: "Daily quests fill the bar - play an hour, play two sessions, open your daily card - and every level has something on the free lane or the pass.",
    points: [`Season ${SEASON.number}: ${SEASON.name}, ${SEASON.levels} levels`, "Up to 275 XP a day from quests", `The ${SEASON.headline} at level ${SEASON.levels}`],
    image: launcherPass,
    alt: "The launcher's Battle Pass page: the Season 4 Emberfall bar, the free and premium reward lanes, and three daily quests",
  },
];

/** Mods on Modrinth, with their own icons from Modrinth's CDN - as the launcher's Mods page shows them. */
const PROFILE_MODS = [
  { name: "Sodium", icon: "https://cdn.modrinth.com/data/AANobbMI/295862f4724dc3f78df3447ad6072b2dcd3ef0c9_96.webp" },
  { name: "Iris Shaders", icon: "https://cdn.modrinth.com/data/YL57xq9U/18d0e7f076d3d6ed5bedd472b853909aac5da202_96.webp" },
  { name: "Cloth Config API", icon: "https://cdn.modrinth.com/data/9s6osm5g/ed8a2316cbb6f4fc5f510e8e13a59a85cbbbff4d_96.webp" },
  { name: "Entity Culling", icon: "https://cdn.modrinth.com/data/NNAgCjsB/7873452d6cede4daed12da3d7d8c193ab88b4fd6_96.webp" },
  { name: "FerriteCore", icon: "https://cdn.modrinth.com/data/uXXizFIs/222a126f26f8f9ae1eb339f3b767677f18bff31f_96.webp" },
  { name: "Mod Menu", icon: "https://cdn.modrinth.com/data/mOgUt4GM/5a20ed1450a0e1e79a1fe04e61bb4e5878bf1d20.png" },
];

/**
 * The feature cards, after Pulse Visuals' grid: one thing each, with a picture of our own - a voxel icon
 * from the launcher's reward art, or a cosmetic the client ships - rendered by scripts/render-cosmetics.py
 * (the skies are the client's own screenshot). Grey until pointed at; the first is lit.
 */
const FEATURE_CARDS: { title: string; text: string; image: string; href?: string; sky?: boolean; wide?: boolean }[] = [
  {
    title: "Made to look good",
    text: `A clean Right Shift menu, ${THEME_PRESETS.length} colour schemes or any colour you like, and a HUD you arrange by dragging.`,
    image: "/features/crown.webp",
  },
  {
    title: "Fast from the first launch",
    text: `${PREINSTALLED_MODS.join(", ").replace(/, ([^,]*)$/, " and $1")} come installed and stay on their newest build - the speed mods, without hunting for them.`,
    image: "/features/pickaxe.webp",
  },
  {
    title: "Made for PvP",
    text: "CPS, projectile prediction, hitbox outlines, totem pops, cooldowns and armour status - one Right Shift away.",
    image: "/features/gauntlet.webp",
  },
  {
    title: "Mods in one click",
    text: "Search Modrinth and CurseForge from the launcher. The mods a mod needs come with it, every file checked.",
    image: "/features/chest.webp",
  },
  {
    title: "Wings you can wear",
    text: "3D wings and gauntlets that beat, glide and fold as you move - worn in game, on your own player.",
    image: "/features/stoneheart-wings.webp",
    href: "/cosmetics",
    wide: true,
  },
  {
    title: `${SKY_SHADERS.length} animated skies`,
    text: "An aurora, a nebula, a galaxy, End beams, caustics or a black hole - drawn by your graphics card, on your screen only.",
    image: "/features/aurora.webp",
    sky: true,
  },
  {
    title: "Your real account",
    text: "Sign in with Microsoft and play as yourself - your name, your skin, online servers.",
    image: "/features/name-tag.webp",
    href: "#sign-in",
  },
  {
    title: "Something every day",
    text: `A daily reward card, a ${SEASON.levels}-level battle pass and redeem codes - coins and cosmetics for playing.`,
    image: "/features/present.webp",
    href: "/battle-pass",
  },
  {
    title: "Always getting better",
    text: "New modules, skies and cosmetics keep coming - every change is in the release notes.",
    image: "/features/lantern.webp",
    href: "/download#notes",
  },
];

/** And the rest, one line each - real, just smaller. */
const MORE_FEATURES = [
  "Profiles that keep mods apart",
  "Your own hit and block sounds",
  "A picture behind your inventory",
  "Catalyst Bot on Home",
  "2 to 16 GB of memory",
  "Java found for you",
  "Your window size",
  "Starts with your computer",
];

/** Catalyst in four figures - each counted from lib/catalyst.ts, none typed in. */
const STATS = [
  { value: CLIENT_MODULES.length, label: "Modules in the client" },
  { value: SKY_SHADERS.length, label: "Animated skies" },
  { value: THEME_PRESETS.length, label: "Colour schemes" },
  { value: SEASON.levels, label: "Battle pass levels" },
];

/**
 * What is switched on in the comparison's Catalyst shot. Both shots were taken by the client's own
 * screenshot harness (DebugShots) from the same spot at the same time of day: every module off for the
 * Minecraft one; for the Catalyst one these, the rest as a new player has them.
 */
const COMPARE_ON = ["Sky Shaders: Aurora", "Minimap", "Ping", "CPS", "Coordinates", "Playtime", "Armour Status", "Saturation"];

/**
 * The home page: what Catalyst is, what it looks like, what it does and how to start - in that order,
 * because that's the order a new player asks. Every fact comes from the launcher and client
 * (lib/catalyst.ts); the screenshots are the real app.
 */
export default function HomePage() {
  const wings = SHOP_ITEMS.filter((item) => item.kind === "wings");
  return (
    <>
      <HashRedirect />

      {/* ------------------------------------------------------------------ hero */}
      <section className={styles.hero}>
        <Hall souls={30} />
        <div className={`wide ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <Reveal>
              <a className={styles.newsPill} href="#sign-in">
                <b>New</b>
                Sign in with your Microsoft account
                <ArrowIcon size={16} />
              </a>
            </Reveal>
            <Reveal delay={0.03}>
              <span className="kicker">Launcher + client · Minecraft {GAME_VERSION}</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="display">
                Minecraft,
                <br />
                <span className="shine-text">set up for you.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="lede">
                Catalyst installs your mods and keeps them up to date, adds {CLIENT_MODULES.length} modules to the
                game, and brings wings, capes and a battle pass - all from one app.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className={styles.actions}>
                <DownloadButton size="big" />
                <a className="btn big" href="#features">
                  See features
                </a>
              </div>
            </Reveal>
            <Reveal delay={0.24}>
              <p className={styles.facts}>
                <span>Free to play</span>
                <span>Windows and macOS</span>
                <span>
                  Minecraft {GAME_VERSION} with {LOADER}
                </span>
              </p>
            </Reveal>
          </div>
          <HeroStage />
        </div>
        <a className={styles.scrollCue} href="#what" aria-label="Scroll to what Catalyst is">
          SCROLL
          <i />
        </a>
      </section>

      {/* ------------------------------------------------------------------ what is it */}
      <section className="band" id="what">
        <div className="wide">
          <Reveal className="band-head center">
            <span className="kicker">What is Catalyst</span>
            <h2 className="headline">One app for all of it.</h2>
            <p className="lede">
              Catalyst is two things that work as one: a launcher that looks after Minecraft for you, and a client
              that makes the game itself better.
            </p>
          </Reveal>
          <Stagger className={styles.pillars}>
            <StaggerItem>
              <Tilt className={`panel ${styles.pillar}`}>
                <span className={styles.pillarIcon} style={{ color: "#4fa8e8" }}>
                  <BoxIcon />
                </span>
                <h3>A launcher that sets things up</h3>
                <p>
                  Profiles, memory, Java and mods - installed with everything they need, checked against your version,
                  and kept up to date.
                </p>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.pillar}`}>
                <span className={styles.pillarIcon} style={{ color: "#37d3c4" }}>
                  <GridIcon />
                </span>
                <h3>A client with {CLIENT_MODULES.length} modules</h3>
                <p>FPS, CPS, coordinates, a minimap, zoom, waypoints, projectile prediction and more - one Right Shift away.</p>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.pillar}`}>
                <span className={styles.pillarIcon} style={{ color: "#b36bff" }}>
                  <SparkIcon />
                </span>
                <h3>Cosmetics you can see</h3>
                <p>Wings and capes from the store, the battle pass and daily rewards - shown in 3D on this site.</p>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.pillar}`}>
                <span className={styles.pillarIcon} style={{ color: "#f0b429" }}>
                  <PixelSprite name="coin chest" size={24} />
                </span>
                <h3>Rewards and a community</h3>
                <p>Coins, codes and a daily calendar - and a site where players design the capes everyone votes on.</p>
              </Tilt>
            </StaggerItem>
          </Stagger>
          <Stagger className={styles.stats}>
            {STATS.map((stat) => (
              <StaggerItem key={stat.label} className={styles.stat}>
                <Counter to={stat.value} className={`shine-text ${styles.statValue}`} />
                <span className={styles.statLabel}>{stat.label}</span>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ------------------------------------------------------------------ the launcher, pinned */}
      <section className={styles.tourBand} aria-labelledby="tour-title">
        <div className="wide">
          <Reveal className="band-head">
            <span className="kicker">Inside the launcher</span>
            <h2 className="headline" id="tour-title">
              See it before you download it.
            </h2>
          </Reveal>
        </div>
        <Tour id="launcher-tour" chapters={LAUNCHER_CHAPTERS} label="Launcher pages" />
      </section>

      {/* ------------------------------------------------------------------ features */}
      <section className="band" id="features" aria-labelledby="features-title">
        <div className="wide">
          <Reveal className="band-head">
            <span className="kicker">Features</span>
            <h2 className="headline" id="features-title">
              Everything in the box.
            </h2>
            <p className="lede">No extra downloads, no folders to find. What Catalyst does, as it does it today.</p>
          </Reveal>
          <Reveal>
            <div className={`panel ${styles.modsPanel}`}>
              <div className={styles.modsCopy}>
                <span className={styles.tileIcon}>
                  <BoxIcon />
                </span>
                <h3>Mods, one click away</h3>
                <p>
                  Search Modrinth and CurseForge without leaving the launcher. Every install is checked against your
                  profile, brings the mods it needs and verifies each file. Installing from CurseForge comes next.
                </p>
                <ul className={styles.modsPoints}>
                  <li>Checked against your version and loader first</li>
                  <li>The mods it needs come along</li>
                  <li>Updates in one click</li>
                </ul>
                <p className={styles.modsTry}>Go on, press Install.</p>
              </div>
              <ModInstall mods={PROFILE_MODS} source={`${GAME_VERSION} ${LOADER}`} />
            </div>
          </Reveal>
          <Stagger className={styles.cards}>
            {FEATURE_CARDS.map((card, i) => {
              const body = (
                <>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a small transparent render, served as it is */}
                  <img className={styles.cardImage} src={card.image} alt="" loading="lazy" decoding="async" draggable={false} />
                </>
              );
              const className = [
                styles.featureCard,
                i === 0 && styles.featureCardLit,
                card.sky && styles.featureCardSky,
                card.wide && styles.featureCardWide,
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <StaggerItem key={card.title}>
                  {card.href ? (
                    <Link href={card.href} className={className}>
                      {body}
                    </Link>
                  ) : (
                    <div className={className}>{body}</div>
                  )}
                </StaggerItem>
              );
            })}
          </Stagger>
          <Reveal>
            <ul className={styles.moreFeatures} aria-label="And more">
              {MORE_FEATURES.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------ the client */}
      <section className={`band ${styles.clientBand}`} aria-labelledby="client-title">
        <div className="wide">
          <Reveal className="band-head center">
            <span className="kicker">Inside the game</span>
            <h2 className="headline" id="client-title">
              {CLIENT_MODULES.length} modules, one Right Shift away.
            </h2>
            <p className="lede">
              Press Right Shift in game and every module is there - search them, star them, switch them on. Scroll
              down and see them all.
            </p>
          </Reveal>
        </div>
        <ModuleVideo />
        <ModuleMarquee />
      </section>

      {/* ------------------------------------------------------------------ side by side */}
      <section className="band" id="compare" aria-labelledby="compare-title">
        <div className="wide">
          <Reveal className="band-head center">
            <span className="kicker">Side by side</span>
            <h2 className="headline" id="compare-title">
              Same world. More to see.
            </h2>
            <p className="lede">
              Two shots of the same moment in the same world. Drag the line: Catalyst on the left, Minecraft as it
              comes on the right.
            </p>
          </Reveal>
          <Reveal from="scale" className={styles.compareWrap}>
            <Compare
              left={{
                image: compareCatalyst,
                label: "With Catalyst",
                accent: true,
                alt: "A snowy valley with Catalyst: an aurora and stars from Sky Shaders fill the sky, ping, CPS, coordinates, playtime and armour durability run down the left, and a minimap sits top right",
              }}
              right={{
                image: compareMinecraft,
                label: "Minecraft",
                alt: "The same moment in Minecraft without Catalyst: a blue sky with blocky clouds, and only the hotbar, health and hunger on screen",
              }}
            />
            <div className={styles.compareFoot}>
              <div className={styles.chips} aria-label="Switched on in the Catalyst shot">
                {COMPARE_ON.map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </div>
              <span className={styles.compareHint}>Real in-game screenshots · drag the line</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------ how it works */}
      <section className="band" aria-labelledby="how-title">
        <div className="wide">
          <Reveal className="band-head center">
            <span className="kicker">How it works</span>
            <h2 className="headline" id="how-title">
              Four steps to playing.
            </h2>
          </Reveal>
          <Stagger as="ol" className={styles.steps}>
            <StaggerItem as="li" className={`panel ${styles.step}`}>
              <span className={styles.stepNo}>01</span>
              <h3>Download Catalyst</h3>
              <p>Get the launcher for Windows or macOS. It runs Minecraft {GAME_VERSION} with {LOADER} for you.</p>
            </StaggerItem>
            <StaggerItem as="li" className={`panel ${styles.step}`}>
              <span className={styles.stepNo}>02</span>
              <h3>Sign in with Microsoft</h3>
              <p>
                On Microsoft&apos;s own page, with the account that owns Minecraft -{" "}
                <a href="#sign-in">how sign-in works</a>.
              </p>
            </StaggerItem>
            <StaggerItem as="li" className={`panel ${styles.step}`}>
              <span className={styles.stepNo}>03</span>
              <h3>Pick your profile and mods</h3>
              <p>
                Catalyst {GAME_VERSION} {LOADER} is ready from the start, with {PREINSTALLED_MODS.join(", ")}. Add more from
                the Mods page.
              </p>
            </StaggerItem>
            <StaggerItem as="li" className={`panel ${styles.step}`}>
              <span className={styles.stepNo}>04</span>
              <h3>Press Launch</h3>
              <p>You play as yourself, online too. Your mods load, your modules wait behind Right Shift, and your cosmetics come with you.</p>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      {/* ------------------------------------------------------------------ sign-in */}
      <section className="band" id="sign-in" aria-labelledby="signin-title">
        <div className={`wide ${styles.signIn}`}>
          <Reveal className={styles.signInCopy}>
            <span className="kicker" style={{ color: "var(--green)" }}>
              Microsoft sign-in
            </span>
            <h2 className="headline" id="signin-title">
              Sign in with your <span className="shine-text">real account.</span>
            </h2>
            <p className="lede">
              Catalyst signs you in with Microsoft, the way Minecraft&apos;s own launcher does - Mojang reviewed the app
              and allowed it to on {SIGN_IN.approvedOn}. Sign in once, and the game starts as you.
            </p>
            <ul className={styles.signInPoints}>
              <li>
                <LockIcon size={22} />
                <div>
                  <b>Your password stays with Microsoft</b>
                  <span>You sign in on Microsoft&apos;s own page, in your browser. Catalyst never sees your email or password.</span>
                </div>
              </li>
              <li>
                <UserIcon size={22} />
                <div>
                  <b>Play as yourself</b>
                  <span>
                    Your name and your skin in game - and online servers let you in, because they check your account with
                    Mojang when you join.
                  </span>
                </div>
              </li>
              <li>
                <CheckIcon size={22} />
                <div>
                  <b>Signed in, and still yours</b>
                  <span>
                    The launcher renews your sign-in by itself. Take its access back any time on{" "}
                    <a href={SIGN_IN.manageUrl} rel="noreferrer">
                      Microsoft&apos;s account page
                    </a>
                    .
                  </span>
                </div>
              </li>
            </ul>
            <p className={styles.signInFine}>
              Catalyst is not an official Minecraft product, and is not approved by or associated with Mojang or
              Microsoft. Being allowed to use Minecraft sign-in lets the launcher sign you in - nothing more.
            </p>
          </Reveal>
          <Reveal from="scale" delay={0.1} className={styles.chainWrap}>
            <ol className={styles.chain} aria-label="What happens when you sign in">
              <li className={styles.chainStep}>
                <span className={styles.chainNode} style={{ color: "#8cc8f2" }}>
                  <LockIcon size={20} />
                </span>
                <div>
                  <h3>
                    Microsoft <span className={styles.chainWhere}>In your browser</span>
                  </h3>
                  <p>You sign in on Microsoft&apos;s own page, and pick the account that owns Minecraft.</p>
                </div>
              </li>
              <li className={styles.chainStep}>
                <span className={styles.chainNode} style={{ color: "#4fa8e8" }}>
                  <UserIcon size={20} />
                </span>
                <div>
                  <h3>Xbox Live</h3>
                  <p>Your Microsoft account vouches for your Xbox profile - the one Minecraft knows you by.</p>
                </div>
              </li>
              <li className={styles.chainStep}>
                <span className={styles.chainNode} style={{ color: "#37d3c4" }}>
                  <ShieldCheckIcon size={20} />
                </span>
                <div>
                  <h3>Minecraft</h3>
                  <p>Mojang checks that Catalyst is on its sign-in allow list, then hands back your Minecraft profile.</p>
                </div>
              </li>
              <li className={styles.chainStep}>
                <span className={styles.chainNode} style={{ color: "#5fbf87" }}>
                  <PlayIcon size={20} />
                </span>
                <div>
                  <h3>Catalyst</h3>
                  <p>Press Play, and the game starts as you - your name, your skin, your servers.</p>
                </div>
              </li>
            </ol>
            <i className={styles.chainLight} aria-hidden="true" />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------ the store */}
      <section className="band tight" aria-labelledby="store-title">
        <div className="wide">
          <Reveal className="band-head">
            <span className="kicker gold">The store</span>
            <h2 className="headline" id="store-title">
              Look the part.
            </h2>
            <p className="lede">Everything is optional, and everything is in the launcher. Here&apos;s what&apos;s in it.</p>
          </Reveal>
          <Stagger className={styles.storeGrid}>
            <StaggerItem>
              <Link href="/cosmetics" className={styles.storeCard}>
                <Tilt className={`panel ${styles.storeInner}`}>
                  <div className={styles.storeArt}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- the shop's own still of the model */}
                    <img src={SHOP_ITEMS.find((i) => i.id === "stoneheart-wings")?.picture} alt="" width={560} height={560} loading="lazy" decoding="async" />
                  </div>
                  <span className="kicker blue">Cosmetics</span>
                  <h3>Wings, gauntlets and capes</h3>
                  <p>
                    {wings.length} wings from {Math.min(...wings.map((w) => w.price ?? Infinity)).toLocaleString("en-US")} coins,{" "}
                    {SHOP_ITEMS.filter((i) => i.kind === "gauntlet").length} gauntlets and {SHOP_ITEMS.filter((i) => i.kind === "cape").length} capes -
                    in 3D.
                  </p>
                  <span className={styles.tileLink}>
                    Browse cosmetics <ArrowIcon size={16} />
                  </span>
                </Tilt>
              </Link>
            </StaggerItem>
            <StaggerItem>
              <Link href="/coins" className={styles.storeCard}>
                <Tilt className={`panel ${styles.storeInner} ${styles.storeGold}`}>
                  <div className={styles.storeArt}>
                    <PixelSprite name="coin chest" size={96} />
                  </div>
                  <span className="kicker gold">Coins</span>
                  <h3>Coin packs</h3>
                  <p>
                    From {COIN_PACKS[0].coins.toLocaleString("en-US")} coins for {usd(COIN_PACKS[0].priceCents)} - or earn them every
                    day.
                  </p>
                  <span className={styles.tileLink}>
                    About coins <ArrowIcon size={16} />
                  </span>
                </Tilt>
              </Link>
            </StaggerItem>
            <StaggerItem>
              <Link href="/battle-pass" className={styles.storeCard}>
                <Tilt className={`panel ${styles.storeInner} ${styles.storeEmber}`}>
                  <div className={styles.storeArt}>
                    <WingsArt colors={[...SEASON.headlineColors]} id="store-emberfall" />
                  </div>
                  <span className="kicker" style={{ color: "#ffb27a" }}>
                    Season {SEASON.number}
                  </span>
                  <h3>{SEASON.name} battle pass</h3>
                  <p>
                    {SEASON.levels} levels ending in the {SEASON.headline}. {usd(SEASON.priceCents)}.
                  </p>
                  <span className={styles.tileLink}>
                    See every level <ArrowIcon size={16} />
                  </span>
                </Tilt>
              </Link>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      {/* ------------------------------------------------------------------ community */}
      <section className="band" aria-labelledby="designs-title">
        <div className={`wide ${styles.designs}`}>
          <Reveal className={styles.designsCopy}>
            <span className="kicker">Catalyst Designs</span>
            <h2 className="display" id="designs-title">
              Made by <span className="shine-text">players.</span>
            </h2>
            <p className="lede">
              Draw a cape right in your browser or upload one. A person checks every design, players vote, and the
              winners become cosmetics.
            </p>
            <ol className={styles.designSteps}>
              <li>
                <b>Draw or upload</b> a 64×32 cape
              </li>
              <li>
                <b>A person checks it</b> - nothing is shown before
              </li>
              <li>
                <b>Players vote</b> - the winners go into the game
              </li>
            </ol>
            <div className={styles.actions}>
              <Link className="btn primary" href="/designs#submit">
                Design a cape
              </Link>
              <Link className="btn" href="/designs#vote">
                Vote on the round
              </Link>
            </div>
          </Reveal>
          <Reveal from="scale" className={styles.designArt}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a still rendered from the site's own 3D players */}
            <img
              src="/stills/designs-trio.webp"
              alt="Three players seen from behind, wearing the Emberfall, Sculk and Aurora capes"
              width={1356}
              height={905}
              loading="lazy"
              decoding="async"
            />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------ download */}
      <section className={styles.final} aria-labelledby="final-title">
        <Hall souls={18} ribbons={false} height={620} fade />
        <div className={`wide ${styles.finalGrid}`}>
          <Reveal className={styles.finalCopy}>
            <span className="kicker">Ready when you are</span>
            <h2 className="display" id="final-title">
              Play <span className="shine-text">better.</span>
            </h2>
            <p className="lede">Your mods, your modules and your look - in one launcher. Free to play.</p>
            <div className={styles.actions}>
              <DownloadButton size="big" />
              <Link className="btn big" href="/download#notes">
                Release notes
              </Link>
            </div>
            <p className={styles.platforms}>
              <span>
                <WindowsIcon size={18} /> Windows
              </span>
              <span>
                <AppleIcon size={18} /> macOS
              </span>
              <span>
                Minecraft {GAME_VERSION} with {LOADER}
              </span>
            </p>
          </Reveal>
          <Reveal from="scale" className={styles.finalArt}>
            <CtaStage />
          </Reveal>
        </div>
      </section>
    </>
  );
}
