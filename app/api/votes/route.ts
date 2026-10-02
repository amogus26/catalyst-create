import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { cookieOptions, currentVoterId, newVoterCookie, VOTED_HINT } from "@/lib/voter";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Which of `?ids=a,b,c` this browser has voted on: `{voted: [...]}`. The designs page is cached and the
 * same for everyone, so it asks this after it shows (components/designs/voted.tsx).
 */
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "").split(",").filter((id) => UUID.test(id)).slice(0, 300);
  const voterId = await currentVoterId();
  if (!voterId || ids.length === 0) return answerVoted([]);
  try {
    return answerVoted([...(await getStore().votedIds(voterId, ids))]);
  } catch (error) {
    console.error("[catalyst-create] reading votes failed:", error);
    return answerVoted([]);
  }
}

function answerVoted(voted: string[]) {
  return NextResponse.json({ voted }, { headers: { "cache-control": "private, no-store" } });
}

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

    // The cached designs page shows vote counts: build it again with this one in.
    if (result.counted) revalidatePath("/designs");

    const response = NextResponse.json(
      { counted: result.counted, voteCount: result.voteCount },
      // Already voted is not an error worth a red message, but it is not a fresh vote either.
      { status: result.counted ? 200 : 409 },
    );
    if (minted) {
      response.cookies.set(minted.name, minted.value, { ...cookieOptions, maxAge: minted.maxAge });
    }
    // Readable by the page (the voter id isn't): it tells the designs page there are votes to look up.
    response.cookies.set(VOTED_HINT, "1", { ...cookieOptions, httpOnly: false, maxAge: 365 * 24 * 60 * 60 });
    return response;
  } catch (error) {
    console.error("[catalyst-create] vote failed:", error);
    return NextResponse.json({ error: "That vote could not be recorded." }, { status: 500 });
  }
}
