import Link from "next/link";
import { contactText, LEGAL } from "@/lib/legal";

export const metadata = {
  title: "Privacy Policy | Catalyst Client",
  description: "What Catalyst Client, its launcher and Catalyst Designs collect, why, for how long, and your rights.",
};

/**
 * The Privacy Policy for all of Catalyst, written from what the software actually does: most of the
 * launcher's data never leaves the player's computer, and the website stores very little. If the
 * software starts collecting something new, this page has to change with it.
 */
export default function PrivacyPage() {
  return (
    <div className="shell">
      <article className="prose">
        <h1>Privacy Policy</h1>
        <p className="updated">Last updated {LEGAL.lastUpdated}</p>

        <div className="summary">
          <b>The short version</b>
          <ul>
            <li>The launcher keeps your settings, play time and progress on your own computer.</li>
            <li>We never see your Microsoft password.</li>
            <li>The website stores designs you submit, a random voting cookie, and nothing else about you.</li>
            <li>No ads, no trackers, no selling data.</li>
          </ul>
        </div>

        <h2 id="who">1. Who is responsible</h2>
        <p>
          {LEGAL.operator} is the controller of the personal data described here. Contact us about
          privacy at {contactText()}.
        </p>

        <h2 id="launcher">2. The launcher and client</h2>
        <p>
          <strong>Kept only on your computer</strong> (in the <code>.visuals-launcher</code> folder in
          your home folder, and the game folder): your settings, theme, memory and window choices, play
          time and session history, session pictures, daily reward and battle pass progress, coins and
          items, custom sounds and images, and installed mods. We do not receive any of it. You can
          delete it at any time from Settings or by deleting the folder.
        </p>
        <p>
          <strong>Microsoft sign-in:</strong> you sign in on Microsoft&apos;s page. The launcher stores
          the resulting tokens and your Minecraft name and ID on your computer, and uses them only to
          talk to Microsoft, Xbox and Mojang services. Microsoft&apos;s privacy statement applies to that.
        </p>
        <p>
          <strong>Redeeming a code</strong> sends the code and a random install ID (made by the launcher
          the first time you redeem, stored on your computer) to our server. We store the code&apos;s
          fingerprint with that install ID and the time, so a code cannot be used twice from the same
          install. Legal basis: providing what you asked for (Article 6(1)(b) GDPR). Kept for as long
          as the code exists.
        </p>
        <p>
          <strong>Mods from Modrinth:</strong> when you browse or install mods, the launcher talks to
          Modrinth&apos;s servers directly, so Modrinth sees your IP address. Its own privacy policy
          applies; we receive nothing.
        </p>

        <h2 id="website">3. Catalyst Designs (this website)</h2>
        <ul>
          <li>
            <strong>Designs you submit</strong>: the image, the display name you type, the kind of design
            and the date. Used to review and show it. Basis: providing the service (Article 6(1)(b)).
            Kept until you ask us to remove it or we take it down; rejected designs are kept so a
            review mistake can be undone, and removed when we clear the queue or you ask.
          </li>
          <li>
            <strong>Votes</strong>: a random ID in a cookie and which designs it voted for - never your
            name or IP address. Basis: our legitimate interest in fair voting (Article 6(1)(f)). Kept
            while the design is on the site.
          </li>
          <li>
            <strong>Reviewer sign-in</strong>: a session cookie for team members only.
          </li>
          <li>
            <strong>Server logs</strong>: our hosting and database providers log requests (IP address,
            browser, time) to run and protect the service. Basis: legitimate interest in security. Kept
            for the providers&apos; standard periods, usually days to weeks.
          </li>
        </ul>
        <p>Do not put personal information (like your real name) in a display name or design.</p>

        <h2 id="cookies">4. Cookies</h2>
        <p>Two, both needed for what you ask the site to do, none for tracking or ads:</p>
        <ul>
          <li>
            <code>catalyst_voter</code> - a random ID so one browser votes once per design. About a year.
          </li>
          <li>
            <code>catalyst_admin</code> - only for reviewers, while signed in. Twelve hours.
          </li>
        </ul>
        <p>Fonts are served from this site itself, so visiting sends nothing to Google or other font services.</p>

        <h2 id="sharing">5. Who we share data with</h2>
        <p>
          We do not sell or rent personal data, and there is no advertising or analytics. We use these
          providers to run the service, under data processing terms:
        </p>
        <ul>
          <li><strong>Netlify</strong> - hosts this website (United States).</li>
          <li><strong>Supabase</strong> - stores submissions, votes and redeem codes (servers in Frankfurt, Germany).</li>
          <li><strong>A payment provider</strong> - once payments open, it will process payments; we will name it here first.</li>
        </ul>
        <p>
          Where a provider handles data outside the European Economic Area, the transfer is protected by
          the EU&apos;s Standard Contractual Clauses or an adequacy decision such as the EU-US Data
          Privacy Framework. We may also disclose data if the law requires it.
        </p>

        <h2 id="rights">6. Your rights</h2>
        <p>Under the GDPR you can ask us to:</p>
        <ul>
          <li>tell you what we hold about you and give you a copy;</li>
          <li>correct it, or delete it;</li>
          <li>restrict how we use it, or object to uses based on legitimate interest;</li>
          <li>give it to you in a portable format.</li>
        </ul>
        <p>
          Write to {contactText()}. We answer within one month. Because we hold no accounts, tell us
          what identifies your data (for example the display name and date of a submission). You can
          also complain to your local data protection authority - in {LEGAL.country}, {LEGAL.authority}.
        </p>

        <h2 id="children">7. Children</h2>
        <p>
          Catalyst is not meant for children under {LEGAL.minimumAge}. If you are under{" "}
          {LEGAL.consentAge}, ask a parent or guardian before submitting a design or buying anything. If
          you think a child has given us personal data, contact us and we will delete it.
        </p>

        <h2 id="security">8. Security</h2>
        <p>
          Data on our servers is only reachable through our own server code; the database refuses direct
          access, uploaded designs are private until approved, and redeem codes are stored only as
          fingerprints. No system is perfectly secure, but we will tell you and the authorities about a
          breach where the law requires.
        </p>

        <h2 id="changes">9. Changes</h2>
        <p>
          If Catalyst starts collecting something new, this policy changes first, and the date at the
          top changes with it. See also our <Link href="/terms">Terms of Service</Link>.
        </p>
      </article>
    </div>
  );
}
