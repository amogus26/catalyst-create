import type { Submission } from "@/lib/store";
import { DesignCard } from "./design-card";
import { SectionHeader } from "./section-header";

/**
 * The current round: the designs a reviewer picked, up to five, big enough to choose between.
 * "Leading" is only claimed when one design is really ahead - a gold badge on a tie at zero would lie.
 */
export function FeaturedRound({ items, voted }: { items: Submission[]; voted: Set<string> }) {
  const leaderIsClear =
    items.length > 0 && items[0].voteCount > 0 && (items.length === 1 || items[0].voteCount > items[1].voteCount);

  return (
    <section className="section" id="vote">
      <SectionHeader kicker="Vote" title="This round">
        {items.length === 0 ? "No round is running right now." : "Vote for every design you like - one vote each."}
      </SectionHeader>

      {items.length === 0 ? (
        <div className="empty">
          <b>The next round is being picked.</b>
          Everything approved so far is in the gallery below.
        </div>
      ) : (
        <div className="design-grid round">
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
    </section>
  );
}
