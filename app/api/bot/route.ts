import { answerQuestion, serverDeps, withinBudget, type Turn } from "@/lib/claude";

/**
 * The launcher's Catalyst Bot asks here: `{ question, history? }` in, `{ answer }` out. Claude answers
 * questions about Catalyst and Minecraft only (lib/claude.ts). 503 when there is no key or Claude can't
 * be reached - the launcher then answers from its own list.
 */
export async function POST(request: Request) {
  if (!withinBudget(request, 12)) {
    return Response.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": "60" } });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const { question, history } = (body ?? {}) as { question?: unknown; history?: unknown };
  if (typeof question !== "string" || !question.trim() || question.length > 400) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const turns: Turn[] = Array.isArray(history)
    ? history
        .filter((t): t is Turn => !!t && typeof t.question === "string" && typeof t.answer === "string")
        .slice(-4)
    : [];
  const answer = await answerQuestion(question.trim(), turns, serverDeps());
  if (!answer) return Response.json({ error: "unavailable" }, { status: 503 });
  return Response.json({ answer }, { headers: { "cache-control": "no-store" } });
}
