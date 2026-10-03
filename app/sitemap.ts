import type { MetadataRoute } from "next";

/** The public pages, for search engines - the home page first. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/download", "/cosmetics", "/coins", "/battle-pass", "/designs", "/redeem", "/terms", "/privacy"];
  return pages.map((path) => ({
    url: `https://catalystclient.net${path}`,
    changeFrequency: path === "/designs" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/terms" || path === "/privacy" ? 0.3 : 0.7,
  }));
}
