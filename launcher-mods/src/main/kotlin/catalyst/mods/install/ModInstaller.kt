package catalyst.mods.install

import catalyst.mods.DependencyKind
import catalyst.mods.InstallException
import catalyst.mods.IntegrityException
import catalyst.mods.ModSource
import catalyst.mods.ModsException
import catalyst.mods.NetworkException
import catalyst.mods.NotFoundException
import catalyst.mods.Platform
import catalyst.mods.ProjectRef
import catalyst.mods.RateLimitedException
import catalyst.mods.SourceUnavailableException
import catalyst.mods.compat.Compatibility
import catalyst.mods.compat.CompatibilityChecker
import catalyst.mods.instance.InstalledMod
import catalyst.mods.instance.InstalledMods
import catalyst.mods.instance.Instance
import catalyst.mods.net.DownloadStatusException
import catalyst.mods.net.Ticker
import catalyst.mods.net.Transport
import catalyst.mods.resolve.InstallPlan
import catalyst.mods.resolve.PlannedMod
import catalyst.mods.security.JarInspector
import catalyst.mods.security.SafePaths
import java.nio.file.FileSystems
import java.nio.file.Files
import java.nio.file.LinkOption
import java.nio.file.Path
import java.nio.file.attribute.PosixFilePermissions
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

data class InstallProgress(val index: Int, val total: Int, val name: String, val stage: Stage) {
    enum class Stage { DOWNLOADING, VERIFYING, INSTALLING, DONE }
}

data class InstallResult(val installed: List<InstalledMod>, val warnings: List<String>)

data class UninstallResult(val removed: List<String>)

/**
 * Puts mod files into an instance, takes them out again, and swaps versions - all or nothing.
 *
 * Every file is downloaded into the instance's own staging folder (same disk, so the final step is a
 * rename), checked for exact size and hash, and opened as a zip to confirm it is a real jar for the right
 * loader. Only when every file of a plan has passed are they moved into `mods/`. If anything fails at any
 * point, the files already moved are taken back out and a replaced version is put back, so the instance
 * is exactly as it was. The launcher never runs, loads or unpacks what it downloads.
 */
