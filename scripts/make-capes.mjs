#!/usr/bin/env node
/**
 * The Store's capes, painted as HD cape textures for the game, the launcher and this site:
 *
 *   node --no-warnings scripts/make-capes.mjs
 *
 * - the season and classic capes: a bold pixel emblem on a cloth field, in the old cape style - our own
 *   emblems, never Mojang's capes or logos;
 * - the meme capes: original jokes in pixel letters (no one's characters or photos);
 * - a flag cape for every country in lib/flags.ts, from the flag-icons artwork (MIT).
 *
 * Writes <slug>.png ("Gem Cape" is gem_cape.png, "Germany Flag" germany_flag.png) into the client
 * (assets/visuals/textures/cosmetics/capes/), the launcher (resources/cosmetics/capes/) and here
 * (public/cosmetics/capes/), and the flag list the launcher's Store reads (resources/cosmetics/flags.json).
 *
 * Layout: Minecraft's 64x32 cape texture at 4x (flags at 8x, for their emblems) - the outside, which shows
 * from behind, at (1,1) 10x16; the inside at (12,1); the sides at (0,1) and (11,1); top (1,0), bottom
 * (11,0); and the elytra (22,0) 24x22, filled because an elytra worn with a cape takes the cape's texture.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { FLAGS, flagName } from "../lib/flags.ts";

const SITE = dirname(dirname(fileURLToPath(import.meta.url)));
const DESKTOP = dirname(SITE);
const OUTS = [
  join(DESKTOP, "client/src/main/resources/assets/visuals/textures/cosmetics/capes"),
  join(DESKTOP, "launcher/src/main/resources/cosmetics/capes"),
  join(SITE, "public/cosmetics/capes"),
];
const FLAG_LIST = join(DESKTOP, "launcher/src/main/resources/cosmetics/flags.json");

// ------------------------------------------------------------------------------------------------ colour

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));
const lighten = (c, k) => (k >= 0 ? mix(c, [255, 255, 255], k) : mix(c, [0, 0, 0], -k));
const ramp = (stops, t) => {
  t = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (t <= p1) return mix(c0, c1, p1 > p0 ? (t - p0) / (p1 - p0) : 0);
  }
  return stops[stops.length - 1][1];
};

/** A steady 0..1 value for these numbers: the same every run, so a cape never changes by itself. */
function hash(...n) {
  let h = 2166136261;
  for (const v of n) h = Math.imul(h ^ (v | 0), 16777619) ^ (h >>> 13);
  return ((h >>> 0) % 100000) / 100000;
}

// ------------------------------------------------------------------------------------------------ a face

/** The outside face to paint: [w] x [h] pixels. */
class Face {
  constructor(w, h, fill = [0, 0, 0]) {
    this.w = w;
    this.h = h;
    this.px = Array.from({ length: h }, () => Array.from({ length: w }, () => [...fill]));
  }
  get(x, y) {
    return this.px[Math.min(this.h - 1, Math.max(0, y))][Math.min(this.w - 1, Math.max(0, x))];
  }
  set(x, y, c) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y][x] = c.map((v) => Math.max(0, Math.min(255, Math.round(v))));
  }
  each(fn) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.set(x, y, fn(x, y, this.px[y][x]));
  }
  rect(x0, y0, x1, y1, c) {
    for (let y = Math.round(y0); y < Math.round(y1); y++) for (let x = Math.round(x0); x < Math.round(x1); x++) this.set(x, y, c);
  }
}

/**
 * The face as chunky cells - 20 x 32, two pixels each - the way the old capes are drawn: shapes are filled
 * cell by cell, then outlined, so everything has the blocky edge a cape should.
 */
class Cells {
  constructor(face, size = 2) {
    this.face = face;
    this.size = size;
    this.w = face.w / size;
    this.h = face.h / size;
    this.mask = Array.from({ length: this.h }, () => Array(this.w).fill(null));
  }
  /** Fills every cell whose middle [inside] says yes. */
  shape(inside, colour, tag = "shape") {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (inside(x + 0.5, y + 0.5)) {
          this.paint(x, y, typeof colour === "function" ? colour(x + 0.5, y + 0.5) : colour);
          this.mask[y][x] = tag;
        }
      }
  }
  paint(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const s = this.size;
    // Each cell a touch lighter or darker than the next - woven cloth, not flat plastic.
    const grain = (hash(x, y, 7) - 0.5) * 0.07;
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) this.face.set(x * s + dx, y * s + dy, lighten(c, grain));
  }
  /** A dark edge round everything tagged [tag]: the sticker outline that makes an emblem read. */
  outline(tag, colour) {
    const edge = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.mask[y][x] === tag) continue;
        const near = [
          [1, 0], [-1, 0], [0, 1], [0, -1],
        ].some(([dx, dy]) => this.mask[y + dy]?.[x + dx] === tag);
        if (near) edge.push([x, y]);
      }
    for (const [x, y] of edge) {
      this.paint(x, y, colour);
      this.mask[y][x] = "outline";
    }
  }
}

