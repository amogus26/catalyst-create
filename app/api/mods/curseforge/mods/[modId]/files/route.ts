import { allowRequest, files, serverDeps, toResponse } from "@/lib/curseforge";

/** A CurseForge mod's files, optionally narrowed to a Minecraft version and loader. */
export async function GET(request: Request, { params }: { params: Promise<{ modId: string }> }) {
  const limited = allowRequest(request);
  if (limited) return toResponse(limited);
  const { modId } = await params;
  return toResponse(await files(modId, new URL(request.url).searchParams, serverDeps()));
}
