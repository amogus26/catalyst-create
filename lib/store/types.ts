/**
 * What the rest of the app is allowed to ask the store for.
 *
 * Two things about this interface carry the moderation rule, and both are deliberate:
 *
 * 1. [Store.createSubmission] takes no status. A driver cannot be asked to create anything but a
 *    pending row, so there is no code path - not in the API, not in a test, not by mistake - that
 *    puts an upload straight into the gallery.
 * 2. Reading is always by status. The public gallery asks for `approved` and can be handed nothing
 *    else; only the admin routes ask for `pending`.
 */

import type { CodeBatch, RedeemResult } from "../codes";
import type { DesignTypeId } from "../design-types";

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface Submission {
  id: string;
  displayName: string;
  status: SubmissionStatus;
  voteCount: number;
  createdAt: string;
  reviewedAt: string | null;
  /** Picked by a reviewer for the current voting round. Only meaningful while approved. */
  featured: boolean;
  /** What kind of cosmetic this is. See lib/design-types.ts. */
  designType: DesignTypeId;
}

export interface StoredImage {
  bytes: Uint8Array;
  contentType: string;
}

export interface Store {
  /** True for the local dev store, so the app can say so on screen and refuse to deploy on it. */
  readonly isLocal: boolean;

  /** One line naming what is backing the site, for the boot log and the dev banner. */
  describe(): string;

  /** Stores the image and a row for it. The row is always `pending`; nothing here can change that. */
  createSubmission(input: {
    displayName: string;
    designType: DesignTypeId;
    bytes: Uint8Array;
    contentType: string;
  }): Promise<Submission>;

  /** Approved comes back most-voted first; pending comes back oldest first, which is the queue. */
  listByStatus(status: SubmissionStatus): Promise<Submission[]>;

  getSubmission(id: string): Promise<Submission | null>;

  /** The raw image. Callers are responsible for deciding who may see it - see app/api/images. */
  readImage(id: string): Promise<StoredImage | null>;

  /**
   * The designs in the current voting round: featured *and* approved, highest-voted first, capped
   * at [limit]. Featuring alone shows nothing - the approved check is repeated here on purpose.
   */
  listFeatured(limit: number): Promise<Submission[]>;

  setStatus(id: string, status: SubmissionStatus): Promise<Submission | null>;

  /** Ticks or unticks a design for the round. Says nothing about whether it is visible. */
  setFeatured(id: string, featured: boolean): Promise<Submission | null>;

  /**
   * One vote per voter per submission, and only on approved submissions. Returns null when there
   * is no approved submission by that id, `counted: false` when this voter already voted.
   */
  castVote(id: string, voterId: string): Promise<{ counted: boolean; voteCount: number } | null>;

  /** Which of [ids] this voter has already voted on, so the gallery can show its buttons spent. */
  votedIds(voterId: string, ids: string[]): Promise<Set<string>>;

  // ------------------------------------------------------------------ redeem codes (lib/codes.ts)

  /** Stores a batch of codes by fingerprint only. The readable codes never reach the store. */
  createCodes(input: {
    batchId: string;
    hashes: string[];
    reward: string;
    note: string | null;
    maxUses: number;
    expiresOn: string | null;
  }): Promise<void>;

  /** Every batch, newest first, with how far through its uses it is. */
  listCodeBatches(): Promise<CodeBatch[]>;

  /**
   * One launcher install redeeming one code, atomically: a shared code's last use cannot go to two
   * installs at once, and one install cannot redeem the same code twice.
   */
  redeemCode(hash: string, deviceId: string): Promise<RedeemResult>;

  /** Cancels every code in a batch, used or not. Returns how many were cancelled. */
  revokeBatch(batchId: string): Promise<number>;

  /** Cancels one code by fingerprint. False when there is no such code. */
  revokeCode(hash: string): Promise<boolean>;
}
