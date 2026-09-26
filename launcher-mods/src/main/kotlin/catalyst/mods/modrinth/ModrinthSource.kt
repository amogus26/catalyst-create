package catalyst.mods.modrinth

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
import catalyst.mods.NotFoundException
import catalyst.mods.Platform
import catalyst.mods.ProjectRef
import catalyst.mods.SearchPage
import catalyst.mods.SearchQuery
import catalyst.mods.SortBy
import catalyst.mods.UnsafeUrlException
import catalyst.mods.cache.TtlCache
import catalyst.mods.compat.CompatibilityChecker
import catalyst.mods.instance.Instance
import catalyst.mods.net.ApiClient
import catalyst.mods.net.Untrusted
import catalyst.mods.net.UrlPolicy
import catalyst.mods.net.hexOrNull
import catalyst.mods.net.instantOrNull
import catalyst.mods.net.long
import catalyst.mods.net.longOrNull
import catalyst.mods.net.boolOrNull
import catalyst.mods.net.objects
import catalyst.mods.net.str
import catalyst.mods.net.strOrNull
import catalyst.mods.net.strings
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.time.Instant

/**
 * Modrinth, through its public v2 API (https://docs.modrinth.com/api/). Reading public projects needs no
 * token, so the launcher holds none; every request carries the launcher's own User-Agent, which Modrinth
 * requires. Files download straight from Modrinth's CDN and are verified against the sha512 the API gives.
 */
