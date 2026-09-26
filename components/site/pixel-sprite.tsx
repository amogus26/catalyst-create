import { REWARD_PALETTE, spriteFor } from "@/lib/sprites";

/**
 * A 16x16 prize icon from the launcher (lib/sprites.ts), drawn as crisp SVG squares - each run of one
 * colour along a row is one rect, so an icon is a few dozen shapes rather than 256.
 */
export function PixelSprite({
  name,
  rows,
  size = 48,
  label,
}: {
  /** Pick the icon by the prize's name, as the launcher does... */
  name?: string;
  /** ...or hand the rows in directly. */
  rows?: string[];
  size?: number;
  label?: string;
}) {
  const grid = rows ?? spriteFor(name ?? "");
  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      const fill = REWARD_PALETTE[ch];
      if (ch !== "." && fill) rects.push({ x, y, w: end - x, fill });
      x = end;
    }
  });
  return (
    <svg
      className="pixel-art"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