// A 3 x 5 pixel font.
const FONT = {
  A: ["010", "101", "111", "101", "101"], B: ["110", "101", "110", "101", "110"], C: ["011", "100", "100", "100", "011"],
  D: ["110", "101", "101", "101", "110"], E: ["111", "100", "110", "100", "111"], F: ["111", "100", "110", "100", "100"],
  G: ["011", "100", "101", "101", "011"], H: ["101", "101", "111", "101", "101"], I: ["111", "010", "010", "010", "111"],
  J: ["001", "001", "001", "101", "010"], K: ["101", "101", "110", "101", "101"], L: ["100", "100", "100", "100", "111"],
  M: ["101", "111", "111", "101", "101"], N: ["110", "101", "101", "101", "101"], O: ["010", "101", "101", "101", "010"],
  P: ["110", "101", "110", "100", "100"], Q: ["010", "101", "101", "110", "011"], R: ["110", "101", "110", "101", "101"],
  S: ["011", "100", "010", "001", "110"], T: ["111", "010", "010", "010", "010"], U: ["101", "101", "101", "101", "111"],
  V: ["101", "101", "101", "101", "010"], W: ["101", "101", "111", "111", "101"], X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"], Z: ["111", "001", "010", "100", "111"], 0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"], 2: ["110", "001", "010", "100", "111"], 3: ["110", "001", "010", "001", "110"],
  4: ["101", "101", "111", "001", "001"], 5: ["111", "100", "110", "001", "110"], 6: ["011", "100", "111", "101", "111"],
  7: ["111", "001", "010", "010", "010"], 8: ["111", "101", "111", "101", "111"], 9: ["111", "101", "111", "001", "110"],
  "!": ["010", "010", "010", "000", "010"], "?": ["110", "001", "010", "000", "010"], ".": ["000", "000", "000", "000", "010"],
  "-": ["000", "000", "111", "000", "000"], ":": ["000", "010", "000", "010", "000"], " ": ["000", "000", "000", "000", "000"],
  "%": ["101", "001", "010", "100", "101"], "(": ["010", "100", "100", "100", "010"], ")": ["010", "001", "001", "001", "010"],
};

/** Writes [text] centred on [cx] with its top at [y], each font pixel [scale] face pixels, a shadow under it. */
function text(face, str, cx, y, colour, scale = 2, shadow = [0, 0, 0]) {
  const pitch = 4 * scale;
  const width = str.length * pitch - scale;
  const x0 = Math.round(cx - width / 2);
  const draw = (ox, oy, c) => {
    [...str].forEach((ch, i) => {
      const glyph = FONT[ch.toUpperCase()] ?? FONT["?"];
      glyph.forEach((row, gy) =>
        [...row].forEach((bit, gx) => {
          if (bit === "1") face.rect(x0 + i * pitch + gx * scale + ox, y + gy * scale + oy, x0 + i * pitch + (gx + 1) * scale + ox, y + (gy + 1) * scale + oy, c);
        }),
      );
    });
  };
  if (shadow) draw(Math.max(1, Math.floor(scale / 2)), Math.max(1, Math.floor(scale / 2)), shadow);
  draw(0, 0, colour);
}

/** A cloth field: a vertical [stops] gradient with soft woven grain. */
function cloth(face, stops, grain = 0.05) {
  face.each((x, y) => lighten(ramp(stops, y / (face.h - 1)), ((x + y) % 2) * grain - grain / 2 + (hash(x >> 1, y >> 1, 3) - 0.5) * grain));
}

/** A trim round the edge, [width] pixels, with a lighter line inside. */
function border(face, colour, inner, width = 2) {
  for (let y = 0; y < face.h; y++)
    for (let x = 0; x < face.w; x++) {
      const d = Math.min(x, y, face.w - 1 - x, face.h - 1 - y);
      if (d < width) face.set(x, y, colour);
      else if (inner && d === width) face.set(x, y, inner);
    }
}

/** A soft round glow added onto the face. */
function glow(face, cx, cy, r, colour, k) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
      if (d < 1) face.set(x, y, mix(face.get(x, y), colour, k * (1 - d) ** 2));
    }
}

const inPoly = (pts) => (x, y) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const inCircle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) <= r;
const star5 = (cx, cy, r, inner = 0.45) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * inner;
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });

