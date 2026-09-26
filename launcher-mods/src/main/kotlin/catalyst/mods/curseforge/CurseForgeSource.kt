package catalyst.mods.curseforge

import catalyst.mods.BadResponseException
import catalyst.mods.Category
import catalyst.mods.Channel
import catalyst.mods.Dependency
import catalyst.mods.DependencyKind
import catalyst.mods.DownloadSpec
import catalyst.mods.Loader
import catalyst.mods.ModDetails
import catalyst.mods.ModFile
import catalyst.mods.ModSource
import catalyst.mods.ModSummary
import catalyst.mods.ModVersion
import catalyst.mods.ModsException
import catalyst.mods.NotFoundException
import catalyst.mods.Platform
import catalyst.mods.ProjectRef
import catalyst.mods.SearchPage
import catalyst.mods.SearchQuery
import catalyst.mods.SortBy
import catalyst.mods.SourceUnavailableException
import catalyst.mods.cache.TtlCache
import catalyst.mods.compat.CompatibilityChecker
import catalyst.mods.instance.Instance
import catalyst.mods.net.ApiClient
import catalyst.mods.net.Response
import catalyst.mods.net.Untrusted
import catalyst.mods.net.UrlPolicy
import catalyst.mods.net.boolOrNull
import catalyst.mods.net.hexOrNull
import catalyst.mods.net.instantOrNull
import catalyst.mods.net.long
import catalyst.mods.net.longOrNull
import catalyst.mods.net.objects
import catalyst.mods.net.str
import catalyst.mods.net.strOrNull
import catalyst.mods.net.strings
import kotlinx.serialization.json.JsonObject
import java.net.URI
import java.time.Instant

/**
 * CurseForge, through **our backend** - never directly.
 *
 * The CurseForge API needs a private key on every request, and since July 2026 so do file downloads from
 * its CDN. A key inside a desktop app is a key anybody can extract, so the launcher holds none: it calls
 * `catalyst-create`'s `/api/mods/curseforge/...` routes, which add the key server-side and answer with a
 * small, already-validated shape (documented in `lib/curseforge.ts` on the site). This class still
 * treats those answers as untrusted: the backend relays a third party.
 *
 * Until the backend has a key, every call fails with [SourceUnavailableException] and the browser shows
 * Modrinth results with a one-line note that CurseForge is not available yet.
 */
