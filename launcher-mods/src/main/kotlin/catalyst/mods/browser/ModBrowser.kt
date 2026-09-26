package catalyst.mods.browser

import catalyst.mods.Channel
import catalyst.mods.Loader
import catalyst.mods.ModDetails
import catalyst.mods.ModSource
import catalyst.mods.ModSummary
import catalyst.mods.ModVersion
import catalyst.mods.ModsException
import catalyst.mods.Platform
import catalyst.mods.ProjectRef
import catalyst.mods.SearchQuery
import catalyst.mods.SortBy
import catalyst.mods.compat.Compatibility
import catalyst.mods.compat.CompatibilityChecker
import catalyst.mods.compat.SuggestedAction
import catalyst.mods.install.InstallProgress
import catalyst.mods.install.InstallResult
import catalyst.mods.install.ModInstaller
import catalyst.mods.install.UninstallResult
import catalyst.mods.instance.InstalledMods
import catalyst.mods.instance.Instance
import catalyst.mods.instance.InstanceProvider
import catalyst.mods.resolve.DependencyResolver
import catalyst.mods.resolve.InstallPlan
import catalyst.mods.resolve.Severity
import catalyst.mods.update.UpdateCandidate
import catalyst.mods.update.UpdateChecker
import catalyst.mods.update.UpdateReport
import java.util.concurrent.Callable
import java.util.concurrent.Executors

/** One result card in Explore Mods. Every string here is ready to show. */
data class ModCard(
    val summary: ModSummary,
    val platformLabel: String,
    val loaderLabel: String?,
    val versionLabel: String?,
    val downloadsLabel: String?,
    val state: CardState,
)

sealed interface CardState {
    data object Installable : CardState
    data class Installed(val versionNumber: String) : CardState
    /** Nothing in the search data says it runs on the chosen profile; the full check happens on Install. */
    data class ProbablyIncompatible(val reason: String) : CardState
    data object NoProfile : CardState
}

data class BrowseResult(
    val cards: List<ModCard>,
    /** A line per platform that could not answer, e.g. CurseForge before the backend has a key. */
    val notices: Map<Platform, String>,
    val total: Int,
)

data class VersionOption(val version: ModVersion, val compatibility: Compatibility)

/** What pressing Install shows: either the plan to confirm, or why it cannot happen and what to do. */
sealed interface InstallPrompt {
    data class Ready(
        val plan: InstallPlan,
        val title: String,
        /** "Fabric API - required dependency", one per extra mod. */
        val lines: List<String>,
        val optional: List<catalyst.mods.resolve.OptionalDependency>,
        val warnings: List<String>,
        val buttonLabel: String,
    ) : InstallPrompt

    data class Blocked(
        val title: String,
        val reason: String,
        val action: SuggestedAction?,
    ) : InstallPrompt
}

/**
 * The Explore Mods screen's logic, independent of the UI toolkit: the launcher's page binds its search
 * box, platform tabs, filters and buttons to these calls and renders what comes back.
 *
 *     Explore Mods
 *     [ Search mods... ]
 *     [ All ] [ Modrinth ] [ CurseForge ]      Profile: 1.21.8 Fabric PvP ▾
 *     Minecraft version ▾  Loader ▾  Category ▾  Sort: Relevance ▾
 *
 * Calls block (network and disk); the UI runs them off its main thread.
 */
