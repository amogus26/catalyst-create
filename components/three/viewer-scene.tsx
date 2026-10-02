"use client";

import { OrbitControls, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { FloorGlow, Lights } from "./hero-scene";
import { Player, type Wearing, type WornModel } from "./player";
import { Stage } from "./stage";

export interface ViewerItem {
  id: string;
  kind: "cape" | "wings" | "gauntlet";
  colors: string[];
  /** The model the client draws it with - the shop's wings and gauntlets have one, capes don't. */
  model?: WornModel;
  /** The glow the item's rarity casts on the pedestal. */
  glow: string;
}

/** A low dark pedestal with a lit rim, for the player to stand on. */
function Pedestal({ glow }: { glow: string }) {
  const rim = useMemo(() => new THREE.Color(glow), [glow]);
  return (
    <group position={[0, -0.12, 0]}>
      <mesh>
        <cylinderGeometry args={[1.05, 1.15, 0.22, 48]} />
        <meshStandardMaterial color="#111a26" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.112, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.0, 1.04, 64]} />
        <meshBasicMaterial color={rim} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

/** Equipping a new item gives the player a small pop, so the change reads. */
function Equip({ children, id }: { children: ReactNode; id: string }) {
  const group = useRef<THREE.Group>(null);
  const since = useRef({ id, t: -1 });
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    if (since.current.id !== id || since.current.t < 0) since.current = { id, t: state.clock.elapsedTime };
    const k = Math.min(1, (state.clock.elapsedTime - since.current.t) / 0.45);
    const s = 1 + Math.sin(k * Math.PI) * 0.06;
    g.scale.setScalar(s);
  });
  return <group ref={group}>{children}</group>;
}

function wearingFor(item: ViewerItem): Wearing {
  if (item.kind === "cape") return { cape: { colors: item.colors } };
  if (item.kind === "gauntlet") return { gauntlet: item.model?.file ?? "gauntlet", skin: "classic" };
  return { wings: item.model ?? { colors: item.colors, glow: 0.18 } };
}

function ViewerContent({ item }: { item: ViewerItem }) {
  const reduced = useReducedMotion();
  const gauntlet = item.kind === "gauntlet";
  return (
    <>
      {/* The warm light behind wings keeps gold gold - the teal rim alone turns it green from behind. */}
      <Lights ember={item.kind !== "cape"} />
      <Equip id={item.id}>
        {/* The camera starts behind the player, where wings and capes are; a gauntlet is seen from the front. */}
        <group rotation={[0, gauntlet ? Math.PI * 0.85 : 0, 0]}>
          <Player wearing={wearingFor(item)} still={!!reduced} pose={gauntlet ? "raise" : "idle"} />
        </group>
      </Equip>
      <Pedestal glow={item.glow} />
      <FloorGlow color={item.glow} size={3} back={false} />
      {!reduced && <Sparkles count={40} scale={[3.4, 2.6, 3]} position={[0, 1.3, 0]} size={2.4} speed={0.3} color={item.glow} opacity={0.8} />}
      <OrbitControls
        target={[0, 1.02, 0]}
        enablePan={false}
        enableZoom={false}
        enableDamping
        autoRotate={!reduced}
        autoRotateSpeed={1.1}
        minPolarAngle={Math.PI * 0.32}
        maxPolarAngle={Math.PI * 0.6}
      />
    </>
  );
}

/** The cosmetics shop's viewer: the player wearing [item] - wings and capes from behind - dragged round by hand. */
export default function ViewerScene({ item, className, fallback }: { item: ViewerItem; className?: string; fallback: ReactNode }) {
  return (
    <Stage
      className={className}
      interactive
      label={`A player wearing the ${item.kind === "cape" ? "cape" : item.kind === "gauntlet" ? "gauntlet" : "wings"} - drag to turn them round`}
      camera={{ position: [2.5, 1.6, -5.4], fov: 30 }}
      fallback={fallback}
    >
      <ViewerContent item={item} />
    </Stage>
  );
}
