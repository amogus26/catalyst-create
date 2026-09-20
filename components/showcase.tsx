import type { Submission } from "@/lib/store";
import { DesignCard } from "./design-card";

/**
 * Everything that has been through review, newest rounds and old ones alike, most-voted first.
 *
 * Designs currently in a round appear here too, tagged - they are approved designs like any other,
 * and hiding them from the showcase while they are being voted on would make the showcase look
 * emptier than the site actually is.
 */
export function Showcase({ items, voted }: { items: Submission[]; voted: Set<string> }) {
  return (
    <section className="section" id="showcase">
      <header className="section-head">
        <div>
          <p className="eyebrow">Showcase</p>
          <div className="pixel-rule" aria-hidden="true" />
          <h2>Designs that made it through</h2>
          <p className="muted">
            {items.length === 0
              ? "Nothing has been approved yet."
              : `${items.length} design${items.length === 1 ? "" : "s"}, most-voted first. Every one of them was looked at by a person before it appeared here.`}
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="empty">
          <p style={{ margin: 0, fontWeight: 600 }}>Nothing has been approved yet.</p>
          <p className="small" style={{ margin: "8px 0 0" }}>
            Submitted designs appear here once a reviewer has looked at them. Yours could be the
            first.
          </p>
        </div>
      ) : (
        <div className="showcase-grid">
          {items.map((submission) => (
            <DesignCard
              key={submission.id}
              submission={submission}
              voted={voted.has(submission.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
