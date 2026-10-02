import * as THREE from "three";
import { darken, lighten, ramp } from "@/lib/catalyst";
import { LOGO_SHAPES } from "@/components/logo-shapes";

/*
 * Every texture the 3D scenes use, drawn in code: no image files, and no Mojang assets. The skin is our
 * own character on the standard 64x64 skin layout (so a real skin could be dropped in later), capes are
 * drawn on the real 64x32 cape layout the way the launcher draws them (CosmeticArt.kt), and the wings
 * use the launcher's wing outline.
 */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A colour nudged lighter or darker by a little noise - blocks in Minecraft are never one flat colour. */
function speckle(hex: string, random: () => number, amount = 0.07): string {
  const t = (random() - 0.5) * 2 * amount;
  return t >= 0 ? lighten(hex, t) : darken(hex, -t);
}

function canvas(width: number, height: number) {
  const el = document.createElement("canvas");
  el.width = width;
  el.height = height;
  const ctx = el.getContext("2d")!;
  return { el, ctx };
}

function pixelTexture(el: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(el);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// --- the skin ---------------------------------------------------------------------------------------------

const SKIN = { tone: "#C99670", shade: "#B27F5A", light: "#D9A983", mouth: "#8E5B41" };
const HAIR = { base: "#16202E", light: "#223249" };
const HOODIE = { base: "#1C2B45", shade: "#15213A", light: "#253A5E" };
const TRIM = "#37D3C4";
const TRIM_DEEP = "#1E9AA1";
const PANTS = { base: "#2A303D", shade: "#222733" };
const SHOE = { base: "#11151C", sole: "#0A0D12", lace: "#3E4A5E" };

type Painter = (x: number, y: number, w: number, h: number) => string;

/** The six regions of a box on a Minecraft texture at (u, v), for a box w wide, h tall and d deep. */
export function boxRegions(u: number, v: number, w: number, h: number, d: number) {
  return {
    top: [u + d, v, w, d],
    bottom: [u + d + w, v, w, d],
    right: [u, v + d, d, h],
    front: [u + d, v + d, w, h],
    left: [u + d + w, v + d, d, h],
    back: [u + d + w + d, v + d, w, h],
  } as const;
}

function paintRegion(ctx: CanvasRenderingContext2D, [rx, ry, rw, rh]: readonly number[], painter: Painter) {
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      ctx.fillStyle = painter(x, y, rw, rh);
      ctx.fillRect(rx + x, ry + y, 1, 1);
    }
  }
}

/** Which skin a player wears: our own hooded one, or a plain everyday one. */
export type SkinStyle = "catalyst" | "classic";

/**
 * Our player: dark hair, teal eyes, a navy hoodie with a teal zip and trim, charcoal trousers and dark
 * shoes - or, "classic", an everyday player in a T-shirt and jeans. Painted pixel by pixel with a little
 * noise, the way skins are.
 */
