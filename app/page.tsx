import Link from "next/link";
import { FeaturedRound } from "@/components/featured-round";
import { HeroPlates } from "@/components/hero-plates";
import { SectionHeader } from "@/components/section-header";
import { SectionTabs } from "@/components/section-tabs";
import { Showcase } from "@/components/showcase";
import { SubmitForm } from "@/components/submit-form";
import { FEATURED_LIMIT } from "@/lib/config";
import { getStore } from "@/lib/store";
import { currentVoterId } from "@/lib/voter";

// Approvals and votes change under this page constantly; never serve it from the build.
export const dynamic = "force-dynamic";

/** How many designs are pinned to the board in the hero. */
const PLATES = 3;

/**
 * The whole public site, bar the terms: submitting, the current round, and the showcase, as three
 * steps of one page (see [SectionTabs]). Everything it shows has been through review - it asks the
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
      <section className="hero-band">
        <div className="hero">
          <div className="hero-copy">
            <p className="eyebrow">For Catalyst Client</p>
            <h1>Cosmetics drawn by the people wearing them</h1>
            <p className="lead">
              Make a cape, a pair of wings or something else to wear - upload it, or draw one here on
              a 64x32 grid. A person looks at every submission before anybody else sees it, and the
              best of each round gets worn in game.
            </p>
            <div className="hero-actions">
              <Link href="/#submit" className="button primary">
                Submit a design
              </Link>
              <Link href="/#vote" className="button ghost">
                Vote on this round
              </Link>
            </div>
          </div>
          <HeroPlates designs={approved.slice(0, PLATES)} />
        </div>
      </section>

      <div className="shell">
        <SectionTabs
          counts={{ vote: featured.length, showcase: approved.length }}
          submit={
            <section className="section" id="submit">
              <SectionHeader no="01" title="Submit a design">
                Upload a PNG, or draw a cape in the browser. Nothing you submit is shown to anyone
                until a reviewer has looked at it - expect that to take a day or two.
              </SectionHeader>
              <div className="submit-layout">
                <div className="panel">
                  <SubmitForm />
                </div>
                <aside className="panel side">
                  <h3>How it works</h3>
                  <ol className="steps-list">
                    <li>
                      <strong>You submit.</strong> Your design goes into a queue. It is not public,
                      and nobody but a reviewer can see it.
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
                      <strong>No art to hand?</strong> <em>Draw a cape</em> is a 64x32 grid you can
                      draw on directly - what comes out is a real cape texture.
                    </li>
                  </ol>
                  <p className="tiny muted footnote">
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
      </div>
    </>
  );
}
