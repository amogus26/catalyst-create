package catalyst.mods.resolve

import catalyst.mods.Channel
import catalyst.mods.Dependency
import catalyst.mods.DependencyKind
import catalyst.mods.ModFile
import catalyst.mods.ModSource
import catalyst.mods.ModVersion
import catalyst.mods.ModsException
import catalyst.mods.Platform
import catalyst.mods.ProjectRef
import catalyst.mods.compat.Compatibility
import catalyst.mods.compat.CompatibilityChecker
import catalyst.mods.compat.SuggestedAction
import catalyst.mods.instance.InstalledMod
import catalyst.mods.instance.Instance

enum class Severity { BLOCKER, WARNING }

data class Problem(val severity: Severity, val message: String, val action: SuggestedAction? = null)

data class PlannedMod(
    val version: ModVersion,
    val file: ModFile,
    val name: String,
    /** Null for the mod the player picked; otherwise the name of the mod that needs this one. */
    val requiredByName: String?,
    val requiredBy: Set<String>,
    val explicit: Boolean,
)

data class OptionalDependency(val ref: ProjectRef, val name: String, val wantedBy: String)

/**
 * Everything that would happen if the player pressed Install - shown to them before anything downloads.
 *
 *     Sodium
 *       • Fabric API - required dependency
 *     [ Install 2 mods ]
 */
data class InstallPlan(
    val instance: Instance,
    val mods: List<PlannedMod>,
    val optional: List<OptionalDependency>,
    /** Dependencies that are already in the instance, with the new parents that now rely on them. */
    val reusedDependencies: Map<String, Set<String>>,
    val problems: List<Problem>,
    /** Set when this plan replaces an installed mod (an update). */
    val replacing: InstalledMod? = null,
) {
    val canInstall: Boolean get() = mods.isNotEmpty() && problems.none { it.severity == Severity.BLOCKER }
    val blockers: List<Problem> get() = problems.filter { it.severity == Severity.BLOCKER }
    val warnings: List<Problem> get() = problems.filter { it.severity == Severity.WARNING }
    val buttonLabel: String get() = if (mods.size == 1) "Install" else "Install ${mods.size} mods"
}

/**
 * Works out which files an install needs: the chosen version, then each required dependency (and each
 * optional one the player ticked), recursively, each picked to fit the instance.
 *
 * Dependency metadata comes from the platform and is untrusted like the rest: a cycle is followed once, a
 * plan is capped at [maxMods] files, a pinned dependency version is only used if it actually fits the
 * instance, and anything that cannot be resolved is reported rather than guessed.
 */
