"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

/*
 * The wings the client ships as Blender models (assets/visuals/cosmetics/<file>.glb, copied into
 * public/cosmetics/models). They are made the way the client's GlbModel reads them: a block to a unit,
 * the player's feet at the origin, facing +Z, Y up - this player's own space - with each wing the child of
 * a node ("Wing.L", "Wing.R") standing at the root it swings about.
 */

/** A node by its Blender name; three.js drops the dot from "Wing.L". */
function wing(root: THREE.Object3D, side: "L" | "R"): THREE.Object3D | undefined {
  let found: THREE.Object3D | undefined;
  root.traverse((node) => {
    if (!found && node.name.replace(/[^A-Za-z]/g, "").toLowerCase() === `wing${side.toLowerCase()}`) found = node;
  });
  return found;
}

/**
 * [file]'s wings, for the player's body group (the body's middle, 18 pixels above the feet, in pixels):
 * at rest each is raked back about its root and beats slowly, as ModelWingsFeatureRenderer's resting pose.
 */
export function GlbWings({ file, still = false }: { file: string; still?: boolean }) {
  const { scene } = useGLTF(`/cosmetics/models/${file}.glb`);
  const model = useMemo(() => scene.clone(true), [scene]);
  const sides = useMemo(() => ({ left: wing(model, "L"), right: wing(model, "R") }), [model]);

  useFrame((state) => {
    const t = still ? 0.6 : state.clock.elapsedTime;
    // Raked back 0.3 (REST_SWEEP), beating a little either side of it. Turning the left wing (+X) about +Y
    // takes its tip backwards (-Z); the right wing turns the other way.
    const sweep = 0.3 + Math.sin(t * 1.9) * 0.12;
    const lift = Math.sin(t * 1.9 + 0.6) * 0.03;
    if (sides.left) {
      sides.left.rotation.y = sweep;
      sides.left.rotation.x = lift;
    }
    if (sides.right) {
      sides.right.rotation.y = -sweep;
      sides.right.rotation.x = lift;
    }
  });

  return <primitive object={model} position={[0, -18, 0]} scale={16} />;
}
