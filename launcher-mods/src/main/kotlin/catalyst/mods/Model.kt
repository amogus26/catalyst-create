package catalyst.mods

import java.time.Instant

/** Where a mod comes from. The launcher talks to Modrinth directly and to CurseForge through our backend. */
enum class Platform(val id: String, val label: String) {
    MODRINTH("modrinth", "Modrinth"),
    CURSEFORGE("curseforge", "CurseForge");

    companion object {
        fun fromId(id: String): Platform? = entries.firstOrNull { it.id == id }
    }
}

/**
 * The mod loaders the browser supports. Anything else an API reports (liteloader, rift, bukkit...) is
 * dropped while mapping, so a version that only lists unknown loaders is treated as compatible with
 * none of ours rather than guessed at.
 */
enum class Loader(val id: String, val label: String) {
    FABRIC("fabric", "Fabric"),
    FORGE("forge", "Forge"),
    NEOFORGE("neoforge", "NeoForge"),
    QUILT("quilt", "Quilt");

    companion object {
        fun fromId(id: String): Loader? = entries.firstOrNull { it.id == id.lowercase() }
    }
}

enum class SortBy { RELEVANCE, POPULARITY, DOWNLOADS, NEWEST, UPDATED }

enum class Channel { RELEASE, BETA, ALPHA }

/** A project on one platform. Ids are the platform's own, never slugs (slugs can change). */
data class ProjectRef(val platform: Platform, val projectId: String) {
    val key: String get() = "${platform.id}:$projectId"

    companion object {
        fun parse(key: String): ProjectRef? {
            val (p, id) = key.split(':', limit = 2).takeIf { it.size == 2 } ?: return null
            return Platform.fromId(p)?.let { ProjectRef(it, id) }
        }
    }
}

/**
 * One filter for both platforms. Categories are named differently on each side, so a unified category
 * carries each platform's own identifier and a platform without one is simply not filtered by it.
 */
data class SearchQuery(
    val text: String = "",
    val platforms: Set<Platform> = Platform.entries.toSet(),
    val gameVersion: String? = null,
    val loader: Loader? = null,
    val category: Category? = null,
    val sort: SortBy = SortBy.RELEVANCE,
    val offset: Int = 0,
    val limit: Int = 20,
)

data class Category(val label: String, val modrinth: String? = null, val curseForge: Int? = null)

/** A search hit: everything a result card shows, nothing more. */
data class ModSummary(
    val ref: ProjectRef,
    val slug: String?,
    val name: String,
    val author: String?,
    val description: String,
    val iconUrl: String?,
    /** Null when the platform does not publish a count. */
    val downloads: Long?,
    val gameVersions: List<String>,
    val loaders: Set<Loader>,
    val categories: List<String>,
    val updated: Instant?,
)

data class SearchPage(val hits: List<ModSummary>, val total: Int, val offset: Int)

data class ModDetails(
    val summary: ModSummary,
    /** Long description as plain text or Markdown. Never rendered as HTML by the launcher. */
    val body: String?,
    val authors: List<String>,
    val gallery: List<String>,
    val pageUrl: String,
    val sourceUrl: String?,
    val issuesUrl: String?,
    /**
     * False when the author has opted out of third-party downloads (CurseForge `allowModDistribution`).
     * The launcher must then send the player to the project page instead of downloading.
     */
    val allowsLauncherDownload: Boolean,
)

data class ModFile(
    val fileName: String,
    /** Null when the platform will not hand this file to a third-party launcher. */
    val url: String?,
    val size: Long,
    val sha512: String?,
    val sha1: String?,
    val primary: Boolean,
)

enum class DependencyKind { REQUIRED, OPTIONAL, INCOMPATIBLE, EMBEDDED }

data class Dependency(
    val projectId: String?,
    val versionId: String?,
    val kind: DependencyKind,
    /** Only set for dependencies that are not a project on the platform (external files). */
    val fileName: String? = null,
)

data class ModVersion(
    val ref: ProjectRef,
    val versionId: String,
    val name: String,
    val versionNumber: String,
    val channel: Channel,
    val gameVersions: List<String>,
    val loaders: Set<Loader>,
    val published: Instant,
    val files: List<ModFile>,
    val dependencies: List<Dependency>,
    /** False when the file may not be downloaded by a launcher (see [ModDetails.allowsLauncherDownload]). */
    val downloadable: Boolean = true,
) {
    /** The file to install: the one marked primary, else the first jar, as Modrinth documents. */
    val primaryFile: ModFile?
        get() = files.firstOrNull { it.primary && it.fileName.endsWith(".jar", ignoreCase = true) }
            ?: files.firstOrNull { it.fileName.endsWith(".jar", ignoreCase = true) }
}
