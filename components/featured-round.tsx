import type { Submission } from "@/lib/store";
import { DesignCard } from "./design-card";

/**
 * The current round: the designs a reviewer has picked out, up to five, laid out as something to
 * choose between rather than as more gallery.
 *
 * "Leading" is only claimed when one design is genuinely ahead - it has votes, and more of them
 * than the next one. A badge on a three-way tie at zero would be a lie told in gold.
 */
export function FeaturedRound({
  items,
  voted,
}: {
  items: Submission[];
  voted: Set<string>;
}) {
  const leaderIsClear =
    items.length > 1 && items[0].voteCount > 0 && items[0].voteCount > items[1].voteCount;

  return (
    <section className="section" id="vote">
      <header className="section-head">
        <div>
          <p className="eyebrow">Current round</p>
          <div className="pixel-rule" aria-hidden="true" />
          <h2>Vote for this round&apos;s winner</h2>
          <p className="muted">
            {items.length === 0
              ? "A reviewer picks a handful of approved designs to put up for a vote."
              : `${items.length} design${items.length === 1 ? "" : "s"} in the running. Vote for as many as you like - one vote each, per browser.`}
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="empty">
          <p style={{ margin: 0, fontWeight: 600 }}>No round is running yet.</p>
          <p className="small" style={{ margin: "8px 0 0" }}>
            Approved designs get picked for a round from the review page. Until then, everything that
            has been through review is in the showcase.
          </p>
        </div>
      ) : (
        <div className={`round-grid count-${items.length}`}>
          {items.map((submission, index) => (
            <DesignCard
              key={submission.id}
              submission={submission}
              voted={voted.has(submission.id)}
              size="large"
              rank={index + 1}
              leading={index === 0 && leaderIsClear}
            />
          ))}
        </div>
      )}

      <p className="tiny muted" style={{ marginTop: 18 }}>
        Votes are counted once per browser, not once per person - clearing your cookies or opening
        another browser gets another vote. They are a guide for whoever picks the winner, not the
        decision itself.
      </p>
    </section>
  );
}
