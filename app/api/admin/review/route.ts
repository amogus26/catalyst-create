import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { getStore, type SubmissionStatus } from "@/lib/store";

const ALLOWED: SubmissionStatus[] = ["approved", "rejected", "pending"];

/**
 * The approval itself - the one route in this site that can make something public.
 *
 * It checks the admin session on every call. The admin page already hides its buttons from
 * visitors, but hiding a button is not a gate: without this check anyone could post here directly
 * and approve their own upload.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { id?: unknown; status?: unknown };
  try {
    body = (await request.json()) as { id?: unknown; status?: unknown };
  } catch {
    return NextResponse.json({ error: "That request could not be read." }, { status: 400 });
  }

  const { id, status } = body;
  if (typeof id !== "string" || id.length === 0) {
    return NextResponse.json({ error: "Which submission?" }, { status: 400 });
  }
  if (typeof status !== "string" || !ALLOWED.includes(status as SubmissionStatus)) {
    return NextResponse.json({ error: "That is not a status." }, { status: 400 });
  }

  try {
    const updated = await getStore().setStatus(id, status as SubmissionStatus);
    if (!updated) {
      return NextResponse.json({ error: "There is no submission with that id." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id: updated.id, status: updated.status });
  } catch (error) {
    console.error("[catalyst-create] review failed:", error);
    return NextResponse.json({ error: "That could not be saved." }, { status: 500 });
  }
}
