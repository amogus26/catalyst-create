import type { CodeBatch } from "../codes";

/** One stored code, as both drivers read it back - everything but its fingerprint. */
export interface StoredCode {
  batchId: string;
  reward: string;
  note: string | null;
  maxUses: number;
  uses: number;
  expiresOn: string | null;
  revoked: boolean;
  createdAt: string;
}

/** Codes rolled up into the batches they were made in, newest batch first. */
export function groupBatches(codes: StoredCode[]): CodeBatch[] {
  const batches = new Map<string, CodeBatch>();
  for (const code of codes) {
    const batch = batches.get(code.batchId) ?? {
      batchId: code.batchId,
      reward: code.reward,
      note: code.note,
      codes: 0,
      uses: 0,
      maxUses: 0,
      revoked: 0,
      expiresOn: code.expiresOn,
      createdAt: code.createdAt,
    };
    batch.codes += 1;
    batch.uses += code.uses;
    batch.maxUses += code.maxUses;
    if (code.revoked) batch.revoked += 1;
    if (code.createdAt < batch.createdAt) batch.createdAt = code.createdAt;
    batches.set(code.batchId, batch);
  }
  return [...batches.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
