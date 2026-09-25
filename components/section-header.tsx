import type { ReactNode } from "react";

/**
 * How every section opens: a small label in the pixel face, a big heading, one line under it, and
 * anything else - filters, a count - at the far end.
 */
export function SectionHeader({
  kicker,
  title,
  children,
  aside,
}: {
  kicker: string;
  title: string;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="section-head">
      <div>
        <span className="kicker">{kicker}</span>
        <h2>{title}</h2>
        {children && <p>{children}</p>}
      </div>
      {aside}
    </header>
  );
}