class ModrinthSource(
    private val api: ApiClient,
    private val urls: UrlPolicy,
) : ModSource {
    override val platform = Platform.MODRINTH

    override fun search(query: SearchQuery): SearchPage {
        val facets = buildList {
            add(listOf("project_type:mod"))
            query.gameVersion?.let { add(listOf("versions:$it")) }
            query.loader?.let { l -> add(CompatibilityChecker.queryLoaders(l).map { "categories:${it.id}" }) }
            query.category?.modrinth?.let { add(listOf("categories:$it")) }
        }
        val params = buildList {
            if (query.text.isNotBlank()) add("query" to query.text.trim().take(100))
            add("facets" to JsonArray(facets.map { group -> JsonArray(group.map(::JsonPrimitive)) }).toString())
            add("index" to when (query.sort) {
                SortBy.RELEVANCE -> "relevance"
                SortBy.POPULARITY -> "follows"
                SortBy.DOWNLOADS -> "downloads"
                SortBy.NEWEST -> "newest"
                SortBy.UPDATED -> "updated"
            })
            add("offset" to query.offset.coerceIn(0, 10_000).toString())
            add("limit" to query.limit.coerceIn(1, 100).toString())
        }
        val root = Untrusted.obj(api.get("/v2/search", params, TtlCache.SEARCH, "Search"), "search")
        val hits = root.objects("hits").mapNotNull { hit -> runCatching { summary(hit) }.getOrNull() }
        return SearchPage(hits, root.longOrNull("total_hits")?.toInt() ?: hits.size, root.longOrNull("offset")?.toInt() ?: query.offset)
    }

    override fun project(projectId: String): ModDetails {
        val id = checkId(projectId)
        val p = Untrusted.obj(api.get("/v2/project/$id", ttl = TtlCache.PROJECT, what = "That mod"), "project")
        val realId = apiId(p.str("id"))
        val members = runCatching {
            Untrusted.arr(api.get("/v2/project/$realId/members", ttl = TtlCache.PROJECT, what = "The mod's authors"), "members")
                .map { Untrusted.obj(it, "member") }
                .sortedBy { it.longOrNull("ordering") ?: Long.MAX_VALUE }
                .mapNotNull { m -> (m["user"] as? JsonObject)?.strOrNull("username") }
        }.getOrDefault(emptyList())
        val slug = p.strOrNull("slug")
        val summary = ModSummary(
            ref = ProjectRef(platform, realId),
            slug = slug,
            name = p.str("title"),
            author = members.firstOrNull(),
            description = p.strOrNull("description", Untrusted.MAX_TEXT) ?: "",
            iconUrl = p.strOrNull("icon_url", 2048)?.takeIf(urls::allows),
            downloads = p.longOrNull("downloads")?.coerceAtLeast(0),
            gameVersions = p.strings("game_versions"),
            loaders = loaders(p.strings("loaders")),
            categories = p.strings("categories"),
            updated = p.instantOrNull("updated"),
        )
        return ModDetails(
            summary = summary,
            body = p.strOrNull("body", Untrusted.MAX_BODY),
            authors = members,
            gallery = p.objects("gallery").mapNotNull { it.strOrNull("url", 2048)?.takeIf(urls::allows) }.take(20),
            pageUrl = pageUrl(slug ?: realId),
            sourceUrl = p.strOrNull("source_url", 2048)?.takeIf { it.startsWith("https://") },
            issuesUrl = p.strOrNull("issues_url", 2048)?.takeIf { it.startsWith("https://") },
            allowsLauncherDownload = true,
        )
    }

    override fun versions(projectId: String, gameVersion: String?, loaders: List<Loader>): List<ModVersion> {
        val id = checkId(projectId)
        val params = buildList {
            if (loaders.isNotEmpty()) add("loaders" to JsonArray(loaders.map { JsonPrimitive(it.id) }).toString())
            gameVersion?.let { add("game_versions" to JsonArray(listOf(JsonPrimitive(it))).toString()) }
            add("include_changelog" to "false")
        }
        val list = Untrusted.arr(api.get("/v2/project/$id/version", params, TtlCache.VERSIONS, "That mod's versions"), "versions")
        return list.mapNotNull { runCatching { version(Untrusted.obj(it, "version")) }.getOrNull() }
            .filter { !ID.matches(projectId) || it.ref.projectId == projectId }
            .sortedByDescending { it.published }
    }

    override fun version(projectId: String, versionId: String): ModVersion {
        val v = version(Untrusted.obj(api.get("/v2/version/${apiId(versionId)}", ttl = TtlCache.VERSIONS, what = "That mod version"), "version"))
        if (v.ref.projectId != projectId && ID.matches(projectId)) {
            throw BadResponseException("version $versionId does not belong to project $projectId")
        }
        return v
    }

    override fun categories(): List<Category> =
        Untrusted.arr(api.get("/v2/tag/category", ttl = TtlCache.TAGS, what = "Categories"), "categories")
            .map { Untrusted.obj(it, "category") }
            .filter { it.strOrNull("project_type") == "mod" }
            .map { c -> c.str("name").let { Category(it.replaceFirstChar(Char::uppercase), modrinth = it) } }

    override fun latestFor(installed: Map<String, String>, instance: Instance): Map<String, ModVersion> {
        val loader = instance.loader ?: return emptyMap()
        val sha1s = installed.keys.mapNotNull { hexOrNull(it, 40) }
        if (sha1s.isEmpty()) return emptyMap()
        val body = buildJsonObject {
            put("hashes", JsonArray(sha1s.map(::JsonPrimitive)))
            put("algorithm", "sha1")
            put("loaders", JsonArray(CompatibilityChecker.queryLoaders(loader).map { JsonPrimitive(it.id) }))
            put("game_versions", JsonArray(listOf(JsonPrimitive(instance.gameVersion))))
            // Offer stable releases as updates; betas are picked by hand from the version list.
            put("version_types", JsonArray(listOf(JsonPrimitive("release"))))
        }
        val map = Untrusted.obj(api.post("/v2/version_files/update", body, TtlCache.NONE, "Updates"), "updates")
        return map.mapNotNull { (hash, v) ->
            val h = hexOrNull(hash, 40) ?: return@mapNotNull null
            if (h !in sha1s) return@mapNotNull null
            runCatching { h to version(Untrusted.obj(v, "version")) }.getOrNull()
        }.toMap()
    }

    override fun download(version: ModVersion, file: ModFile): DownloadSpec {
        val url = file.url ?: throw UnsafeUrlException("Modrinth gave no download address for ${file.fileName}.")
        return DownloadSpec(urls.check(url))
    }

    override fun pageUrl(projectIdOrSlug: String) =
        "https://modrinth.com/mod/" + java.net.URLEncoder.encode(projectIdOrSlug, Charsets.UTF_8)

    private fun summary(hit: JsonObject) = ModSummary(
        ref = ProjectRef(platform, apiId(hit.str("project_id"))),
        slug = hit.strOrNull("slug"),
        name = hit.str("title"),
        author = hit.strOrNull("author"),
        description = hit.strOrNull("description", Untrusted.MAX_TEXT) ?: "",
        iconUrl = hit.strOrNull("icon_url", 2048)?.takeIf(urls::allows),
        downloads = hit.longOrNull("downloads")?.coerceAtLeast(0),
        gameVersions = hit.strings("versions"),
        // Search lumps loaders in with categories.
        loaders = loaders(hit.strings("categories") + hit.strings("display_categories")),
        categories = (hit.strings("display_categories").ifEmpty { hit.strings("categories") })
            .filter { Loader.fromId(it) == null },
        updated = hit.instantOrNull("date_modified"),
    )

    private fun version(v: JsonObject): ModVersion {
        val status = v.strOrNull("status")
        if (status == "draft" || status == "scheduled") throw NotFoundException("That mod version")
        val projectId = apiId(v.str("project_id"))
        return ModVersion(
            ref = ProjectRef(platform, projectId),
            versionId = apiId(v.str("id")),
            name = v.str("name"),
            versionNumber = v.str("version_number"),
            channel = when (v.strOrNull("version_type")) {
                "beta" -> Channel.BETA
                "alpha" -> Channel.ALPHA
                else -> Channel.RELEASE
            },
            gameVersions = v.strings("game_versions"),
            loaders = loaders(v.strings("loaders")),
            published = v.instantOrNull("date_published") ?: Instant.EPOCH,
            files = v.objects("files").mapNotNull { f ->
                val hashes = f["hashes"] as? JsonObject ?: return@mapNotNull null
                ModFile(
                    fileName = f.str("filename"),
                    url = f.strOrNull("url", 2048),
                    size = f.long("size").also { if (it <= 0) throw BadResponseException("file size $it") },
                    sha512 = hexOrNull(hashes.strOrNull("sha512"), 128),
                    sha1 = hexOrNull(hashes.strOrNull("sha1"), 40),
                    primary = f.boolOrNull("primary") ?: false,
                )
            },
            dependencies = v.objects("dependencies").mapNotNull { d ->
                val kind = when (d.strOrNull("dependency_type")) {
                    "required" -> DependencyKind.REQUIRED
                    "optional" -> DependencyKind.OPTIONAL
                    "incompatible" -> DependencyKind.INCOMPATIBLE
                    "embedded" -> DependencyKind.EMBEDDED
                    else -> return@mapNotNull null
                }
                Dependency(
                    projectId = d.strOrNull("project_id")?.takeIf { ID.matches(it) },
                    versionId = d.strOrNull("version_id")?.takeIf { ID.matches(it) },
                    kind = kind,
                    fileName = d.strOrNull("file_name"),
                ).takeIf { it.projectId != null || it.versionId != null || it.fileName != null }
            },
        )
    }

    private fun loaders(ids: List<String>) = ids.mapNotNull(Loader::fromId).toSet()

    /**
     * Project and version ids go into URL paths, so they must look like ids: Modrinth's are base62. A
     * player-typed slug is also accepted (and URL-encoded) for opening a project by name.
     */
    private fun checkId(id: String): String = when {
        ID.matches(id) -> id
        SLUG.matches(id) -> java.net.URLEncoder.encode(id, Charsets.UTF_8)
        else -> throw NotFoundException("The Modrinth project \"${id.take(40)}\"")
    }

    /** Ids that came back from the API: must be real base62 ids, never anything path-like. */
    private fun apiId(id: String): String =
        if (ID.matches(id)) id else throw BadResponseException("\"${id.take(40)}\" is not a Modrinth id")

    private companion object {
        val ID = Regex("^[A-Za-z0-9]{8}$")
        val SLUG = Regex("^[a-zA-Z0-9!@\$()`.+,_\"-]{3,64}$")
    }
}
