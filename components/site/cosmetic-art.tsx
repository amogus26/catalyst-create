import { darken, ramp } from "@/lib/catalyst";

/*
 * The shop's preview art, drawn the way the launcher draws it (ui/components/CosmeticArt.kt) - the same
 * shapes, gradients and shading, in SVG so it is sharp at any size. Both fill a 100x100 box.
 * [id] keeps each drawing's gradient apart from the others on the page.
 */

const SHADE = "rgba(0,0,0,0.22)";

/** An id that is safe inside url(#...) - item names have spaces. */
function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "-");
}
const RIM = "rgba(255,255,255,0.16)";

/** A cape on a player seen from behind: a plain silhouette wearing the cape in the item's colours. */
export function CapeArt({ colors, id, className }: { colors: string[]; id: string; className?: string }) {
  const stops = ramp(colors);
  const px = 3.6;
  const cx = 50;
  const headTop = 5;
  const shoulders = headTop + 8 * px;
  const hips = shoulders + 12 * px;
  const seam = px * 0.12;
  const figure = "rgba(126,135,155,0.5)";
  const part = (left: number, top: number, width: number, height: number, key: string) => (
    <rect key={key} x={left + seam} y={top + seam} width={width - seam * 2} height={height - seam * 2} fill={figure} />
  );
  const capeX = cx - 5 * px;
  const capeW = 10 * px;
  const capeH = 16 * px;
  const gid = `cape-${safeId(id)}`;
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gid} x1="0" y1={shoulders} x2="0" y2={shoulders + capeH} gradientUnits="userSpaceOnUse">
          {stops.map((c, i) => (
            <stop key={i} offset={stops.length === 1 ? 0 : i / (stops.length - 1)} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      {part(cx - 4 * px, headTop, 8 * px, 8 * px, "head")}
      {part(cx - 8 * px, shoulders, 4 * px, 12 * px, "arm-r")}
      {part(cx + 4 * px, shoulders, 4 * px, 12 * px, "arm-l")}
      {part(cx - 4 * px, hips, 4 * px, 12 * px, "leg-r")}
      {part(cx, hips, 4 * px, 12 * px, "leg-l")}
      <rect x={capeX} y={shoulders} width={capeW} height={capeH} fill={`url(#${gid})`} />
      <rect
        x={capeX + px * 0.6}
        y={shoulders + px * 0.6}
        width={capeW - px * 1.2}
        height={capeH - px * 1.2}
        fill="none"
        stroke={SHADE}
        strokeWidth={px * 0.8}
      />
      <path
        d={`M${cx} ${shoulders + 3 * px} L${cx + 1.6 * px} ${shoulders + 4.6 * px} L${cx} ${shoulders + 6.2 * px} L${cx - 1.6 * px} ${shoulders + 4.6 * px}Z`}
        fill="rgba(255,255,255,0.35)"
      />
      <rect x={capeX} y={shoulders} width={capeW} height={capeH} fill="none" stroke={RIM} strokeWidth={1.2} />
    </svg>
  );
}

/** A pair of swept wings, mirror images joined at a small body, each ending in three feather lobes. */
export function WingsArt({ colors, id, className }: { colors: string[]; id: string; className?: string }) {
  const stops = ramp(colors);
  const gid = `wings-${safeId(id)}`;
  const wing =
    "M47 42 C38 26 22 16 6 17 C5 28 7 38 11 45 C13.7 53.7 17.7 56 23 52 C25.7 61.3 29.3 63.3 34 58 C37.3 66 41 66.7 45 60 L47 55 Z";
  const feathers = "M44 44.5 L13 30 M44.5 47.5 L23 51.5 M45.5 50.5 L34 57.5";
  const one = (
    <>
      <path d={wing} fill={`url(#${gid})`} />
      <path d={feathers} fill="none" stroke={SHADE} strokeWidth={1.4} strokeLinecap="round" />
      <path d={wing} fill="none" stroke={RIM} strokeWidth={1.2} />
    </>
  );
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gid} x1="47" y1="48" x2="6" y2="20" gradientUnits="userSpaceOnUse">
          {stops.map((c, i) => (
            <stop key={i} offset={stops.length === 1 ? 0 : i / (stops.length - 1)} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      <g transform="translate(0 8)">
        {one}
        <g transform="translate(100 0) scale(-1 1)">{one}</g>
        <rect x={46.5} y={38} width={7} height={24} rx={3.5} fill={darken(stops[0], 0.35)} />
      </g>
    </svg>
  );
}