class CurseForgeSource(
    private val api: ApiClient,
    private val backendBase: URI,
    private val urls: UrlPolicy,
) : ModSource {
    override val platform = Platform.CURSEFORGE

    override fun search(query: SearchQuery): SearchPage {
        val params = buildList {
            if (query.text.isNotBlank()) add("q" to query.text.trim().take(100))
            query.gameVersion?.let { add("gameVersion" to it) }
            query.loader?.let { add("loader" to it.id) }
            query.category?.curseForge?.let { add("categoryId" to it.toString()) }
            add("sort" to query.sort.name.lowercase())
            add("index" to query.offset.coerceIn(0, 9_950).toString())
            add("pageSize" to query.limit.coerceIn(1, 50).toString())
        }
        val root = Untrusted.obj(api.get("/search", params, TtlCache.SEARCH, "Search"), "search")
        val hits = root.objects("hits").mapNotNull { runCatching { summary(it) }.getOrNull() }
        return SearchPage(hits, root.longOrNull("total")?.toInt() ?: hits.size, root.longOrNull("index")?.toInt() ?: query.offset)
    }

    override fun project(projectId: String): ModDetails {
        val id = checkId(projectId)
        val m = Untrusted.obj(Untrusted.obj(api.get("/mods/$id", ttl = TtlCache.PROJECT, what = "That mod"), "mod")["mod"], "mod")
        val s = summary(m)
        return ModDetails(
            summary = s,
            body = null,
            authors = m.strings("authors"),
            gallery = m.strings("screenshots", 2048).filter(urls::allows).take(20),
            pageUrl = pageUrl(s.slug ?: id),
            sourceUrl = m.strOrNull("sourceUrl", 2048)?.takeIf { it.startsWith("https://") },
            issuesUrl = m.strOrNull("issuesUrl", 2048)?.takeIf { it.startsWith("https://") },
            allowsLauncherDownload = m.boolOrNull("allowDistribution") ?: false,
        )
    }

    override fun versions(projectId: String, gameVersion: String?, loaders: List<Loader>): List<ModVersion> {
        val id = checkId(projectId)
        val distributable = project(id).allowsLauncherDownload
        // CurseForge filters by one loader per request; Quilt profiles ask for Quilt and Fabric.
        val asks = loaders.ifEmpty { listOf(null) }
        return asks.flatMap { loader ->
            val params = buildList {
                gameVersion?.let { add("gameVersion" to it) }
                loader?.let { add("loader" to it.id) }
            }
            val root = Untrusted.obj(api.get("/mods/$id/files", params, TtlCache.VERSIONS, "That mod's files"), "files")
            root.objects("files").mapNotNull { runCatching { file(it, distributable) }.getOrNull() }
        }.filter { it.ref.projectId == id }.distinctBy { it.versionId }.sortedByDescending { it.published }
    }

    override fun version(projectId: String, versionId: String): ModVersion {
        val id = checkId(projectId)
        val root = Untrusted.obj(api.get("/mods/$id/files/${checkId(versionId)}", ttl = TtlCache.VERSIONS, what = "That mod file"), "file")
        val v = file(Untrusted.obj(root["file"], "file"), project(id).allowsLauncherDownload)
        if (v.ref.projectId != id) throw BadResponseException("file $versionId does not belong to mod $projectId")
        return v
    }

    override fun categories(): List<Category> =
        Untrusted.obj(api.get("/categories", ttl = TtlCache.TAGS, what = "Categories"), "categories")
            .objects("categories")
            .mapNotNull { c -> runCatching { Category(c.str("name"), curseForge = c.long("id").toInt()) }.getOrNull() }

    override fun latestFor(installed: Map<String, String>, instance: Instance): Map<String, ModVersion> {
        val loader = instance.loader ?: return emptyMap()
        val loaders = CompatibilityChecker.queryLoaders(loader)
        return installed.mapNotNull { (sha1, projectId) ->
            val newest = runCatching { versions(projectId, instance.gameVersion, loaders) }.getOrNull()
                ?.firstOrNull { it.channel == Channel.RELEASE && instance.gameVersion in it.gameVersions }
                ?: return@mapNotNull null
            sha1 to newest
        }.toMap()
    }

    override fun download(version: ModVersion, file: ModFile): DownloadSpec {
        if (!version.downloadable) {
            throw SourceUnavailableException(
                platform,
                "The author only allows this mod to be downloaded from the CurseForge website.",
            )
        }
        val base = backendBase.toString().trimEnd('/')
        return DownloadSpec(urls.check("$base/mods/${checkId(version.ref.projectId)}/files/${checkId(version.versionId)}/download"))
    }

    override fun pageUrl(projectIdOrSlug: String) =
        "https://www.curseforge.com/minecraft/mc-mods/" + java.net.URLEncoder.encode(projectIdOrSlug, Charsets.UTF_8)

    private fun summary(m: JsonObject): ModSummary = ModSummary(
        ref = ProjectRef(platform, checkId(m.long("id").toString())),
        slug = m.strOrNull("slug")?.takeIf { SLUG.matches(it) },
        name = m.str("name"),
        author = m.strings("authors").firstOrNull(),
        description = m.strOrNull("summary", Untrusted.MAX_TEXT) ?: "",
        iconUrl = m.strOrNull("iconUrl", 2048)?.takeIf(urls::allows),
        downloads = m.longOrNull("downloads")?.coerceAtLeast(0),
        gameVersions = m.strings("gameVersions"),
        loaders = m.strings("loaders").mapNotNull(Loader::fromId).toSet(),
        categories = m.strings("categories"),
        updated = m.instantOrNull("dateModified"),
    )

    private fun file(f: JsonObject, distributable: Boolean): ModVersion {
        val size = f.long("size")
        if (size <= 0) throw BadResponseException("file size $size")
        val fileName = f.str("fileName")
        return ModVersion(
            ref = ProjectRef(platform, checkId(f.long("modId").toString())),
            versionId = checkId(f.long("id").toString()),
            name = f.strOrNull("displayName") ?: fileName,
            versionNumber = f.strOrNull("displayName") ?: fileName,
            channel = when (f.strOrNull("releaseType")) {
                "beta" -> Channel.BETA
                "alpha" -> Channel.ALPHA
                else -> Channel.RELEASE
            },
            gameVersions = f.strings("gameVersions"),
            loaders = f.strings("loaders").mapNotNull(Loader::fromId).toSet(),
            published = f.instantOrNull("date") ?: Instant.EPOCH,
            // CurseForge publishes sha1 (and md5); sha1 is what gets verified.
            files = listOf(ModFile(fileName, url = null, size = size, sha512 = null, sha1 = hexOrNull(f.strOrNull("sha1"), 40), primary = true)),
            dependencies = f.objects("dependencies").mapNotNull { d ->
                val kind = when (d.strOrNull("type")) {
                    "required" -> DependencyKind.REQUIRED
                    "optional" -> DependencyKind.OPTIONAL
                    "incompatible" -> DependencyKind.INCOMPATIBLE
                    "embedded" -> DependencyKind.EMBEDDED
                    else -> return@mapNotNull null
                }
                Dependency(projectId = checkId(d.long("modId").toString()), versionId = null, kind = kind)
            },
            downloadable = distributable && (f.boolOrNull("downloadable") ?: false),
        )
    }

    private fun checkId(id: String): String =
        if (ID.matches(id)) id else throw NotFoundException("The CurseForge project \"${id.take(40)}\"")

    companion object {
        private val ID = Regex("^[0-9]{1,10}$")
        private val SLUG = Regex("^[a-z0-9-]{1,100}$")

        /** How our backend reports that CurseForge is switched off or down. */
        fun backendError(response: Response): ModsException? {
            val code = runCatching { Untrusted.obj(Untrusted.parse(response.body), "error").strOrNull("error") }.getOrNull()
            val message = runCatching { Untrusted.obj(Untrusted.parse(response.body), "error").strOrNull("message", 300) }.getOrNull()
            return when {
                code == "not_configured" -> SourceUnavailableException(
                    Platform.CURSEFORGE,
                    message ?: "CurseForge browsing is not switched on yet. Modrinth results are shown instead.",
                )
                code == "upstream_unavailable" || response.status == 502 -> SourceUnavailableException(
                    Platform.CURSEFORGE,
                    "CurseForge is not answering right now. Try again in a few minutes.",
                )
                response.status == 401 || response.status == 403 -> SourceUnavailableException(
                    Platform.CURSEFORGE,
                    "CurseForge is not available right now.",
                )
                else -> null
            }
        }
    }
}
