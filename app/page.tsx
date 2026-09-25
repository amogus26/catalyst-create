import Link from "next/link";
import { FeaturedRound } from "@/components/featured-round";
import { Gallery } from "@/components/gallery";
import { HeroStage } from "@/components/hero-stage";
import { SectionHeader } from "@/components/section-header";
import { SubmitForm } from "@/components/submit-form";
import { FEATURED_LIMIT } from "@/lib/config";
import { getStore } from "@/lib/store";
import { currentVoterId } from "@/lib/voter";

// Approvals and votes change under this page constantly; never serve it from the build.
export const dynamic = "force-dynamic";

/**
 * The whole public site bar the legal pages, as one scroll: the round, the gallery and the form are
 * all on it, in the order people use them. Everything shown has been through review - the store is
 * only ever asked for approved designs and the current round.
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
  const votes = approved.reduce((sum, submission) => sum + submission.voteCount, 0);
  const leader = featured[0] ?? approved[0] ?? null;

  return (
    <div className="shell">
      <section className="hero">
        <div>
          <span className="round-chip">
            <span className="pulse" aria-hidden="true" />
            {featured.length > 0
              ? `Voting is open - ${featured.length} design${featured.length === 1 ? "" : "s"} in this round`
              : "Submissions are open"}
          </span>
          <h1>
            Design what Catalyst players <span className="accent">wear</span>.
          </h1>
          <p className="lead">
            Upload a cape or draw one right here. A person checks every design, players vote, and
            the winners go into the client.
          </p>
          <div className="hero-actions">
            <Link href="/#submit" className="button primary">
              Submit a design
            </Link>
            <Link href="/#vote" className="button">
              Vote on the round
            </Link>
          </div>
          <div className="hero-stats">
            <div>
              <b>{approved.length}</b>
              <span>designs in the gallery</span>
            </div>
            <div>
              <b>{votes}</b>
              <span>votes cast</span>
            </div>
            <div>
              <b>{featured.length}</b>
              <span>in this round</span>
            </div>
          </div>
        </div>
        <HeroStage leader={leader} leading={featured.length > 0} />
      </section>

      <ol className="steps">
        <li>
          <span className="no">01</span>
          <div>
            <b>Submit</b>
            <span>Upload a PNG or draw a cape.</span>
          </div>
        </li>
        <li>
          <span className="no">02</span>
          <div>
            <b>Get checked</b>
            <span>A person reviews it, usually within two days.</span>
          </div>
        </li>
        <li>
          <span className="no">03</span>
          <div>
            <b>Win the vote</b>
            <span>The round&apos;s winners are made into cosmetics.</span>
          </div>
        </li>
      </ol>

      <FeaturedRound items={featured} voted={voted} />

      <Gallery items={approved} voted={[...voted]} />

      <section className="section" id="submit">
        <SectionHeader kicker="Submit" title="Send in your design">
          Nobody sees it until a reviewer has approved it.
        </SectionHeader>
        <div className="submit-layout">
          <div className="form-card">
            <SubmitForm />
          </div>
          <aside className="rules">
            <h3>What gets approved</h3>
            <ul>
              <li>Your own work - no art, logos or characters you don&apos;t have the rights to.</li>
              <li>Nothing hateful, sexual, violent or aimed at a real person.</li>
              <li>Capes are 64x32, or an exact 2:1 HD size like 128x64.</li>
              <li>A display name that follows the same rules - it is shown with your design.</li>
            </ul>
            <p className="fine">
              By submitting you agree to the <Link href="/terms">Terms of Service</Link> and let us
              show your design here and, if it wins, in the client. See the{" "}
              <Link href="/privacy">Privacy Policy</Link> for what we store.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
