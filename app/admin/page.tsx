import { adminPasswordConfigured, isAdmin } from "@/lib/admin-session";
import { getStore, type Submission } from "@/lib/store";
import { LoginForm } from "./login-form";
import { ReviewButtons } from "./review-buttons";

export const metadata = { title: "Review queue | Catalyst Designs", robots: { index: false } };

export const dynamic = "force-dynamic";

/**
 * The review queue - the moderation step itself.
 *
 * Nothing reaches the gallery except through the Approve button on this page. The page is behind a
 * shared password (see lib/admin-session.ts); the API it posts to checks the same session again,
 * because a page that merely hides its buttons is not a gate.
 */
export default async function AdminPage() {
  if (!adminPasswordConfigured()) {
    return (
      <div style={{ paddingTop: 32, maxWidth: 620 }}>
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
  const pending = await store.listByStatus("pending");
  const reviewed = [...(await store.listByStatus("approved")), ...(await store.listByStatus("rejected"))]
    .sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""))
    .slice(0, 12);

  return (
    <div style={{ paddingTop: 32 }}>
      <h1>Review queue</h1>
      <p className="muted small">
        {pending.length === 0
          ? "Nothing is waiting."
          : `${pending.length} design${pending.length === 1 ? "" : "s"} waiting. Nothing below is visible to anyone else yet.`}
      </p>

      {pending.length === 0 ? (
        <div className="empty" style={{ marginTop: 24 }}>
          Nothing to review right now.
        </div>
      ) : (
        <div className="grid" style={{ marginTop: 24 }}>
          {pending.map((submission) => (
            <ReviewCard key={submission.id} submission={submission} />
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <h2>Recently reviewed</h2>
          <p className="muted small">
            Approved designs are live in the gallery. Sending one back to pending takes it down
            again - which is how you undo an approval you did not mean.
          </p>
          <div className="grid" style={{ marginTop: 16 }}>
            {reviewed.map((submission) => (
              <ReviewCard key={submission.id} submission={submission} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ReviewCard({ submission }: { submission: Submission }) {
  const label =
    submission.status === "approved" ? "Live in the gallery" : submission.status === "rejected" ? "Rejected" : null;
  const labelColour = submission.status === "approved" ? "var(--success)" : "var(--danger)";

  return (
    <article className="card">
      <img
        className="art"
        src={`/api/images/${submission.id}`}
        alt={`Submission by ${submission.displayName}`}
        loading="lazy"
      />
      <div className="body" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <div>
          <div className="name" title={submission.displayName}>
            {submission.displayName}
          </div>
          <div className="tiny muted">
            {new Date(submission.createdAt).toLocaleString()}
            {label && (
              <>
                {" - "}
                <span style={{ color: labelColour }}>{label}</span>
              </>
            )}
          </div>
        </div>
        <ReviewButtons id={submission.id} status={submission.status} />
      </div>
    </article>
  );
}
