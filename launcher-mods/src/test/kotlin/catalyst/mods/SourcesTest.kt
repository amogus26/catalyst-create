package catalyst.mods

import catalyst.mods.net.Response
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.net.URI
import java.net.URLDecoder
import java.nio.file.Path
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

private const val HIT = """{"project_id":"AANobbMI","project_type":"mod","slug":"sodium","title":"Sodium","description":"Fast",
  "author":"jellysquid3","categories":["fabric","optimization"],"display_categories":["fabric","optimization"],
  "versions":["1.21","1.21.1"],"downloads":55000000,"follows":1,"icon_url":"https://cdn.modrinth.com/data/AANobbMI/icon.png",
  "date_modified":"2026-09-01T00:00:00Z"}"""

class ModrinthSourceTest {
    private val transport = FakeTransport()
    private val ticker = FakeTicker()

    private fun modrinth(dir: Path) = testManager(dir, transport, ticker).sources.getValue(Platform.MODRINTH)

    private fun decodedQuery(): String = URLDecoder.decode(transport.requests.last().uri.rawQuery, Charsets.UTF_8)

    @Test
    fun `search sends name, version, loader, category and sort as documented facets`(@TempDir dir: Path) {
        transport.json("GET", "/v2/search", """{"hits":[$HIT],"offset":0,"limit":20,"total_hits":1}""")
        val page = modrinth(dir).search(
            SearchQuery("sodium", gameVersion = "1.21.1", loader = Loader.FABRIC, category = Category("Optimization", modrinth = "optimization"), sort = SortBy.DOWNLOADS),
        )
        val q = decodedQuery()
        assertTrue("query=sodium" in q, q)
        assertTrue("""facets=[["project_type:mod"],["versions:1.21.1"],["categories:fabric"],["categories:optimization"]]""" in q, q)
        assertTrue("index=downloads" in q, q)
        val hit = page.hits.single()
        assertEquals("Sodium", hit.name)
        assertEquals("jellysquid3", hit.author)
        assertEquals(setOf(Loader.FABRIC), hit.loaders)
        assertEquals(listOf("optimization"), hit.categories, "loaders are not shown as categories")
        assertEquals(55_000_000, hit.downloads)
    }

    @Test
    fun `a quilt filter also finds fabric mods`(@TempDir dir: Path) {
        transport.json("GET", "/v2/search", """{"hits":[],"offset":0,"limit":20,"total_hits":0}""")
        modrinth(dir).search(SearchQuery(loader = Loader.QUILT))
        assertTrue("""["categories:quilt","categories:fabric"]""" in decodedQuery())
    }

    @Test
    fun `sort options map to modrinth indexes`(@TempDir dir: Path) {
        transport.json("GET", "/v2/search", """{"hits":[],"offset":0,"limit":20,"total_hits":0}""")
        val source = modrinth(dir)
        val expected = mapOf(SortBy.RELEVANCE to "relevance", SortBy.POPULARITY to "follows", SortBy.NEWEST to "newest", SortBy.UPDATED to "updated")
        for ((sort, index) in expected) {
            source.search(SearchQuery("x$index", sort = sort))
            assertTrue("index=$index" in decodedQuery())
        }
    }

    @Test
    fun `malformed hits are skipped and hostile icon urls dropped`(@TempDir dir: Path) {
        val bad = """{"project_id":"../../etc","title":"Evil"}"""
        val noTitle = """{"project_id":"BBBBBBBB"}"""
        val evilIcon = HIT.replace("https://cdn.modrinth.com/data/AANobbMI/icon.png", "http://evil.example/track.png")
        transport.json("GET", "/v2/search", """{"hits":[$bad,$noTitle,$evilIcon],"offset":0,"limit":20,"total_hits":3}""")
        val hits = modrinth(dir).search(SearchQuery("x")).hits
        assertEquals(1, hits.size)
        assertNull(hits.single().iconUrl)
    }

