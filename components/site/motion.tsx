"use client";

import { animate, motion, useInView, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const EASE = [0.2, 0.8, 0.2, 1] as const;

/**
 * Whether the reader asked for reduced motion - false on the server and on the first render in the
 * browser, so the HTML is always the same both sides (a mismatch makes React throw the page away and
 * render it again). Every piece below keeps the same markup either way and only changes its timing:
 * with reduced motion, things arrive at once instead of travelling.
 */
export function useReducedMotionAfterMount(): boolean {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}

type From = "up" | "left" | "right" | "scale" | "fade";

const SHOWN = { opacity: 1, x: 0, y: 0, scale: 1 };

const OFFSETS: Record<From, { x?: number; y?: number; scale?: number }> = {
  up: { y: 34 },
  left: { x: -40 },
  right: { x: 40 },
  scale: { scale: 0.94, y: 18 },
  fade: {},
};

/**
 * A piece of page that arrives as it is scrolled to: it rises (or slides, or grows) in from a little
 * way off and fades up, once. With reduced motion it is simply there.
 */
export function Reveal({
  children,
  from = "up",
  delay = 0,
  className,
  style,
  amount = 0.25,
  as = "div",
}: {
  children: ReactNode;
  from?: From;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  amount?: number;
  as?: "div" | "section" | "li" | "article";
}) {
  const reduced = useReducedMotionAfterMount();
  const Tag = motion[as];
  // With reduced motion everything is shown at once, rather than popping in while scrolling.
  return (
    <Tag
      className={className}
      style={style}
      initial={{ opacity: 0, ...OFFSETS[from] }}
      animate={reduced ? SHOWN : undefined}
      whileInView={reduced ? undefined : SHOWN}
      viewport={{ once: true, amount }}
      transition={reduced ? { duration: 0 } : { duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

const staggerParent: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const staggerChild: Variants = {
  hidden: { opacity: 0, y: 26 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
};
const instantParent: Variants = { hidden: {}, shown: {} };
const instantChild: Variants = { hidden: staggerChild.hidden, shown: { opacity: 1, y: 0, transition: { duration: 0 } } };

/** A list whose items arrive one after another as it comes into view. */
export function Stagger({ children, className, as = "div", amount = 0.15 }: { children: ReactNode; className?: string; as?: "div" | "ul" | "ol"; amount?: number }) {
  const reduced = useReducedMotionAfterMount();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      variants={reduced ? instantParent : staggerParent}
      initial="hidden"
      // With reduced motion the whole list is shown at once.
      animate={reduced ? "shown" : undefined}
      whileInView={reduced ? undefined : "shown"}
      viewport={{ once: true, amount }}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({ children, className, as = "div", style }: { children: ReactNode; className?: string; as?: "div" | "li" | "article"; style?: CSSProperties }) {
  const reduced = useReducedMotionAfterMount();
  const Tag = motion[as];
  return (
    <Tag className={className} variants={reduced ? instantChild : staggerChild} style={style}>
      {children}
    </Tag>
  );
}

/** A number that counts up from zero the first time it is seen. */
export function Counter({ to, suffix = "", className, format = true }: { to: number; suffix?: string; className?: string; format?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotionAfterMount();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(to);
      return;
    }
    const controls = animate(0, to, { duration: 1.4, ease: EASE, onUpdate: (v) => setValue(Math.round(v)) });
    return () => controls.stop();
  }, [inView, reduced, to]);
  const shown = format ? value.toLocaleString("en-US") : String(value);
  return (
    <span ref={ref} className={className}>
      {/* The final figure is what a screen reader hears, not every step of the count. */}
      <span aria-hidden="true">
        {shown}
        {suffix}
      </span>
      <span className="visually-hidden">
        {format ? to.toLocaleString("en-US") : to}
        {suffix}
      </span>
    </span>
  );
}

/**
 * A card that leans towards the pointer, with a soft light where the pointer is. Off for touch and
 * reduced motion; [max] is the most it tips, in degrees.
 */
export function Tilt({ children, className = "", style, max = 7, as = "div" }: { children: ReactNode; className?: string; style?: CSSProperties; max?: number; as?: "div" | "article" | "li" }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotionAfterMount();
  const [active, setActive] = useState(false);
  const Tag = as;

  function onMove(event: React.PointerEvent) {
    if (reduced || event.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    el.style.setProperty("--ry", `${(px - 0.5) * 2 * max}deg`);
    el.style.setProperty("--rx", `${(0.5 - py) * 2 * max}deg`);
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
    if (!active) setActive(true);
  }
  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    setActive(false);
  }

  return (
    <Tag
      ref={ref as never}
      className={`tilt ${active ? "active" : ""} ${className}`.trim()}
      style={style}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </Tag>
  );
}

/** Each page fades and rises in on arrival (used by app/template.tsx, which remounts per page). */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduced = useReducedMotionAfterMount();
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={reduced ? { duration: 0 } : { duration: 0.45, ease: EASE }}>
      {children}
    </motion.div>
  );
}
