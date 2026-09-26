import { allowRequest, search, serverDeps, toResponse } from "@/lib/curseforge";

/** The launcher's CurseForge search. See lib/curseforge.ts for the whole relay and why it exists. */
export async function GET(request: Request) {
  const limited = allowRequest(request);
  if (limited) return toResponse(limited);
  return toResponse(await search(new URL(request.url).searchParams, serverDeps()));
}
