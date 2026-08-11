import type { MetadataRoute } from "next";
import { allTools } from "@/lib/all-tools";
import { guides } from "@/lib/guides";
import { navigationGroups } from "@/lib/navigation";
import { proTools } from "@/lib/pro-tools";
import { releaseTools } from "@/lib/release-tools";

const CONTENT_UPDATED_AT = new Date("2026-08-11T07:30:00-03:00");

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
  const staticRoutes = ["", "/ferramentas", "/guias", "/sobre", "/privacidade", "/cookies", "/termos", "/contato", "/seguranca", "/acessibilidade"];
  const tools = [...allTools, ...proTools, ...releaseTools];
  return [
    ...staticRoutes.map((route) => ({ url: `${base}${route}`, lastModified: CONTENT_UPDATED_AT, changeFrequency: route === "" ? "weekly" as const : "monthly" as const, priority: route === "" ? 1 : route === "/ferramentas" ? .95 : route === "/guias" ? .8 : .62 })),
    ...navigationGroups.map((group) => ({ url: `${base}/categorias/${group.slug}`, lastModified: CONTENT_UPDATED_AT, changeFrequency: "monthly" as const, priority: .82 })),
    ...tools.map((tool) => ({ url: `${base}/ferramentas/${tool.slug}`, lastModified: CONTENT_UPDATED_AT, changeFrequency: "monthly" as const, priority: .9 })),
    ...guides.map((guide) => ({ url: `${base}/guias/${guide.slug}`, lastModified: CONTENT_UPDATED_AT, changeFrequency: "monthly" as const, priority: .76 })),
  ];
}
