"use client";

import { Environment, Lightformer, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { Stage } from "./stage";
import { makeCoinFace, makeMilling } from "./textures";

/** One coin: a gold disc with a milled edge and the logo struck into both faces. */
function Coin({ size = 1, spin = 1, phase = 0, faces }: { size?: number; spin?: number; phase?: number; faces: THREE.Material[] }) {
  const ref = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  useFrame((state, delta) => {
    const g = ref.current;
    if (!g || reduced) return;
    g.rotation.y += delta * spin;
    g.position.y = Math.sin(state.clock.elapsedTime * 1.2 + phase) * 0.06 * size;
  });
  return (
    <group ref={ref} rotation={[0, phase, 0]} scale={size}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={faces}>
        <cylinderGeometry args={[1, 1, 0.16, 96]} />
      </mesh>
    </group>
  );
}

/** Small coins circling the big one. */
function Orbit({ faces }: { faces: THREE.Material[] }) {
  const ref = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  useFrame((_, delta) => {
    if (ref.current && !reduced) ref.current.rotation.y += delta * 0.35;
  });
  const coins = [0, 1, 2, 3, 4];
  return (
    <group ref={ref} rotation={[0.35, 0, 0.12]}>
      {coins.map((i) => {
        const a = (i / coins.length) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * 1.85, Math.sin(a * 2) * 0.22, Math.sin(a) * 1.85]}>
            <Coin size={0.26} spin={2.2 + i * 0.2} phase={i * 1.3} faces={faces} />
          </group>
        );
      })}
    </group>
  );
}

function CoinContent() {
  const reduced = useReducedMotion();
  const faces = useMemo(() => {
    const { map, bump } = makeCoinFace();
    const milling = makeMilling();
    const edge = new THREE.MeshStandardMaterial({ color: "#E0A51F", metalness: 1, roughness: 0.3, bumpMap: milling, bumpScale: 0.7 });
    const face = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 3, metalness: 0.85, roughness: 0.32 });
    return [edge, face, face];
  }, []);
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} color="#fff4dc" />
      <directionalLight position={[-4, -2, 3]} intensity={0.8} color="#4fa8e8" />
      {/* Light for the gold to reflect - shapes in the scene, so nothing is downloaded. */}
      <Environment resolution={128}>
        <Lightformer intensity={3} position={[0, 4, 3]} scale={[8, 2, 1]} />
        <Lightformer intensity={1.6} position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer intensity={1.2} color="#ffd46b" position={[5, -1, 2]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer intensity={0.8} color="#37d3c4" position={[0, -4, 1]} scale={[8, 2, 1]} />
      </Environment>
      <group rotation={[0.12, 0, 0]}>
        <Coin size={1.25} spin={0.9} faces={faces} />
      </group>
      <Orbit faces={faces} />
      {!reduced && <Sparkles count={50} scale={[6, 4, 4]} size={3} speed={0.4} color="#ffd46b" opacity={0.9} />}
    </>
  );
}

/** The coin page's hero: a struck gold coin turning, small coins circling it. */
export default function CoinScene({ className, fallback }: { className?: string; fallback: ReactNode }) {
  return (
    <Stage className={className} label="A gold Catalyst coin, turning, with small coins circling it" camera={{ position: [0, 0.3, 6.6], fov: 34 }} fallback={fallback}>
      <CoinContent />
    </Stage>
  );
}
