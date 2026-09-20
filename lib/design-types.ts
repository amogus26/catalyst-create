/**
 * What kinds of design this site takes, and what each one's file has to be.
 *
 * The names come from the launcher rather than being invented here: `ShopKind` in the launcher's
 * ShopPage is {Wings, Cape} - "the shop sells wearables: wings and capes" - and its cosmetics page
 * lists Cloaks, Wings, Hats, Pets, Backpacks and Emotes. The four below are the wearables from
 * those lists that a person can actually draw as a texture. Pets and Emotes are deliberately left
 * out: a pet is a model and an emote is an animation, and neither is a PNG somebody submits.
 *
 * **On dimensions - the part worth reading.** Only the cape has a real, checkable size in this
 * project: 64x32 or an exact 2:1 HD multiple, because the 1.21.4 cape model computes its UVs
 * against a 64x32 layout (see the launcher's `controls/ControlsValidation.kt`, which explains it
 * properly). Nothing else has a settled size *anywhere* in the project - the client mod implements
 * capes (`ControlsCapeMixin`) and nothing else yet, and the launcher's wings are drawn artwork
 * rather than a texture.
 *
 * So the rule is: **enforce a size only where the project actually specifies one.** Capes are
 * checked exactly as before; every other type gets format and size checks only. Holding wings to
 * the cape's 64x32 would be inventing a spec and rejecting perfectly good submissions for breaking
 * a rule nobody has written - which is the one failure mode worth avoiding while the mod side is
 * still unbuilt. When wings do get implemented, add their sizes to `sizes` here and the checks,
 * the drop zone's wording and the submit form all follow.
 */

export type DesignTypeId = "cape" | "wings" | "hat" | "backpack";

export interface DesignSize {
  width: number;
  height: number;
}

export interface DesignType {
  id: DesignTypeId;
  label: string;
  /** The exact sizes accepted, or null when this type has no settled texture size yet. */
  sizes: DesignSize[] | null;
  /** One line under the drop zone saying what this type needs. */
  requirement: string;
  /** Shown when the type has no fixed size, so nobody wonders why the rule is looser. */
  note?: string;
  /** Whether the in-browser drawing canvas covers this type. Capes only, for now. */
  drawable: boolean;
}

/** 64x32 and its HD multiples, exactly as the launcher accepts them. */
const CAPE_SIZES: DesignSize[] = [
  { width: 64, height: 32 },
  { width: 128, height: 64 },
  { width: 256, height: 128 },
  { width: 512, height: 256 },
];

export const DESIGN_TYPES: DesignType[] = [
  {
    id: "cape",
    label: "Cape",
    sizes: CAPE_SIZES,
    requirement: "PNG, 64x32 (or 128x64, 256x128, 512x256), under 1 MB",
    drawable: true,
  },
  {
    id: "wings",
    label: "Wings",
    sizes: null,
    requirement: "PNG, up to 1024x1024, under 1 MB",
    note: "Wings have no fixed texture size in the client yet, so anything sensible is accepted. If you are working to the elytra layout, 64x32 is a good bet.",
    drawable: false,
  },
  {
    id: "hat",
    label: "Hat",
    sizes: null,
    requirement: "PNG, up to 1024x1024, under 1 MB",
    note: "Hats have no fixed texture size in the client yet, so anything sensible is accepted.",
    drawable: false,
  },
  {
    id: "backpack",
    label: "Backpack",
    sizes: null,
    requirement: "PNG, up to 1024x1024, under 1 MB",
    note: "Backpacks have no fixed texture size in the client yet, so anything sensible is accepted.",
    drawable: false,
  },
];

export const DEFAULT_DESIGN_TYPE: DesignTypeId = "cape";

export function designType(id: string): DesignType {
  return DESIGN_TYPES.find((type) => type.id === id) ?? DESIGN_TYPES[0];
}

export function isDesignTypeId(value: unknown): value is DesignTypeId {
  return typeof value === "string" && DESIGN_TYPES.some((type) => type.id === value);
}

/** The cape's drawing grid, and what the canvas produces. */
export const CAPE_WIDTH = 64;
export const CAPE_HEIGHT = 32;
