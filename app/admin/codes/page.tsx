import { isOwner, passwordConfigured } from "@/lib/admin-session";
import { describeReward } from "@/lib/rewards";
import { getStore } from "@/lib/store";
import { SectionHeader } from "@/components/section-header";
import { AdminBar } from "../admin-bar";
import { LoginForm } from "../login-form";
import { CancelBatch, CancelOne } from "./cancel";
import { CodeMaker } from "./code-maker";

export const metadata = { title: "Redeem codes | Catalyst Designs", robots: { index: false } };

export const dynamic = "force-dynamic";

/**
 * Making redeem codes for the launcher - gift cards, giveaways, stream codes. A code made here works
 * in every launcher straight away: the launcher asks this site (/api/codes/redeem), and the site
 * marks it used for everyone. Behind the owner's own password (CODES_PASSWORD), not the reviewers': codes
 * are worth coins and items, so only the owner makes them.
 */
export default async function CodesPage() {
  if (!passwordConfigured("owner")) {
    return (
      <div className="shell prose">
        <h1>Redeem codes</h1>
        <div className="notice info" style={{ marginTop: 20 }}>
          <strong>CODES_PASSWORD is not set</strong> (or is the same as the reviewers&apos; password), so nobody can make
          codes. Set your own in Netlify&apos;s environment variables and deploy again.
        </div>
      </div>
    );
  }
  if (!(await isOwner())) {
    return <LoginForm gate="owner" title="Redeem codes" blurb="Only the owner makes codes. This is not the reviewers' password." />;
  }

  // Before supabase/migrations/0004_redeem_codes.sql has run there are no tables to read - say so
  // rather than failing the whole page.
  let batches: Awaited<ReturnType<ReturnType<typeof getStore>["listCodeBatches"]>> = [];
  let missingTables = false;
  try {
    batches = await getStore().listCodeBatches();
  } catch (error) {
    console.error("[catalyst-create] listing codes failed:", error);
    missingTables = true;
  }

  return (
    <div className="shell admin">
      <AdminBar title="Redeem codes" current="codes" />
      {missingTables && (
        <div className="notice error" style={{ marginTop: 24 }}>
          The codes tables aren&apos;t set up in the database yet. Run{" "}
          <code>supabase/migrations/0004_redeem_codes.sql</code> in Supabase&apos;s SQL Editor, then
          reload this page.
        </div>
      )}

      <div className="codes-layout section">
        <section>
          <SectionHeader kicker="New" title="Make codes">
            They work in the launcher the moment they are made.
          </SectionHeader>
          <div className="form-card">
            <CodeMaker />
          </div>
        </section>

        <section>
          <SectionHeader kicker="Made" title="Batches">
            {batches.length === 0 ? "No codes yet." : "Newest first. Cancelling stops every code in a batch."}
          </SectionHeader>
          {batches.length > 0 && (
            <div className="table-wrap">
              <table className="batches">
                <thead>
                  <tr>
                    <th>Reward</th>
                    <th>Codes</th>
                    <th>Used</th>
                    <th>Last day</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.batchId}>
                      <td>
                        <b>{describeReward(batch.reward)}</b>
                        <div className="tiny muted">
                          {new Date(batch.createdAt).toLocaleDateString("en-GB")}
                          {batch.note ? ` - ${batch.note}` : ""}
                        </div>
                      </td>
                      <td className="num">
                        {batch.codes}
                        {batch.maxUses > batch.codes ? ` x ${Math.round(batch.maxUses / batch.codes)} uses` : ""}
                      </td>
                      <td className="num">
                        {batch.uses} / {batch.maxUses}
                      </td>
                      <td className="num">{batch.expiresOn ?? "Never"}</td>
                      <td>
                        {batch.revoked === batch.codes ? (
                          <span className="tag-off">Cancelled</span>
                        ) : (
                          <CancelBatch batchId={batch.batchId} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: 28 }}>
            <CancelOne />
          </div>
        </section>
      </div>
    </div>
  );
}
