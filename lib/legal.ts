/**
 * The facts the Terms of Service and Privacy Policy depend on, in one place. Change them here and
 * both pages follow.
 *
 * The legal pages are written to be honest about what the software does today, but they are not a
 * lawyer's work - have someone qualified in the operator's country read them before real money or a
 * large audience is involved.
 */
export const LEGAL = {
  /** Who runs the service. A company name goes here once there is one. */
  operator: "the Catalyst Client team",
  /**
   * Where people reach the operator about anything legal, privacy requests and takedowns. The GDPR
   * requires one. Null until the team has a public address - the pages say so plainly meanwhile.
   */
  contactEmail: null as string | null,
  /** Whose law the terms are under, and the data protection authority people can complain to. */
  country: "Poland",
  authority: "the President of the Personal Data Protection Office (UODO), ul. Stawki 2, 00-193 Warsaw, uodo.gov.pl",
  /** The minimum age to use the service at all, and the age below which a parent must agree. */
  minimumAge: 13,
  consentAge: 16,
  /** Change whenever the wording of either page changes. */
  lastUpdated: "25 September 2026",
};

/** How the pages give the contact address, whether or not there is one yet. */
export function contactText(): string {
  return LEGAL.contactEmail ?? "the team's contact address (being set up - it will be listed here)";
}
