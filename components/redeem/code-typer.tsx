"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * A code being typed into the launcher's box, over and over: CATL-, then each group of four as the
 * letters roll into place. Decoration only - the example code is not a real one.
 */
export function CodeTyper({ code, className }: { code: string; className?: string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(code);
  useEffect(() => {
    if (reduced) {
      setShown(code);
      return;
    }
    let typed = 0;
    let held = 0;
    let t = 0;
    const step = () => {
      if (typed < code.length) {
        typed++;
        // The next letter "rolls" before it lands, like a slot machine.
        const next = typed < code.length && code[typed] !== "-" ? ALPHABET[Math.floor(Math.random() * ALPHABET.length)] : "";
        setShown(code.slice(0, typed) + next);
        t = window.setTimeout(step, 70);
      } else if (held < 34) {
        held++;
        setShown(code);
        t = window.setTimeout(step, 70);
      } else {
        typed = 0;
        held = 0;
        setShown("");
        t = window.setTimeout(step, 400);
      }
    };
    t = window.setTimeout(step, 400);
    return () => window.clearTimeout(t);
  }, [code, reduced]);
  return (
    <span className={className}>
      <span aria-hidden="true">{shown || " "}</span>
      <span className="visually-hidden">{code}</span>
    </span>
  );
}
