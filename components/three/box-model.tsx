"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import arcaneGauntlet from "./models/arcane_gauntlet.json";
import gauntlet from "./models/gauntlet.json";
import stoneheartWings from "./models/stoneheart_wings.json";

/*
 * The client's box-model cosmetics - its cosmetics/Gauntlet.java and StoneWings.java - drawn from the same
 * files it reads (assets/visuals/cosmetics/*.json, copied into ./models: change them together). They are
 * made in Minecraft's model space: pixels, Y down, +Z behind the player, +X the player's left. Each hangs
 * under a group turned half round X, which makes that space this player's own (Y up, facing +Z), so every
 * number below is the client's as it is.
 */

type PartJson = { from: number[]; to: number[]; color: string; glow?: boolean; sparkle?: boolean };
type Specks = { count: number; size: number; drift: number; rise: number; seconds: number };
type Box = { x1: number; y1: number; z1: number; x2: number; y2: number; z2: number; colour: THREE.Color; glow: boolean; sparkle: boolean };

/** The gauntlets' model files, as the shop names them (Gauntlet.MODELS). */
const GAUNTLETS: Record<string, { parts: PartJson[]; specks: Specks }> = {
  gauntlet,
  arcane_gauntlet: arcaneGauntlet,
};
export type GauntletFile = keyof typeof GAUNTLETS;

/** StoneWings.lighter: a stone's facet, 45% of the way to white (in sRGB, as the client works). */
function lighter(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const up = (v: number) => Math.round(v + (255 - v) * 0.45);
  return `rgb(${up((n >> 16) & 255)},${up((n >> 8) & 255)},${up(n & 255)})`;
}

/** The boxes of [parts]; the left side's are the right's mirrored by their coordinates (StoneWings.mirrored). */
function boxes(parts: PartJson[], mirror = false, stone = "#FFFFFF"): Box[] {
  return parts.map((p) => {
    let x1 = Math.min(p.from[0], p.to[0]);
    let x2 = Math.max(p.from[0], p.to[0]);
    if (mirror) [x1, x2] = [-x2, -x1];
    const spec = p.color === "GEM" ? stone : p.color === "GEM+" ? lighter(stone) : p.color;
    return {
      x1,
      x2,
      y1: Math.min(p.from[1], p.to[1]),
      y2: Math.max(p.from[1], p.to[1]),
      z1: Math.min(p.from[2], p.to[2]),
      z2: Math.max(p.from[2], p.to[2]),
      colour: new THREE.Color(spec),
      glow: !!p.glow,
      sparkle: !!p.sparkle,
    };
  });
}

/** One mesh of many boxes, each in its own colour. */
function merged(list: Box[]): THREE.BufferGeometry | null {
  if (list.length === 0) return null;
  const parts = list.map((b) => {
    const g = new THREE.BoxGeometry(Math.max(b.x2 - b.x1, 0.01), Math.max(b.y2 - b.y1, 0.01), Math.max(b.z2 - b.z1, 0.01));
    g.translate((b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2, (b.z1 + b.z2) / 2);
    const colours = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colours.length; i += 3) {
      colours[i] = b.colour.r;
      colours[i + 1] = b.colour.g;
      colours[i + 2] = b.colour.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colours, 3));
    g.deleteAttribute("uv");
    return g;
  });
  const geometry = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return geometry;
}

/** Gauntlet.hash: a steady 0..1 for these numbers, so a speck keeps its path from frame to frame. */
function hash(a: number, b: number, c: number, d: number): number {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2147483629) + Math.imul(d, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h & 0x7fffffff) / 0x7fffffff;
}

/**
 * Gauntlet.specks: tiny glowing specks drifting out of each sparkling stone and fading, in its colour - out
 * from the arm, or ([outOfBack]) out of a wing. [seed] keeps two sets from moving in step.
 */
function StoneSpecks({ stones, specks, outOfBack, seed, still }: { stones: Box[]; specks: Specks; outOfBack: boolean; seed: number; still: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  const scratch = useMemo(() => ({ matrix: new THREE.Matrix4(), colour: new THREE.Color() }), []);

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const now = still ? 1.7 : state.clock.elapsedTime;
    let n = 0;
    stones.forEach((p, s) => {
      const stone = seed * 7 + s + 1;
      const cx = (p.x1 + p.x2) / 2;
      const cz = (p.z1 + p.z2) / 2;
      let ox = outOfBack ? 0 : cx + 1;
      let oz = outOfBack ? 1 : cz;
      const len = Math.hypot(ox, oz);
      ox = len > 0 ? ox / len : -1;
      oz = len > 0 ? oz / len : 0;
      for (let i = 0; i < specks.count; i++) {
        const phase = now / specks.seconds + i / specks.count + stone * 0.37;
        const cycle = Math.floor(phase);
        const t = phase - cycle;
        const drift = specks.drift * t * (0.6 + 0.6 * hash(stone, i, cycle, 4));
        const x = p.x1 + (p.x2 - p.x1) * hash(stone, i, cycle, 1) + ox * drift;
        const y = p.y1 + (p.y2 - p.y1) * hash(stone, i, cycle, 2) - specks.rise * t;
        const z = p.z1 + (p.z2 - p.z1) * hash(stone, i, cycle, 3) + oz * drift;
        const size = specks.size * (1 - t * 0.7);
        const alpha = Math.min(1, (1 - t) * 1.6) * Math.min(1, t * 8);
        scratch.matrix.makeScale(size, size, size).setPosition(x, y, z);
        m.setMatrixAt(n, scratch.matrix);
        // Added light, so a fading speck is a dimmer one.
        m.setColorAt(n, scratch.colour.copy(p.colour).multiplyScalar(alpha * 1.4));
        n++;
      }
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, stones.length * specks.count]} frustumCulled={false} />;
}

/** A set of boxes: the gold lit by the scene, the stones and glowing lines lit from within, and their specks. */
function Boxes({ list, specks, outOfBack = false, seed = 0, still = false }: { list: Box[]; specks?: Specks; outOfBack?: boolean; seed?: number; still?: boolean }) {
  const solid = useMemo(() => merged(list.filter((b) => !b.glow)), [list]);
  const glow = useMemo(() => merged(list.filter((b) => b.glow)), [list]);
  const stones = useMemo(() => list.filter((b) => b.sparkle), [list]);
  const materials = useMemo(
    () => ({
      // Little metalness: with no environment to reflect, a metal shows its colour only in highlights.
      solid: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.12 }),
      glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    }),
    [],
  );
  useEffect(
    () => () => {
      solid?.dispose();
      glow?.dispose();
      materials.solid.dispose();
      materials.glow.dispose();
    },
    [solid, glow, materials],
  );
  return (
    <>
      {solid && <mesh geometry={solid} material={materials.solid} />}
      {glow && <mesh geometry={glow} material={materials.glow} />}
      {specks && stones.length > 0 && <StoneSpecks stones={stones} specks={specks} outOfBack={outOfBack} seed={seed} still={still} />}
    </>
  );
}

