import type { MetadataRoute } from "next";
import { allTools } from "@/lib/all-tools";
import { navigationGroups } from "@/lib/navigation";
import { proTools } from "@/lib/pro-tools";
import { guides } from "@/lib/guides";

const CONTENT_UPDATED_AT = new Date("2026-08-17T17:45:00-03:00");

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
  const staticRoutes = [
    "",
    "/ferramentas",
    "/premium",
    "/ferramentas/converter-pdf",
    "/ferramentas/ocr-pdf",
    "/ferramentas/dimensionar-pdf",
    "/ferramentas/preflight-pdf",
    "/privacidade",
    "/cookies",
    "/termos",
    "/seguranca",
    "/acessibilidade",
    "/guias",
    "/sobre",
    "/contato",
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route}`,
      lastModified: CONTENT_UPDATED_AT,
      changeFrequency: route === "" || route === "/ferramentas" ? "weekly" as const : "monthly" as const,
      priority: route === "" ? 1 : route === "/ferramentas" ? .97 : route === "/premium" ? .93 : route.startsWith("/ferramentas/") ? .94 : .56,
    })),
    ...guides.map((guide) => ({
      url: `${base}/guias/${guide.slug}`,
      lastModified: CONTENT_UPDATED_AT,
      changeFrequency: "monthly" as const,
      priority: .78,
    })),
    ...navigationGroups.map((group) => ({
      url: `${base}/categorias/${group.slug}`,
      lastModified: CONTENT_UPDATED_AT,
      changeFrequency: "monthly" as const,
      priority: .86,
    })),
    ...allTools.map((tool) => ({
      url: `${base}/ferramentas/${tool.slug}`,
      lastModified: CONTENT_UPDATED_AT,
      changeFrequency: "monthly" as const,
      priority: .92,
    })),
    ...proTools.map((tool) => ({
      url: `${base}/ferramentas/${tool.slug}`,
      lastModified: CONTENT_UPDATED_AT,
      changeFrequency: "monthly" as const,
      priority: .92,
    })),
  ];
}