// ------------------------------------------------------------------------------------------------ designs

const W4 = 40;
const H4 = 64;

/** A design: the face, the inside's colour and the edges' - as design_capes.py's are. */
const DESIGNS = {
  // --- the season capes, redone in the bold style
  emberfall_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#7A1E0E")], [0.6, hex("#4A120A")], [1, hex("#2A0906")]]);
    glow(f, 20, 34, 22, hex("#FF7A1A"), 0.45);
    const c = new Cells(f);
    c.shape(inPoly([[10, 4], [13, 9], [14, 12], [15, 8], [17, 13], [17, 18], [15, 23], [10, 26], [5, 23], [3, 18], [4, 13], [6, 15], [7, 10]]), hex("#FF8A1E"), "flame");
    c.shape(inPoly([[10, 11], [12, 15], [13, 19], [11, 23], [9, 23], [7, 19], [8, 15]]), hex("#FFD24A"), "flame");
    c.shape(inPoly([[10, 16], [11.5, 19.5], [10.5, 22], [9.5, 22], [8.5, 19.5]]), hex("#FFF6D8"), "flame");
    c.outline("flame", hex("#3A0A06"));
    border(f, hex("#C88B3A"), hex("#7A4A1A"));
    return [f, hex("#2A0906"), hex("#8A5A24")];
  },
  sculk_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#0B2A33")], [1, hex("#051418")]]);
    const c = new Cells(f);
    // glowing tendrils branching up from the hem
    const veins = [
      [[10, 31], [10, 24], [7, 19], [7, 13], [4, 9]],
      [[10, 24], [13, 19], [13, 12], [16, 7]],
      [[7, 19], [3, 16]],
      [[13, 15], [17, 13]],
    ];
    for (const path of veins)
      for (let i = 0; i < path.length - 1; i++) {
        const [x0, y0] = path[i];
        const [x1, y1] = path[i + 1];
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let s = 0; s <= steps; s++) {
          const x = Math.round(x0 + ((x1 - x0) * s) / steps);
          const y = Math.round(y0 + ((y1 - y0) * s) / steps);
          c.paint(x, y, hex("#2FE0D6"));
          c.mask[y][x] = "vein";
        }
      }
    for (const [x, y] of [[4, 9], [16, 7], [3, 16], [17, 13]]) c.shape(inCircle(x + 0.5, y + 0.5, 1.6), hex("#9AFFF6"), "vein");
    c.outline("vein", hex("#0E4F55"));
    glow(f, 20, 40, 26, hex("#1FB8B0"), 0.25);
    border(f, hex("#123E44"), hex("#1E6E70"));
    return [f, hex("#051418"), hex("#123E44")];
  },
  aurora_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#071431")], [1, hex("#02060F")]]);
    f.each((x, y, p) => {
      let col = p;
      for (const [band, colour, amp] of [[16, "#3BF0A0", 4], [24, "#38C8F0", 5], [31, "#8B6CFF", 3]]) {
        const centre = band + Math.sin(x / 6 + band) * amp;
        const d = Math.abs(y - centre) / 5;
        if (d < 1) col = mix(col, hex(colour), (1 - d) * 0.85);
      }
      return col;
    });
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(hash(i, 1) * W4);
      const y = Math.floor(hash(i, 2) * 60);
      f.set(x, y, hash(i, 3) > 0.5 ? [255, 255, 255] : [200, 220, 255]);
    }
    border(f, hex("#1B2E58"), hex("#3B5FA8"));
    return [f, hex("#02060F"), hex("#1B2E58")];
  },
  nightfall_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#1A2A5E")], [1, hex("#070B1E")]]);
    const c = new Cells(f);
    c.shape((x, y) => inCircle(10, 12, 6)(x, y) && !inCircle(12.4, 10.6, 5.2)(x, y), hex("#F4E9B0"), "moon");
    c.outline("moon", hex("#0A1030"));
    glow(f, 20, 24, 18, hex("#F4E9B0"), 0.18);
    for (const [x, y, s] of [[4, 5, 1], [16, 4, 1], [15, 20, 1], [5, 24, 1], [12, 28, 1], [17, 27, 1]])
      c.shape(inPoly(star5(x + 0.5, y + 0.5, 1.7)), hex("#FFFFFF"), "star");
    border(f, hex("#0E1636"), hex("#2E3F7A"));
    return [f, hex("#070B1E"), hex("#0E1636")];
  },
  verdant_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#2E7D32")], [1, hex("#14401A")]]);
    const c = new Cells(f);
    c.shape(inPoly([[10, 3], [15, 9], [16, 16], [13, 23], [10, 26], [7, 23], [4, 16], [5, 9]]), hex("#7BD66B"), "leaf");
    c.shape((x, y) => Math.abs(x - 10) < 0.6 && y > 6 && y < 28, hex("#2E7D32"), "vein");
    for (let i = 0; i < 4; i++) {
      const y = 10 + i * 4;
      c.shape((x, yy) => Math.abs(yy - (y + Math.abs(x - 10) * 0.7)) < 0.55 && Math.abs(x - 10) > 0.6 && Math.abs(x - 10) < 4 - i * 0.4, hex("#4CAF50"), "vein");
    }
    c.outline("leaf", hex("#0C2A10"));
    border(f, hex("#5D3A1A"), hex("#8A5A2A"));
    return [f, hex("#14401A"), hex("#5D3A1A")];
  },

  // --- classics: one bold emblem each
  miner_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#5E636B")], [1, hex("#2F3238")]], 0.09);
    const c = new Cells(f);
    const handle = inPoly([[5.2, 25.5], [6.8, 27], [15.5, 18.3], [14, 16.8]]);
    c.shape(handle, hex("#8A5A2E"), "pick");
    c.shape(inPoly([[3, 9], [7, 6], [12, 6], [17, 9], [16.5, 10.5], [12, 8.6], [7, 8.6], [3.5, 10.5]]), hex("#5FD6E8"), "pick");
    c.shape(inPoly([[9, 7], [12, 7], [15.5, 17.5], [14, 18]]), hex("#5FD6E8"), "pick");
    c.outline("pick", hex("#15171B"));
    border(f, hex("#24272C"), hex("#7A808A"));
    return [f, hex("#2F3238"), hex("#24272C")];
  },
  gem_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#1E3FA8")], [1, hex("#0C1A52")]]);
    glow(f, 20, 28, 20, hex("#7FE8FF"), 0.35);
    const c = new Cells(f);
    c.shape(inPoly([[10, 5], [17, 12], [10, 25], [3, 12]]), hex("#5BE0F5"), "gem");
    c.shape(inPoly([[10, 5], [13, 12], [10, 25]]), hex("#B9F6FF"), "gem");
    c.shape(inPoly([[3, 12], [17, 12], [10, 13.6]]), hex("#2FB4D6"), "gem");
    c.shape(inPoly([[8, 7], [10, 5], [10, 9]]), hex("#FFFFFF"), "gem");
    c.outline("gem", hex("#06103A"));
    border(f, hex("#E3B341"), hex("#8A6A12"));
    return [f, hex("#0C1A52"), hex("#8A6A12")];
  },
  torchlight_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#3A2414")], [1, hex("#1A0F08")]]);
    glow(f, 20, 16, 20, hex("#FFB238"), 0.5);
    const c = new Cells(f);
    c.shape(inPoly([[8.6, 13], [11.4, 13], [11, 28], [9, 28]]), hex("#7A4A22"), "torch");
    c.shape(inPoly([[10, 4], [12.6, 8], [12, 12], [10, 13], [8, 12], [7.4, 8]]), hex("#FF9A1F"), "torch");
    c.shape(inPoly([[10, 7], [11.4, 9.5], [10.8, 12], [9.2, 12], [8.6, 9.5]]), hex("#FFE27A"), "torch");
    c.outline("torch", hex("#120804"));
    border(f, hex("#5A3A1E"), hex("#8A6A3A"));
    return [f, hex("#1A0F08"), hex("#5A3A1E")];
  },
  heart_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#C62839")], [1, hex("#6E0E1A")]]);
    const c = new Cells(f);
    const heart = (x, y) => {
      const u = (x - 10) / 7;
      const v = (13 - y) / 7;
      return (u * u + v * v - 1) ** 3 - u * u * v * v * v <= 0;
    };
    c.shape(heart, hex("#FFFFFF"), "heart");
    c.shape((x, y) => heart(x, y) && inCircle(6.6, 9.4, 1.5)(x, y), hex("#FFD6DC"), "heart");
    c.outline("heart", hex("#3A0410"));
    border(f, hex("#FFFFFF"), hex("#F7A1AD"), 1);
    return [f, hex("#6E0E1A"), hex("#8A1622")];
  },
  starfall_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#3A1E6E")], [1, hex("#12082A")]]);
    const c = new Cells(f);
    for (const [x, y, r] of [[10, 11, 6.2], [4, 22, 2.8], [16, 24, 2.4], [8, 29, 1.8]]) {
      c.shape(inPoly(star5(x, y, r)), hex("#FFD84A"), "star");
      // its trail, falling from the top right
      for (let i = 1; i < r * 2.4; i++) c.paint(Math.round(x + i * 0.9), Math.round(y - i * 0.9), mix(hex("#FFD84A"), hex("#3A1E6E"), i / (r * 2.4)));
    }
    c.outline("star", hex("#1A0A3A"));
    border(f, hex("#E3B341"), hex("#6A4AA8"));
    return [f, hex("#12082A"), hex("#6A4AA8")];
  },
  thunder_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#2B3240")], [1, hex("#12161E")]]);
    glow(f, 20, 30, 24, hex("#FFE14A"), 0.3);
    const c = new Cells(f);
    c.shape(inPoly([[12, 3], [5, 17], [10, 17], [7, 29], [16, 13], [11, 13], [14, 3]]), hex("#FFE14A"), "bolt");
    c.shape(inPoly([[12.6, 4], [8, 14], [10, 14]]), hex("#FFF7C2"), "bolt");
    c.outline("bolt", hex("#0A0C10"));
    border(f, hex("#FFE14A"), hex("#4A5262"), 1);
    return [f, hex("#12161E"), hex("#3A4250")];
  },
  moonrise_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#0F1E46")], [0.7, hex("#2A3E7A")], [1, hex("#3A2A5E")]]);
    const c = new Cells(f);
    c.shape(inCircle(10, 16, 6.5), hex("#F2EBD0"), "moon");
    c.shape((x, y) => inCircle(10, 16, 6.5)(x, y) && (inCircle(8, 14, 1.4)(x, y) || inCircle(12.5, 18, 1.1)(x, y) || inCircle(11.5, 12.5, 0.8)(x, y)), hex("#D8CFA8"), "moon");
    c.outline("moon", hex("#0A1230"));
    // hills on the horizon
    c.shape((x, y) => y > 26 - Math.sin(x / 3) * 1.5, hex("#141A33"), "hill");
    border(f, hex("#0A1230"), hex("#3A4E8A"));
    return [f, hex("#0F1E46"), hex("#0A1230")];
  },
  swordsman_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#9E1B24")], [1, hex("#4A0A10")]]);
    const c = new Cells(f);
    for (const flip of [1, -1]) {
      const at = (x, y) => [10 + flip * (x - 10), y];
      c.shape(inPoly([at(4, 6), at(5.5, 5), at(15, 20), at(14, 21)]), hex("#D8DEE6"), "sword");
      c.shape(inPoly([at(12, 21), at(17, 16.5), at(18, 17.5), at(13, 22)]), hex("#E3B341"), "sword");
      c.shape(inPoly([at(14.5, 21), at(15.5, 20), at(18, 23), at(17, 24)]), hex("#6A3A1A"), "sword");
    }
    c.outline("sword", hex("#22050A"));
    border(f, hex("#E3B341"), hex("#7A1A1A"));
    return [f, hex("#4A0A10"), hex("#7A1A1A")];
  },

  // --- memes: our own jokes, in pixel letters
  skill_issue_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#141414")], [1, hex("#050505")]]);
    text(f, "SKILL", 20, 16, hex("#FF3B3B"), 2);
    text(f, "ISSUE", 20, 30, hex("#FFFFFF"), 2);
    text(f, ":(", 20, 46, hex("#FF3B3B"), 2, null);
    border(f, hex("#FF3B3B"), null, 1);
    return [f, hex("#050505"), hex("#2A0A0A")];
  },
  gg_ez_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#1FAA59")], [1, hex("#0B5A2C")]]);
    text(f, "GG", 20, 12, hex("#FFFFFF"), 4, hex("#08391C"));
    text(f, "EZ", 20, 40, hex("#FFE14A"), 3, hex("#08391C"));
    border(f, hex("#0B5A2C"), hex("#5FE08F"));
    return [f, hex("#0B5A2C"), hex("#0B5A2C")];
  },
  touch_grass_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#7EC8F5")], [0.62, hex("#BDE6FF")], [0.63, hex("#5AB54B")], [0.75, hex("#3E8E36")], [0.76, hex("#7A5432")], [1, hex("#5A3A20")]]);
    const c = new Cells(f);
    for (let x = 0; x < 20; x++) if (hash(x, 9) > 0.35) c.paint(x, 19, hex("#6CCB5C"));
    for (let x = 1; x < 20; x += 3) c.paint(x, 18, hex("#4FAE42"));
    c.shape(inCircle(15, 5, 2.4), hex("#FFE14A"), "sun");
    text(f, "TOUCH", 20, 12, hex("#FFFFFF"), 2, hex("#3A6E9A"));
    text(f, "GRASS", 20, 24, hex("#FFFFFF"), 2, hex("#3A6E9A"));
    return [f, hex("#3E8E36"), hex("#5A3A20")];
  },
  afk_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#6B7280")], [1, hex("#374151")]]);
    text(f, "AFK", 20, 22, hex("#FFFFFF"), 3, hex("#1F2430"));
    text(f, "Z", 30, 8, hex("#C7D2FE"), 2, null);
    text(f, "Z", 25, 3, hex("#C7D2FE"), 1, null);
    text(f, "BRB", 20, 46, hex("#D1D5DB"), 2, hex("#1F2430"));
    border(f, hex("#1F2430"), hex("#9CA3AF"));
    return [f, hex("#374151"), hex("#1F2430")];
  },
  error_404_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#F2F2F2")], [1, hex("#D4D4D4")]], 0.03);
    f.rect(0, 0, 40, 6, hex("#3B82F6"));
    for (const [x, c] of [[3, "#F87171"], [7, "#FBBF24"], [11, "#34D399"]]) f.rect(x, 2, x + 2, 4, hex(c));
    text(f, "404", 20, 18, hex("#111827"), 3, null);
    text(f, "SKILL", 20, 40, hex("#6B7280"), 1, null);
    text(f, "NOT", 20, 47, hex("#6B7280"), 1, null);
    text(f, "FOUND", 20, 54, hex("#6B7280"), 1, null);
    border(f, hex("#9CA3AF"), null, 1);
    return [f, hex("#D4D4D4"), hex("#9CA3AF")];
  },
  low_battery_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#1F2937")], [1, hex("#0B0F17")]]);
    // a battery standing up: outline, cap, one red bar
    f.rect(11, 10, 29, 12, hex("#E5E7EB"));
    f.rect(16, 7, 24, 10, hex("#E5E7EB"));
    f.rect(11, 12, 13, 50, hex("#E5E7EB"));
    f.rect(27, 12, 29, 50, hex("#E5E7EB"));
    f.rect(11, 50, 29, 52, hex("#E5E7EB"));
    f.rect(14, 44, 26, 49, hex("#EF4444"));
    text(f, "1%", 20, 25, hex("#EF4444"), 2, null);
    text(f, "LOW", 20, 55, hex("#9CA3AF"), 1, null);
    return [f, hex("#0B0F17"), hex("#374151")];
  },
  loading_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#0A0A0A")], [1, hex("#000000")]], 0.02);
    // the spinner: dots round a ring, fading
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.round(20 + Math.cos(a) * 7);
      const y = Math.round(20 + Math.sin(a) * 7);
      f.rect(x - 1, y - 1, x + 2, y + 2, mix(hex("#FFFFFF"), hex("#1A1A1A"), i / 8));
    }
    text(f, "LOADING", 20, 38, hex("#FFFFFF"), 1, null);
    f.rect(6, 47, 34, 52, hex("#2A2A2A"));
    f.rect(7, 48, 22, 51, hex("#22C55E"));
    text(f, "52%", 20, 55, hex("#9CA3AF"), 1, null);
    return [f, hex("#000000"), hex("#1A1A1A")];
  },
  bruh_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#FF8A1E")], [1, hex("#C2410C")]]);
    text(f, "BRUH", 20, 26, hex("#FFFFFF"), 2, hex("#7C2D12"));
    // two flat eyes and a flat mouth: unimpressed
    f.rect(12, 12, 17, 14, hex("#3A1A06"));
    f.rect(23, 12, 28, 14, hex("#3A1A06"));
    f.rect(15, 44, 25, 46, hex("#3A1A06"));
    border(f, hex("#7C2D12"), hex("#FDBA74"));
    return [f, hex("#C2410C"), hex("#7C2D12")];
  },
  stonks_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#0B1F3A")], [1, hex("#050D1A")]]);
    for (let y = 8; y < 56; y += 6) f.rect(3, y, 37, y + 1, hex("#13304F"));
    const line = [[4, 48], [11, 40], [16, 44], [23, 30], [28, 34], [35, 14]];
    for (let i = 0; i < line.length - 1; i++) {
      const [x0, y0] = line[i];
      const [x1, y1] = line[i + 1];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 0; s <= steps; s++) {
        const x = Math.round(x0 + ((x1 - x0) * s) / steps);
        const y = Math.round(y0 + ((y1 - y0) * s) / steps);
        f.rect(x - 1, y - 1, x + 2, y + 2, hex("#22C55E"));
      }
    }
    f.rect(31, 12, 38, 14, hex("#22C55E"));
    f.rect(36, 12, 38, 19, hex("#22C55E"));
    text(f, "STONKS", 20, 55, hex("#86EFAC"), 1, null);
    return [f, hex("#050D1A"), hex("#13304F")];
  },
  such_cape() {
    // An original pixel shiba, not anyone's photo, with "wow" in candy colours round it.
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#FFE9A8")], [1, hex("#F7C873")]], 0.03);
    const c = new Cells(f);
    const tan = hex("#E0A050");
    c.shape(inPoly([[4, 9], [6, 5], [8, 9], [12, 9], [14, 5], [16, 9], [17, 15], [15, 20], [10, 22], [5, 20], [3, 15]]), tan, "dog");
    c.shape(inPoly([[6, 15], [10, 13], [14, 15], [13, 20], [10, 21], [7, 20]]), hex("#FFF4E0"), "dog");
    c.shape(inPoly([[5, 6.5], [6, 5], [7, 8]]), hex("#FFF4E0"), "dog");
    c.shape(inPoly([[13, 8], [14, 5], [15, 6.5]]), hex("#FFF4E0"), "dog");
    for (const x of [7.5, 12.5]) c.shape(inCircle(x, 13, 0.9), hex("#2A1A10"), "dog");
    c.shape(inCircle(10, 16.6, 1.0), hex("#2A1A10"), "dog");
    c.outline("dog", hex("#7A4A1A"));
    text(f, "WOW", 9, 48, hex("#FF4FA2"), 1, null);
    text(f, "SUCH", 28, 52, hex("#3B82F6"), 1, null);
    text(f, "CAPE", 14, 57, hex("#22C55E"), 1, null);
    text(f, "WOW", 31, 3, hex("#A855F7"), 1, null);
    return [f, hex("#F7C873"), hex("#C08A3A")];
  },
  npc_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#9CA3AF")], [1, hex("#6B7280")]], 0.03);
    // a blank face: two dots and a straight line
    f.rect(12, 12, 28, 30, hex("#D1D5DB"));
    f.rect(15, 18, 17, 20, hex("#111827"));
    f.rect(23, 18, 25, 20, hex("#111827"));
    f.rect(16, 25, 24, 26, hex("#111827"));
    text(f, "NPC", 20, 38, hex("#111827"), 2, null);
    text(f, "OK.", 20, 53, hex("#374151"), 1, null);
    border(f, hex("#4B5563"), hex("#D1D5DB"), 1);
    return [f, hex("#6B7280"), hex("#4B5563")];
  },
  one_heart_cape() {
    const f = new Face(W4, H4);
    cloth(f, [[0, hex("#1F1F24")], [1, hex("#0A0A0C")]]);
    const hearts = (cx, cy, filled) => {
      const shape = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"];
      shape.forEach((row, y) =>
        [...row].forEach((bit, x) => {
          if (bit !== "1") return;
          const edge = !shape[y - 1]?.[x] || shape[y - 1][x] === "0" || !shape[y + 1]?.[x] || shape[y + 1][x] === "0" || row[x - 1] !== "1" || row[x + 1] !== "1";
          f.set(cx + x, cy + y, filled ? (edge ? hex("#8A0A14") : hex("#EF2B3B")) : edge ? hex("#3A3A40") : hex("#141418"));
        }),
      );
    };
    hearts(6, 14, true);
    hearts(16, 14, false);
    hearts(26, 14, false);
    text(f, "1 HP", 20, 34, hex("#EF2B3B"), 2, null);
    text(f, "GOOD", 20, 50, hex("#9CA3AF"), 1, null);
    text(f, "LUCK", 20, 56, hex("#9CA3AF"), 1, null);
    return [f, hex("#0A0A0C"), hex("#3A3A40")];
  },
};