export function makeSkinTexture(style: SkinStyle = "catalyst"): THREE.CanvasTexture {
  if (style === "classic") return makeClassicSkin();
  const { el, ctx } = canvas(64, 64);
  const r = rng(7);
  const hair = () => speckle(HAIR.base, r, 0.1);
  const hoodie = (y: number, h: number) => speckle(y < 2 ? HOODIE.light : y > h - 3 ? HOODIE.shade : HOODIE.base, r, 0.06);

  // Head.
  const head = boxRegions(0, 0, 8, 8, 8);
  paintRegion(ctx, head.top, () => hair());
  paintRegion(ctx, head.bottom, () => speckle(SKIN.shade, r));
  paintRegion(ctx, head.back, (x, y) => (y < 7 || x < 1 || x > 6 ? hair() : speckle(SKIN.shade, r)));
  // Sides: hair over the back five columns and the top three rows; the front edge is face.
  paintRegion(ctx, head.right, (x, y) => (y < 3 || x < 5 ? hair() : x === 5 && y === 4 ? SKIN.shade : speckle(SKIN.tone, r, 0.05)));
  paintRegion(ctx, head.left, (x, y) => (y < 3 || x > 2 ? hair() : x === 2 && y === 4 ? SKIN.shade : speckle(SKIN.tone, r, 0.05)));
  paintRegion(ctx, head.front, (x, y) => {
    if (y < 2) return hair();
    if (y === 2) return x === 0 || x === 7 || x === 3 ? hair() : speckle(SKIN.light, r, 0.04);
    if (y === 4) {
      if (x === 1 || x === 6) return "#F4F7FB"; // whites
      if (x === 2 || x === 5) return TRIM; // teal eyes
    }
    if (y === 3 && (x === 1 || x === 2 || x === 5 || x === 6)) return speckle(SKIN.shade, r, 0.03); // brows' shadow
    if (y === 6 && (x === 3 || x === 4)) return SKIN.mouth;
    if (y === 7) return speckle(SKIN.shade, r, 0.04);
    return speckle(SKIN.tone, r, 0.05);
  });

  // Body: the hoodie, a teal zip down the front, a teal band round the hood's edge at the back.
  const body = boxRegions(16, 16, 8, 12, 4);
  paintRegion(ctx, body.top, () => hoodie(1, 4));
  paintRegion(ctx, body.bottom, () => speckle(HOODIE.shade, r));
  paintRegion(ctx, body.front, (x, y, w, h) => {
    if (y === 0 && (x < 2 || x > 5)) return TRIM_DEEP; // the hood's edge over the shoulders
    if (y === 0 && x >= 2 && x <= 5) return speckle(SKIN.shade, r, 0.03); // neck
    if (x === 3 || x === 4) return y % 3 === 1 ? lighten(TRIM, 0.35) : TRIM; // the zip
    if (y === 8 && (x === 1 || x === 6)) return HOODIE.shade; // pocket seams
    if (y === 9 && (x < 3 || x > 4)) return HOODIE.shade;
    if (y === h - 1) return TRIM_DEEP; // hem
    return hoodie(y, h);
  });
  paintRegion(ctx, body.back, (x, y, w, h) => {
    if (y < 2) return y === 1 ? TRIM : speckle(HOODIE.light, r); // the hood lying on the shoulders
    if (y === h - 1) return TRIM_DEEP;
    return hoodie(y, h);
  });
  paintRegion(ctx, body.right, (x, y, w, h) => (y === h - 1 ? TRIM_DEEP : hoodie(y, h)));
  paintRegion(ctx, body.left, (x, y, w, h) => (y === h - 1 ? TRIM_DEEP : hoodie(y, h)));

  // Arms: sleeves, a teal cuff, hands.
  const arm = (u: number, v: number) => {
    const a = boxRegions(u, v, 4, 12, 4);
    const sleeve: Painter = (x, y, w, h) => (y < 8 ? hoodie(y, 9) : y === 8 ? TRIM : speckle(y === h - 1 ? SKIN.shade : SKIN.tone, r, 0.05));
    paintRegion(ctx, a.top, () => hoodie(1, 4));
    paintRegion(ctx, a.bottom, () => speckle(SKIN.shade, r));
    for (const face of [a.front, a.back, a.right, a.left]) paintRegion(ctx, face, sleeve);
  };
  arm(40, 16);
  arm(32, 48);

  // Legs: trousers and shoes.
  const leg = (u: number, v: number) => {
    const l = boxRegions(u, v, 4, 12, 4);
    const trousers: Painter = (x, y, w, h) => {
      if (y >= h - 2) return y === h - 1 ? SHOE.sole : x === 1 || x === 2 ? SHOE.lace : SHOE.base;
      return speckle(y > 7 ? PANTS.shade : PANTS.base, r, 0.06);
    };
    paintRegion(ctx, l.top, () => speckle(PANTS.base, r));
    paintRegion(ctx, l.bottom, () => SHOE.sole);
    for (const face of [l.front, l.back, l.right, l.left]) paintRegion(ctx, face, trousers);
  };
  leg(0, 16);
  leg(16, 48);

  return pixelTexture(el);
}

const CLASSIC = {
  hair: "#4A3222",
  hairLight: "#5E412D",
  eye: "#4B6FB0",
  shirt: "#2E9FC0",
  shirtShade: "#23809B",
  shirtLight: "#3BB3D3",
  jeans: "#34477A",
  jeansShade: "#2A3A66",
  shoe: "#4A4E57",
  sole: "#2E3138",
} as const;

/**
 * An everyday player, our own pixels: brown hair, a teal T-shirt with short sleeves, blue jeans and grey
 * shoes. The "normal skin" the home page's last picture wears (and scripts/render-cosmetics.py's arm).
 */