    @Test
    fun `invalid json is reported, not crashed on`(@TempDir dir: Path) {
        transport.json("GET", "/v2/search", "<html>502 Bad Gateway</html>")
        assertFailsWith<BadResponseException> { modrinth(dir).search(SearchQuery("x")) }
        transport.json("GET", "/v2/search", """{"hits":"nope"}""")
        assertFailsWith<BadResponseException> { modrinth(dir).search(SearchQuery("y")) }
    }

    @Test
    fun `project details include author, loaders and versions`(@TempDir dir: Path) {
        val world = FakeModrinth(transport)
        world.project("AANobbMI", "Sodium")
        val d = modrinth(dir).project("AANobbMI")
        assertEquals("SodiumDev", d.summary.author)
        assertEquals(listOf("SodiumDev"), d.authors)
        assertEquals(listOf("1.21.1"), d.summary.gameVersions)
        assertEquals("https://modrinth.com/mod/sodium", d.pageUrl)
        assertTrue(d.allowsLauncherDownload)
    }

    @Test
    fun `versions carry loaders, game versions, hashes and dependencies`(@TempDir dir: Path) {
        val world = FakeModrinth(transport)
        world.project("AANobbMI", "Sodium")
        world.version("AANobbMI", "V0000001", "0.6.0", deps = "[${req("P7dR8mSH")},${opt("YL57xq9U")},${incompatible("GGGGGGGG")}]")
        val v = modrinth(dir).versions("AANobbMI", "1.21.1", listOf(Loader.FABRIC)).single()
        assertEquals(setOf(Loader.FABRIC), v.loaders)
        assertEquals(listOf("1.21.1"), v.gameVersions)
        assertEquals(128, v.primaryFile!!.sha512!!.length)
        assertEquals(listOf(DependencyKind.REQUIRED, DependencyKind.OPTIONAL, DependencyKind.INCOMPATIBLE), v.dependencies.map { it.kind })
        val q = decodedQuery()
        assertTrue("""loaders=["fabric"]""" in q && """game_versions=["1.21.1"]""" in q && "include_changelog=false" in q, q)
    }

    @Test
    fun `a version pretending to belong to another project is rejected`(@TempDir dir: Path) {
        val world = FakeModrinth(transport)
        world.version("CCCCCCCC", "V0000009", "1.0")
        assertFailsWith<BadResponseException> { modrinth(dir).version("AANobbMI", "V0000009") }
    }

    @Test
    fun `404 and 410 become readable errors`(@TempDir dir: Path) {
        assertFailsWith<NotFoundException> { modrinth(dir).project("ZZZZZZZZ") }
        transport.json("GET", "/v2/project/AANobbMI", """{"error":"gone"}""", status = 410)
        assertFailsWith<ApiRetiredException> { modrinth(dir).project("AANobbMI") }
    }

    @Test
    fun `answers are cached until they expire`(@TempDir dir: Path) {
        transport.json("GET", "/v2/search", """{"hits":[$HIT],"offset":0,"limit":20,"total_hits":1}""")
        val source = modrinth(dir)
        source.search(SearchQuery("sodium"))
        source.search(SearchQuery("sodium"))
        assertEquals(1, transport.count("/v2/search"))
        ticker.now += 6 * 60_000
        source.search(SearchQuery("sodium"))
        assertEquals(2, transport.count("/v2/search"), "search results refresh after five minutes")
    }

    @Test
    fun `network failures are retried, then served from an expired copy when offline`(@TempDir dir: Path) {
        var fail = false
        transport.on("GET", "/v2/search") {
            if (fail) throw NetworkException("offline")
            Response(200, emptyMap(), """{"hits":[$HIT],"offset":0,"limit":20,"total_hits":1}""".toByteArray())
        }
        val source = modrinth(dir)
        source.search(SearchQuery("sodium"))
        fail = true
        ticker.now += 6 * 60_000
        assertEquals("Sodium", source.search(SearchQuery("sodium")).hits.single().name)
        assertEquals(4, transport.count("/v2/search"), "one success, then three attempts while offline")
        assertFailsWith<NetworkException> { source.search(SearchQuery("never seen")) }
    }

