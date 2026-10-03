"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/** The reviewers' header: the page's name, a switch between reviewing designs and making codes, and Sign out. */
export function AdminBar({ title, current }: { title: string; current: "designs" | "codes" }) {
  const router = useRouter();
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
        <button
          type="button"
          className="quiet"
          onClick={async () => {
            await fetch("/api/admin/login", { method: "DELETE" });
            router.refresh();
          }}
        >
          Sign out
        </button>
      </nav>
    </div>
  );
}
