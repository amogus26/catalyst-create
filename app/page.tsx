import Link from "next/link";
import clientHud from "@/assets/screens/client-hud.jpg";
import clientModules from "@/assets/screens/client-modules.jpg";
import clientTitle from "@/assets/screens/client-title.jpg";
import launcherControls from "@/assets/screens/launcher-controls.jpg";
import launcherHome from "@/assets/screens/launcher-home.jpg";
import launcherMods from "@/assets/screens/launcher-mods.jpg";
import launcherShop from "@/assets/screens/launcher-shop.jpg";
import { ClientFan, ModuleMarquee } from "@/components/home/client-showcase";
import { HeroStage } from "@/components/home/hero-stage";
import { Tour, type Chapter } from "@/components/home/tour";
import { CapeArt, WingsArt } from "@/components/site/cosmetic-art";
import { DownloadButton } from "@/components/site/download-button";
import { Hall } from "@/components/site/hall";
import { HashRedirect } from "@/components/site/hash-redirect";
import {
  ArrowIcon,
  BannerIcon,
  BoltIcon,
  BoxIcon,
  CalendarIcon,
  ChatIcon,
  GridIcon,
  LayersIcon,
  PaletteIcon,
  SlidersIcon,
  SoundIcon,
  SparkIcon,
  TicketIcon,
} from "@/components/site/icons";
import { Counter, Reveal, Stagger, StaggerItem, Tilt } from "@/components/site/motion";
import { PixelSprite } from "@/components/site/pixel-sprite";
import {
  CLIENT_MODULES,
  COIN_PACKS,
  DAILY_MONTH_COINS,
  GAME_VERSION,
  LOADER,
  PREINSTALLED_MODS,
  QUEST_XP_PER_DAY,
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
    key: "store",
    kicker: "Store",
    title: "Something new every day.",
    text: "Open a daily reward card, level up the battle pass with daily quests, and find the community's cape designs - all in the Store.",
    points: ["A 30-day calendar with lucky days", `Battle pass Season ${SEASON.number}: ${SEASON.name}`, "Wings and capes in Cosmetics"],
    image: launcherShop,
    alt: "The launcher's Store with the battle pass banner and a row of daily reward cards",
  },
];

