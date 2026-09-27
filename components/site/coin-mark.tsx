/**
 * The launcher's struck coin (its drawMintedCoin): a gold disc with a bevelled rim, a recessed field
 * and a raised mint mark, drawn small next to a price.
 */
import { remSize } from "./icons";

export function CoinMark({ size = 16 }: { size?: number }) {
  return (
    <svg className="sized" width={size} height={size} style={remSize(size, size)} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="coin-rim" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#FFE9A3" />
          <stop offset="0.55" stopColor="#F2C230" />
          <stop offset="1" stopColor="#B27812" />
        </radialGradient>
        <radialGradient id="coin-field" cx="60%" cy="65%" r="70%">
          <stop offset="0" stopColor="#F6CD4A" />
          <stop offset="1" stopColor="#C88B16" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="url(#coin-rim)" />
      <circle cx="16" cy="16" r="11" fill="url(#coin-field)" stroke="#9A6510" strokeWidth="1" />
      <path d="M16 9.5 18.6 16 16 22.5 13.4 16Z" fill="#FFF1C2" stroke="#B27812" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M8 7.5a11 11 0 0 1 9-3" fill="none" stroke="#FFF6D6" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}
