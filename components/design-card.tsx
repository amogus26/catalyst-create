import { designType } from "@/lib/design-types";
import type { Submission } from "@/lib/store";
import { TypeIcon } from "./type-icon";
import { VoteButton } from "./vote-button";

/**
 * One design, anywhere on the public page: the art big on its stage, then who made it, what it is,
 * and its vote. The round and the gallery use the same card at two sizes, so a design keeps its look
 * when it is picked for a round.
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
  const type = designType(submission.designType);

  return (
    <article className={`design-card${leading ? " leading" : ""}`}>
      <div className="art-frame">
        <img
          className="art"
          src={`/api/images/${submission.id}`}
          alt={`${type.label} design by ${submission.displayName}`}
          loading="lazy"
        />
        {typeof rank === "number" && <span className="rank">#{rank}</span>}
        {leading && <span className="leading-tag">Leading</span>}
        {size === "normal" && submission.featured && <span className="round-tag">In the round</span>}
      </div>
      <div className="design-card-body">
        {/* The count lives on the button only: printed twice, the two would disagree after a vote. */}
        <div className="who">
          <span className="name" title={submission.displayName}>
            {submission.displayName}
          </span>
          <span className="type-tag">
            <TypeIcon type={submission.designType} />
            {type.label}
          </span>
        </div>
        <VoteButton id={submission.id} initialCount={submission.voteCount} initiallyVoted={voted} size={size} />
      </div>
    </article>
  );
}
