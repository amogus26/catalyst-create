"use client";

import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Anything thrown inside the 3D scene shows the still picture instead of breaking the page. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Where a 3D scene lives on a page. It keeps the scene cheap: the pixel ratio is capped, nothing is
 * drawn while the stage is off screen, and with reduced motion a single still frame is drawn (and redrawn
 * only when dragged). Without WebGL - or if the scene fails - [fallback] shows instead.
 *
 * `?still` in the address keeps the drawing buffer, so the stills in public/stills can be captured.
 */
export function Stage({
  children,
  camera,
  className,
  label,
  fallback,
  interactive = false,
}: {
  children: ReactNode;
  camera: { position: [number, number, number]; fov: number };
  className?: string;
  label: string;
  fallback: ReactNode;
  /** Whether the scene takes the pointer (drag to rotate). A decorative scene lets it through. */
  interactive?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);
  const [keep, setKeep] = useState(false);

  useEffect(() => {
    setSupported(webglAvailable());
    setKeep(new URLSearchParams(window.location.search).has("still"));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "160px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      role="img"
      aria-label={label}
      style={interactive ? { touchAction: "pan-y" } : undefined}
    >
      {supported === false && fallback}
      {supported && (
        <SceneBoundary fallback={fallback}>
          <Canvas
            // No tone mapping: the launcher's colours (lib/catalyst.ts) come out as they are, not washed out.
            flat
            dpr={[1, 1.75]}
            camera={camera}
            frameloop={!visible ? "never" : reduced ? "demand" : "always"}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: keep }}
            style={{ pointerEvents: interactive ? "auto" : "none" }}
          >
            {children}
          </Canvas>
        </SceneBoundary>
      )}
    </div>
  );
}

/** The pointer across the whole window, -1..1 each way - for scenes that follow the mouse from anywhere. */
export function useWindowPointer() {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return pointer;
}
