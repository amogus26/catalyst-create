package catalyst.mods

import catalyst.mods.instance.Instance
import catalyst.mods.instance.InstanceProvider
import catalyst.mods.net.DownloadStatusException
import catalyst.mods.net.Downloaded
import catalyst.mods.net.Request
import catalyst.mods.net.Response
import catalyst.mods.net.Ticker
import catalyst.mods.net.Transport
import catalyst.mods.net.UrlPolicy
import catalyst.mods.net.streamToFile
import catalyst.mods.net.toHex
import java.io.ByteArrayOutputStream
import java.net.URI
import java.nio.file.Files
import java.nio.file.Path
import java.security.MessageDigest
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class FakeTicker(var now: Long = 1_000_000L) : Ticker {
    val sleeps = mutableListOf<Long>()
    override fun nowMillis() = now
    override fun sleep(millis: Long) {
        sleeps += millis
        now += millis
    }
}

/**
 * Serves canned responses by path, records every request, and applies the same [UrlPolicy] the real
 * transport does - so tests exercise the policy too.
 */
class FakeTransport(private val policy: UrlPolicy = UrlPolicy(UrlPolicy.MODRINTH + UrlPolicy.CURSEFORGE_MEDIA + "backend.test")) : Transport {
    val requests = mutableListOf<Request>()
    val downloads = mutableListOf<URI>()
    private val routes = mutableListOf<Pair<(Request) -> Boolean, (Request) -> Response>>()
    private val files = mutableMapOf<String, () -> ByteArray>()

    /** Later routes win over earlier ones for the same path. */
    fun on(method: String, path: String, respond: (Request) -> Response) {
        routes.add(0, { r: Request -> r.method == method && r.uri.rawPath == path } to respond)
    }

    fun json(method: String, path: String, body: String, status: Int = 200, headers: Map<String, String> = emptyMap()) =
        on(method, path) { Response(status, headers.mapValues { listOf(it.value) }, body.toByteArray()) }

    fun count(path: String) = requests.count { it.uri.rawPath == path }

    fun file(url: String, bytes: ByteArray) {
        files[url] = { bytes }
    }

    fun fileFails(url: String, error: () -> Nothing) {
        files[url] = error
    }

    override fun send(request: Request, maxBytes: Long): Response {
        policy.check(request.uri)
        requests += request
        val route = routes.firstOrNull { it.first(request) } ?: return Response(404, emptyMap(), "{}".toByteArray())
        return route.second(request)
    }

    override fun download(uri: URI, headers: Map<String, String>, target: Path, maxBytes: Long): Downloaded {
        policy.check(uri)
        downloads += uri
        val bytes = files[uri.toString()]?.invoke() ?: throw DownloadStatusException(404, null)
        return streamToFile(bytes.inputStream(), target, maxBytes)
    }
}

object Jars {
    fun build(vararg entries: Pair<String, String>): ByteArray {
        val out = ByteArrayOutputStream()
        ZipOutputStream(out).use { zip ->
            for ((name, content) in entries) {
                zip.putNextEntry(ZipEntry(name))
                zip.write(content.toByteArray())
                zip.closeEntry()
            }
        }
        return out.toByteArray()
    }

    fun fabric(id: String) = build("fabric.mod.json" to """{"schemaVersion":1,"id":"$id","version":"1.0.0"}""", "$id/Mod.class" to "cafebabe")
    fun forge(id: String) = build("META-INF/mods.toml" to "modLoader=\"javafml\"\n[[mods]]\nmodId=\"$id\"", "$id/Mod.class" to "cafebabe")
}

fun sha1(b: ByteArray) = MessageDigest.getInstance("SHA-1").digest(b).toHex()
fun sha512(b: ByteArray) = MessageDigest.getInstance("SHA-512").digest(b).toHex()

class FakeInstances(private val root: Path) : InstanceProvider {
    val created = mutableListOf<Instance>()
    override fun list() = created.toList()
    override fun get(id: String) = created.firstOrNull { it.id == id }
    override fun create(name: String, gameVersion: String, loader: Loader) =
        Instance("i${created.size}", name, gameVersion, loader, "latest", root.resolve("i${created.size}")).also { created += it }
}

