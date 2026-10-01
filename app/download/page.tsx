import type { Metadata } from "next";
import Link from "next/link";
import { Platforms } from "@/components/download/platforms";
import { Hall } from "@/components/site/hall";
import { Reveal, Stagger, StaggerItem } from "@/components/site/motion";
import { DOWNLOAD_URLS, GAME_VERSION, LOADER, PREINSTALLED_MODS, RELEASE_NOTES } from "@/lib/catalyst";
import styles from "./download.module.css";

export const metadata: Metadata = {
  title: "Download",
  description: `Catalyst for Windows and macOS: a launcher and client for Minecraft ${GAME_VERSION} with ${LOADER}. System requirements and release notes.`,
};

const TAG_COLOUR: Record<string, string> = { Launcher: "#4fa8e8", Client: "#5fbf87", Store: "#f0b429" };

export default function DownloadPage() {
  const released = DOWNLOAD_URLS.windows || DOWNLOAD_URLS.macos;
  return (
    <>
      <section className="page-top">
        <Hall souls={22} />
        <div className="wide" style={{ position: "relative", zIndex: 1 }}>
          <Reveal className="band-head center" amount={0}>
            <span className="kicker">Download</span>
            <h1 className="display" style={{ fontSize: "clamp(2.75rem, 6.6vw, 5.5rem)" }}>
              Get <span className="shine-text">Catalyst.</span>
            </h1>
            <p className="lede">
              One launcher for Windows and macOS. It runs Minecraft {GAME_VERSION} with {LOADER}, with{" "}
              {PREINSTALLED_MODS.join(", ").replace(/, ([^,]*)$/, " and $1")} already in.
            </p>
          </Reveal>
          <Reveal delay={0.1} amount={0}>
            <Platforms />
          </Reveal>
          {!released && (
            <p className={`note ${styles.placeholder}`}>
              <b>Coming soon.</b>&nbsp;The first public build of Catalyst isn&apos;t out yet. When it is, these buttons will
              download it - no account or other app needed.
            </p>
          )}
        </div>
      </section>

      <section className="band tight" aria-labelledby="needs-title">
        <div className="wide">
          <Reveal className="band-head">
            <span className="kicker blue">What you need</span>
            <h2 className="headline" id="needs-title">
              System requirements.
            </h2>
          </Reveal>
          <Stagger className={styles.needs}>
            <StaggerItem className={`panel ${styles.need}`}>
              <b>Computer</b>
              <span>Windows or macOS.</span>
            </StaggerItem>
            <StaggerItem className={`panel ${styles.need}`}>
              <b>Game</b>
              <span>
                Minecraft: Java Edition {GAME_VERSION}, run with {LOADER} by the launcher.
              </span>
            </StaggerItem>
            <StaggerItem className={`panel ${styles.need}`}>
              <b>Account</b>
              <span>
                A Microsoft account that owns Minecraft: Java Edition. You sign in on Microsoft&apos;s own page - Catalyst
                is <Link href="/#sign-in">approved for Minecraft sign-in</Link>.
              </span>
            </StaggerItem>
            <StaggerItem className={`panel ${styles.need}`}>
              <b>Memory</b>
              <span>Enough to give the game 2 GB or more - you choose 2 to 16 GB in Settings.</span>
            </StaggerItem>
            <StaggerItem className={`panel ${styles.need}`}>
              <b>Java</b>
              <span>Java 21 or newer. The launcher finds one for you, or you can point it at yours.</span>
            </StaggerItem>
            <StaggerItem className={`panel ${styles.need}`}>
              <b>Internet</b>
              <span>For mods, updates, codes and the store. Nothing else needs to be installed.</span>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      <section className="band" id="notes" aria-labelledby="notes-title">
        <div className="wide">
          <Reveal className="band-head">
            <span className="kicker">Release notes</span>
            <h2 className="headline" id="notes-title">
              What&apos;s new.
            </h2>
            <p className="lede">The latest from the launcher&apos;s News page - real changes only.</p>
          </Reveal>
          <ol className={styles.timeline}>
            {RELEASE_NOTES.map((note, i) => (
              <Reveal as="li" key={note.title} className={styles.entry} delay={Math.min(i, 3) * 0.05}>
                <span className={styles.dot} style={{ background: TAG_COLOUR[note.tag] }} aria-hidden="true" />
                <div className={styles.meta}>
                  <span className="tag" style={{ color: TAG_COLOUR[note.tag] }}>
                    {note.tag}
                  </span>
                  <time>{note.date}</time>
                </div>
                <h3>{note.title}</h3>
                <p className={styles.excerpt}>{note.excerpt}</p>
                <ul>
                  {note.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
