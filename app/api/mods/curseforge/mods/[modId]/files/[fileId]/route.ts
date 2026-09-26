import { allowRequest, file, serverDeps, toResponse } from "@/lib/curseforge";

/** One CurseForge file - what the launcher's dependency resolver asks for. */
export async function GET(request: Request, { params }: { params: Promise<{ modId: string; fileId: string }> }) {
  const limited = allowRequest(request);
  if (limited) return toResponse(limited);
  const { modId, fileId } = await params;
  return toResponse(await file(modId, fileId, serverDeps()));
}
