"use client";

import { useEffect, useRef } from "react";

/*
 * The launcher's Home hall answering the pointer (HallBackdrop.kt), on every page of the site: a band of
 * fog trails after the mouse, and a click blooms - a soft glow swelling out and fading. Same numbers as
 * the launcher's Fog trail and Bloom pulse, in its sculk glow (Palette.GlowBright).
 *
 * One canvas fixed behind the page, so the light is on the background and the glass panels show it
 * dimmed, as in the launcher. It draws only while there is light to draw, and not at all with reduced
 * motion. The trail follows a mouse or pen, not a finger; a tap still blooms.
 */

const COLOUR = [77, 230, 230] as const; // #4DE6E6
const TRAIL_MILLIS = 380;
const TRAIL_SPACING = 7;
const TRAIL_MAX_POINTS = 70;
const TRAIL_RADIUS = 30;
const BLOOM_MILLIS = 1600;
const BLOOM_REACH = 170;
/** The fog is soft, so it is drawn at half resolution - a quarter of the pixels. */
const RESOLUTION = 0.5;

type Point = { x: number; y: number; t: number };

export function PointerLight() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // One soft dot of light - the launcher's trail brush - drawn once and stamped wherever it is needed.
    const dot = document.createElement("canvas");
    dot.width = dot.height = 128;
    const d = dot.getContext("2d")!;
    const [r, g, b] = COLOUR;
    const glow = d.createRadialGradient(64, 64, 0, 64, 64, 64);
    glow.addColorStop(0, `rgba(${r},${g},${b},1)`);
    glow.addColorStop(0.33, `rgba(${r},${g},${b},0.45)`);
    glow.addColorStop(0.66, `rgba(${r},${g},${b},0.12)`);
    glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    d.fillStyle = glow;
    d.fillRect(0, 0, 128, 128);

    const trail: Point[] = [];
    const blooms: Point[] = [];
    let frame = 0;

    const resize = () => {
      canvas.width = Math.ceil(window.innerWidth * RESOLUTION);
      canvas.height = Math.ceil(window.innerHeight * RESOLUTION);
      ctx.setTransform(RESOLUTION, 0, 0, RESOLUTION, 0, 0);
    };
    resize();

    const stamp = (x: number, y: number, radius: number, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.drawImage(dot, x - radius, y - radius, radius * 2, radius * 2);
    };

    const draw = (now: number) => {
      frame = 0;
      while (trail.length && now - trail[0].t > TRAIL_MILLIS) trail.shift();
      while (blooms.length && now - blooms[0].t > BLOOM_MILLIS) blooms.shift();
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of trail) {
        const fresh = Math.pow(1 - Math.min(1, (now - p.t) / TRAIL_MILLIS), 1.4);
        if (fresh >= 0.02) stamp(p.x, p.y, TRAIL_RADIUS * (0.4 + 0.6 * fresh), 0.09 * fresh);
      }
      for (const p of blooms) {
        const age = (now - p.t) / BLOOM_MILLIS;
        stamp(p.x, p.y, BLOOM_REACH * (0.2 + 0.8 * (1 - Math.pow(1 - age, 2))), 0.42 * Math.pow(1 - age, 1.5));
      }
      if (trail.length || blooms.length) frame = requestAnimationFrame(draw);
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const now = performance.now();
      const last = trail[trail.length - 1];
      if (!last) {
        trail.push({ x: event.clientX, y: event.clientY, t: now });
      } else {
        // A fast move arrives as far-apart points: fill the gap, so the fog stays one band.
        const gap = Math.hypot(event.clientX - last.x, event.clientY - last.y);
        if (gap < TRAIL_SPACING) return;
        const steps = Math.min(TRAIL_MAX_POINTS, Math.floor(gap / TRAIL_SPACING));
        for (let i = 1; i <= steps; i++) {
          trail.push({ x: last.x + ((event.clientX - last.x) * i) / steps, y: last.y + ((event.clientY - last.y) * i) / steps, t: now });
        }
        if (trail.length > TRAIL_MAX_POINTS) trail.splice(0, trail.length - TRAIL_MAX_POINTS);
      }
      wake();
    };
    const onDown = (event: PointerEvent) => {
      blooms.push({ x: event.clientX, y: event.clientY, t: performance.now() });
      wake();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-light" aria-hidden="true" />;
}
