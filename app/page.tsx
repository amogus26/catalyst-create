import Link from "next/link";
import clientHud from "@/assets/screens/client-hud.webp";
import clientModules from "@/assets/screens/client-modules.webp";
import clientTitle from "@/assets/screens/client-title.webp";
import launcherControls from "@/assets/screens/launcher-controls.webp";
import launcherHome from "@/assets/screens/launcher-home.webp";
import launcherMods from "@/assets/screens/launcher-mods.webp";
import launcherPass from "@/assets/screens/launcher-pass.webp";
import { ClientViews, ModuleMarquee } from "@/components/home/client-showcase";
import { HeroStage } from "@/components/home/hero-stage";
import { Tour, type Chapter } from "@/components/home/tour";
import { CapeArt, WingsArt } from "@/components/site/cosmetic-art";
import { DownloadButton } from "@/components/site/download-button";
import { Hall } from "@/components/site/hall";
import { HashRedirect } from "@/components/site/hash-redirect";
import { ModInstall } from "@/components/home/mod-install";
import {
  ArrowIcon,
  BoltIcon,
  BoxIcon,
  ChatIcon,
  GridIcon,
  LayersIcon,
  PaletteIcon,
  SlidersIcon,
  SoundIcon,
  WindowsIcon,
  AppleIcon,
  SparkIcon,
} from "@/components/site/icons";
import { Reveal, Stagger, StaggerItem, Tilt } from "@/components/site/motion";
import { PixelSprite } from "@/components/site/pixel-sprite";
import {
  CLIENT_MODULES,
  COIN_PACKS,
  GAME_VERSION,
  LOADER,
  PREINSTALLED_MODS,
  SEASON,
  SHOP_ITEMS,
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
    text: "Search Modrinth from inside the launcher. Every install is checked against your profile first and brings the mods it needs along with it.",
    points: ["Search, sort and filter by category", "Dependencies installed for you, hashes checked", "Updates in one click - CurseForge is coming"],
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

/** The six features under the mods panel - what the launcher does besides mods, one line each. */
const FEATURES = [
  {
    title: "Fast from the first launch",
    text: `${PREINSTALLED_MODS.join(", ").replace(/, ([^,]*)$/, " and $1")} come installed, and stay on their newest build.`,
    Icon: BoltIcon,
    colour: "#f0b429",
  },
  {
    title: "Profiles that keep mods apart",
    text: "Each profile has its own mods. A mod that doesn't fit says why - and offers to make a profile it does fit.",
    Icon: LayersIcon,
    colour: "#8cc8f2",
  },
  {
    title: "Your colours",
    text: `${THEME_PRESETS.length} colour schemes - or one built from any colour. The client's menu follows.`,
    Icon: PaletteIcon,
    colour: "#fa86b6",
  },
  {
    title: "Your sounds",
    text: "Your own hit and block sounds, and a picture behind your inventory - set in the launcher, heard in game.",
    Icon: SoundIcon,
    colour: "#4fa8e8",
  },
  {
    title: "Help, built in",
    text: "Catalyst Bot answers the usual questions - mods, crashes, the menu, rewards - right on Home.",
    Icon: ChatIcon,
    colour: "#37d3c4",
  },
  {
    title: "Memory and Java, sorted",
    text: "Give the game 2 to 16 GB, pick a Java or let Catalyst find one, and choose the game's window size.",
    Icon: SlidersIcon,
    colour: "#b9c0cc",
  },
];

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
                  Search Modrinth without leaving the launcher. Every install is checked against your profile, brings the
                  mods it needs and verifies each file. CurseForge joins once it&apos;s switched on.
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
          <Stagger className={styles.featureGrid}>
            {FEATURES.map((feature) => (
              <StaggerItem key={feature.title} className={`panel ${styles.feature}`}>
                <span className={styles.tileIcon} style={{ color: feature.colour }}>
                  <feature.Icon />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                {feature.title === "Fast from the first launch" && (
                  <div className={styles.chips}>
                    {PREINSTALLED_MODS.map((mod) => (
                      <span key={mod}>{mod}</span>
                    ))}
                  </div>
                )}
                {feature.title === "Your colours" && (
                  <div className={styles.swatches} role="img" aria-label={`${THEME_PRESETS.length} colour schemes`}>
                    {THEME_PRESETS.map((preset) => (
                      <span key={preset.name} title={preset.name} style={{ background: preset.accent }} />
                    ))}
                  </div>
                )}
              </StaggerItem>
            ))}
          </Stagger>
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
              A title screen of your own, a module menu you can search, and a HUD you drag into place - the client
              is part of the game, not a window on top of it.
            </p>
          </Reveal>
          <ClientViews
            shots={[
              { image: clientTitle, alt: "The client's title screen with Quick Play, Singleplayer, Multiplayer, Realms, Mods and Favourite servers", label: "Title screen" },
              { image: clientModules, alt: "The client's module menu: cards for Damage Numbers, CPS, Playtime, FPS, Ping and Coordinates, each with Settings", label: "Module menu" },
              { image: clientHud, alt: "Edit HUD: CPS, coordinates, FPS and cooldowns placed over the game, with drag, scroll and snapping hints", label: "HUD editor" },
            ]}
          />
        </div>
        <ModuleMarquee />
      </section>

      {/* ------------------------------------------------------------------ how it works */}
      <section className="band" aria-labelledby="how-title">
        <div className="wide">
          <Reveal className="band-head center">
            <span className="kicker">How it works</span>
            <h2 className="headline" id="how-title">
              Three steps to playing.
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
              <h3>Pick your profile and mods</h3>
              <p>
                Catalyst {GAME_VERSION} {LOADER} is ready from the start, with {PREINSTALLED_MODS.join(", ")}. Add more from
                the Mods page.
              </p>
            </StaggerItem>
            <StaggerItem as="li" className={`panel ${styles.step}`}>
              <span className={styles.stepNo}>03</span>
              <h3>Press Launch</h3>
              <p>Your mods load, your modules are waiting behind Right Shift, and your cosmetics come with you.</p>
            </StaggerItem>
          </Stagger>
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
                    <WingsArt colors={SHOP_ITEMS.find((i) => i.id === "frost-wings")!.colors} id="store-frost" />
                  </div>
                  <span className="kicker blue">Cosmetics</span>
                  <h3>Wings and capes</h3>
                  <p>
                    {wings.length} wings from {Math.min(...wings.map((w) => w.price ?? Infinity)).toLocaleString("en-US")} coins, and{" "}
                    {SHOP_ITEMS.length - wings.length} capes - in 3D.
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
            {/* eslint-disable-next-line @next/next/no-img-element -- a still rendered from the site's own 3D player */}
            <img
              src="/stills/cta-wave.webp"
              alt="A player in the Sculk Cape and Prism Wings, waving"
              width={1184}
              height={979}
              loading="lazy"
              decoding="async"
            />
          </Reveal>
        </div>
      </section>
    </>
  );
}
