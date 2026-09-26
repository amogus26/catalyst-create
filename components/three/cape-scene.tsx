"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { FloorGlow, Lights } from "./hero-scene";
import { Player } from "./player";
import { Stage } from "./stage";
import { capeTextureFrom } from "./textures";

export type CapeSource = { canvas: RefObject<HTMLCanvasElement | null> } | { url: string };

/** The drawing canvas, as a live texture: redrawn every frame, so each stroke shows on the cape at once. */
function useCanvasTexture(ref: RefObject<HTMLCanvasElement | null> | null): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!ref?.current) return;
    const t = capeTextureFrom(ref.current);
    setTexture(t);
    return () => t.dispose();
  }, [ref]);
  useFrame(() => {
    if (texture) texture.needsUpdate = true;
  });
  return texture;
}

/** A cape picture from an address - an approved design, or a file picked for upload. */
function useImageTexture(url: string | null): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    const image = new Image();
    image.onload = () => {
      if (alive) setTexture(capeTextureFrom(image));
    };
    image.src = url;
    return () => {
      alive = false;
    };
  }, [url]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function CapeContent({ source }: { source: CapeSource }) {
  const reduced = useReducedMotion();
  const fromCanvas = useCanvasTexture("canvas" in source ? source.canvas : null);
  const fromImage = useImageTexture("url" in source ? source.url : null);
  const texture = fromCanvas ?? fromImage;
  // A blank 64x32 until the picture arrives, so the cape is never missing.
  const blank = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 32;
    return capeTextureFrom(c);
  }, []);
  return (
    <>
      <Lights />
      <Player wearing={{ cape: { texture: texture ?? blank } }} still={!!reduced} />
      <FloorGlow size={2.6} back={false} />
      <OrbitControls
        target={[0, 1.02, 0]}
        enablePan={false}
        enableZoom={false}
        enableDamping
        autoRotate={!reduced}
        autoRotateSpeed={1.4}
        minPolarAngle={Math.PI * 0.32}
        maxPolarAngle={Math.PI * 0.6}
      />
    </>
  );
}

/** A cape design worn on our player, seen from behind, turned by hand. */
export default function CapeScene({ source, className, fallback }: { source: CapeSource; className?: string; fallback: ReactNode }) {
  return (
    <Stage className={className} interactive label="Your cape on a player - drag to turn them round" camera={{ position: [1.4, 1.5, -4.8], fov: 30 }} fallback={fallback}>
      <CapeContent source={source} />
    </Stage>
  );
}
