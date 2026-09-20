import type { ReactNode } from "react";

/**
 * Every section opens the same way: its step number in the pixel face, the heading, a line of
 * explanation, and a rule under the lot.
 *
 * The number is the point. Submit, vote and showcase are not three unrelated panels, they are the
 * order this site works in, and a reader who lands halfway down should be able to tell which part
 * of it they are looking at.
 */
export function SectionHeader({
  no,
  title,
  children,
}: {
  no: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="section-head">
      <span className="section-no" aria-hidden="true">
        {no}
      </span>
      <div>
        <h2>{title}</h2>
        {children && <p>{children}</p>}
      </div>
    </header>
  );
}