function makeClassicSkin(): THREE.CanvasTexture {
  const { el, ctx } = canvas(64, 64);
  const r = rng(11);
  const hair = () => speckle(r() < 0.25 ? CLASSIC.hairLight : CLASSIC.hair, r, 0.08);
  const shirt = (y: number, h: number) => speckle(y < 1 ? CLASSIC.shirtLight : y > h - 2 ? CLASSIC.shirtShade : CLASSIC.shirt, r, 0.05);
  const skin = () => speckle(SKIN.tone, r, 0.05);

  const head = boxRegions(0, 0, 8, 8, 8);
  paintRegion(ctx, head.top, () => hair());
  paintRegion(ctx, head.bottom, () => speckle(SKIN.shade, r));
  paintRegion(ctx, head.back, (x, y) => (y < 6 ? hair() : speckle(SKIN.shade, r)));
  paintRegion(ctx, head.right, (x, y) => (y < 2 || x < 4 || (y < 4 && x < 6) ? hair() : skin()));
  paintRegion(ctx, head.left, (x, y) => (y < 2 || x > 3 || (y < 4 && x > 1) ? hair() : skin()));
  paintRegion(ctx, head.front, (x, y) => {
    if (y < 2) return hair();
    if (y === 2) return x === 0 || x === 7 ? hair() : speckle(SKIN.light, r, 0.04);
    if (y === 4) {
      if (x === 1 || x === 6) return "#F4F7FB"; // whites
      if (x === 2 || x === 5) return CLASSIC.eye;
    }
    if (y === 3 && (x === 1 || x === 2 || x === 5 || x === 6)) return speckle(CLASSIC.hair, r, 0.05); // brows
    if (y === 6 && x >= 3 && x <= 4) return SKIN.mouth;
    if (y === 7) return speckle(SKIN.shade, r, 0.04);
    return skin();
  });

  const body = boxRegions(16, 16, 8, 12, 4);
  paintRegion(ctx, body.top, () => shirt(1, 4));
  paintRegion(ctx, body.bottom, () => speckle(CLASSIC.jeans, r));
  paintRegion(ctx, body.front, (x, y, w, h) => {
    if (y === 0 && x >= 3 && x <= 4) return skin(); // the collar's dip
    if (y >= h - 2) return speckle(y === h - 1 ? CLASSIC.jeansShade : CLASSIC.jeans, r, 0.05); // jeans at the waist
    return shirt(y, h - 2);
  });
  for (const face of [body.back, body.right, body.left]) {
    paintRegion(ctx, face, (x, y, w, h) => (y >= h - 2 ? speckle(CLASSIC.jeans, r, 0.05) : shirt(y, h - 2)));
  }

  // Arms: short sleeves, then bare arms.
  const arm = (u: number, v: number) => {
    const a = boxRegions(u, v, 4, 12, 4);
    const painter: Painter = (x, y, w, h) => (y < 4 ? shirt(y, 4) : speckle(y === h - 1 ? SKIN.shade : SKIN.tone, r, 0.05));
    paintRegion(ctx, a.top, () => shirt(1, 4));
    paintRegion(ctx, a.bottom, () => speckle(SKIN.shade, r));
    for (const face of [a.front, a.back, a.right, a.left]) paintRegion(ctx, face, painter);
  };
  arm(40, 16);
  arm(32, 48);

  const leg = (u: number, v: number) => {
    const l = boxRegions(u, v, 4, 12, 4);
    const painter: Painter = (x, y, w, h) => {
      if (y >= h - 2) return y === h - 1 ? CLASSIC.sole : speckle(CLASSIC.shoe, r, 0.05);
      return speckle(y > 7 ? CLASSIC.jeansShade : CLASSIC.jeans, r, 0.06);
    };
    paintRegion(ctx, l.top, () => speckle(CLASSIC.jeans, r));
    paintRegion(ctx, l.bottom, () => CLASSIC.sole);
    for (const face of [l.front, l.back, l.right, l.left]) paintRegion(ctx, face, painter);
  };
  leg(0, 16);
  leg(16, 48);

  return pixelTexture(el);
}

// --- capes ------------------------------------------------------------------------------------------------

/** Where a ramp is at [t] (0..1), colours mixed in sRGB like the launcher's gradient brush. */
function rampAt(stops: string[], t: number): string {
  if (stops.length === 1) return stops[0];
  const scaled = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  const a = parseInt(stops[i].slice(1), 16);
  const b = parseInt(stops[i + 1].slice(1), 16);
  const mix = (shift: number) => Math.round(((a >> shift) & 255) * (1 - f) + ((b >> shift) & 255) * f);
  return `rgb(${mix(16)},${mix(8)},${mix(0)})`;
}