    @Test
    fun `a 429 with a long wait is reported with the wait`(@TempDir dir: Path) {
        transport.json("GET", "/v2/search", "{}", status = 429, headers = mapOf("Retry-After" to "42"))
        val e = assertFailsWith<RateLimitedException> { modrinth(dir).search(SearchQuery("x")) }
        assertEquals(42, e.retryAfterSeconds)
    }

    @Test
    fun `a 429 with a short wait is waited out and retried once`(@TempDir dir: Path) {
        var calls = 0
        transport.on("GET", "/v2/search") {
            if (calls++ == 0) Response(429, mapOf("Retry-After" to listOf("2")), "{}".toByteArray())
            else Response(200, emptyMap(), """{"hits":[],"offset":0,"limit":20,"total_hits":0}""".toByteArray())
        }
        modrinth(dir).search(SearchQuery("x"))
        assertEquals(2, calls)
        assertTrue(ticker.sleeps.any { it >= 2_000 })
    }

    @Test
    fun `an exhausted X-Ratelimit window stops further requests until it resets`(@TempDir dir: Path) {
        transport.json(
            "GET", "/v2/search", """{"hits":[],"offset":0,"limit":20,"total_hits":0}""",
            headers = mapOf("X-Ratelimit-Limit" to "300", "X-Ratelimit-Remaining" to "0", "X-Ratelimit-Reset" to "30"),
        )
        val source = modrinth(dir)
        source.search(SearchQuery("a"))
        val sent = transport.requests.size
        assertFailsWith<RateLimitedException> { source.search(SearchQuery("b")) }
        assertEquals(sent, transport.requests.size, "nothing is sent while the window is exhausted")
    }

    @Test
    fun `our own budget keeps under the published limit`(@TempDir dir: Path) {
        transport.on("GET", "/v2/search") { Response(200, emptyMap(), """{"hits":[],"offset":0,"limit":20,"total_hits":0}""".toByteArray()) }
        val source = modrinth(dir)
        repeat(250) { source.search(SearchQuery("q$it")) }
        assertFailsWith<RateLimitedException> { source.search(SearchQuery("one too many")) }
    }

    @Test
    fun `update check posts sha1 hashes with the instance's loader and version`(@TempDir dir: Path) {
        val world = FakeModrinth(transport)
        val newer = world.version("AANobbMI", "V0000002", "0.6.5")
        transport.json("POST", "/v2/version_files/update", """{"${"a".repeat(40)}":${world.versionJson("V0000002")}}""")
        val result = modrinth(dir).latestFor(mapOf("a".repeat(40) to "AANobbMI"), instance(dir))
        assertEquals("V0000002", result.getValue("a".repeat(40)).versionId)
        val body = transport.requests.last().body!!.toString(Charsets.UTF_8)
        assertTrue(""""algorithm":"sha1"""" in body && """"loaders":["fabric"]""" in body && """"game_versions":["1.21.1"]""" in body, body)
        assertTrue(newer.isNotEmpty())
    }

    @Test
    fun `a manager without a proper user agent is refused`(@TempDir dir: Path) {
        assertFailsWith<IllegalArgumentException> {
            ModManager(ModManagerConfig(" ", null, null), FakeInstances(dir), FakeTicker(), transport)
        }
    }
}

class CurseForgeSourceTest {
    private val transport = FakeTransport()

    private fun cf(dir: Path) = testManager(dir, transport).sources.getValue(Platform.CURSEFORGE)

    private val mod = """{"id":394468,"slug":"sodium","name":"Sodium","summary":"Fast","authors":["jellysquid3"],
        "iconUrl":"https://media.forgecdn.net/avatars/1/icon.png","downloads":1000,"gameVersions":["1.21.1"],
        "loaders":["fabric"],"categories":["Performance"],"dateModified":"2026-09-01T00:00:00Z","allowDistribution":true}"""

