/**
 * The Deep Dark hall behind a page's top, like the launcher's Home: pools of teal and blue light that
 * drift, two ribbons of light waving across, and souls rising through it. CSS only - no script, no
 * canvas - so it costs nothing to load, and it all stops for reduced motion (see site.css).
 *
 * The souls are placed by a fixed seed, so the server and the browser draw the same ones.
 */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function Hall({
  souls = 26,
  tint = "teal",
  ribbons = true,
  height = 760,
  fade = false,
}: {
  souls?: number;
  tint?: "teal" | "gold" | "ember";
  ribbons?: boolean;
  height?: number;
  /** Fade the hall out at its top and bottom edges - for a band in the middle of a page. */
  fade?: boolean;
}) {
  const random = seeded(tint.length * 97 + souls);
  const colours =
    tint === "gold"
      ? ["rgba(240,180,41,0.22)", "rgba(79,168,232,0.12)", "#ffd46b"]
      : tint === "ember"
        ? ["rgba(217,138,90,0.24)", "rgba(194,76,85,0.16)", "#ffb27a"]
        : ["rgba(55,211,196,0.2)", "rgba(79,168,232,0.2)", "#6ff5e6"];
  return (
    <div className={fade ? "hall fade" : "hall"} aria-hidden="true">
      <div className="pool" style={{ left: "-8%", top: "-18%", width: "58%", height: "70%", background: `radial-gradient(closest-side, ${colours[0]}, transparent)` }} />
      <div className="pool" style={{ right: "-10%", top: "-10%", width: "55%", height: "65%", background: `radial-gradient(closest-side, ${colours[1]}, transparent)`, animationDelay: "-8s" }} />
      <div className="pool" style={{ left: "30%", top: "35%", width: "45%", height: "55%", background: `radial-gradient(closest-side, ${colours[0]}, transparent)`, animationDelay: "-14s", opacity: 0.6 }} />
      {ribbons && (
        <>
          <svg className="ribbon" style={{ top: "14%" }} viewBox="0 0 1200 340" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`rib-a-${tint}`} x1="0" x2="1">
                <stop offset="0" stopColor={colours[2]} stopOpacity="0" />
                <stop offset="0.45" stopColor={colours[2]} stopOpacity="0.55" />
                <stop offset="1" stopColor={colours[2]} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 210 C 220 90, 420 300, 640 170 S 1020 60, 1200 150" stroke={`url(#rib-a-${tint})`} strokeWidth="2" />
            <path d="M0 230 C 240 120, 430 320, 660 190 S 1030 90, 1200 175" stroke={`url(#rib-a-${tint})`} strokeWidth="18" opacity="0.18" style={{ filter: "blur(10px)" }} />
          </svg>
          <svg className="ribbon" style={{ top: "38%", animationDelay: "-11s", opacity: 0.4 }} viewBox="0 0 1200 340" preserveAspectRatio="none">
            <path d="M0 120 C 260 230, 480 40, 700 160 S 1040 260, 1200 120" stroke={`url(#rib-a-${tint})`} strokeWidth="1.5" />
          </svg>
        </>
      )}
      {Array.from({ length: souls }, (_, i) => {
        const size = 2 + Math.round(random() * 3);
        const style = {
          left: `${(random() * 100).toFixed(2)}%`,
          "--s": `${size / 16}rem`,
          "--d": `${(11 + random() * 12).toFixed(1)}s`,
          "--delay": `${(-random() * 20).toFixed(1)}s`,
          "--x": `${Math.round((random() - 0.5) * 120) / 16}rem`,
          "--h": `${Math.round(height * (0.6 + random() * 0.5)) / 16}rem`,
          background: colours[2],
          color: colours[2],
        } as React.CSSProperties;
        return <span key={i} className="soul" style={style} />;
      })}
    </div>
  );
}
