/**
 * What a submitted file has to be before this site keeps it, and the exact wording used to turn
 * one away.
 *
 * Ported from the launcher's `controls/ControlsValidation.kt`, deliberately including its habits:
 * the format is checked by reading the file's own bytes rather than trusting its name, the limits
 * are stated up front beside the drop zone, and every rejection is a plain sentence saying what
 * was wrong and what would be accepted. Nothing fails silently.
 *
 * **Capes must be 64x32, or an exact 2:1 HD multiple.** Minecraft's cape model (`PlayerCapeModel`
 * in 1.21.4) declares a 64x64 texture but gives the cape cuboid a `textureScaleY` of 0.5, so its
 * UVs are computed against 64x32 - the same layout as vanilla's own cape texture. UVs are
 * normalised, so exact multiples render identically at higher detail; any other size is stretched
 * or mis-sampled. A design that breaks this rule is no use to the launcher that would wear it, so
 * it is refused here rather than accepted and disappointing someone later.
 *
 * This module runs in the browser *and* on the server. The browser copy is a courtesy - it gives
 * an instant answer - and the server copy is the one that decides, because anything the browser
 * checks can be skipped by posting straight to the API.
 */

export const MAX_IMAGE_BYTES = 1024 * 1024;

export const CAPE_WIDTH = 64;
export const CAPE_HEIGHT = 32;

/** 64x32 and its HD multiples, as the launcher accepts them. */
export const CAPE_SCALES = [1, 2, 4, 8] as const;

export const CAPE_SIZE_TEXT = "64x32 pixels (or an HD multiple: 128x64, 256x128 or 512x256)";

/** Shown beside the drop zone, so the limits are known before anyone picks a file. */
export const LIMIT_TEXT = "PNG only | under 1 MB | 64x32 (or 128x64, 256x128, 512x256)";

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 24;

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type Validation = { ok: true; width: number; height: number } | { ok: false; message: string };

export function isCapeSize(width: number, height: number): boolean {
  return CAPE_SCALES.some((scale) => width === CAPE_WIDTH * scale && height === CAPE_HEIGHT * scale);
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

/** The whole rule set for an uploaded image, in the order the messages read best. */
export function validateImage(fileName: string, size: number, bytes: Uint8Array): Validation {
  if (!fileName.toLowerCase().endsWith(".png")) {
    return { ok: false, message: "Only .png files are supported for capes." };
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
  if (!isCapeSize(png.width, png.height)) {
    return {
      ok: false,
      message: `Capes must be ${CAPE_SIZE_TEXT}. That image is ${png.width}x${png.height}.`,
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
