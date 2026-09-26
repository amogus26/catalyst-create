package catalyst.mods.instance

import catalyst.mods.Loader
import catalyst.mods.Platform
import catalyst.mods.ProjectRef
import catalyst.mods.net.Untrusted
import catalyst.mods.net.boolOrNull
import catalyst.mods.net.long
import catalyst.mods.net.objects
import catalyst.mods.net.str
import catalyst.mods.net.strOrNull
import catalyst.mods.net.strings
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption

/**
 * A Minecraft instance (profile) the launcher manages. The launcher owns where instances live and how they
 * are created; the mod manager is handed one of these and only ever writes inside [gameDir].
 *
 * [loader] is null for a vanilla profile - mods cannot be installed there, and the UI offers to create
 * a profile with the loader the mod needs instead.
 */
data class Instance(
    val id: String,
    val name: String,
    val gameVersion: String,
    val loader: Loader?,
    val loaderVersion: String?,
    val gameDir: Path,
) {
    val modsDir: Path get() = gameDir.resolve("mods")

    /** The mod manager's own folder: its record of installed mods, staging and backups. */
    val stateDir: Path get() = gameDir.resolve(".catalyst")
}

/** Implemented by the launcher: its list of profiles, and making a new one when the UI asks. */
interface InstanceProvider {
    fun list(): List<Instance>
    fun get(id: String): Instance?
    fun create(name: String, gameVersion: String, loader: Loader): Instance
}

/** One mod the launcher installed into an instance. */
data class InstalledMod(
    val ref: ProjectRef,
    val name: String,
    val versionId: String,
    val versionNumber: String,
    val fileName: String,
    val size: Long,
    val sha1: String?,
    val sha512: String?,
    /** True when the player chose it; false when it came in as a dependency. */
    val explicit: Boolean,
    /** Projects (by [ProjectRef.key]) that required this one when they were installed. */
    val requiredBy: Set<String>,
    /** Projects this version declared incompatible, kept so later installs can be checked against it. */
    val incompatibleWith: Set<String> = emptySet(),
    val installedAt: Long,
)

/**
 * `.catalyst/mods.json` inside an instance: which files in `mods/` the launcher put there, and why.
 *
 * Files the player added by hand are not in it and are never touched. The record is rewritten atomically
 * (write a temp file, then rename over), so a crash mid-save leaves the previous record intact.
 */
class InstalledMods(private val instance: Instance) {
    private val file: Path get() = instance.stateDir.resolve("mods.json")

    fun load(): List<InstalledMod> {
        if (!Files.isRegularFile(file)) return emptyList()
        val root = runCatching { Untrusted.obj(Untrusted.parse(Files.readAllBytes(file)), "mods.json") }.getOrNull()
            ?: return emptyList()
        return root.objects("mods").mapNotNull { o ->
            runCatching {
                InstalledMod(
                    ref = ProjectRef(Platform.fromId(o.str("platform")) ?: return@mapNotNull null, o.str("projectId")),
                    name = o.str("name"),
                    versionId = o.str("versionId"),
                    versionNumber = o.str("versionNumber"),
                    fileName = o.str("fileName"),
                    size = o.long("size"),
                    sha1 = o.strOrNull("sha1"),
                    sha512 = o.strOrNull("sha512"),
                    explicit = o.boolOrNull("explicit") ?: true,
                    requiredBy = o.strings("requiredBy").toSet(),
                    incompatibleWith = o.strings("incompatibleWith").toSet(),
                    installedAt = o.long("installedAt"),
                )
            }.getOrNull()
        }
    }

    fun save(mods: List<InstalledMod>) {
        Files.createDirectories(instance.stateDir)
        val json = buildJsonObject {
            put("format", 1)
            put("mods", JsonArray(mods.sortedBy { it.name.lowercase() }.map { m ->
                buildJsonObject {
                    put("platform", m.ref.platform.id)
                    put("projectId", m.ref.projectId)
                    put("name", m.name)
                    put("versionId", m.versionId)
                    put("versionNumber", m.versionNumber)
                    put("fileName", m.fileName)
                    put("size", m.size)
                    m.sha1?.let { put("sha1", it) }
                    m.sha512?.let { put("sha512", it) }
                    put("explicit", m.explicit)
                    put("requiredBy", JsonArray(m.requiredBy.sorted().map(::JsonPrimitive)))
                    put("incompatibleWith", JsonArray(m.incompatibleWith.sorted().map(::JsonPrimitive)))
                    put("installedAt", m.installedAt)
                }
            }))
        }
        val tmp = Files.createTempFile(instance.stateDir, "mods", ".tmp")
        try {
            Files.writeString(tmp, json.toString())
            Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
        } finally {
            Files.deleteIfExists(tmp)
        }
    }
}
