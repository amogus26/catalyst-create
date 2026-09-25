import { designType } from "@/lib/design-types";
import type { Submission } from "@/lib/store";

/**
 * The top of the page shows the site's point before a word is read: the design that is winning (or
 * the most-voted one, between rounds), big, on a pool of light. A real submission on the public image
 * route, never artwork. With nothing approved yet it shows the empty 64x32 frame waiting for one.
 */
export function HeroStage({ leader, leading }: { leader: Submission | null; leading: boolean }) {
  if (!leader) {
    return (
      <figure className="stage" style={{ margin: 0 }}>
        <div className="blank">Your design here - 64x32</div>
      </figure>
    );
  }
  return (
    <figure className="stage" style={{ margin: 0 }}>
      <img src={`/api/images/${leader.id}`} alt={`${designType(leader.designType).label} by ${leader.displayName}`} />
      <figcaption>
        <span>
          <b>{leader.displayName}</b> - {designType(leader.designType).label}
        </span>
        {leading && leader.voteCount > 0 ? (
          <span className="leading-tag">Leading - {leader.voteCount}</span>
        ) : (
          <span>
            {leader.voteCount} {leader.voteCount === 1 ? "vote" : "votes"}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
