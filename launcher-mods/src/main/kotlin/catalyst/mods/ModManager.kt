package catalyst.mods

import catalyst.mods.browser.ModBrowser
import catalyst.mods.cache.TtlCache
import catalyst.mods.curseforge.CurseForgeSource
import catalyst.mods.install.ModInstaller
import catalyst.mods.instance.InstanceProvider
import catalyst.mods.modrinth.ModrinthSource
import catalyst.mods.net.ApiClient
import catalyst.mods.net.JdkTransport
import catalyst.mods.net.RateBudget
import catalyst.mods.net.Ticker
import catalyst.mods.net.Transport
import catalyst.mods.net.UrlPolicy
import catalyst.mods.resolve.DependencyResolver
import catalyst.mods.update.UpdateChecker
import java.net.URI
import java.nio.file.Path

/**
 * @param userAgent sent on every request. Modrinth requires one that identifies the app, e.g.
 *   `CatalystLauncher/1.4.0 (support@example.com)` - never just the HTTP library's name.
 * @param backend the site's CurseForge routes, e.g. `https://catalyst-create.netlify.app/api/mods/curseforge`.
 *   Null leaves CurseForge out entirely.
 * @param cacheDir where API answers are kept between launches (the launcher's data folder), or null for memory only.
 */
data class ModManagerConfig(
    val userAgent: String,
    val backend: URI?,
    val cacheDir: Path?,
    val modrinthApi: URI = URI("https://api.modrinth.com"),
)

/** Builds the whole mod browser from a config and the launcher's instance list. */
class ModManager(
    config: ModManagerConfig,
    instances: InstanceProvider,
    ticker: Ticker = Ticker.System,
    transportOverride: Transport? = null,
) {
    init {
        require(config.userAgent.isNotBlank() && !config.userAgent.startsWith("Java-http-client")) {
            "Modrinth requires a User-Agent that identifies the launcher"
        }
    }

    private val backendHost = config.backend?.let {
        require(it.scheme == "https" && it.host != null) { "the backend must be an https:// address" }
        it.host.lowercase()
    }
    val urls = UrlPolicy(UrlPolicy.MODRINTH + UrlPolicy.CURSEFORGE_MEDIA + listOfNotNull(backendHost, config.modrinthApi.host))
    val transport: Transport = transportOverride ?: JdkTransport(urls, config.userAgent)
    val cache = TtlCache(config.cacheDir, ticker = ticker)

    val sources: Map<Platform, ModSource> = buildMap {
        // Modrinth allows 300 requests a minute per IP; staying under 250 leaves room for the rest of the launcher.
        put(Platform.MODRINTH, ModrinthSource(ApiClient("Modrinth", config.modrinthApi, transport, RateBudget("Modrinth", 250, ticker), cache, ticker), urls))
        config.backend?.let { backend ->
            val api = ApiClient(
                "CurseForge", backend, transport, RateBudget("CurseForge", 120, ticker), cache, ticker,
                mapError = CurseForgeSource::backendError,
            )
            put(Platform.CURSEFORGE, CurseForgeSource(api, backend, urls))
        }
    }

    val resolver = DependencyResolver(sources)
    val installer = ModInstaller(sources, transport, ticker)
    val updates = UpdateChecker(sources)
    val browser = ModBrowser(sources, resolver, installer, updates, instances)
}