    @Test
    fun `before the backend has a key, curseforge says so instead of failing oddly`(@TempDir dir: Path) {
        transport.json("GET", "/api/mods/curseforge/search", """{"error":"not_configured","message":"CurseForge is not switched on yet."}""", status = 503)
        val e = assertFailsWith<SourceUnavailableException> { cf(dir).search(SearchQuery("sodium")) }
        assertEquals("CurseForge is not switched on yet.", e.message)
        assertEquals(1, transport.count("/api/mods/curseforge/search"), "not-configured is not retried")
    }

    @Test
    fun `search goes to our backend with the filters, never to curseforge directly`(@TempDir dir: Path) {
        transport.json("GET", "/api/mods/curseforge/search", """{"hits":[$mod],"total":1,"index":0}""")
        val hit = cf(dir).search(SearchQuery("sodium", gameVersion = "1.21.1", loader = Loader.FABRIC, category = Category("Performance", curseForge = 423), sort = SortBy.UPDATED)).hits.single()
        val uri = transport.requests.single().uri
        assertEquals("backend.test", uri.host)
        val q = URLDecoder.decode(uri.rawQuery, Charsets.UTF_8)
        assertTrue("q=sodium" in q && "gameVersion=1.21.1" in q && "loader=fabric" in q && "categoryId=423" in q && "sort=updated" in q, q)
        assertFalse(transport.requests.any { r -> r.headers.keys.any { it.equals("x-api-key", true) } }, "the client never sends a key")
        assertEquals(ProjectRef(Platform.CURSEFORGE, "394468"), hit.ref)
        assertEquals("https://www.curseforge.com/minecraft/mc-mods/sodium", cf(dir).pageUrl("sodium"))
    }

    @Test
    fun `files map to versions, and downloads go through the backend`(@TempDir dir: Path) {
        transport.json("GET", "/api/mods/curseforge/mods/394468", """{"mod":$mod}""")
        transport.json(
            "GET", "/api/mods/curseforge/mods/394468/files",
            """{"files":[{"id":5555,"modId":394468,"displayName":"Sodium 0.6.0","fileName":"sodium-0.6.0.jar","releaseType":"release",
                "gameVersions":["1.21.1"],"loaders":["fabric"],"date":"2026-08-01T00:00:00Z","size":100,"sha1":"${"b".repeat(40)}",
                "dependencies":[{"modId":306612,"type":"required"}],"downloadable":true}]}""",
        )
        val source = cf(dir)
        val v = source.versions("394468", "1.21.1", listOf(Loader.FABRIC)).single()
        assertEquals("5555", v.versionId)
        assertEquals("306612", v.dependencies.single().projectId)
        assertEquals("b".repeat(40), v.primaryFile!!.sha1)
        assertEquals(URI("https://backend.test/api/mods/curseforge/mods/394468/files/5555/download"), source.download(v, v.primaryFile!!).uri)
    }

    @Test
    fun `mods whose authors opted out of third-party downloads are never downloaded`(@TempDir dir: Path) {
        transport.json("GET", "/api/mods/curseforge/mods/394468", """{"mod":${mod.replace("\"allowDistribution\":true", "\"allowDistribution\":false")}}""")
        transport.json(
            "GET", "/api/mods/curseforge/mods/394468/files",
            """{"files":[{"id":5555,"modId":394468,"fileName":"sodium.jar","releaseType":"release","gameVersions":["1.21.1"],
                "loaders":["fabric"],"date":"2026-08-01T00:00:00Z","size":100,"sha1":"${"b".repeat(40)}","dependencies":[],"downloadable":true}]}""",
        )
        val source = cf(dir)
        val v = source.versions("394468").single()
        assertFalse(v.downloadable)
        assertFailsWith<SourceUnavailableException> { source.download(v, v.primaryFile!!) }
    }
}
