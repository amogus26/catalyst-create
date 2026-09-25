import { promises as fs } from "node:fs";
import path from "node:path";
import type { RedeemResult } from "../codes";
import { DEFAULT_DESIGN_TYPE } from "../design-types";
import { groupBatches, type StoredCode } from "./code-batches";
import type { Store, StoredImage, Submission, SubmissionStatus } from "./types";

/**
 * The development store: rows in a JSON file, images in a folder, both under `.localstore/`
 * (gitignored).
 *
 * It exists so the site can be run and its behaviour checked - submit, review, approve, vote -
 * without a Supabase project, a network connection or an account. It is **not** a fallback for
 * production: `getStore()` refuses to hand this out when NODE_ENV is production, so a deploy that
 * is missing its Supabase settings fails loudly at the first request instead of quietly serving a
 * different, empty site that nobody is moderating.
 *
 * It behaves like the real driver in the ways that matter: a new submission is always `pending`,
 * only approved rows are votable, and one voter votes once per submission. It is not concurrent,
 * not fast and not durable, and it is not meant to be.
 */

interface Data {
  submissions: (Submission & { imageFile: string })[];
  votes: { submissionId: string; voterId: string }[];
}

const ROOT = path.join(process.cwd(), ".localstore");
const DATA_FILE = path.join(ROOT, "submissions.json");
const IMAGE_DIR = path.join(ROOT, "images");

async function read(): Promise<Data> {
  try {
    const data = JSON.parse(await fs.readFile(DATA_FILE, "utf8")) as Data;
    // Rows written before these columns existed are not featured, and are capes.
    for (const row of data.submissions) {
      row.featured = row.featured ?? false;
      row.designType = row.designType ?? DEFAULT_DESIGN_TYPE;
    }
    return data;
  } catch {
    return { submissions: [], votes: [] };
  }
}

async function write(data: Data): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function publicView(row: Submission & { imageFile: string }): Submission {
  const { imageFile: _imageFile, ...submission } = row;
  return submission;
}