class ModBrowser(
    private val sources: Map<Platform, ModSource>,
    private val resolver: DependencyResolver,
    private val installer: ModInstaller,
    private val updates: UpdateChecker,
    private val instances: InstanceProvider,
) {
    private val pool = Executors.newFixedThreadPool(2) { r -> Thread(r, "mod-search").apply { isDaemon = true } }

    /** Searches the selected platforms at once; one failing does not hide the other's results. */
    fun search(query: SearchQuery, profile: Instance?): BrowseResult {
        val q = profile?.let {
            query.copy(gameVersion = query.gameVersion ?: it.gameVersion, loader = query.loader ?: it.loader)
        } ?: query
        val active = sources.filterKeys { it in q.platforms }
        val futures = active.mapValues { (_, source) -> pool.submit(Callable { source.search(q) }) }
        val notices = mutableMapOf<Platform, String>()
        val pages = futures.mapNotNull { (platform, f) ->
            try {
                platform to f.get()
            } catch (e: java.util.concurrent.ExecutionException) {
                notices[platform] = (e.cause as? ModsException)?.message ?: "${platform.label} search failed."
                null
            }
        }.toMap()
        val installed = profile?.let { InstalledMods(it).load().associateBy { m -> m.ref } }.orEmpty()
        val merged = merge(pages.values.map { it.hits }, q.sort)
        return BrowseResult(merged.map { card(it, profile, installed[it.ref]?.versionNumber) }, notices, pages.values.sumOf { it.total })
    }

    fun details(ref: ProjectRef): ModDetails = source(ref).project(ref.projectId)

    /** Every version of a mod, newest first, each marked with whether it fits [profile]. */
    fun versions(ref: ProjectRef, profile: Instance, name: String): List<VersionOption> =
        source(ref).versions(ref.projectId).map { VersionOption(it, CompatibilityChecker.check(profile, it, name)) }

    /**
     * Builds what Install would do. With no [versionId], picks the newest release that fits the profile
     * (falling back to a beta, then an alpha). [optional] are the optional dependencies the player ticked.
     */
    fun prepareInstall(profile: Instance, ref: ProjectRef, name: String, versionId: String? = null, optional: Set<ProjectRef> = emptySet()): InstallPrompt {
        val title = "Cannot install $name"
        val version = try {
            if (versionId != null) source(ref).version(ref.projectId, versionId)
            else bestVersion(ref, profile, name) ?: return noVersionPrompt(ref, profile, name)
        } catch (e: ModsException) {
            return InstallPrompt.Blocked(title, e.message ?: "Could not reach ${ref.platform.label}.", null)
        }
        val plan = resolver.resolve(profile, version, name, InstalledMods(profile).load(), optional)
        return prompt(plan, name, title)
    }

    fun install(plan: InstallPlan, progress: (InstallProgress) -> Unit = {}): InstallResult = installer.install(plan, progress)

    fun uninstall(profile: Instance, ref: ProjectRef, force: Boolean = false): UninstallResult =
        installer.uninstall(profile, ref, removeOrphans = true, force = force)

    fun checkUpdates(profile: Instance): UpdateReport = updates.check(profile)

    fun prepareUpdate(profile: Instance, candidate: UpdateCandidate): InstallPrompt {
        val plan = resolver.resolve(profile, candidate.latest, candidate.installed.name, InstalledMods(profile).load(), replacing = candidate.installed)
        return prompt(plan, candidate.installed.name, "Cannot update ${candidate.installed.name}")
    }

    fun update(plan: InstallPlan, progress: (InstallProgress) -> Unit = {}): InstallResult = installer.update(plan, progress)

    /** The "Create Fabric Profile" button. */
    fun createProfile(action: SuggestedAction.CreateProfile): Instance =
        instances.create("${action.gameVersion} ${action.loader.label}", action.gameVersion, action.loader)

    fun card(s: ModSummary, profile: Instance?, installedVersion: String?): ModCard {
        val loader = profile?.loader
        val state = when {
            installedVersion != null -> CardState.Installed(installedVersion)
            profile == null -> CardState.NoProfile
            loader == null -> CardState.ProbablyIncompatible("\"${profile.name}\" has no mod loader.")
            s.loaders.isNotEmpty() && CompatibilityChecker.loaderSupport(loader, s.loaders) == null ->
                CardState.ProbablyIncompatible("Not available for ${loader.label}.")
            s.gameVersions.isNotEmpty() && profile.gameVersion !in s.gameVersions ->
                CardState.ProbablyIncompatible("Not available for Minecraft ${profile.gameVersion}.")
            else -> CardState.Installable
        }
        val shownLoader = loader?.takeIf { CompatibilityChecker.loaderSupport(it, s.loaders) != null }
            ?: listOf(Loader.FABRIC, Loader.NEOFORGE, Loader.FORGE, Loader.QUILT).firstOrNull { it in s.loaders }
        val versionLabel = when {
            s.gameVersions.isEmpty() -> null
            profile != null && profile.gameVersion in s.gameVersions -> "Minecraft ${profile.gameVersion}"
            else -> "Minecraft ${CompatibilityChecker.summarize(s.gameVersions)}"
        }
        return ModCard(s, s.ref.platform.label, shownLoader?.label, versionLabel, s.downloads?.let(::compact), state)
    }

    private fun prompt(plan: InstallPlan, name: String, title: String): InstallPrompt {
        plan.blockers.firstOrNull()?.let { return InstallPrompt.Blocked(title, it.message, it.action) }
        return InstallPrompt.Ready(
            plan = plan,
            title = name,
            lines = plan.mods.filter { it.requiredByName != null }.map { "${it.name} - required by ${it.requiredByName}" },
            optional = plan.optional,
            warnings = plan.problems.filter { it.severity == Severity.WARNING }.map { it.message },
            buttonLabel = if (plan.replacing != null) "Update" else plan.buttonLabel,
        )
    }

    private fun bestVersion(ref: ProjectRef, profile: Instance, name: String): ModVersion? {
        val loader = profile.loader ?: return null
        val fits = source(ref).versions(ref.projectId, profile.gameVersion, CompatibilityChecker.queryLoaders(loader))
            .filter { CompatibilityChecker.check(profile, it, name).installable }
        return fits.firstOrNull { it.channel == Channel.RELEASE } ?: fits.firstOrNull { it.channel == Channel.BETA } ?: fits.firstOrNull()
    }

    /** No version fits: say why in the player's terms, using any version to name what the mod needs. */
    private fun noVersionPrompt(ref: ProjectRef, profile: Instance, name: String): InstallPrompt {
        val any = runCatching { source(ref).versions(ref.projectId) }.getOrDefault(emptyList())
        val newest = any.firstOrNull { it.channel == Channel.RELEASE } ?: any.firstOrNull()
            ?: return InstallPrompt.Blocked("Cannot install $name", "$name has no downloadable versions.", null)
        val sameGame = any.firstOrNull { profile.gameVersion in it.gameVersions } ?: newest
        val c = CompatibilityChecker.check(profile, sameGame, name)
        return InstallPrompt.Blocked(
            "Cannot install $name",
            (c as? Compatibility.Incompatible)?.reason ?: "$name has no version for this profile.",
            (c as? Compatibility.Incompatible)?.action,
        )
    }

    private fun source(ref: ProjectRef) = sources[ref.platform] ?: throw catalyst.mods.SourceUnavailableException(ref.platform, "${ref.platform.label} is not available.")

    companion object {
        /** "All" mixes platforms: by count or date when sorting by those, otherwise alternating by rank. */
        fun merge(lists: List<List<ModSummary>>, sort: SortBy): List<ModSummary> = when (sort) {
            SortBy.DOWNLOADS -> lists.flatten().sortedByDescending { it.downloads ?: 0 }
            SortBy.NEWEST, SortBy.UPDATED -> lists.flatten().sortedByDescending { it.updated ?: java.time.Instant.EPOCH }
            else -> buildList {
                val max = lists.maxOfOrNull { it.size } ?: 0
                for (i in 0 until max) for (l in lists) l.getOrNull(i)?.let(::add)
            }
        }

        fun compact(n: Long): String = when {
            n >= 1_000_000_000 -> "%.1fB".format(java.util.Locale.ROOT, n / 1e9)
            n >= 1_000_000 -> "%.1fM".format(java.util.Locale.ROOT, n / 1e6)
            n >= 1_000 -> "%.1fK".format(java.util.Locale.ROOT, n / 1e3)
            else -> n.toString()
        }.replace(".0", "")
    }
}
