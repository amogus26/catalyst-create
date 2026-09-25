import { LOGO_SHAPES } from "./logo-shapes";

/**
 * The client's logo, the same traced shapes the launcher draws (its CatalystLogo.kt) - an isometric
 * hexagon of blocks, the Deep Dark on one side and the Overworld on the other. Vector, so it is sharp
 * at any size, and never a copy of the team's raster artwork.
 */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg
      className="logo"
      width={Math.round(size * 0.858)}
      height={size}
      viewBox="0 0 858 1000"
      aria-hidden="true"
      focusable="false"
    >
      {LOGO_SHAPES.map(([fill, d], index) => (
        <path key={index} fill={fill} fillRule="evenodd" d={d} />
      ))}
    </svg>
  );
}