// ------------------------------------------------------------------------------------------------ flags

/** Whether every row (or column) of [raw] is one colour - a striped flag that stretches cleanly. */
function striped(raw, w, h) {
  const near = (i, j) => Math.abs(raw[i] - raw[j]) + Math.abs(raw[i + 1] - raw[j + 1]) + Math.abs(raw[i + 2] - raw[j + 2]) < 40;
  let rows = 0;
  let cols = 0;
  for (let y = 0; y < h; y++) {
    let ok = true;
    for (let x = 1; x < w && ok; x++) ok = near((y * w + x) * 4, (y * w) * 4);
    if (ok) rows++;
  }
  for (let x = 0; x < w; x++) {
    let ok = true;
    for (let y = 1; y < h && ok; y++) ok = near((y * w + x) * 4, x * 4);
    if (ok) cols++;
  }
  return rows > h * 0.97 || cols > w * 0.97;
}

function rowUniform(raw, w, y) {
  for (let x = 1; x < w; x++) {
    const i = (y * w + x) * 4;
    const j = y * w * 4;
    if (Math.abs(raw[i] - raw[j]) + Math.abs(raw[i + 1] - raw[j + 1]) + Math.abs(raw[i + 2] - raw[j + 2]) > 40) return false;
  }
  return true;
}

