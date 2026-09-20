import Link from "next/link";

export const metadata = {
  title: "Terms & Privacy | Catalyst Designs",
  description: "What this site collects, how submissions are reviewed, and what may be submitted.",
};

/** The date the wording below last changed. Update it when the wording does. */
const LAST_UPDATED = "19 September 2026";

/**
 * Terms of service and privacy policy on one page, because they are read in one sitting and are
 * mostly about the same handful of facts.
 *
 * **This is starter content, not a reviewed legal document** - the notice at the top says so to
 * anyone reading it, which is the same way the rest of this project handles legal material: write
 * the honest version of what the software actually does, and have someone qualified check it
 * before it means anything.
 */
export default function TermsPage() {
  return (
    <article className="prose">
      <p className="eyebrow">Reference</p>
      <h1>Terms &amp; Privacy</h1>
      <p className="muted small">Last updated {LAST_UPDATED}</p>

      <div className="notice info" role="note">
        <strong>Draft - not reviewed by a lawyer.</strong> This is starter wording that describes
        what the site actually does today. It has not been checked by anyone qualified, and it needs
        to be before this site is meaningfully public or handles anything that matters. Treat it as
        an honest description, not as a binding document.
      </div>

      <h2>What this site is</h2>
      <p>
        Catalyst Designs is a place to submit cosmetic designs for Catalyst Client - capes, wings and
        other wearables - and to vote on designs other people have submitted. It is run by the small team that makes the client. It is not a
        shop, it takes no payments, and it has no user accounts.
      </p>

      <h2>What we collect</h2>
      <p>When you submit a design, we store:</p>
      <ul>
        <li>
          <strong>The display name you type.</strong> It is a label shown next to your design. It is
          not checked against anything and it is not an identity - anyone could type any name.
        </li>
        <li>
          <strong>The image file you upload</strong>, and the date you uploaded it.
        </li>
      </ul>
      <p>When you vote, we store:</p>
      <ul>
        <li>
          <strong>A random id kept in a cookie in your browser</strong>, and which designs that id
          has voted for. The id is not linked to a person, a name or an email, because we do not
          have any of those.
        </li>
      </ul>
      <p>
        Our hosting provider and database provider keep their own server logs, which ordinarily
        include IP addresses and request times. That is standard for any website and is outside what
        this site controls.
      </p>

      <h2>What we do not collect</h2>
      <ul>
        <li>No accounts, usernames or passwords - there is no sign-up, and nothing to sign in to.</li>
        <li>No email addresses.</li>
        <li>No payment details of any kind. This site cannot take a payment.</li>
        <li>No analytics or advertising trackers.</li>
      </ul>

      <h2>Cookies</h2>
      <p>Two, and neither is for tracking you across the web:</p>
      <ul>
        <li>
          <code>catalyst_voter</code> - a random id, so the same browser cannot vote twice on the
          same design. It lasts about a year.
        </li>
        <li>
          <code>catalyst_admin</code> - only set for reviewers, when they sign in to the review page.
          It lasts twelve hours.
        </li>
      </ul>

      <h2>Submissions are reviewed before anyone sees them</h2>
      <p>
        Every submission starts hidden. A person from the team looks at the image and the display
        name, and only then does it appear on the site. Nothing you upload is shown to other visitors
        before that review, and a design that is not approved is never shown at all.
      </p>
      <p>
        Approval is not an endorsement, and it can be undone: anything on this site can be taken down
        at any time, for any reason, including after it has been approved.
      </p>

      <h2>Your design must be your own work</h2>
      <p>
        Only submit work you made yourself. Do not submit someone else&apos;s art, logos, brands or
        characters you do not have the right to use. If you submit something that is not yours, it
        will be removed when we find out.
      </p>
      <p>
        You keep the rights to what you make. By submitting, you give us permission to show it on
        this site and, if it is chosen, to include it in Catalyst Client as a cosmetic other players can
        wear. You can ask us to remove a design - see below.
      </p>

      <h2>Acceptable use</h2>
      <p>
        This is the site&apos;s own rule, in addition to the review step - a submission can be
        rejected for breaking it whether or not a reviewer catches it first. Do not submit:
      </p>
      <ul>
        <li>Anything illegal, or anything that depicts or encourages illegal acts.</li>
        <li>Hate symbols, or imagery attacking people for who they are.</li>
        <li>Sexually explicit imagery, or anything sexualising minors.</li>
        <li>Graphic violence or gore.</li>
        <li>Harassment of a specific person, or someone&apos;s private information.</li>
        <li>Anything designed to mislead people about who made it or what it is.</li>
      </ul>
      <p>
        Attempting to stuff the vote, break the review step, or get around the rules above is also
        not on, and gets a submission removed.
      </p>

      <h2>Removing something</h2>
      <p>
        To have a design taken down - yours, or one you believe infringes your rights - contact the
        team. <strong>A contact address goes here</strong>; this site has no form for it yet, which
        is one of the things that needs settling before it is properly public.
      </p>

      <h2>Voting</h2>
      <p>
        Votes are counted once per browser, which is not the same as once per person: clearing
        cookies or using another browser will let the same person vote again. Vote counts are a
        guide for whoever picks a winner, not an automatic decision, and no prize is awarded by
        this site.
      </p>

      <h2>Changes</h2>
      <p>
        This page will change as the site does. The date at the top says when the wording last
        changed.
      </p>

      <p className="muted small" style={{ marginTop: 40 }}>
        <Link href="/">Back to the designs</Link>
      </p>
    </article>
  );
}
