import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { cookieOptions, currentVoterId, newVoterCookie } from "@/lib/voter";

/**
 * One vote, from one browser, on one approved design.
 *
 * The voter id is a cookie minted here on the first vote. The store refuses a second vote from the
 * same id on the same design, and refuses any vote on something that is not approved - so a vote
 * cannot be used to find out whether a pending design exists, and cannot be cast on one.
 */
export async function POST(request: Request) {
  let id: unknown;
  try {
    ({ id } = (await request.json()) as { id?: unknown });
  } catch {
    return NextResponse.json({ error: "That request could not be read." }, { status: 400 });
  }
  if (typeof id !== "string" || id.length === 0) {
    return NextResponse.json({ error: "Which design?" }, { status: 400 });
  }

  const existing = await currentVoterId();
  const minted = existing ? null : newVoterCookie();
  const voterId = existing ?? minted!.value;

  try {
    const result = await getStore().castVote(id, voterId);
    if (!result) {
      return NextResponse.json({ error: "That design is not open for votes." }, { status: 404 });
    }

    const response = NextResponse.json(
      { counted: result.counted, voteCount: result.voteCount },
      // Already voted is not an error worth a red message, but it is not a fresh vote either.
      { status: result.counted ? 200 : 409 },
    );
    if (minted) {
      response.cookies.set(minted.name, minted.value, { ...cookieOptions, maxAge: minted.maxAge });
    }
    return response;
  } catch (error) {
    console.error("[catalyst-create] vote failed:", error);
    return NextResponse.json({ error: "That vote could not be recorded." }, { status: 500 });
  }
}