/**
 * A flag on a cape's 80 x 128 face. A striped flag is stretched to fill it; one with an emblem in its middle
 * keeps its shape, centred, with its top and bottom edges carried on above and below; any other (a canton
 * in the corner) is stretched too. Then it hangs in soft folds, with a darker hem.
 */
async function flagFace(code) {
  const FW = 80;
  const FH = 128;
  const svg = readFileSync(join(SITE, "node_modules/flag-icons/flags/4x3", `${code}.svg`));
  // A flag that isn't a rectangle (Nepal's) hangs on white cloth.
  const flat = await sharp(svg, { density: 300 }).resize(FW, 60, { fit: "fill" }).flatten({ background: "#FFFFFF" }).raw().toBuffer();
  const face = new Face(FW, FH);
  if (striped(flat, FW, 60) || !rowUniform(flat, FW, 0) || !rowUniform(flat, FW, 59)) {
    const tall = await sharp(svg, { density: 300 }).resize(FW, FH, { fit: "fill" }).flatten({ background: "#FFFFFF" }).raw().toBuffer();
    face.each((x, y) => [tall[(y * FW + x) * 3], tall[(y * FW + x) * 3 + 1], tall[(y * FW + x) * 3 + 2]]);
  } else {
    const top = (FH - 60) >> 1;
    face.each((x, y) => {
      const sy = Math.min(59, Math.max(0, y - top));
      const i = (sy * FW + x) * 3;
      return [flat[i], flat[i + 1], flat[i + 2]];
    });
  }
  // Folds: the cloth catching the light in soft vertical waves, and a hem.
  face.each((x, y, p) => lighten(p, Math.sin(x / 7 + y / 40) * 0.07 - (y > FH - 4 ? 0.25 : 0)));
  return face;
}

