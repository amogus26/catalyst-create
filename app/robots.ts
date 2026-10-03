import type { MetadataRoute } from "next";

/** Everything public may be indexed; the reviewers' pages and the API may not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: "https://catalystclient.net/sitemap.xml",
  };
}
