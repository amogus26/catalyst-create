import { allowRequest, mod, serverDeps, toResponse } from "@/lib/curseforge";

/** One CurseForge mod's details. */
export async function GET(request: Request, { params }: { params: Promise<{ modId: string }> }) {
  const limited = allowRequest(request);
  if (limited) return toResponse(limited);
  const { modId } = await params;
  return toResponse(await mod(modId, serverDeps()));
}
