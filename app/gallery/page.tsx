import { getStore } from "@/lib/store";
import { currentVoterId } from "@/lib/voter";
import { VoteButton } from "./vote-button";

export const metadata = { title: "Gallery | Catalyst Designs" };

// Votes and approvals change under this page constantly; never serve it from a build.
export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const store = getStore();

  // The only status this page ever asks for. Pending and rejected designs are not fetched here,
  // not filtered out later - they are never loaded in the first place.
  const approved = await store.listByStatus("approved");

  const voterId = await currentVoterId();
  const alreadyVoted = voterId
    ? await store.votedIds(
        voterId,
        approved.map((submission) => submission.id),
      )
    : new Set<string>();

  return (
    <div style={{ paddingTop: 32 }}>
      <h1>Gallery</h1>
      <p className="muted small">
        Designs that have been through review. One vote per design, per browser.
      </p>

      {approved.length === 0 ? (
        <div className="empty" style={{ marginTop: 24 }}>
          <p style={{ margin: 0 }}>Nothing has been approved yet.</p>
          <p className="small" style={{ margin: "8px 0 0" }}>
            Submitted designs appear here once a reviewer has looked at them.
          </p>
        </div>
      ) : (
        <div className="grid" style={{ marginTop: 24 }}>
          {approved.map((submission) => (
            <article className="card" key={submission.id}>
              <img
                className="art"
                src={`/api/images/${submission.id}`}
                alt={`Cape design by ${submission.displayName}`}
                loading="lazy"
              />
              <div className="body">
                <span className="name" title={submission.displayName}>
                  {submission.displayName}
                </span>
                <VoteButton
                  id={submission.id}
                  initialCount={submission.voteCount}
                  initiallyVoted={alreadyVoted.has(submission.id)}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
