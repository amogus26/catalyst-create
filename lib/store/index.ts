import { createLocalStore } from "./local";
import { createSupabaseStore } from "./supabase";
import type { Store } from "./types";

export type { Store, StoredImage, Submission, SubmissionStatus } from "./types";

/**
 * Picks what is backing the site, once, and never lets the choice be an accident:
 *
 * - Supabase settings present -> Supabase, wherever it is running.
 * - Missing, in development -> the local dev store, with a warning in the log and a banner on
 *   every page, so nobody mistakes it for the real thing.
 * - Missing, in production -> **an error**. A live deployment with no database must not quietly
 *   serve a scratch store that nobody is reviewing submissions in.
 */

let cached: Store | null = null;
let warned = false;

/**
 * Whether this process would use the dev store, worked out from the environment alone.
 *
 * The layout asks this to decide whether to show its banner, and asking must not *build* a store:
 * a production build renders the layout for every static page, and [getStore] is meant to throw in
 * production when Supabase is not configured. That throw belongs at the first real request, not in
 * the middle of `next build`.
 */
export function usingDevStore(): boolean {
  const configured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return !configured && process.env.NODE_ENV !== "production";
}

export function getStore(): Store {
  if (typeof window !== "undefined") {
    // The service role key lives in this module's neighbourhood. Nothing here may be bundled into
    // a client component, and this turns a mistake into an immediate, obvious failure.
    throw new Error("The store is server-only and must never be imported into a client component.");
  }
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET ?? "submissions";

  if (url && key) {
    cached = createSupabaseStore(url, key, bucket);
  } else if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production. " +
        "The local dev store is not a fallback - see README, 'Deploying'.",
    );
  } else {
    cached = createLocalStore();
  }

  if (!warned) {
    warned = true;
    console.log(`[catalyst-create] storing submissions in: ${cached.describe()}`);
    if (cached.isLocal) {
      console.warn(
        "[catalyst-create] no Supabase settings found - using the local dev store. " +
          "Uploads land in .localstore/ and are lost when you delete it.",
      );
    }
  }
  return cached;
}
