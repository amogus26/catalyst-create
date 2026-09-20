import type { Submission } from "@/lib/store";
import { VoteButton } from "./vote-button";

/**
 * One design, as it appears anywhere on the public page: the image first and large, then who made
 * it and what it has taken in votes.
 *
 * The showcase and the voting round use the same card at two sizes rather than two cards, so a
 * design does not change character when it is picked for a round - it just gets more room.
 */
export function DesignCard({
  submission,
  voted,
  size = "normal",
  rank,
  leading = false,
}: {
  submission: Submission;
  voted: boolean;
  size?: "normal" | "large";
  rank?: number;
  leading?: boolean;
}) {
  return (
    <article className={`design-card${size === "large" ? " large" : ""}${leading ? " leading" : ""}`}>
      <div className="art-frame">
        <img
          className="art"
          src={`/api/images/${submission.id}`}
          alt={`Cape design by ${submission.displayName}`}
          loading="lazy"
        />
        {typeof rank === "number" && <span className="rank">{rank}</span>}
        {leading && <span className="badge-leading">Leading</span>}
        {size === "normal" && submission.featured && <span className="badge-round">In this round</span>}
      </div>
      <div className="design-card-body">
        {/* The count lives on the button and nowhere else: printed twice on one card, the two
            numbers only have to disagree once - after a vote - to look broken. */}
        <div className="who">
          <span className="name" title={submission.displayName}>
            {submission.displayName}
          </span>
          <span className="tiny muted">Community design</span>
        </div>
        <VoteButton
          id={submission.id}
          initialCount={submission.voteCount}
          initiallyVoted={voted}
          size={size}
        />
      </div>
    </article>
  );
}