// ------------------------------------------------------------------------------------------------ the layout

/** The whole texture at [s] times 64x32: as design_capes.py lays a cape out. */
function layout(front, inside, edge, s) {
  const W = 64 * s;
  const H = 32 * s;
  const out = Buffer.alloc(W * H * 4);
  const put = (x, y, c, a = 255) => {
    const i = (y * W + x) * 4;
    out[i] = c[0];
    out[i + 1] = c[1];
    out[i + 2] = c[2];
    out[i + 3] = a;
  };
  const FW = 10 * s;
  const FH = 16 * s;
  for (let y = 0; y < FH; y++)
    for (let x = 0; x < FW; x++) {
      const p = front.get(Math.floor((x / FW) * front.w), Math.floor((y / FH) * front.h));
      put(s + x, s + y, p);
      const q = front.get(front.w - 1 - Math.floor((x / FW) * front.w), Math.floor((y / FH) * front.h));
      put(12 * s + x, s + y, mix(inside, q, 0.18));
    }
  for (let y = 0; y < FH; y++)
    for (let x = 0; x < s; x++) {
      put(x, s + y, edge);
      put(11 * s + x, s + y, edge);
    }
  for (let y = 0; y < s; y++)
    for (let x = 0; x < FW; x++) {
      put(s + x, y, lighten(edge, 0.15));
      put(11 * s + x, y, lighten(edge, -0.2));
    }
  const ex = 22 * s;
  const ew = 24 * s;
  const eh = 22 * s;
  for (let y = 0; y < eh; y++) for (let x = 0; x < ew; x++) put(ex + x, y, front.get(Math.floor((x / ew) * front.w), Math.floor((y / eh) * front.h)));
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9, palette: false }).toBuffer();
}

async function write(slug, png) {
  for (const dir of OUTS) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${slug}.png`), png);
  }
}

const slugOf = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

for (const [slug, design] of Object.entries(DESIGNS)) {
  const [face, inside, edge] = design();
  await write(slug, await layout(face, inside, edge, 4));
}
console.log(`${Object.keys(DESIGNS).length} designed capes`);

for (const [code, country] of FLAGS) {
  const face = await flagFace(code);
  await write(slugOf(flagName(country)), await layout(face, lighten(face.get(40, 64), -0.6), lighten(face.get(40, 64), -0.45), 8));
}
writeFileSync(FLAG_LIST, JSON.stringify(FLAGS.map(([code, country]) => ({ code, country })), null, 1) + "\n");
console.log(`${FLAGS.length} flag capes, and ${FLAG_LIST}`);
