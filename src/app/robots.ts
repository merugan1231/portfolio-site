import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://merugan.is-a.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/cabinet", "/onboarding", "/register", "/login"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
