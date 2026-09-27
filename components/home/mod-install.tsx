"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/components/site/icons";
import { useReducedMotionAfterMount } from "@/components/site/motion";
import styles from "@/app/home.module.css";

type State = "idle" | "installing" | "installed";

/** How long a pretend install takes - about as long as a small mod really does. */
const INSTALL_MILLIS = 1100;

/**
 * The launcher's Mods list, playable: Install fills a bar, then the row turns green and says so. Only a
 * picture of the real thing - nothing is downloaded. The first mod starts installed, as Sodium comes
 * with every profile.
 */
export function ModInstall({ mods, source }: { mods: readonly string[]; source: string }) {
  const reduced = useReducedMotionAfterMount();
  const [states, setStates] = useState<State[]>(() => mods.map((_, i) => (i === 0 ? "installed" : "idle")));
  const [said, setSaid] = useState("");
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const set = (i: number, state: State) => setStates((all) => all.map((s, j) => (j === i ? state : s)));

  function install(i: number) {
    if (states[i] !== "idle") return;
    if (reduced) {
      set(i, "installed");
      setSaid(`${mods[i]} installed`);
      return;
    }
    set(i, "installing");
    setSaid(`Installing ${mods[i]}`);
    timers.current.push(
      window.setTimeout(() => {
        set(i, "installed");
        setSaid(`${mods[i]} installed`);
      }, INSTALL_MILLIS),
    );
  }

  const installed = states.filter((s) => s === "installed").length;
  return (
    <div className={styles.modDemo}>
      <div className={styles.modDemoHead}>
        <span>Catalyst {source}</span>
        <b>
          {installed} of {mods.length} installed
        </b>
      </div>
      <ul className={styles.modList}>
        {mods.map((mod, i) => (
          <li key={mod} data-state={states[i]}>
            <span className={styles.modDot} style={{ background: `hsl(${150 + i * 36} 55% 55%)` }} />
            <b>{mod}</b>
            <em>Modrinth</em>
            {states[i] === "installed" ? (
              <span className={styles.modDone}>
                <CheckIcon size={15} />
                Installed
              </span>
            ) : (
              <button
                type="button"
                className={styles.modButton}
                onClick={() => install(i)}
                disabled={states[i] === "installing"}
                aria-label={`Install ${mod}`}
              >
                <span>{states[i] === "installing" ? "Installing" : "Install"}</span>
                <i style={{ animationDuration: `${INSTALL_MILLIS}ms` }} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="visually-hidden" aria-live="polite">
        {said}
      </p>
    </div>
  );
}
