/*
 * The site's line icons: 24px, drawn with a 1.9 stroke in the current colour. Our own, like the
 * launcher's glyphs - no icon font, no library.
 */

type IconProps = { size?: number; className?: string };

/**
 * An SVG's size in rem, so it scales with the page (see html in site.css) - applied by the zero-weight
 * `.sized` rule, so any CSS that sizes an SVG itself still wins.
 */
export function remSize(width: number, height: number): React.CSSProperties {
  return { ["--w" as string]: `${width / 16}rem`, ["--h" as string]: `${height / 16}rem` };
}

function Svg({ size = 24, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className ? `sized ${className}` : "sized"}
      width={size}
      height={size}
      style={remSize(size, size)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const BoltIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
  </Svg>
);
export const BoxIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7L12 2.5z" />
    <path d="M3.5 7 12 11.5 20.5 7M12 11.5v10" />
  </Svg>
);
export const LayersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5z" />
    <path d="m3 13 9 5 9-5" />
  </Svg>
);
export const GridIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </Svg>
);
export const SparkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </Svg>
);
export const BannerIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3v18" />
    <path d="M6 4h12v11l-6-3-6 3" />
    <path d="m9 8 3 2 3-2" />
  </Svg>
);
export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Svg>
);
export const TicketIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 8.5V6a1.5 1.5 0 0 1 1.5-1.5h14A1.5 1.5 0 0 1 20.5 6v2.5a2.5 2.5 0 0 0 0 5V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18v-4.5a2.5 2.5 0 0 0 0-5z" />
    <path d="M14 5v2M14 11v2M14 17v2" />
  </Svg>
);
export const PaletteIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1.1.9-1.9 2-1.9h2.3A4.7 4.7 0 0 0 21 9.8C21 6 17 3 12 3z" />
    <circle cx="7.5" cy="11" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="10" cy="7" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="7" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);
export const SoundIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" />
    <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" />
  </Svg>
);
export const ChatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.5 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.6A7.5 7.5 0 1 1 20.5 12z" />
    <path d="M9 11h.01M12 11h.01M15 11h.01" strokeWidth={2.6} />
  </Svg>
);
export const SlidersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </Svg>
);
export const DownloadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v12m0 0-5-5m5 5 5-5M4 19.5h16" />
  </Svg>
);
export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20.5c1.4-3.6 4.4-5.5 8-5.5s6.6 1.9 8 5.5" />
  </Svg>
);
export const PlayIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4.5v15l12-7.5-12-7.5z" />
  </Svg>
);
export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
);
export const ShieldCheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 5 5.8v5.4c0 4.5 3 8.2 7 9.8 4-1.6 7-5.3 7-9.8V5.8L12 3z" />
    <path d="m8.8 12.2 2.3 2.3 4.4-4.8" />
  </Svg>
);
export const LockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Svg>
);
export const ArrowIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14m0 0-6-6m6 6-6 6" />
  </Svg>
);
export const WindowsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 5.5 10.5 4.5v7h-7zM13 4.2 20.5 3v8.5H13zM3.5 12.5h7v7l-7-1zM13 12.5h7.5V21L13 19.9z" />
  </Svg>
);
export const AppleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.9-.9-3.1-.8a4.6 4.6 0 0 0-3.9 2.4c-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 3 2.3 1.2 0 1.6-.8 3.1-.8 1.4 0 1.8.8 3.1.7 1.3 0 2.1-1.1 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.6-1-2.7-3.9z" />
    <path d="M14.2 5.3c.6-.8 1.1-1.9 1-3-1 .1-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.6 2.8-1.4z" />
  </Svg>
);
