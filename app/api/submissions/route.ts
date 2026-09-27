import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { DEFAULT_DESIGN_TYPE, isDesignTypeId } from "@/lib/design-types";
import { MAX_IMAGE_BYTES, validateDisplayName, validateImage } from "@/lib/validation";
import { screenDesign, serverDeps, withinBudget } from "@/lib/claude";

/**
 * Takes a submission, has Claude screen it, and puts it in the queue. It cannot do anything else: the store's
 * `createSubmission` has no status to pass, so what this route creates is always pending.
 *
 * Everything the browser checked is checked again here. The form's validation is a courtesy to
 * whoever is using it; this is the check that counts, because a POST can be made without ever
 * loading the form.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "That request could not be read." }, { status: 400 });
  }

  const name = validateDisplayName(String(form.get("displayName") ?? ""));
  if (!name.ok) {
    return NextResponse.json({ error: name.message }, { status: 400 });
  }

  // The kind of cosmetic decides which size rule applies - only capes have one. An unknown value
  // is refused rather than quietly treated as a cape, which would reject a wings design for
  // breaking a rule that was never meant to apply to it.
  const rawType = form.get("designType");
  const typeId = rawType === null ? DEFAULT_DESIGN_TYPE : rawType;
  if (!isDesignTypeId(typeId)) {
    return NextResponse.json({ error: "That is not a kind of design." }, { status: 400 });
  }

  const image = form.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Pick a PNG to submit." }, { status: 400 });
  }
  // Checked before the bytes are read, so an oversized file is refused rather than held in memory.
  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "That file is too large. Images must be under 1 MB." },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  const checked = validateImage(image.name, bytes.byteLength, bytes, typeId);
  if (!checked.ok) {
    return NextResponse.json({ error: checked.message }, { status: 400 });
  }

  // Claude looks at it before it is stored (lib/claude.ts). A design it refuses is never saved; one it
  // passes - or one it could not look at - still waits for a person on /admin like every other.
  if (!withinBudget(request, 6)) {
    return NextResponse.json({ error: "Too many designs at once. Try again in a minute." }, { status: 429 });
  }
  const screening = await screenDesign(bytes, name.value, serverDeps());
  if (screening.verdict === "block") {
    return NextResponse.json(
      { error: `This design can't be accepted: ${screening.reason}. Designs must be safe for everyone - no sexual content, hate symbols, violence, or real places, addresses or coordinates.` },
      { status: 422 },
    );
  }
  if (screening.verdict === "unavailable") {
    console.warn("[catalyst-create] design not screened by Claude - a reviewer will see it unscreened");
  }

  try {
    const submission = await getStore().createSubmission({
      displayName: name.value,
      designType: typeId,
      bytes,
      // Not the browser's word for it: the bytes have been read as a PNG above.
      contentType: "image/png",
    });
    return NextResponse.json(
      { ok: true, id: submission.id, status: submission.status, designType: submission.designType },
      { status: 201 },
    );
  } catch (error) {
    console.error("[catalyst-create] submission failed:", error);
    return NextResponse.json(
      { error: "That could not be saved. Try again in a moment." },
      { status: 500 },
    );
  }
}
