import type { Submission } from "@/lib/store";
import { DesignCard } from "./design-card";
import { SectionHeader } from "./section-header";

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
      <SectionHeader no="03" title="Designs that made it through">
        {items.length === 0
          ? "Nothing has been approved yet."
          : `${items.length} design${items.length === 1 ? "" : "s"}, most-voted first. Every one of them was looked at by a person before it appeared here.`}
      </SectionHeader>

      {items.length === 0 ? (
        <div className="empty">
          <b>Nothing has been approved yet.</b>
          Submitted designs appear here once a reviewer has looked at them. Yours could be the first.
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
