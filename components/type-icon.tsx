import type { DesignTypeId } from "@/lib/design-types";

/**
 * A small mark for each kind of design.
 *
 * Drawn on a 16-unit grid out of straight edges and right angles only, with `crispEdges` so they
 * stay hard at any size - the site is about pixel art, and a set of soft rounded icons would be
 * the one thing on the page that isn't. Deliberately plain: they sit beside a word that already
 * says what they are, so their job is to make a row of tags scannable, not to be looked at.
 */
export function TypeIcon({ type, size = 12 }: { type: DesignTypeId; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {type === "cape" && <path d="M3 2h10v6l-5 6-5-6V2zm2 2v3.3l3 3.6 3-3.6V4H5z" />}
      {type === "wings" && (
        <path d="M8 5h1v7H8V5zM7 6H1v2h2v2h4V6zm3 0h6v2h-2v2h-4V6z" />
      )}
      {type === "hat" && <path d="M5 3h6v5h2v2H3V8h2V3zm2 2v3h2V5H7z" />}
      {type === "backpack" && (
        <path d="M6 2h4v2H6V2zM3 5h10v9H3V5zm2 2v2h6V7H5zm1 4h4v2H6v-2z" />
      )}
    </svg>
  );
}
