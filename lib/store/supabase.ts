import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RedeemResult } from "../codes";
import type { DesignTypeId } from "../design-types";
import { groupBatches } from "./code-batches";
import type { Store, StoredImage, Submission, SubmissionStatus } from "./types";

/**
 * The real store: a Postgres table for the rows and a **private** Storage bucket for the images.
 *
 * This talks to Supabase with the service role key, which bypasses row-level security. That is the
 * point: the tables carry RLS with *no policies at all* (see supabase/migrations/0001_init.sql), so
 * the anon key - and therefore anything running in a browser - can read and write nothing. Every
 * read and write in this site goes through the server, which is what makes the moderation gate
 * something a visitor cannot go around.
 *
 * The bucket is private for the same reason. A public bucket would make every upload fetchable by
 * URL the moment it landed, review or no review; here the bytes only ever leave through
 * `app/api/images/[id]`, which checks the row's status first.
 */

interface Row {
  id: string;
  display_name: string;
  image_path: string;
  status: SubmissionStatus;
  vote_count: number;
  created_at: string;
  reviewed_at: string | null;
  featured: boolean;
  design_type: DesignTypeId;
}

const COLUMNS =
  "id, display_name, image_path, status, vote_count, created_at, reviewed_at, featured, design_type";

function toSubmission(row: Row): Submission {
  return {
    id: row.id,
    displayName: row.display_name,
    status: row.status,
    voteCount: row.vote_count,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    featured: row.featured,
    designType: row.design_type,
  };
}

