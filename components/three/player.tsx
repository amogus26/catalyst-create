"use client";

import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { GauntletModel, StoneWingsModel } from "./box-model";
import { GlbWings } from "./glb-wings";
import { boxRegions, makeCapeTexture, makeSkinTexture, makeWingTexture, WING_END, WING_PATH, WING_START, type SkinStyle } from "./textures";

/*
 * A Minecraft-proportioned player, built in code: head 8x8x8, body 8x12x4, arms and legs 4x12x4 and a
 * 10x16x1 cape, in skin pixels (the group is scaled by 1/16, so the player is two units tall, feet at
 * zero, facing +z). Each box reads its faces from the standard layouts - 64x64 for the skin, 64x32 for
 * the cape - so a real cape texture, like one drawn on the Designs page, lands exactly where the game
 * puts it.
 */

type Region = readonly [number, number, number, number];

/**
 * Points a box's six faces at their regions of a texture. BoxGeometry's faces come in the order
 * +x, -x, +y, -y, +z, -z, four vertices each (top-left, top-right, bottom-left, bottom-right).
 * With the player facing +z, the skin's "right" region is the -x face.
 */
function mapBox(geometry: THREE.BoxGeometry, faces: Region[], texW: number, texH: number) {
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  faces.forEach(([x, y, w, h], face) => {
    const u0 = x / texW;
    const u1 = (x + w) / texW;
    const v0 = 1 - y / texH;
    const v1 = 1 - (y + h) / texH;
    const i = face * 4;
    uv.setXY(i, u0, v0);
    uv.setXY(i + 1, u1, v0);
    uv.setXY(i + 2, u0, v1);
    uv.setXY(i + 3, u1, v1);
  });
  uv.needsUpdate = true;
}

function skinBox(w: number, h: number, d: number, u: number, v: number): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const r = boxRegions(u, v, w, h, d);
  mapBox(geometry, [r.left, r.right, r.top, r.bottom, r.front, r.back], 64, 64);
  return geometry;
}

/** The cape's box. Its texture's "front" is the outside, which faces backwards (-z) when worn. */
function capeBox(): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(10, 16, 1);
  const r = boxRegions(0, 0, 10, 16, 1);
  mapBox(geometry, [r.right, r.left, r.top, r.bottom, r.back, r.front], 64, 32);
  return geometry;
}

/** One wing: the launcher's outline as a thin slab, root at the origin, reaching out along -x and up. */
function wingGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  // Box coordinates with y flipped (up is +), so the shape's own UVs line up with the wing texture.
  shape.moveTo(WING_START[0], 1 - WING_START[1]);
  for (const [a, b, c, d, e, f] of WING_PATH) shape.bezierCurveTo(a, 1 - b, c, 1 - d, e, 1 - f);
  shape.lineTo(WING_END[0], 1 - WING_END[1]);
  shape.closePath();
  const depth = 0.012;
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 18 });
  geometry.translate(-0.47, -0.52, -depth / 2);
  return geometry;
}

/** How many skin pixels one unit of the wing's outline box is: 33 makes each wing about 13 pixels long. */
const WING_SCALE = 33;

/** A worn model, as the client draws it: a box model (./box-model) or a Blender model (./glb-wings). */
export type WornModel = { type: "box" | "glb"; file: string };

export interface Wearing {
  /** A shop cape in its colours, or a cape texture (an uploaded or drawn design). */
  cape?: { colors: string[] } | { texture: THREE.Texture };
  /** Flat wings in colours (the battle pass's), or a model the client ships. */
  wings?: { colors: string[]; glow?: number } | WornModel;
  /** A gauntlet's box model, on the right hand. */
  gauntlet?: string;
  skin?: SkinStyle;
}

/**
 * The player, wearing [wearing]. Idle: breathing, arms swinging a little, the cape lifting and
 * settling, the wings slowly beating. [look], when given, is a pointer position (-1..1) the head turns
 * towards. [still] freezes the pose (reduced motion).
 */
