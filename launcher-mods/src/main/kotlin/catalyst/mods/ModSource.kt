package catalyst.mods

import catalyst.mods.instance.Instance
import java.net.URI

/** How to fetch one file: where, and any headers the request must carry. */
data class DownloadSpec(val uri: URI, val headers: Map<String, String> = emptyMap())

/**
 * One mod platform, as the rest of the launcher sees it. Modrinth and CurseForge each implement this, so
 * search, dependency resolution, installing and updating never branch on the platform.
 */
interface ModSource {
    val platform: Platform

    fun search(query: SearchQuery): SearchPage

    fun project(projectId: String): ModDetails

    /** Versions of a project, newest first, optionally narrowed to what an instance can run. */
    fun versions(projectId: String, gameVersion: String? = null, loaders: List<Loader> = emptyList()): List<ModVersion>

    fun version(projectId: String, versionId: String): ModVersion

    fun categories(): List<Category>

    /**
     * The newest compatible release for each installed file. [installed] maps each file's sha1 to its
     * project id; the answer is keyed by the same sha1.
     */
    fun latestFor(installed: Map<String, String>, instance: Instance): Map<String, ModVersion>

    /** Where to download [file] from. Throws if this platform cannot hand the file to the launcher. */
    fun download(version: ModVersion, file: ModFile): DownloadSpec

    /** The public web page for a project, for "Open on Modrinth/CurseForge". */
    fun pageUrl(projectIdOrSlug: String): String
}
