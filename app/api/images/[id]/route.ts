import { isAdmin } from "@/lib/admin-session";
import { getStore } from "@/lib/store";

/**
 * The only way an uploaded image leaves this server.
 *
 * The bucket it comes from is private, so there is no URL anywhere that serves these files
 * directly - every request comes through here, and here the row's status is checked first. A
 * pending or rejected design is a 404 to everyone except a signed-in reviewer, and a 404 rather
 * than a 403 so that the response does not confirm the id exists.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();

  const submission = await store.getSubmission(id);
  if (!submission) {
    return new Response("Not found", { status: 404 });
  }

  const reviewer = submission.status === "approved" ? false : await isAdmin();
  if (submission.status !== "approved" && !reviewer) {
    return new Response("Not found", { status: 404 });
  }

  const image = await store.readImage(id);
  if (!image) {
    return new Response("Not found", { status: 404 });
  }

  // Copied into a buffer of its own: a driver may hand back a view onto a larger or shared one,
  // which is not something a response body may borrow.
  const body = new Uint8Array(image.bytes.byteLength);
  body.set(image.bytes);

  return new Response(body, {
    headers: {
      "content-type": image.contentType,
      "content-length": String(body.byteLength),
      // Approved images may be held briefly by the visitor's own browser, and by nothing else: a
      // shared cache must not go on serving something after it is taken down. A reviewer's view of
      // a pending design is never stored at all.
      "cache-control": reviewer ? "no-store" : "private, max-age=60",
      "content-disposition": "inline",
      "x-content-type-options": "nosniff",
    },
  });
}