/**
 * A shop cape on the real 64x32 cape layout: the outside (10x16 at 1,1) in the item's colours from the
 * shoulders down, a darker border one pixel in and a light diamond near the top - CosmeticArt.kt's
 * CapeArt, at the cape's own resolution. The inside is the same, darker.
 */
export function makeCapeTexture(colors: string[]): THREE.CanvasTexture {
  const { el, ctx } = canvas(64, 32);
  const stops = ramp(colors);
  const regions = boxRegions(0, 0, 10, 16, 1);
  const r = rng(colors.join("").length * 31);
  paintRegion(ctx, regions.front, (x, y, w, h) => {
    const colour = rampAt(stops, (y + 0.5) / h);
    const diamond = (y === 3 && (x === 4 || x === 5)) || (y === 4 && x >= 3 && x <= 6) || (y === 5 && (x === 4 || x === 5));
    if (diamond) return tintOver(colour, 0.4);
    const border = x === 0 || x === w - 1 || y === 0 || y === h - 1;
    return border ? shadeOver(colour, 0.22) : jitter(colour, r);
  });
  paintRegion(ctx, regions.back, (x, y, w, h) => shadeOver(rampAt(stops, (y + 0.5) / h), 0.4));
  for (const face of [regions.top, regions.bottom, regions.left, regions.right]) {
    paintRegion(ctx, face, (x, y) => shadeOver(rampAt(stops, 0.5), 0.3));
  }
  return pixelTexture(el);
}

/** [colour] with white laid over it at [alpha]. */
function tintOver(colour: string, alpha: number): string {
  const [r, g, b] = toRgb(colour);
  const t = (v: number) => Math.round(v + (255 - v) * alpha);
  return `rgb(${t(r)},${t(g)},${t(b)})`;
}

/** [colour] with black laid over it at [alpha]. */
function shadeOver(colour: string, alpha: number): string {
  const [r, g, b] = toRgb(colour);
  return `rgb(${Math.round(r * (1 - alpha))},${Math.round(g * (1 - alpha))},${Math.round(b * (1 - alpha))})`;
}

function jitter(colour: string, random: () => number): string {
  const [r, g, b] = toRgb(colour);
  const t = 1 + (random() - 0.5) * 0.1;
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * t)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