fun instance(root: Path, gameVersion: String = "1.21.1", loader: Loader? = Loader.FABRIC, name: String = "$gameVersion ${loader?.label ?: "Vanilla"} PvP") =
    Instance("test", name, gameVersion, loader, "0.16.0", root.resolve("instance").also { Files.createDirectories(it) })

/** A Modrinth-shaped world: projects, versions and files, served from a [FakeTransport]. */
class FakeModrinth(val transport: FakeTransport) {
    private val versionsByProject = mutableMapOf<String, MutableList<String>>()
    private val versionJson = mutableMapOf<String, String>()
    val jarBytes = mutableMapOf<String, ByteArray>()

    fun project(id: String, title: String, slug: String = title.lowercase(), loaders: List<String> = listOf("fabric"), versions: List<String> = listOf("1.21.1")) {
        transport.json(
            "GET", "/v2/project/$id",
            """{"id":"$id","slug":"$slug","title":"$title","description":"$title does things","body":"# $title","project_type":"mod",
               "downloads":1234567,"icon_url":"https://cdn.modrinth.com/data/$id/icon.png","game_versions":${versions.js()},
               "loaders":${loaders.js()},"categories":["optimization"],"updated":"2026-09-01T00:00:00Z","gallery":[]}""",
        )
        transport.json("GET", "/v2/project/$id/members", """[{"user":{"username":"${title}Dev"},"role":"Owner","ordering":0}]""")
        transport.on("GET", "/v2/project/$id/version") {
            Response(200, emptyMap(), ("[" + versionsByProject[id].orEmpty().map { versionJson.getValue(it) }.joinToString(",") + "]").toByteArray())
        }
    }

    fun version(
        projectId: String,
        versionId: String,
        number: String,
        gameVersions: List<String> = listOf("1.21.1"),
        loaders: List<String> = listOf("fabric"),
        deps: String = "[]",
        type: String = "release",
        published: String = "2026-08-01T00:00:00Z",
        jar: ByteArray = Jars.fabric(projectId.lowercase()),
        fileName: String = "$projectId-$number.jar",
        sha512Override: String? = null,
        sizeOverride: Long? = null,
    ): ByteArray {
        val url = "https://cdn.modrinth.com/data/$projectId/versions/$versionId/${java.net.URLEncoder.encode(fileName, Charsets.UTF_8)}"
        val json = """{"id":"$versionId","project_id":"$projectId","author_id":"AAAAAAAA","name":"$number","version_number":"$number",
            "version_type":"$type","game_versions":${gameVersions.js()},"loaders":${loaders.js()},"featured":false,"status":"listed",
            "date_published":"$published","downloads":10,"dependencies":$deps,"environment":"client_and_server",
            "files":[{"hashes":{"sha1":"${sha1(jar)}","sha512":"${sha512Override ?: sha512(jar)}"},"url":"$url",
            "filename":${kotlinx.serialization.json.JsonPrimitive(fileName)},"primary":true,"size":${sizeOverride ?: jar.size}}]}"""
        versionJson[versionId] = json
        versionsByProject.getOrPut(projectId) { mutableListOf() }.add(0, versionId)
        transport.json("GET", "/v2/version/$versionId", json)
        transport.file(url, jar)
        jarBytes[versionId] = jar
        return jar
    }

    fun versionJson(versionId: String) = versionJson.getValue(versionId)

    private fun List<String>.js() = joinToString(",", "[", "]") { "\"$it\"" }
}

fun req(id: String) = """{"project_id":"$id","dependency_type":"required"}"""
fun opt(id: String) = """{"project_id":"$id","dependency_type":"optional"}"""
fun incompatible(id: String) = """{"project_id":"$id","dependency_type":"incompatible"}"""

/** A ModManager wired to fakes. */
fun testManager(root: Path, transport: FakeTransport, ticker: FakeTicker = FakeTicker(), backend: Boolean = true) = ModManager(
    ModManagerConfig("catalyst/launcher-mods-test/0.1.0 (test@example.com)", if (backend) URI("https://backend.test/api/mods/curseforge") else null, null),
    FakeInstances(root),
    ticker,
    transport,
)
