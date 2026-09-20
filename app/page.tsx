import Link from "next/link";
import { FeaturedRound } from "@/components/featured-round";
import { SectionTabs } from "@/components/section-tabs";
import { Showcase } from "@/components/showcase";
import { SubmitForm } from "@/components/submit-form";
import { FEATURED_LIMIT } from "@/lib/config";
import { getStore } from "@/lib/store";
import { DESIGN_TYPES } from "@/lib/design-types";
import { currentVoterId } from "@/lib/voter";

// Approvals and votes change under this page constantly; never serve it from the build.
export const dynamic = "force-dynamic";

/**
 * The whole public site, bar the terms: submitting, the current round, and the showcase, as three
 * parts of one page (see [SectionTabs]). Everything it shows has been through review - it asks the
 * store for approved designs and for the current round, and there is no query here that could
 * return anything else.
 */
export default async function HomePage() {
  const store = getStore();
  const [featured, approved] = await Promise.all([
    store.listFeatured(FEATURED_LIMIT),
    store.listByStatus("approved"),
  ]);

  const voterId = await currentVoterId();
  const ids = [...new Set([...featured, ...approved].map((submission) => submission.id))];
  const voted = voterId ? await store.votedIds(voterId, ids) : new Set<string>();

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Catalyst Client</p>
        <h1>
          Community <span className="gold">cosmetic designs</span>
        </h1>
        <p className="lead">
          Make a cape, a pair of wings or something else to wear, put it up for review, and vote on
          the ones other people have made. The best of each round gets worn in game.
        </p>
        <div className="hero-meta">
          <span className="chip">{DESIGN_TYPES.map((type) => type.label).join(" \u00b7 ")}</span>
          <span className="chip">Every design reviewed by a person</span>
        </div>
      </section>

      <SectionTabs
        counts={{ vote: featured.length, showcase: approved.length }}
        submit={
          <section className="section" id="submit">
            <header className="section-head">
              <div>
                <p className="eyebrow">Your turn</p>
                <div className="pixel-rule" aria-hidden="true" />
                <h2>Submit a design</h2>
                <p className="muted">
                  Upload a PNG, or draw a cape here in the browser. Nothing you submit is shown to
                  anyone until a reviewer has looked at it - expect that to take a day or two.
                </p>
              </div>
            </header>
            <div className="submit-layout">
              <div className="panel">
                <SubmitForm />
              </div>
              <aside className="panel side">
                <h3>How it works</h3>
                <ol className="steps">
                  <li>
                    <strong>You submit.</strong> Your design goes into a queue. It is not public, and
                    nobody but a reviewer can see it.
                  </li>
                  <li>
                    <strong>A person looks at it.</strong> Both the image and the name on it. If it
                    is fine, it is approved; if not, it never appears.
                  </li>
                  <li>
                    <strong>It joins the showcase.</strong> Approved designs can be voted on, and a
                    few get picked for each round.
                  </li>
                  <li>
                    <strong>No art to hand?</strong> The <em>Draw a cape</em> tab is a 64x32 grid you
                    can draw on directly - what comes out is a real cape texture.
                  </li>
                </ol>
                <p className="tiny muted" style={{ marginBottom: 0 }}>
                  By submitting you agree it is your own work and that it follows the{" "}
                  <Link href="/terms">terms and acceptable use</Link>.
                </p>
              </aside>
            </div>
          </section>
        }
        vote={<FeaturedRound items={featured} voted={voted} />}
        showcase={<Showcase items={approved} voted={voted} />}
      />
    </>
  );
}
