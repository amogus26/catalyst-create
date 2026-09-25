import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { fingerprint, generateCodes } from "@/lib/codes";
import { parseReward, rewardSpec } from "@/lib/rewards";
import { getStore } from "@/lib/store";

/** Most codes one batch may hold - a big giveaway, not a bulk export. */
const MAX_BATCH = 1000;

/**
 * Makes a batch of codes: `{reward, count, maxUses, expiresOn, note}`. Reviewers only.
 *
 * The codes are generated here, stored by fingerprint only, and handed back in readable form in this
 * one response - the only time they exist readably. Lose the response and the batch is unusable (it
 * can be cancelled from the codes page and made again).
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "That request could not be read." }, { status: 400 });
  }

  const reward = typeof body.reward === "string" ? parseReward(body.reward) : null;
  if (!reward) {
    return NextResponse.json({ error: "That reward is not one the launcher understands." }, { status: 400 });
  }
  const count = Number(body.count);
  if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH) {
    return NextResponse.json({ error: `Make between 1 and ${MAX_BATCH} codes at a time.` }, { status: 400 });
  }
  const maxUses = Number(body.maxUses ?? 1);
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100_000) {
    return NextResponse.json({ error: "Uses per code must be between 1 and 100,000." }, { status: 400 });
  }
  let expiresOn: string | null = null;
  if (typeof body.expiresOn === "string" && body.expiresOn !== "") {
    const today = new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.expiresOn) || Number.isNaN(Date.parse(body.expiresOn))) {
      return NextResponse.json({ error: "The last day must be a date." }, { status: 400 });
    }
    if (body.expiresOn < today) {
      return NextResponse.json({ error: "The last day is already over." }, { status: 400 });
    }
    expiresOn = body.expiresOn;
  }
  const note = typeof body.note === "string" && body.note.trim() !== "" ? body.note.trim().slice(0, 120) : null;

  const codes = generateCodes(count);
  const batchId = crypto.randomUUID();
  try {
    await getStore().createCodes({
      batchId,
      hashes: codes.map(fingerprint),
      reward: rewardSpec(reward),
      note,
      maxUses,
      expiresOn,
    });
  } catch (error) {
    console.error("[catalyst-create] making codes failed:", error);
    return NextResponse.json({ error: "The codes could not be saved - none were made." }, { status: 500 });
  }

  return NextResponse.json(
    { batchId, codes, reward: rewardSpec(reward), maxUses, expiresOn, note },
    { headers: { "cache-control": "no-store" } },
  );
}
