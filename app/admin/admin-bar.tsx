import Link from "next/link";

/** The reviewers' header: the page's name, and a switch between reviewing designs and making codes. */
export function AdminBar({ title, current }: { title: string; current: "designs" | "codes" }) {
  return (
    <div className="admin-bar">
      <h1>{title}</h1>
      <nav className="admin-nav" aria-label="Reviewer pages">
        <Link href="/admin" aria-current={current === "designs" ? "page" : undefined}>
          Designs
        </Link>
        <Link href="/admin/codes" aria-current={current === "codes" ? "page" : undefined}>
          Redeem codes
        </Link>
      </nav>
    </div>
  );
}
