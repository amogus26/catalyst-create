import { NextResponse } from "next/server";
import { fingerprint, isDeviceId, looksLikeCode, type RedeemResult } from "@/lib/codes";
import { getStore } from "@/lib/store";

/**
 * Where the launcher redeems a code: `POST {"code": "CATL-...", "device": "<uuid>"}`.
 *
 * The answer is always an outcome the launcher has a sentence for - redeemed (with the reward to
 * apply), unknown, used, already (this install redeemed it before), expired or revoked. The code is
 * turned into its fingerprint here and only the fingerprint goes to the database.
 *
 * No rate limit: a code is 12 characters from 31, about 8 * 10^17 possibilities, so guessing one by
 * asking this route is hopeless whatever the speed.
 */
export async function POST(request: Request) {
  let body: { code?: unknown; device?: unknown };
  try {
    body = (await request.json()) as { code?: unknown; device?: unknown };
  } catch {
    return NextResponse.json({ error: "That request could not be read." }, { status: 400 });
  }

  const { code, device } = body;
  if (typeof code !== "string" || code.length === 0 || code.length > 64) {
    return NextResponse.json({ error: "Which code?" }, { status: 400 });
  }
  if (!isDeviceId(device)) {
    return NextResponse.json({ error: "The launcher did not say which install this is." }, { status: 400 });
  }
  if (!looksLikeCode(code)) {
    return answer({ outcome: "unknown" });
  }

  try {
    return answer(await getStore().redeemCode(fingerprint(code), device.toLowerCase()));
  } catch (error) {
    console.error("[catalyst-create] redeem failed:", error);
    return NextResponse.json({ error: "The code server had a problem. Try again in a minute." }, { status: 500 });
  }
}

function answer(result: RedeemResult) {
  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}
