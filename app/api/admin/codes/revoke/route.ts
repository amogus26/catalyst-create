import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { fingerprint, looksLikeCode } from "@/lib/codes";
import { getStore } from "@/lib/store";

/**
 * Cancels codes: a whole batch (`{batchId}`) or one code typed in (`{code}`). Reviewers only. A
 * cancelled code answers "revoked" from then on, including to anyone who has it but hasn't used it.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { batchId?: unknown; code?: unknown };
  try {
    body = (await request.json()) as { batchId?: unknown; code?: unknown };
  } catch {
    return NextResponse.json({ error: "That request could not be read." }, { status: 400 });
  }

  try {
    if (typeof body.batchId === "string" && body.batchId.length > 0) {
      const cancelled = await getStore().revokeBatch(body.batchId);
      return NextResponse.json({ ok: true, cancelled });
    }
    if (typeof body.code === "string" && looksLikeCode(body.code)) {
      const found = await getStore().revokeCode(fingerprint(body.code));
      if (!found) return NextResponse.json({ error: "There is no such code." }, { status: 404 });
      return NextResponse.json({ ok: true, cancelled: 1 });
    }
  } catch (error) {
    console.error("[catalyst-create] cancelling codes failed:", error);
    return NextResponse.json({ error: "That could not be saved." }, { status: 500 });
  }
  return NextResponse.json({ error: "Which code or batch?" }, { status: 400 });
}