class ModInstaller(
    private val sources: Map<Platform, ModSource>,
    private val transport: Transport,
    private val ticker: Ticker = Ticker.System,
    private val maxFileBytes: Long = 256L * 1024 * 1024,
) {
    fun install(plan: InstallPlan, progress: (InstallProgress) -> Unit = {}): InstallResult = locked(plan.instance) {
        if (!plan.canInstall) throw InstallException(plan.blockers.firstOrNull()?.message ?: "Nothing to install.")
        val instance = plan.instance
        val record = InstalledMods(instance)
        val installed = record.load()

        // The plan was built earlier and from API data; check it again against the instance as it is now.
        for (m in plan.mods) {
            val c = CompatibilityChecker.check(instance, m.version, m.name)
            if (c is Compatibility.Incompatible) throw InstallException("Cannot install ${m.name}: ${c.reason}")
            if (m.version.ref != plan.replacing?.ref && installed.any { it.ref == m.version.ref }) {
                throw InstallException("${m.name} is already installed.")
            }
        }
        Files.createDirectories(instance.modsDir)
        if (Files.isSymbolicLink(instance.modsDir)) throw InstallException("The instance's mods folder is a link; refusing to install through it.")
        val targets = plan.mods.map { SafePaths.childOf(instance.modsDir, it.file.fileName) }
        if (targets.toSet().size != targets.size) throw InstallException("Two of these mods use the same file name.")
        val replacedPath = plan.replacing?.let { SafePaths.childOf(instance.modsDir, it.fileName) }
        targets.forEachIndexed { i, target ->
            if (Files.exists(target, LinkOption.NOFOLLOW_LINKS) && target != replacedPath) {
                throw InstallException("A file named ${plan.mods[i].file.fileName} is already in the mods folder.")
            }
        }

        val staging = newPrivateDir(instance.stateDir.resolve("staging"))
        try {
            val staged = plan.mods.mapIndexed { i, m ->
                progress(InstallProgress(i + 1, plan.mods.size, m.name, InstallProgress.Stage.DOWNLOADING))
                fetchAndVerify(instance, m, staging.resolve("$i.part")) { stage ->
                    progress(InstallProgress(i + 1, plan.mods.size, m.name, stage))
                }
            }
            commit(instance, plan, staged, targets, replacedPath, installed, record)
            plan.mods.forEachIndexed { i, m -> progress(InstallProgress(i + 1, plan.mods.size, m.name, InstallProgress.Stage.DONE)) }
            InstallResult(record.load().filter { r -> plan.mods.any { it.version.ref == r.ref } }, plan.warnings.map { it.message })
        } finally {
            deleteTree(staging)
        }
    }

    /** An update is an install plan that replaces one installed mod; the old file comes back if it fails. */
    fun update(plan: InstallPlan, progress: (InstallProgress) -> Unit = {}): InstallResult {
        requireNotNull(plan.replacing) { "not an update plan" }
        return install(plan, progress)
    }

    /**
     * Removes a mod the launcher installed. Refuses if another installed mod needs it (unless [force]), and
     * with [removeOrphans] also removes dependencies nothing else needs any more. Files the player added by
     * hand are never touched: only files named in the launcher's record are deleted.
     */
    fun uninstall(instance: Instance, ref: ProjectRef, removeOrphans: Boolean = true, force: Boolean = false): UninstallResult =
        locked(instance) {
            val record = InstalledMods(instance)
            val all = record.load()
            val target = all.firstOrNull { it.ref == ref } ?: throw InstallException("That mod was not installed by the launcher.")
            val present = all.map { it.ref.key }.toSet()
            val neededBy = target.requiredBy.filter { it in present && it != ref.key }
            if (neededBy.isNotEmpty() && !force) {
                val names = all.filter { it.ref.key in neededBy }.joinToString(", ") { it.name }
                throw InstallException("${target.name} is needed by $names. Remove those first.")
            }

            val remove = mutableListOf(target)
            if (removeOrphans) {
                var changed = true
                while (changed) {
                    changed = false
                    val gone = remove.map { it.ref.key }.toSet()
                    for (m in all) {
                        if (m in remove || m.explicit || m.requiredBy.isEmpty()) continue
                        if (m.requiredBy.all { it in gone || it !in present }) {
                            remove += m
                            changed = true
                        }
                    }
                }
            }
            val gone = remove.map { it.ref.key }.toSet()
            for (m in remove) {
                val path = SafePaths.childOf(instance.modsDir, m.fileName)
                if (Files.isSymbolicLink(path)) throw InstallException("Refusing to delete a link in the mods folder.")
                Files.deleteIfExists(path)
            }
            record.save(all.filter { it.ref.key !in gone }.map { it.copy(requiredBy = it.requiredBy - gone) })
            UninstallResult(remove.map { it.name })
        }

    private class Staged(val path: Path, val sha1: String, val sha512: String, val size: Long)

    private fun fetchAndVerify(instance: Instance, m: PlannedMod, part: Path, stage: (InstallProgress.Stage) -> Unit): Staged {
        val file = m.file
        if (file.size > maxFileBytes) throw InstallException("${m.name} is larger than the launcher allows for a mod file.")
        val source = sources[m.version.ref.platform] ?: throw InstallException("${m.version.ref.platform.label} is not available.")
        val spec = source.download(m.version, file)
        val downloaded = try {
            retryOnce { transport.download(spec.uri, spec.headers, part, file.size) }
        } catch (e: DownloadStatusException) {
            throw when (e.status) {
                404 -> NotFoundException("${m.name}'s file")
                429 -> RateLimitedException(e.retryAfter?.toLongOrNull() ?: 60, m.version.ref.platform.label)
                501, 503 -> SourceUnavailableException(m.version.ref.platform, "Downloading from ${m.version.ref.platform.label} is not switched on yet.")
                else -> NetworkException("Downloading ${m.name} failed (HTTP ${e.status}).")
            }
        }

        stage(InstallProgress.Stage.VERIFYING)
        if (downloaded.size != file.size) {
            Files.deleteIfExists(part)
            throw IntegrityException("${m.name} did not download completely (the file is corrupted). Nothing was installed.")
        }
        val expected = file.sha512?.let { it to downloaded.sha512 } ?: file.sha1?.let { it to downloaded.sha1 }
            ?: throw IntegrityException("${m.name} has no checksum to verify it against.")
        if (!java.security.MessageDigest.isEqual(expected.first.toByteArray(), expected.second.toByteArray())) {
            Files.deleteIfExists(part)
            throw IntegrityException("${m.name} failed its checksum: the download is corrupted or has been tampered with. Nothing was installed.")
        }
        val info = JarInspector.inspect(part)
        val loader = instance.loader
        if (loader != null && info.loaders.isNotEmpty() && CompatibilityChecker.loaderSupport(loader, info.loaders) == null) {
            throw IntegrityException(
                "${m.name}'s file is built for ${info.loaders.joinToString(" / ") { it.label }}, not ${loader.label}. Nothing was installed.",
            )
        }
        return Staged(part, downloaded.sha1, downloaded.sha512, downloaded.size)
    }

    private fun commit(
        instance: Instance,
        plan: InstallPlan,
        staged: List<Staged>,
        targets: List<Path>,
        replacedPath: Path?,
        before: List<InstalledMod>,
        record: InstalledMods,
    ) {
        val moved = mutableListOf<Path>()
        var backups: Path? = null
        var backup: Path? = null
        try {
            if (replacedPath != null && Files.exists(replacedPath, LinkOption.NOFOLLOW_LINKS)) {
                backups = newPrivateDir(instance.stateDir.resolve("backup"))
                backup = backups.resolve("previous.jar")
                Files.move(replacedPath, backup)
            }
            staged.forEachIndexed { i, s ->
                // No REPLACE_EXISTING: if something appeared at the target since the check, fail instead of overwriting.
                Files.move(s.path, targets[i])
                moved.add(targets[i])
            }
            val now = ticker.nowMillis()
            val replacing = plan.replacing
            val newEntries = plan.mods.mapIndexed { i, m ->
                val isReplacement = replacing != null && m.version.ref == replacing.ref
                InstalledMod(
                    ref = m.version.ref,
                    name = m.name,
                    versionId = m.version.versionId,
                    versionNumber = m.version.versionNumber,
                    fileName = targets[i].fileName.toString(),
                    size = staged[i].size,
                    sha1 = staged[i].sha1,
                    sha512 = staged[i].sha512,
                    explicit = if (isReplacement) replacing!!.explicit else m.explicit,
                    requiredBy = if (isReplacement) replacing!!.requiredBy + m.requiredBy else m.requiredBy,
                    incompatibleWith = m.version.dependencies
                        .filter { it.kind == DependencyKind.INCOMPATIBLE && it.projectId != null }
                        .map { ProjectRef(m.version.ref.platform, it.projectId!!).key }.toSet(),
                    installedAt = now,
                )
            }
            val kept = before.filter { b -> b.ref != replacing?.ref && newEntries.none { it.ref == b.ref } }
                .map { b -> plan.reusedDependencies[b.ref.key]?.let { b.copy(requiredBy = b.requiredBy + it) } ?: b }
            record.save(kept + newEntries)
            backups?.let(::deleteTree)
        } catch (e: Exception) {
            moved.asReversed().forEach { runCatching { Files.deleteIfExists(it) } }
            if (backup != null && replacedPath != null) runCatching { Files.move(backup, replacedPath) }
            backups?.let { runCatching { deleteTree(it) } }
            runCatching { record.save(before) }
            throw if (e is ModsException) e else InstallException("Installing failed and was undone; your mods are as they were.", e)
        }
    }

    private fun <T> retryOnce(block: () -> T): T = try {
        block()
    } catch (e: NetworkException) {
        ticker.sleep(1_000)
        block()
    }

    private fun newPrivateDir(parent: Path): Path {
        Files.createDirectories(parent)
        val dir = parent.resolve(UUID.randomUUID().toString())
        if ("posix" in FileSystems.getDefault().supportedFileAttributeViews()) {
            Files.createDirectory(dir, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rwx------")))
        } else {
            Files.createDirectory(dir)
        }
        return dir
    }

    private fun deleteTree(dir: Path) {
        if (!Files.exists(dir, LinkOption.NOFOLLOW_LINKS)) return
        Files.walk(dir).use { s -> s.sorted(Comparator.reverseOrder()).forEach { runCatching { Files.deleteIfExists(it) } } }
    }

    private fun <T> locked(instance: Instance, block: () -> T): T {
        val lock = locks.computeIfAbsent(instance.gameDir.toAbsolutePath().normalize().toString()) { Any() }
        return synchronized(lock, block)
    }

    private companion object {
        val locks = ConcurrentHashMap<String, Any>()
    }
}
