import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { getStore } from "@/lib/store";

/**
 * Ticks a design into the current voting round, or out of it.
 *
 * Featuring is curation, not publication: it cannot make anything visible, because every query for
 * a round also requires `approved`. Even so, this refuses to feature something unreviewed - a tick
 * that does nothing is a trap for whoever clicks it next. Un-featuring is always allowed, so there
 * is no state a design can get stuck in.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { id?: unknown; featured?: unknown };
  try {
    body = (await request.json()) as { id?: unknown; featured?: unknown };
  } catch {
    return NextResponse.json({ error: "That request could not be read." }, { status: 400 });
  }

  const { id, featured } = body;
  if (typeof id !== "string" || id.length === 0) {
    return NextResponse.json({ error: "Which submission?" }, { status: 400 });
  }
  if (typeof featured !== "boolean") {
    return NextResponse.json({ error: "Featured must be true or false." }, { status: 400 });
  }

  try {
    const store = getStore();
    if (featured) {
      const submission = await store.getSubmission(id);
      if (!submission) {
        return NextResponse.json({ error: "There is no submission with that id." }, { status: 404 });
      }
      if (submission.status !== "approved") {
        return NextResponse.json(
          { error: "Only approved designs can go in a round. Approve it first." },
          { status: 400 },
        );
      }
    }

    const updated = await store.setFeatured(id, featured);
    if (!updated) {
      return NextResponse.json({ error: "There is no submission with that id." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id: updated.id, featured: updated.featured });
  } catch (error) {
    console.error("[catalyst-create] featuring failed:", error);
    return NextResponse.json({ error: "That could not be saved." }, { status: 500 });
  }
}