function toRgb(colour: string): [number, number, number] {
  if (colour.startsWith("#")) {
    const n = parseInt(colour.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = colour.match(/\d+/g)!.map(Number);
  return [m[0], m[1], m[2]];
}

/** A cape texture from a picture - an uploaded or drawn 64x32 (or 2:1 HD) cape - kept pixel-sharp. */
export function capeTextureFrom(source: HTMLCanvasElement | HTMLImageElement): THREE.Texture {
  const texture = source instanceof HTMLCanvasElement ? new THREE.CanvasTexture(source) : new THREE.Texture(source);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// --- wings ------------------------------------------------------------------------------------------------

/** The launcher's wing outline (CosmeticArt.kt WingsArt), in its 0..1 box: root, tip and three lobes. */
export const WING_PATH: [number, number, number, number, number, number][] = [
  [0.38, 0.26, 0.22, 0.16, 0.06, 0.17],
  [0.05, 0.28, 0.07, 0.38, 0.11, 0.45],
  [0.137, 0.537, 0.177, 0.56, 0.23, 0.52],
  [0.257, 0.613, 0.293, 0.633, 0.34, 0.58],
  [0.373, 0.66, 0.41, 0.667, 0.45, 0.6],
];
export const WING_START: [number, number] = [0.47, 0.42];
export const WING_END: [number, number] = [0.47, 0.55];

/** The wing's art - gradient, feather lines and rim - on a square canvas, to lay over the wing shape. */
export function makeWingTexture(colors: string[]): THREE.CanvasTexture {
  const size = 512;
  const { el, ctx } = canvas(size, size);
  const stops = ramp(colors);
  const path = new Path2D();
  path.moveTo(WING_START[0] * size, WING_START[1] * size);
  for (const [a, b, c, d, e, f] of WING_PATH) path.bezierCurveTo(a * size, b * size, c * size, d * size, e * size, f * size);
  path.lineTo(WING_END[0] * size, WING_END[1] * size);
  path.closePath();
  const gradient = ctx.createLinearGradient(0.47 * size, 0.48 * size, 0.06 * size, 0.2 * size);
  stops.forEach((c, i) => gradient.addColorStop(stops.length === 1 ? 0 : i / (stops.length - 1), c));
  ctx.fillStyle = gradient;
  ctx.fill(path);
  // A soft sheen along the leading edge.
  const sheen = ctx.createLinearGradient(0.3 * size, 0.2 * size, 0.3 * size, 0.45 * size);
  sheen.addColorStop(0, "rgba(255,255,255,0.28)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineCap = "round";
  ctx.lineWidth = size * 0.014;
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of [
    [0.44, 0.445, 0.13, 0.3],
    [0.445, 0.475, 0.23, 0.515],
    [0.455, 0.505, 0.34, 0.575],
  ]) {
    ctx.moveTo(x1 * size, y1 * size);
    ctx.lineTo(x2 * size, y2 * size);
  }
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = size * 0.01;
  ctx.stroke(path);
  const texture = new THREE.CanvasTexture(el);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// --- the coin ---------------------------------------------------------------------------------------------

/**
 * A coin's face: gold with a milled rim and the Catalyst logo struck into it. The same picture serves as
 * its bump map, so the logo and rim stand up from the field.
 */
export function makeCoinFace(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 512;
  const { el, ctx } = canvas(size, size);
  const c = size / 2;
  const field = ctx.createRadialGradient(c * 0.8, c * 0.7, 20, c, c, c);
  field.addColorStop(0, "#FFE9A3");
  field.addColorStop(0.55, "#F2C230");
  field.addColorStop(1, "#B27812");
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, size, size);
  // The raised rim and a recessed field inside it.
  ctx.lineWidth = size * 0.05;
  ctx.strokeStyle = "#D99E1B";
  ctx.beginPath();
  ctx.arc(c, c, c * 0.9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = size * 0.012;
  ctx.strokeStyle = "#8F5F0C";
  ctx.beginPath();
  ctx.arc(c, c, c * 0.8, 0, Math.PI * 2);
  ctx.stroke();
  // The logo, struck in: drawn in two golds so its blocks read, scaled into the field.
  ctx.save();
  const scale = (size * 0.5) / 1000;
  ctx.translate(c - (858 * scale) / 2, c - (1000 * scale) / 2);
  ctx.scale(scale, scale);
  LOGO_SHAPES.forEach(([fill, d]) => {
    const lum = luminance(fill);
    ctx.fillStyle = lum > 0.35 ? "#FFF1C2" : lum > 0.15 ? "#E8B330" : "#A86F10";
    ctx.fill(new Path2D(d), "evenodd");
  });
  ctx.restore();
  const map = new THREE.CanvasTexture(el);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  // The bump map: the same rim and logo as light shapes on a darker field.
  const { el: bumpEl, ctx: b } = canvas(size, size);
  b.fillStyle = "#555";
  b.fillRect(0, 0, size, size);
  b.lineWidth = size * 0.05;
  b.strokeStyle = "#fff";
  b.beginPath();
  b.arc(c, c, c * 0.9, 0, Math.PI * 2);
  b.stroke();
  b.save();
  b.translate(c - (858 * scale) / 2, c - (1000 * scale) / 2);
  b.scale(scale, scale);
  LOGO_SHAPES.forEach(([, d]) => {
    b.fillStyle = "#ddd";
    b.fill(new Path2D(d), "evenodd");
  });
  b.restore();
  const bump = new THREE.CanvasTexture(bumpEl);
  return { map, bump };
}

/** Fine vertical lines round a coin's edge - the milling - as a repeating bump texture. */
export function makeMilling(): THREE.CanvasTexture {
  const { el, ctx } = canvas(256, 8);
  for (let x = 0; x < 256; x++) {
    ctx.fillStyle = x % 4 < 2 ? "#ffffff" : "#505050";
    ctx.fillRect(x, 0, 1, 8);
  }
  const texture = new THREE.CanvasTexture(el);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(6, 1);
  return texture;
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** A soft round glow, white at the middle - tinted by the material that uses it. */
export function makeGlowTexture(): THREE.CanvasTexture {
  const { el, ctx } = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.35, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(el);
}
