"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { Player } from "./player";
import { Stage, useWindowPointer } from "./stage";
import { makeGlowTexture } from "./textures";

/**
 * A soft pool of light on the ground, and a fainter one standing up behind the player - kept well
 * inside the canvas, or its edge would show where the canvas ends.
 */
export function FloorGlow({ color = "#37d3c4", size = 3.4, back = true }: { color?: string; size?: number; back?: boolean }) {
  const glow = useMemo(() => makeGlowTexture(), []);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={glow} color={color} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {back && (
        <mesh position={[0, 1.15, -1.4]}>
          <planeGeometry args={[2.6, 2.6]} />
          <meshBasicMaterial map={glow} color={color} transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
    </>
  );
}

/** Warm key light, cool fill and a teal rim - the Deep Dark's light on a player. */
export function Lights({ ember = false }: { ember?: boolean }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#a9d8ff", "#0b1320", 0.55]} />
      <directionalLight position={[3, 5, 4]} intensity={1.7} color="#fff3e2" />
      <directionalLight position={[-4, 2.5, -4]} intensity={1.6} color="#37d3c4" />
      <directionalLight position={[4, 1.5, -4]} intensity={0.8} color="#4fa8e8" />
      {ember && <pointLight position={[0, 1.4, -1.1]} intensity={3} distance={3.2} color="#ff9b54" />}
    </>
  );
}

function HeroContent() {
  const pointer = useWindowPointer();
  const reduced = useReducedMotion();
  const spin = useRef<THREE.Group>(null);
  const yaw = useRef(2.4);
  // `?still` holds a three-quarter pose, for capturing public/stills/hero.webp.
  const [still] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("still"));
  useFrame((state, delta) => {
    const g = spin.current;
    if (!g) return;
    if (still) {
      g.rotation.y = 2.55;
      state.camera.lookAt(0, 1.05, 0);
      return;
    }
    if (!reduced) yaw.current += delta * 0.32;
    const target = yaw.current + pointer.current.x * 0.45;
    g.rotation.y += (target - g.rotation.y) * 0.06;
    g.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.04;
    const cam = state.camera;
    cam.position.x += (pointer.current.x * 0.35 - cam.position.x) * 0.04;
    cam.position.y += (1.3 - pointer.current.y * 0.18 - cam.position.y) * 0.04;
    cam.lookAt(0, 1.05, 0);
  });
  return (
    <>
      <Lights />
      <group ref={spin}>
        <Player wearing={{ wings: { type: "glb", file: "void_butterfly_wings" } }} look={pointer} still={!!reduced} />
      </group>
      <FloorGlow />
      {!reduced && (
        <>
          <Sparkles count={70} scale={[5.5, 3.6, 4]} position={[0, 1.5, 0]} size={2.6} speed={0.35} color="#6ff5e6" opacity={0.85} />
          <Sparkles count={24} scale={[2.4, 2, 1.6]} position={[0, 1.5, -0.8]} size={3.2} speed={0.5} color="#b98cff" opacity={0.9} />
        </>
      )}
    </>
  );
}

/** The home page's hero: our player in the Void Butterfly Wings, turning slowly. */
export default function HeroScene({ className, fallback }: { className?: string; fallback: ReactNode }) {
  return (
    <Stage
      className={className}
      label="A Catalyst player wearing the Void Butterfly Wings, turning slowly"
      camera={{ position: [0, 1.3, 6.2], fov: 30 }}
      fallback={fallback}
    >
      <HeroContent />
    </Stage>
  );
}
