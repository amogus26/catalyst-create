import { FeatureToggle } from "@/components/feature-toggle";
import { adminPasswordConfigured, isAdmin } from "@/lib/admin-session";
import { FEATURED_LIMIT } from "@/lib/config";
import { getStore, type Submission } from "@/lib/store";
import { LoginForm } from "./login-form";
import { ReviewButtons } from "./review-buttons";

export const metadata = { title: "Review queue | Catalyst Designs", robots: { index: false } };

export const dynamic = "force-dynamic";

/**
 * The review queue - the moderation step itself - and the place a round is put together.
 *
 * Nothing reaches the public page except through the Approve button here. The page is behind a
 * shared password (see lib/admin-session.ts); the routes it posts to check the same session again,
 * because a page that merely hides its buttons is not a gate.
 */
export default async function AdminPage() {
  if (!adminPasswordConfigured()) {
    return (
      <div className="prose">
        <h1>Review queue</h1>
        <div className="notice info">
          <strong>ADMIN_PASSWORD is not set.</strong> Nobody can open this page, which also means
          nothing can be approved. Put a long random password in <code>.env.local</code> (or in the
          host&apos;s environment variables) and restart.
        </div>
      </div>
    );
  }

  if (!(await isAdmin())) {
    return <LoginForm />;
  }

  const store = getStore();
  const [pending, approved, rejected] = await Promise.all([
    store.listByStatus("pending"),
    store.listByStatus("approved"),
    store.listByStatus("rejected"),
  ]);

  const featuredCount = approved.filter((submission) => submission.featured).length;
  // Featured first, so the round is together at the top of the approved list.
  const approvedSorted = [...approved].sort(
    (a, b) => Number(b.featured) - Number(a.featured) || b.voteCount - a.voteCount,
  );

  return (
    <div className="admin">
      <header className="section-head">
        <div>
          <p className="eyebrow">Reviewers only</p>
          <h1>Review queue</h1>
          <p className="muted">
            {pending.length === 0
              ? "Nothing is waiting."
              : `${pending.length} design${pending.length === 1 ? "" : "s"} waiting. Nothing below is visible to anyone else yet.`}
          </p>
        </div>
      </header>

      <section className="section">
        <h2>Waiting for review</h2>
        {pending.length === 0 ? (
          <div className="empty">Nothing to review right now.</div>
        ) : (
          <div className="showcase-grid">
            {pending.map((submission) => (
              <AdminCard key={submission.id} submission={submission} featuredCount={featuredCount} />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2>Approved</h2>
        <p className="muted small">
          Live on the site. {featuredCount === 0
            ? "None are in a voting round yet - add up to five."
            : `${featuredCount} in the current round; the page shows the top ${FEATURED_LIMIT}.`}{" "}
          Sending one back to pending takes it down again, which is how you undo an approval.
        </p>
        {approvedSorted.length === 0 ? (
          <div className="empty">Nothing approved yet.</div>
        ) : (
          <div className="showcase-grid">
            {approvedSorted.map((submission) => (
              <AdminCard key={submission.id} submission={submission} featuredCount={featuredCount} />
            ))}
          </div>
        )}
      </section>

      {rejected.length > 0 && (
        <section className="section">
          <h2>Rejected</h2>
          <p className="muted small">
            Not shown anywhere and not reachable by anyone but a reviewer. Kept so a mis-click can be
            undone.
          </p>
          <div className="showcase-grid">
            {rejected.slice(0, 8).map((submission) => (
              <AdminCard key={submission.id} submission={submission} featuredCount={featuredCount} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AdminCard({
  submission,
  featuredCount,
}: {
  submission: Submission;
  featuredCount: number;
}) {
  const label =
    submission.status === "approved" ? "Live" : submission.status === "rejected" ? "Rejected" : null;

  return (
    <article className="design-card admin-card">
      <div className="art-frame">
        <img
          className="art"
          src={`/api/images/${submission.id}`}
          alt={`Submission by ${submission.displayName}`}
          loading="lazy"
        />
        {label && (
          <span className={submission.status === "approved" ? "badge-live" : "badge-rejected"}>
            {label}
          </span>
        )}
      </div>
      <div className="design-card-body">
        <div className="who">
          <span className="name" title={submission.displayName}>
            {submission.displayName}
          </span>
          <span className="tiny muted">
            {new Date(submission.createdAt).toLocaleDateString()} - {submission.voteCount}{" "}
            {submission.voteCount === 1 ? "vote" : "votes"}
          </span>
        </div>
        <div className="admin-actions">
          <ReviewButtons id={submission.id} status={submission.status} />
          {submission.status === "approved" && (
            <FeatureToggle
              id={submission.id}
              featured={submission.featured}
              roundIsFull={!submission.featured && featuredCount >= FEATURED_LIMIT}
            />
          )}
        </div>
      </div>
    </article>
  );
}