/**
 * A gauntlet, for the player's right-arm group: in the client it is drawn in the arm's own space (after
 * the arm's rotation), whose pivot is a pixel further in than this player's arm group - hence the 1.
 */
export function GauntletModel({ file, still = false }: { file: string; still?: boolean }) {
  const data = GAUNTLETS[file] ?? GAUNTLETS.gauntlet;
  const list = useMemo(() => boxes(data.parts), [data]);
  return (
    <group position={[1, 0, 0]} rotation={[Math.PI, 0, 0]}>
      <Boxes list={list} specks={data.specks} seed={0} still={still} />
    </group>
  );
}

/** WingPose standing still: how far each side swings back (degrees), its beat, the blades' ripple, the beat's speed. */
const IDLE = { open: 12, beat: 4, ripple: 2.5, speed: 2.4 };

/**
 * The Stoneheart Wings, for the player's body group (whose origin is the body's middle, 6 pixels below the
 * neck): WingsFeatureRenderer's anchor between the shoulder blades, StoneWings' scale, and its idle - each
 * side swinging back and breathing, the blades rippling one after another.
 */
export function StoneWingsModel({ still = false }: { still?: boolean }) {
  const data = stoneheartWings as unknown as {
    specks: Specks;
    spine: PartJson[];
    plate: PartJson[];
    plateStones: [string, string];
    blades: { angle: number; delay: number; rootX: number; rootY?: number; stones: [string, string]; parts: PartJson[] }[];
  };
  const spine = useMemo(() => boxes(data.spine), [data]);
  const sides = useMemo(
    () =>
      ([1, -1] as const).map((side) => ({
        side,
        plate: boxes(data.plate, side === -1, data.plateStones[side === 1 ? 0 : 1]),
        blades: data.blades.map((blade) => ({ ...blade, list: boxes(blade.parts, side === -1, blade.stones[side === 1 ? 0 : 1]) })),
      })),
    [data],
  );
  const sideGroups = useRef<(THREE.Group | null)[]>([]);
  const bladeGroups = useRef<(THREE.Group | null)[][]>([[], []]);

  useFrame((state) => {
    const phase = (still ? 0.6 : state.clock.elapsedTime) * IDLE.speed;
    const sweep = THREE.MathUtils.degToRad(IDLE.open + Math.sin(phase) * IDLE.beat);
    sides.forEach(({ side }, s) => {
      const group = sideGroups.current[s];
      if (group) group.rotation.y = -side * sweep;
      data.blades.forEach((blade, i) => {
        const bladeGroup = bladeGroups.current[s][i];
        if (!bladeGroup) return;
        const ripple = Math.sin(phase - blade.delay * 2.4) * IDLE.ripple;
        bladeGroup.rotation.z = THREE.MathUtils.degToRad(-side * (blade.angle + ripple));
      });
    });
  });

  return (
    <group position={[0, 6, 0]} rotation={[Math.PI, 0, 0]}>
      {/* ROOT_Y 0.2 and ROOT_Z 0.16 blocks from the neck, then StoneWings' SCALE of 1.3. */}
      <group position={[0, 3.2, 2.56]} scale={1.3}>
        <Boxes list={spine} specks={data.specks} outOfBack seed={3} still={still} />
        {sides.map(({ side, plate, blades }, s) => (
          <group key={side} ref={(g) => void (sideGroups.current[s] = g)}>
            <Boxes list={plate} specks={data.specks} outOfBack seed={side === 1 ? 1 : 2} still={still} />
            {blades.map((blade, i) => (
              <group key={i} position={[side * blade.rootX, blade.rootY ?? 0, 0]} ref={(g) => void (bladeGroups.current[s][i] = g)}>
                <Boxes list={blade.list} specks={data.specks} outOfBack seed={side === 1 ? 1 : 2} still={still} />
              </group>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}
