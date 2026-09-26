/**
 * A pack's coins as piles of flat gold coins, more and taller up the tiers - the launcher's Coins shelf
 * draws its packs the same way, in isometric gold.
 */
export function CoinStack({ tier }: { tier: number }) {
  const piles = Math.min(3, 1 + Math.floor(tier / 2));
  const perPile = 3 + tier;
  const w = 64;
  const coinH = 7;
  const rx = 26;
  const ry = 9;
  const width = piles * w + 20;
  const height = perPile * coinH + ry * 2 + 20;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="stack-side" x1="0" x2="1">
          <stop offset="0" stopColor="#9A6510" />
          <stop offset="0.35" stopColor="#E8B330" />
          <stop offset="0.6" stopColor="#F6CD4A" />
          <stop offset="1" stopColor="#A86F10" />
        </linearGradient>
        <radialGradient id="stack-top" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#FFF1C2" />
          <stop offset="0.5" stopColor="#F2C230" />
          <stop offset="1" stopColor="#C88B16" />
        </radialGradient>
      </defs>
      {Array.from({ length: piles }, (_, p) => {
        const cx = 10 + w / 2 + p * w;
        const count = perPile - (p === 1 ? 1 : p === 2 ? 2 : 0);
        return (
          <g key={p}>
            {Array.from({ length: count }, (_, c) => {
              const cy = height - ry - 6 - c * coinH;
              return (
                <g key={c}>
                  <path d={`M${cx - rx} ${cy} v${-coinH + 1} a${rx} ${ry} 0 0 0 ${rx * 2} 0 v${coinH - 1} a${rx} ${ry} 0 0 1 ${-rx * 2} 0z`} fill="url(#stack-side)" />
                  <ellipse cx={cx} cy={cy - coinH + 1} rx={rx} ry={ry} fill="url(#stack-top)" stroke="#B27812" strokeWidth="0.8" />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
