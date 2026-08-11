import type { MetadataRoute } from "next";
import { allTools } from "@/lib/all-tools";
import { navigationGroups } from "@/lib/navigation";

const CONTENT_UPDATED_AT = new Date("2026-08-10T00:00:00-03:00");

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
  const staticRoutes = [
    "",
    "/ferramentas",
    "/privacidade",
    "/cookies",
    "/termos",
    "/contato",
    "/seguranca",
    "/acessibilidade",
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route}`,
      lastModified: CONTENT_UPDATED_AT,
      changeFrequency: route === "" ? "weekly" as const : "monthly" as const,
      priority: route === "" ? 1 : route === "/ferramentas" ? .95 : .65,
    })),
    ...navigationGroups.map((group) => ({
      url: `${base}/categorias/${group.slug}`,
      lastModified: CONTENT_UPDATED_AT,
      changeFrequency: "monthly" as const,
      priority: .82,
    })),
    ...allTools.map((tool) => ({
      url: `${base}/ferramentas/${tool.slug}`,
      lastModified: CONTENT_UPDATED_AT,
      changeFrequency: "monthly" as const,
      priority: .9,
    })),
  ];
}
