import { error, toResponse } from "@/lib/curseforge";

/**
 * Where the launcher will download CurseForge files from - switched off on purpose.
 *
 * Since July 2026 CurseForge's CDN (edge.forgecdn.net) needs the API key on every download, so the
 * launcher cannot fetch files itself without shipping our key, and it must not. The remaining way is
 * for this server to fetch the file with the key and pass the bytes on. Whether CurseForge's terms
 * allow a relay like that is not something to guess: ask CurseForge when applying for the key, and
 * only if they confirm it in writing, replace this with a route that fetches
 * `/v1/mods/{modId}/files/{fileId}` for the download URL, streams it with the key, and never stores it.
 * Mods whose authors opt out of third-party distribution must stay excluded either way.
 *
 * Until then the launcher shows "Downloading from CurseForge is not switched on yet" and links to the
 * project page.
 */
export async function GET() {
  return toResponse(
    error(501, "downloads_not_enabled", "Downloading from CurseForge through the launcher is not switched on yet."),
  );
}