class DependencyResolver(
    private val sources: Map<Platform, ModSource>,
    private val maxMods: Int = 64,
) {
    fun resolve(
        instance: Instance,
        root: ModVersion,
        rootName: String,
        installed: List<InstalledMod>,
        chosenOptional: Set<ProjectRef> = emptySet(),
        replacing: InstalledMod? = null,
    ): InstallPlan {
        val problems = mutableListOf<Problem>()
        val plan = LinkedHashMap<String, PlannedMod>()
        val optional = LinkedHashMap<String, OptionalDependency>()
        val reused = LinkedHashMap<String, MutableSet<String>>()
        val installedByKey = installed.filter { it.ref != replacing?.ref }.associateBy { it.ref.key }
        val names = HashMap<String, String>().apply { put(root.ref.key, rootName) }
        fun done() = InstallPlan(instance, plan.values.toList(), optional.values.toList(), reused, problems.distinct(), replacing)

        when (val c = CompatibilityChecker.check(instance, root, rootName)) {
            is Compatibility.Incompatible -> {
                problems += Problem(Severity.BLOCKER, "⚠ ${c.reason}", c.action)
                return done()
            }
            is Compatibility.CompatibleWithWarning -> problems += Problem(Severity.WARNING, c.warning)
            Compatibility.Compatible -> Unit
        }

        installedByKey[root.ref.key]?.let { existing ->
            problems += Problem(
                Severity.BLOCKER,
                if (existing.versionId == root.versionId) "$rootName ${existing.versionNumber} is already installed in \"${instance.name}\"."
                else "$rootName ${existing.versionNumber} is already installed. Use Update to change versions.",
            )
            return done()
        }

        val rootFile = fileOf(root, rootName, problems) ?: return done()
        duplicateCheck(root, rootFile, rootName, installedByKey.values, problems)
        plan[root.ref.key] = PlannedMod(root, rootFile, rootName, null, emptySet(), explicit = true)

        val queue = ArrayDeque(listOf(root))
        while (queue.isNotEmpty()) {
            val parent = queue.removeFirst()
            val parentName = names[parent.ref.key] ?: parent.name
            for (dep in parent.dependencies) {
                when (dep.kind) {
                    DependencyKind.EMBEDDED -> Unit
                    DependencyKind.INCOMPATIBLE -> {
                        val key = dep.projectId?.let { ProjectRef(parent.ref.platform, it).key } ?: continue
                        val clash = installedByKey[key]?.name ?: plan[key]?.name
                        if (clash != null) {
                            problems += Problem(Severity.BLOCKER, "$parentName cannot be used together with $clash.")
                        }
                    }
                    DependencyKind.OPTIONAL, DependencyKind.REQUIRED -> {
                        val depRef = dependencyRef(parent, dep) ?: run {
                            if (dep.kind == DependencyKind.REQUIRED) {
                                problems += Problem(
                                    Severity.WARNING,
                                    "$parentName also needs ${dep.fileName ?: "a file"} that is not on ${parent.ref.platform.label}. " +
                                        "It will not be installed automatically.",
                                )
                            }
                            null
                        } ?: continue
                        val key = depRef.key
                        if (installedByKey.containsKey(key)) {
                            if (dep.kind == DependencyKind.REQUIRED) reused.getOrPut(key) { mutableSetOf() } += parent.ref.key
                            continue
                        }
                        plan[key]?.let { existing ->
                            if (dep.kind == DependencyKind.REQUIRED) {
                                plan[key] = existing.copy(requiredBy = existing.requiredBy + parent.ref.key)
                                if (dep.versionId != null && dep.versionId != existing.version.versionId) {
                                    problems += Problem(
                                        Severity.WARNING,
                                        "$parentName asks for a different version of ${existing.name} than another mod does; " +
                                            "installing ${existing.version.versionNumber}.",
                                    )
                                }
                            }
                            continue
                        }
                        val name = names.getOrPut(key) { nameOf(depRef) }
                        if (dep.kind == DependencyKind.OPTIONAL && depRef !in chosenOptional) {
                            optional.putIfAbsent(key, OptionalDependency(depRef, name, parentName))
                            continue
                        }
                        if (plan.size >= maxMods) {
                            problems += Problem(Severity.BLOCKER, "$rootName pulls in more than $maxMods mods; refusing to install that many at once.")
                            return done()
                        }
                        val picked = pick(instance, depRef, dep, name, parentName, problems) ?: continue
                        installedByKey.values.firstOrNull { key in it.incompatibleWith }?.let {
                            problems += Problem(Severity.BLOCKER, "${it.name} (installed) cannot be used together with $name.")
                        }
                        val file = fileOf(picked, name, problems) ?: continue
                        duplicateCheck(picked, file, name, installedByKey.values, problems)
                        plan[key] = PlannedMod(picked, file, name, parentName, setOf(parent.ref.key), explicit = depRef in chosenOptional)
                        optional.remove(key)
                        queue.addLast(picked)
                    }
                }
            }
        }

        // Installed mods that declared the new ones incompatible when they were installed.
        for (planned in plan.values) {
            installedByKey.values.firstOrNull { planned.version.ref.key in it.incompatibleWith }?.let {
                problems += Problem(Severity.BLOCKER, "${it.name} (installed) cannot be used together with ${planned.name}.")
            }
        }
        return done()
    }

    private fun dependencyRef(parent: ModVersion, dep: Dependency): ProjectRef? {
        val platform = parent.ref.platform
        dep.projectId?.let { return ProjectRef(platform, it) }
        val versionId = dep.versionId ?: return null
        // Modrinth sometimes gives only a version id; its project id is inside the version.
        return runCatching { sources.getValue(platform).version("", versionId).ref }.getOrNull()
    }

    private fun pick(
        instance: Instance,
        ref: ProjectRef,
        dep: Dependency,
        name: String,
        parentName: String,
        problems: MutableList<Problem>,
    ): ModVersion? {
        val source = sources[ref.platform] ?: return null
        fun fits(v: ModVersion) = CompatibilityChecker.check(instance, v, name).installable && v.ref == ref
        try {
            dep.versionId?.let { pinned ->
                runCatching { source.version(ref.projectId, pinned) }.getOrNull()?.takeIf(::fits)?.let { return it }
            }
            val loaders = instance.loader?.let(CompatibilityChecker::queryLoaders).orEmpty()
            val candidates = source.versions(ref.projectId, instance.gameVersion, loaders).filter(::fits)
            val chosen = candidates.firstOrNull { it.channel == Channel.RELEASE } ?: candidates.firstOrNull()
            if (chosen == null) {
                problems += Problem(
                    Severity.BLOCKER,
                    "$parentName needs $name, but $name has no version for Minecraft ${instance.gameVersion} with ${instance.loader?.label}.",
                )
            }
            return chosen
        } catch (e: ModsException) {
            problems += Problem(Severity.BLOCKER, "Could not look up $name, which $parentName needs: ${e.message}")
            return null
        }
    }

    private fun fileOf(version: ModVersion, name: String, problems: MutableList<Problem>): ModFile? {
        if (!version.downloadable) {
            problems += Problem(
                Severity.BLOCKER,
                "The author of $name only allows downloads from the ${version.ref.platform.label} website.",
                SuggestedAction.OpenProjectPage(sources[version.ref.platform]?.pageUrl(version.ref.projectId) ?: ""),
            )
            return null
        }
        val file = version.primaryFile
        if (file == null || (file.sha1 == null && file.sha512 == null)) {
            problems += Problem(Severity.BLOCKER, "$name ${version.versionNumber} has no mod file that can be verified.")
            return null
        }
        return file
    }

    /** Same file already present (from either platform), or what looks like the same mod from the other one. */
    private fun duplicateCheck(version: ModVersion, file: ModFile, name: String, installed: Collection<InstalledMod>, problems: MutableList<Problem>) {
        installed.firstOrNull { (file.sha1 != null && it.sha1 == file.sha1) || (file.sha512 != null && it.sha512 == file.sha512) }?.let {
            problems += Problem(Severity.BLOCKER, "$name is already installed (as ${it.name} from ${it.ref.platform.label}).")
            return
        }
        installed.firstOrNull { it.ref.platform != version.ref.platform && normalize(it.name) == normalize(name) }?.let {
            problems += Problem(
                Severity.WARNING,
                "${it.name} is already installed from ${it.ref.platform.label}. Two copies of the same mod usually crash the game.",
            )
        }
    }

    private fun nameOf(ref: ProjectRef): String =
        runCatching { sources.getValue(ref.platform).project(ref.projectId).summary.name }.getOrDefault(ref.projectId)

    private fun normalize(s: String) = s.lowercase().filter { it.isLetterOrDigit() }
}
