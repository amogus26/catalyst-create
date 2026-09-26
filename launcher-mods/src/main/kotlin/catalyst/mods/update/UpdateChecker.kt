package catalyst.mods.update

import catalyst.mods.ModSource
import catalyst.mods.ModVersion
import catalyst.mods.ModsException
import catalyst.mods.Platform
import catalyst.mods.compat.CompatibilityChecker
import catalyst.mods.instance.InstalledMod
import catalyst.mods.instance.InstalledMods
import catalyst.mods.instance.Instance

/**
 *     Sodium
 *     Installed: 0.6.0   Latest compatible: 0.6.5
 *     [ Update ]
 */
data class UpdateCandidate(val installed: InstalledMod, val latest: ModVersion)

data class UpdateReport(val updates: List<UpdateCandidate>, val errors: Map<Platform, String>)

/**
 * Finds newer compatible versions of the mods the launcher installed in an instance.
 *
 * Modrinth answers for every file in one request (by hash). CurseForge is asked per mod through our
 * backend. Whatever comes back is checked again here - same project, a different version, and compatible
 * with the instance - before it is offered.
 */
class UpdateChecker(private val sources: Map<Platform, ModSource>) {
    fun check(instance: Instance): UpdateReport {
        val installed = InstalledMods(instance).load()
        val updates = mutableListOf<UpdateCandidate>()
        val errors = mutableMapOf<Platform, String>()
        for ((platform, mods) in installed.groupBy { it.ref.platform }) {
            val source = sources[platform] ?: continue
            val bySha1 = mods.filter { it.sha1 != null }.associateBy { it.sha1!! }
            val latest = try {
                source.latestFor(bySha1.mapValues { it.value.ref.projectId }, instance)
            } catch (e: ModsException) {
                errors[platform] = e.message ?: "Could not check for updates."
                continue
            }
            for ((sha1, version) in latest) {
                val mod = bySha1[sha1] ?: continue
                if (version.ref != mod.ref || version.versionId == mod.versionId) continue
                if (!CompatibilityChecker.check(instance, version, mod.name).installable) continue
                if (version.primaryFile?.let { f -> f.sha1 == mod.sha1 || (f.sha512 != null && f.sha512 == mod.sha512) } == true) continue
                updates += UpdateCandidate(mod, version)
            }
        }
        return UpdateReport(updates.sortedBy { it.installed.name.lowercase() }, errors)
    }
}