export function createLocalStore(): Store {
  return {
    isLocal: true,

    describe() {
      return `local dev store (${path.relative(process.cwd(), ROOT)}/)`;
    },

    async createSubmission({ displayName, designType, bytes }) {
      const data = await read();
      const id = crypto.randomUUID();
      const imageFile = `${id}.png`;
      await fs.mkdir(IMAGE_DIR, { recursive: true });
      await fs.writeFile(path.join(IMAGE_DIR, imageFile), bytes);

      const submission: Submission & { imageFile: string } = {
        id,
        displayName,
        // Hard-coded, like the column default in the migration: nothing arrives visible.
        status: "pending",
        voteCount: 0,
        createdAt: new Date().toISOString(),
        reviewedAt: null,
        featured: false,
        designType,
        imageFile,
      };
      data.submissions.push(submission);
      await write(data);
      return publicView(submission);
    },

    async listByStatus(status) {
      const data = await read();
      const rows = data.submissions.filter((row) => row.status === status);
      rows.sort((a, b) =>
        status === "approved"
          ? b.voteCount - a.voteCount || b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt),
      );
      return rows.map(publicView);
    },

    async getSubmission(id) {
      const data = await read();
      const row = data.submissions.find((item) => item.id === id);
      return row ? publicView(row) : null;
    },

    async readImage(id): Promise<StoredImage | null> {
      const data = await read();
      const row = data.submissions.find((item) => item.id === id);
      if (!row) return null;
      try {
        const bytes = await fs.readFile(path.join(IMAGE_DIR, row.imageFile));
        return { bytes: new Uint8Array(bytes), contentType: "image/png" };
      } catch {
        return null;
      }
    },

    async listFeatured(limit) {
      const data = await read();
      return data.submissions
        .filter((row) => row.featured && row.status === "approved")
        .sort((a, b) => b.voteCount - a.voteCount || a.createdAt.localeCompare(b.createdAt))
        .slice(0, limit)
        .map(publicView);
    },

    async setFeatured(id, featured) {
      const data = await read();
      const row = data.submissions.find((item) => item.id === id);
      if (!row) return null;
      row.featured = featured;
      await write(data);
      return publicView(row);
    },

    async setStatus(id, status: SubmissionStatus) {
      const data = await read();
      const row = data.submissions.find((item) => item.id === id);
      if (!row) return null;
      row.status = status;
      row.reviewedAt = new Date().toISOString();
      await write(data);
      return publicView(row);
    },

    async castVote(id, voterId) {
      const data = await read();
      const row = data.submissions.find((item) => item.id === id);
      if (!row || row.status !== "approved") return null;
      if (data.votes.some((vote) => vote.submissionId === id && vote.voterId === voterId)) {
        return { counted: false, voteCount: row.voteCount };
      }
      data.votes.push({ submissionId: id, voterId });
      row.voteCount += 1;
      await write(data);
      return { counted: true, voteCount: row.voteCount };
    },

    async votedIds(voterId, ids) {
      const data = await read();
      return new Set(
        data.votes
          .filter((vote) => vote.voterId === voterId && ids.includes(vote.submissionId))
          .map((vote) => vote.submissionId),
      );
    },

    async createCodes({ batchId, hashes, reward, note, maxUses, expiresOn }) {
      const book = await readCodes();
      const createdAt = new Date().toISOString();
      for (const hash of hashes) {
        book.codes.push({ hash, batchId, reward, note, maxUses, uses: 0, expiresOn, revoked: false, createdAt });
      }
      await writeCodes(book);
    },

    async listCodeBatches() {
      return groupBatches((await readCodes()).codes);
    },

    async redeemCode(hash, deviceId): Promise<RedeemResult> {
      // The same order of checks as the database function in 0004_redeem_codes.sql.
      const book = await readCodes();
      const code = book.codes.find((item) => item.hash === hash);
      if (!code) return { outcome: "unknown" };
      if (code.revoked) return { outcome: "revoked" };
      const today = new Date().toISOString().slice(0, 10);
      if (code.expiresOn && code.expiresOn < today) return { outcome: "expired", expiresOn: code.expiresOn };
      if (book.redemptions.some((item) => item.hash === hash && item.deviceId === deviceId)) {
        return { outcome: "already" };
      }
      if (code.uses >= code.maxUses) return { outcome: "used" };
      book.redemptions.push({ hash, deviceId, redeemedAt: new Date().toISOString() });
      code.uses += 1;
      await writeCodes(book);
      return { outcome: "redeemed", reward: code.reward, ...(code.expiresOn ? { expiresOn: code.expiresOn } : {}) };
    },

    async revokeBatch(batchId) {
      const book = await readCodes();
      const live = book.codes.filter((code) => code.batchId === batchId && !code.revoked);
      live.forEach((code) => (code.revoked = true));
      await writeCodes(book);
      return live.length;
    },

    async revokeCode(hash) {
      const book = await readCodes();
      const code = book.codes.find((item) => item.hash === hash);
      if (!code) return false;
      code.revoked = true;
      await writeCodes(book);
      return true;
    },
  };
}

// --------------------------------------------------------------------------- redeem codes

interface CodeBook {
  codes: (StoredCode & { hash: string })[];
  redemptions: { hash: string; deviceId: string; redeemedAt: string }[];
}

const CODES_FILE = path.join(ROOT, "codes.json");

async function readCodes(): Promise<CodeBook> {
  try {
    return JSON.parse(await fs.readFile(CODES_FILE, "utf8")) as CodeBook;
  } catch {
    return { codes: [], redemptions: [] };
  }
}

async function writeCodes(book: CodeBook): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
  await fs.writeFile(CODES_FILE, JSON.stringify(book, null, 2), "utf8");
}
