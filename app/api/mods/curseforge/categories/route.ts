import { allowRequest, categories, serverDeps, toResponse } from "@/lib/curseforge";

/** CurseForge's Minecraft mod categories, for the launcher's category filter. */
export async function GET(request: Request) {
  const limited = allowRequest(request);
  if (limited) return toResponse(limited);
  return toResponse(await categories(serverDeps()));
}