export function createSupabaseStore(url: string, serviceRoleKey: string, bucket: string): Store {
  const client: SupabaseClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const imagePathFor = (id: string) => `${id}.png`;

  return {
    isLocal: false,

    describe() {
      // The host only - the key is a secret and the log is not the place for it.
      return `Supabase (${new URL(url).host}, bucket "${bucket}")`;
    },

    async createSubmission({ displayName, designType, bytes, contentType }) {
      // The id is made here so the object can be named before the row exists: if the insert fails,
      // there is a known path to clean up rather than an orphan with a random name.
      const id = crypto.randomUUID();
      const path = imagePathFor(id);

      const upload = await client.storage
        .from(bucket)
        .upload(path, bytes, { contentType, upsert: false });
      if (upload.error) {
        throw new Error(`Could not store the image: ${upload.error.message}`);
      }

      const insert = await client
        .from("submissions")
        .insert({ id, display_name: displayName, image_path: path, design_type: designType })
        .select(COLUMNS)
        .single();

      if (insert.error || !insert.data) {
        await client.storage.from(bucket).remove([path]);
        throw new Error(`Could not record the submission: ${insert.error?.message ?? "no row returned"}`);
      }
      return toSubmission(insert.data as Row);
    },

    async listByStatus(status) {
      const query = client.from("submissions").select(COLUMNS).eq("status", status);
      // Most-voted first in the gallery; oldest first in the review queue.
      const ordered =
        status === "approved"
          ? query.order("vote_count", { ascending: false }).order("created_at", { ascending: false })
          : query.order("created_at", { ascending: true });

      const { data, error } = await ordered;
      if (error) throw new Error(`Could not list submissions: ${error.message}`);
      return (data as Row[]).map(toSubmission);
    },

    async getSubmission(id) {
      const { data, error } = await client.from("submissions").select(COLUMNS).eq("id", id).maybeSingle();
      if (error) throw new Error(`Could not read the submission: ${error.message}`);
      return data ? toSubmission(data as Row) : null;
    },

    async readImage(id): Promise<StoredImage | null> {
      const { data, error } = await client
        .from("submissions")
        .select("image_path")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(`Could not read the submission: ${error.message}`);
      if (!data) return null;

      const file = await client.storage.from(bucket).download((data as { image_path: string }).image_path);
      if (file.error || !file.data) return null;
      return {
        bytes: new Uint8Array(await file.data.arrayBuffer()),
        contentType: file.data.type || "image/png",
      };
    },

    async listFeatured(limit) {
      // Both conditions, every time: featured is a curation flag, approved is what makes a design
      // public, and only the pair of them belongs in a round.
      const { data, error } = await client
        .from("submissions")
        .select(COLUMNS)
        .eq("status", "approved")
        .eq("featured", true)
        .order("vote_count", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) throw new Error(`Could not list the featured designs: ${error.message}`);
      return (data as Row[]).map(toSubmission);
    },

    async setFeatured(id, featured) {
      const { data, error } = await client
        .from("submissions")
        .update({ featured })
        .eq("id", id)
        .select(COLUMNS)
        .maybeSingle();
      if (error) throw new Error(`Could not update the submission: ${error.message}`);
      return data ? toSubmission(data as Row) : null;
    },

    async setStatus(id, status) {
      const { data, error } = await client
        .from("submissions")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", id)
        .select(COLUMNS)
        .maybeSingle();
      if (error) throw new Error(`Could not update the submission: ${error.message}`);
      return data ? toSubmission(data as Row) : null;
    },

    async castVote(id, voterId) {
      // One round trip, and atomic: the insert and the increment cannot come apart under two
      // clicks at once. The function also refuses anything that is not approved - the gate again,
      // this time in the database. See the migration.
      const { data, error } = await client.rpc("cast_vote", {
        p_submission_id: id,
        p_voter_id: voterId,
      });
      if (error) throw new Error(`Could not record the vote: ${error.message}`);
      const result = Array.isArray(data) ? data[0] : data;
      if (!result || result.votes === null) return null;
      return { counted: result.counted === true, voteCount: result.votes as number };
    },

    async votedIds(voterId, ids) {
      if (ids.length === 0) return new Set();
      const { data, error } = await client
        .from("votes")
        .select("submission_id")
        .eq("voter_id", voterId)
        .in("submission_id", ids);
      if (error) throw new Error(`Could not read votes: ${error.message}`);
      return new Set((data as { submission_id: string }[]).map((row) => row.submission_id));
    },

    async createCodes({ batchId, hashes, reward, note, maxUses, expiresOn }) {
      const rows = hashes.map((hash) => ({
        hash,
        reward,
        note,
        batch_id: batchId,
        max_uses: maxUses,
        expires_on: expiresOn,
      }));
      const { error } = await client.from("redeem_codes").insert(rows);
      if (error) throw new Error(`Could not store the codes: ${error.message}`);
    },

    async listCodeBatches() {
      // ponytail: grouped here from the newest 10,000 codes; move to a SQL view once batches pass that.
      const { data, error } = await client
        .from("redeem_codes")
        .select("batch_id, reward, note, max_uses, uses, expires_on, revoked, created_at")
        .order("created_at", { ascending: false })
        .limit(10_000);
      if (error) throw new Error(`Could not list the codes: ${error.message}`);
      return groupBatches(
        (data as CodeRow[]).map((row) => ({
          batchId: row.batch_id,
          reward: row.reward,
          note: row.note,
          maxUses: row.max_uses,
          uses: row.uses,
          expiresOn: row.expires_on,
          revoked: row.revoked,
          createdAt: row.created_at,
        })),
      );
    },

    async redeemCode(hash, deviceId) {
      const { data, error } = await client.rpc("redeem_code", { p_hash: hash, p_device: deviceId });
      if (error) throw new Error(`Could not redeem the code: ${error.message}`);
      const row = (Array.isArray(data) ? data[0] : data) as
        | { outcome: RedeemResult["outcome"]; reward: string | null; expires_on: string | null }
        | undefined;
      if (!row) throw new Error("The database gave no answer.");
      return {
        outcome: row.outcome,
        ...(row.reward ? { reward: row.reward } : {}),
        ...(row.expires_on ? { expiresOn: row.expires_on } : {}),
      };
    },

    async revokeBatch(batchId) {
      const { data, error } = await client
        .from("redeem_codes")
        .update({ revoked: true })
        .eq("batch_id", batchId)
        .eq("revoked", false)
        .select("hash");
      if (error) throw new Error(`Could not cancel the batch: ${error.message}`);
      return (data ?? []).length;
    },

    async revokeCode(hash) {
      const { data, error } = await client
        .from("redeem_codes")
        .update({ revoked: true })
        .eq("hash", hash)
        .select("hash");
      if (error) throw new Error(`Could not cancel the code: ${error.message}`);
      return (data ?? []).length > 0;
    },
  };
}

interface CodeRow {
  batch_id: string;
  reward: string;
  note: string | null;
  max_uses: number;
  uses: number;
  expires_on: string | null;
  revoked: boolean;
  created_at: string;
}
