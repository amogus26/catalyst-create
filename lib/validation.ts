import {
  DEFAULT_DESIGN_TYPE,
  designType,
  type DesignTypeId,
} from "./design-types";

/**
 * What a submitted file has to be before this site keeps it, and the exact wording used to turn
 * one away.
 *
 * Ported from the launcher's `controls/ControlsValidation.kt`, deliberately including its habits:
 * the format is checked by reading the file's own bytes rather than trusting its name, the limits
 * are stated up front beside the drop zone, and every rejection is a plain sentence saying what
 * was wrong and what would be accepted. Nothing fails silently.
 *
 * The size rule depends on the kind of design, and only the cape has one - see `design-types.ts`
 * for why, at length. Everything else is checked for being a real PNG of a sane size and nothing
 * more, because inventing a texture size for a cosmetic the client has not implemented yet would
 * only reject good work.
 *
 * This module runs in the browser *and* on the server. The browser copy is a courtesy - it gives
 * an instant answer - and the server copy is the one that decides, because anything the browser
 * checks can be skipped by posting straight to the API.
 */

export const MAX_IMAGE_BYTES = 1024 * 1024;

/** The widest and tallest anything may be when its type has no fixed size, and the smallest. */
export const MAX_FREE_DIMENSION = 1024;
export const MIN_FREE_DIMENSION = 8;

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 24;

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type Validation = { ok: true; width: number; height: number } | { ok: false; message: string };

/** How the accepted sizes read in a sentence: "64x32, 128x64, 256x128 or 512x256". */
export function sizeListText(id: DesignTypeId): string | null {
  const sizes = designType(id).sizes;
  if (!sizes) return null;
  const parts = sizes.map((size) => `${size.width}x${size.height}`);
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} or ${parts[parts.length - 1]}`;
}

/** The line shown beside the drop zone for [id], before anyone picks a file. */
export function limitText(id: DesignTypeId): string {
  return designType(id).requirement;
}

/**
 * Reads a PNG's own header: the 8-byte signature, then the IHDR chunk that has to come first,
 * whose width and height are big-endian 32-bit integers at bytes 16 and 20. A file that is a PNG
 * only by name has neither, which is the point of looking.
 */
export function readPngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  for (let i = 0; i < PNG_MAGIC.length; i++) {
    if (bytes[i] !== PNG_MAGIC[i]) return null;
  }
  // Bytes 12-16 name the first chunk, which the spec requires to be IHDR.
  if (String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]) !== "IHDR") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (width === 0 || height === 0) return null;
  return { width, height };
}

/** Whether [width]x[height] is one of the sizes [id] accepts. Always true where there are none. */
export function isAcceptedSize(id: DesignTypeId, width: number, height: number): boolean {
  const sizes = designType(id).sizes;
  if (!sizes) return width <= MAX_FREE_DIMENSION && height <= MAX_FREE_DIMENSION && width >= MIN_FREE_DIMENSION && height >= MIN_FREE_DIMENSION;
  return sizes.some((size) => size.width === width && size.height === height);
}

/** The whole rule set for an uploaded image, in the order the messages read best. */
export function validateImage(
  fileName: string,
  size: number,
  bytes: Uint8Array,
  typeId: DesignTypeId = DEFAULT_DESIGN_TYPE,
): Validation {
  const type = designType(typeId);

  if (!fileName.toLowerCase().endsWith(".png")) {
    return { ok: false, message: "Only .png files are supported." };
  }
  if (size > MAX_IMAGE_BYTES) {
    return { ok: false, message: "That file is too large. Images must be under 1 MB." };
  }
  if (size === 0) {
    return { ok: false, message: "That file is empty." };
  }

  const png = readPngSize(bytes);
  if (!png) {
    return {
      ok: false,
      message: "That file isn't really a PNG (only its name is), so it couldn't be read as an image.",
    };
  }

  if (type.sizes) {
    if (!isAcceptedSize(typeId, png.width, png.height)) {
      return {
        ok: false,
        message: `${type.label}s must be ${sizeListText(typeId)} pixels. That image is ${png.width}x${png.height}.`,
      };
    }
  } else if (png.width > MAX_FREE_DIMENSION || png.height > MAX_FREE_DIMENSION) {
    return {
      ok: false,
      message: `That image is ${png.width}x${png.height}. Keep it to ${MAX_FREE_DIMENSION}x${MAX_FREE_DIMENSION} or smaller.`,
    };
  } else if (png.width < MIN_FREE_DIMENSION || png.height < MIN_FREE_DIMENSION) {
    return {
      ok: false,
      message: `That image is ${png.width}x${png.height}, which is too small to make out.`,
    };
  }

  return { ok: true, width: png.width, height: png.height };
}

/**
 * The display name is a label, not an identity - there are no accounts here. It is shown publicly
 * beside an approved design, which means it goes past the same human review the image does.
 */
export function validateDisplayName(
  raw: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const value = raw.trim().replace(/\s+/g, " ");
  if (value.length < DISPLAY_NAME_MIN) {
    return { ok: false, message: `Enter a display name of at least ${DISPLAY_NAME_MIN} characters.` };
  }
  if (value.length > DISPLAY_NAME_MAX) {
    return {
      ok: false,
      message: `That display name is too long. Keep it to ${DISPLAY_NAME_MAX} characters.`,
    };
  }
  // Control characters would let a name break the page it is printed on.
  if (/[\p{Cc}]/u.test(value)) {
    return { ok: false, message: "That display name contains characters that aren't allowed." };
  }
  return { ok: true, value };
}