const PROFILE_MODS = ["Sodium", "Iris Shaders", "Cloth Config API", "Entity Culling", "FerriteCore", "Mod Menu"];

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
          <Stagger className={styles.bento}>
            <StaggerItem className={styles.spanWide}>
              <Tilt className={`panel ${styles.tile} ${styles.tileMods}`} max={4}>
                <div className={styles.tileHead}>
                  <span className={styles.tileIcon}>
                    <BoxIcon />
                  </span>
                  <h3>Mods, one click away</h3>
                </div>
                <p>
                  Search Modrinth without leaving the launcher. Each install is checked against your profile, brings the
                  mods it needs and verifies every file. CurseForge joins once it&apos;s switched on.
                </p>
                <ul className={styles.modList} aria-label="Mods on Modrinth">
                  {PROFILE_MODS.map((mod, i) => (
                    <li key={mod}>
                      <span className={styles.modDot} style={{ background: `hsl(${150 + i * 36} 55% 55%)` }} />
                      <b>{mod}</b>
                      <em>Modrinth · {LOADER}</em>
                      <span className={i < 1 ? styles.modInstalled : styles.modInstall}>{i < 1 ? "Installed" : "Install"}</span>
                    </li>
                  ))}
                </ul>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.tile}`}>
                <div className={styles.tileHead}>
                  <span className={styles.tileIcon} style={{ color: "#f0b429" }}>
                    <BoltIcon />
                  </span>
                  <h3>Fast from the first launch</h3>
                </div>
                <p>{PREINSTALLED_MODS.join(", ").replace(/, ([^,]*)$/, " and $1")} come installed, and stay on their newest build.</p>
                <div className={styles.chips}>
                  {PREINSTALLED_MODS.map((mod) => (
                    <span key={mod}>{mod}</span>
                  ))}
                </div>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.tile}`}>
                <div className={styles.tileHead}>
                  <span className={styles.tileIcon} style={{ color: "#37d3c4" }}>
                    <GridIcon />
                  </span>
                  <h3>
                    <Counter to={CLIENT_MODULES.length} /> modules
                  </h3>
                </div>
                <p>HUD, visual, PvP and world modules in one menu - search them, star them, drag the HUD where you want it.</p>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.tile}`}>
                <div className={styles.tileHead}>
                  <span className={styles.tileIcon} style={{ color: "#8cc8f2" }}>
                    <LayersIcon />
                  </span>
                  <h3>Profiles that keep mods apart</h3>
                </div>
                <p>
                  Each profile has its own mods. A mod that doesn&apos;t fit says why - and offers to make a profile it does
                  fit.
                </p>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.tile}`}>
                <div className={styles.tileHead}>
                  <span className={styles.tileIcon} style={{ color: "#b36bff" }}>
                    <SparkIcon />
                  </span>
                  <h3>Wings and capes</h3>
                </div>
                <div className={styles.tileArt}>
                  <WingsArt colors={wings[0].colors} id="tile-prism" />
                  <CapeArt colors={SHOP_ITEMS.find((i) => i.id === "sculk-cape")!.colors} id="tile-sculk" />
                </div>
                <Link className={styles.tileLink} href="/cosmetics">
                  See them in 3D <ArrowIcon size={16} />
                </Link>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.tile}`}>
                <div className={styles.tileHead}>
                  <span className={styles.tileIcon} style={{ color: "#d98a5a" }}>
                    <BannerIcon />
                  </span>
                  <h3>A battle pass that plays along</h3>
                </div>
                <p>
                  {SEASON.levels} levels, earned through daily quests worth up to {QUEST_XP_PER_DAY} XP a day. Season{" "}
                  {SEASON.number}: {SEASON.name}.
                </p>
                <Link className={styles.tileLink} href="/battle-pass">
                  See the rewards <ArrowIcon size={16} />
                </Link>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.tile}`}>
                <div className={styles.tileHead}>
                  <span className={styles.tileIcon} style={{ color: "#5fbf87" }}>
                    <CalendarIcon />
                  </span>
                  <h3>Something every day</h3>
                </div>
                <p>
                  A 30-day calendar of coins and cosmetics - {DAILY_MONTH_COINS.toLocaleString("en-US")} coins a month, and
                  lucky days pay double.
                </p>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.tile}`}>
                <div className={styles.tileHead}>
                  <span className={styles.tileIcon} style={{ color: "#f0b429" }}>
                    <TicketIcon />
                  </span>
                  <h3>Redeem codes</h3>
                </div>
                <p>Codes from giveaways and events give coins, a sale, an item or an exclusive - redeemed in the launcher.</p>
                <Link className={styles.tileLink} href="/redeem">
                  How codes work <ArrowIcon size={16} />
                </Link>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.tile}`}>
                <div className={styles.tileHead}>
                  <span className={styles.tileIcon} style={{ color: "#fa86b6" }}>
                    <PaletteIcon />
                  </span>
                  <h3>Your colours</h3>
                </div>
                <p>{THEME_PRESETS.length} colour schemes - or one built from any colour. The client&apos;s menu follows.</p>
                <div className={styles.swatches} aria-label="Colour schemes">
                  {THEME_PRESETS.map((preset) => (
                    <span key={preset.name} title={preset.name} style={{ background: preset.accent }} />
                  ))}
                </div>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.tile}`}>
                <div className={styles.tileHead}>
                  <span className={styles.tileIcon} style={{ color: "#4fa8e8" }}>
                    <SoundIcon />
                  </span>
                  <h3>Your sounds</h3>
                </div>
                <p>Your own hit and block sounds, and a picture behind your inventory - set in the launcher, heard in game.</p>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.tile}`}>
                <div className={styles.tileHead}>
                  <span className={styles.tileIcon} style={{ color: "#37d3c4" }}>
                    <ChatIcon />
                  </span>
                  <h3>Help, built in</h3>
                </div>
                <p>Catalyst Bot answers the usual questions - mods, crashes, the menu, rewards - right on Home.</p>
              </Tilt>
            </StaggerItem>
            <StaggerItem>
              <Tilt className={`panel ${styles.tile}`}>
                <div className={styles.tileHead}>
                  <span className={styles.tileIcon} style={{ color: "#b9c0cc" }}>
                    <SlidersIcon />
                  </span>
                  <h3>Memory and Java, sorted</h3>
                </div>
                <p>Give the game 2 to 16 GB, pick a Java or let Catalyst find one, and choose the game&apos;s window size.</p>
              </Tilt>
            </StaggerItem>
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
          <ClientFan
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
      <section className="band tight" aria-labelledby="designs-title">
        <div className="wide">
          <Reveal>
            <div className={`panel ${styles.designs}`}>
              <div>
                <span className="kicker">Catalyst Designs</span>
                <h2 className="headline" id="designs-title">
                  Made by players.
                </h2>
                <p className="lede">
                  Draw a cape right in your browser or upload one. A person checks every design, players vote, and the
                  winners become cosmetics.
                </p>
                <div className={styles.actions}>
                  <Link className="btn primary" href="/designs#submit">
                    Design a cape
                  </Link>
                  <Link className="btn" href="/designs#vote">
                    Vote on the round
                  </Link>
                </div>
              </div>
              <div className={styles.designArt} aria-hidden="true">
                {SHOP_ITEMS.filter((i) => i.kind === "cape")
                  .slice(0, 3)
                  .map((cape, i) => (
                    <div key={cape.id} className={styles.designCape} style={{ ["--i" as string]: i }}>
                      <CapeArt colors={cape.colors} id={`community-${cape.id}`} />
                    </div>
                  ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------ download */}
      <section className={styles.final} aria-labelledby="final-title">
        <Hall souls={18} ribbons={false} height={520} fade />
        <div className="wide">
          <Reveal className="band-head center">
            <span className="kicker">Ready when you are</span>
            <h2 className="display" id="final-title" style={{ fontSize: "clamp(40px, 6vw, 80px)" }}>
              Play <span className="shine-text">better.</span>
            </h2>
            <p className="lede">Free to play, on Windows and macOS. Your mods, your modules and your look - in one launcher.</p>
            <div className={styles.actions} style={{ justifyContent: "center" }}>
              <DownloadButton size="big" />
              <Link className="btn big" href="/download#notes">
                Release notes
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