export function Player({
  wearing,
  look,
  still = false,
  pose = "idle",
}: {
  wearing: Wearing;
  look?: MutableRefObject<{ x: number; y: number }>;
  still?: boolean;
  pose?: "idle" | "wave" | "raise";
}) {
  const skinStyle = wearing.skin ?? "catalyst";
  const skin = useMemo(() => makeSkinTexture(skinStyle), [skinStyle]);
  const geometry = useMemo(
    () => ({
      head: skinBox(8, 8, 8, 0, 0),
      body: skinBox(8, 12, 4, 16, 16),
      rightArm: skinBox(4, 12, 4, 40, 16),
      leftArm: skinBox(4, 12, 4, 32, 48),
      rightLeg: skinBox(4, 12, 4, 0, 16),
      leftLeg: skinBox(4, 12, 4, 16, 48),
      cape: capeBox(),
      wing: wingGeometry(),
    }),
    [],
  );
  const skinMaterial = useMemo(() => new THREE.MeshStandardMaterial({ map: skin, roughness: 0.82, metalness: 0.02 }), [skin]);

  const capeKey = wearing.cape ? ("colors" in wearing.cape ? wearing.cape.colors.join() : wearing.cape.texture.uuid) : "";
  const capeMaterial = useMemo(() => {
    if (!wearing.cape) return null;
    const map = "colors" in wearing.cape ? makeCapeTexture(wearing.cape.colors) : wearing.cape.texture;
    return new THREE.MeshStandardMaterial({ map, roughness: 0.78, metalness: 0.02, emissive: new THREE.Color("#ffffff"), emissiveMap: map, emissiveIntensity: 0.12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capeKey]);

  const flatWings = wearing.wings && "colors" in wearing.wings ? wearing.wings : null;
  const modelWings = wearing.wings && "type" in wearing.wings ? wearing.wings : null;
  const wingKey = flatWings?.colors.join() ?? "";
  const wingMaterial = useMemo(() => {
    if (!flatWings) return null;
    const map = makeWingTexture(flatWings.colors);
    return new THREE.MeshStandardMaterial({
      map,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.08,
      emissive: new THREE.Color("#ffffff"),
      emissiveMap: map,
      emissiveIntensity: flatWings.glow ?? 0.22,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wingKey]);

  // Materials made here are this component's to throw away - and a cape texture drawn here too (one
  // handed in belongs to whoever made it).
  const ownCapeMap = !!wearing.cape && "colors" in wearing.cape;
  useEffect(
    () => () => {
      if (ownCapeMap) capeMaterial?.map?.dispose();
      capeMaterial?.dispose();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [capeMaterial],
  );
  useEffect(() => () => wingMaterial?.map?.dispose(), [wingMaterial]);
  useEffect(
    () => () => {
      Object.values(geometry).forEach((g) => g.dispose());
      skinMaterial.dispose();
      skin.dispose();
    },
    [geometry, skin, skinMaterial],
  );

  const head = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const cape = useRef<THREE.Group>(null);
  const rightWing = useRef<THREE.Group>(null);
  const leftWing = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = still ? 0.8 : state.clock.elapsedTime;
    const breathe = Math.sin(t * 1.6) * 0.18;
    if (body.current) body.current.position.y = 18 + breathe * 0.25;
    if (rightArm.current && leftArm.current) {
      rightArm.current.rotation.z = 0.07 + Math.sin(t * 1.6) * 0.03;
      leftArm.current.rotation.z = -0.07 - Math.sin(t * 1.6) * 0.03;
      rightArm.current.rotation.x = Math.sin(t * 0.9) * 0.08;
      leftArm.current.rotation.x = -Math.sin(t * 0.9) * 0.08;
      if (pose === "wave") {
        rightArm.current.rotation.z = 2.6 + Math.sin(t * 7) * 0.25;
      } else if (pose === "raise") {
        // A fist held up and out to the side, clear of the head - to show off a gauntlet. (The right arm
        // swings outwards about -z; +z would bring it in across the face.)
        rightArm.current.rotation.z = -2.3 - Math.sin(t * 1.6) * 0.04;
        rightArm.current.rotation.x = -0.2;
      }
    }
    if (head.current) {
      const lx = look ? look.current.x : Math.sin(t * 0.5) * 0.25;
      const ly = look ? look.current.y : 0;
      head.current.rotation.y += (lx * 0.55 - head.current.rotation.y) * 0.08;
      head.current.rotation.x += (-ly * 0.25 - head.current.rotation.x) * 0.08;
    }
    if (cape.current) cape.current.rotation.x = 0.16 + Math.sin(t * 1.3) * 0.06 + Math.sin(t * 3.1) * 0.015;
    const flap = Math.sin(t * 1.9);
    if (rightWing.current && leftWing.current) {
      leftWing.current.rotation.y = 0.5 + flap * 0.22;
      rightWing.current.rotation.y = -(0.5 + flap * 0.22);
      leftWing.current.rotation.z = -0.12 - flap * 0.04;
      rightWing.current.rotation.z = 0.12 + flap * 0.04;
    }
  });

  return (
    <group scale={1 / 16}>
      <group ref={body} position={[0, 18, 0]}>
        <mesh geometry={geometry.body} material={skinMaterial} castShadow />
        {/* Children of the body move with its breath. Positions are from the body's centre. */}
        <group ref={head} position={[0, 6, 0]}>
          <mesh geometry={geometry.head} material={skinMaterial} position={[0, 4, 0]} />
        </group>
        <group ref={rightArm} position={[-6, 4, 0]}>
          {/* A raised gauntlet turns a quarter round its arm, so its stones (on the back of the hand) face forward. */}
          <group rotation={[0, wearing.gauntlet && pose !== "idle" ? Math.PI / 2 : 0, 0]}>
            <mesh geometry={geometry.rightArm} material={skinMaterial} position={[0, -4, 0]} />
            {wearing.gauntlet && <GauntletModel file={wearing.gauntlet} still={still} />}
          </group>
        </group>
        <group ref={leftArm} position={[6, 4, 0]}>
          <mesh geometry={geometry.leftArm} material={skinMaterial} position={[0, -4, 0]} />
        </group>
        {capeMaterial && (
          <group ref={cape} position={[0, 6, -2]}>
            <mesh geometry={geometry.cape} material={capeMaterial} position={[0, -8, -0.5]} />
          </group>
        )}
        {modelWings?.type === "box" && <StoneWingsModel still={still} />}
        {modelWings?.type === "glb" && (
          <Suspense fallback={null}>
            <GlbWings file={modelWings.file} still={still} />
          </Suspense>
        )}
        {wingMaterial && (
          <>
            <group ref={leftWing} position={[1, 3.5, capeMaterial ? -3.2 : -2.3]}>
              <mesh geometry={geometry.wing} material={wingMaterial} scale={[-WING_SCALE, WING_SCALE, WING_SCALE]} />
            </group>
            <group ref={rightWing} position={[-1, 3.5, capeMaterial ? -3.2 : -2.3]}>
              <mesh geometry={geometry.wing} material={wingMaterial} scale={[WING_SCALE, WING_SCALE, WING_SCALE]} />
            </group>
          </>
        )}
      </group>
      <group position={[-2, 12, 0]}>
        <mesh geometry={geometry.rightLeg} material={skinMaterial} position={[0, -6, 0]} />
      </group>
      <group position={[2, 12, 0]}>
        <mesh geometry={geometry.leftLeg} material={skinMaterial} position={[0, -6, 0]} />
      </group>
    </group>
  );
}
