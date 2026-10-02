"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";
import { FloorGlow, Lights } from "./hero-scene";
import { Player } from "./player";
import { Stage } from "./stage";

/** The stones' colours (the gauntlet's), for the specks drifting round the player. */
const GOLD = "#f2c23a";

function CtaContent() {
  const reduced = useReducedMotion();
  // `?still` holds the pose, for capturing public/stills/cta-stoneheart.webp.
  const [still] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("still"));
  useFrame((state) => state.camera.lookAt(0, 1.15, 0));
  return (
    <>
      <Lights ember />
      {/* Turned a little towards the raised gauntlet, with both wings showing behind. */}
      <group rotation={[0, 0.38, 0]}>
        <Player
          wearing={{ wings: { type: "box", file: "stoneheart_wings" }, gauntlet: "gauntlet", skin: "classic" }}
          pose="raise"
          still={!!reduced || still}
        />
      </group>
      <FloorGlow color="#37d3c4" />
      {!reduced && !still && <Sparkles count={36} scale={[3.2, 2.6, 2.4]} position={[0, 1.4, -0.4]} size={2.8} speed={0.35} color={GOLD} opacity={0.85} />}
    </>
  );
}

/** The home page's last picture: an everyday player in the Stoneheart Wings, the Stoneheart Gauntlet held high. */
export default function CtaScene({ className, fallback }: { className?: string; fallback: ReactNode }) {
  return (
    <Stage
      className={className}
      label="A player in the Stoneheart Wings, holding up the Stoneheart Gauntlet"
      camera={{ position: [0.6, 1.35, 6.3], fov: 30 }}
      fallback={fallback}
    >
      <CtaContent />
    </Stage>
  );
}
