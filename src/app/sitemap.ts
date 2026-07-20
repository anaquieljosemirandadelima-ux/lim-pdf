import type { MetadataRoute } from "next";
import { guides } from "@/lib/guides";
import { tools } from "@/lib/tools";
import { navigationGroups } from "@/lib/navigation";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://lim-pdf-preview.vercel.app";
  const now = new Date();
  const staticRoutes = ["", "/ferramentas", "/guias", "/sobre", "/privacidade", "/cookies", "/termos", "/contato", "/seguranca", "/acessibilidade"];
  return [
    ...staticRoutes.map((route) => ({ url: `${base}${route}`, lastModified: now, changeFrequency: route === "" ? "weekly" as const : "monthly" as const, priority: route === "" ? 1 : route === "/ferramentas" ? .95 : .65 })),
    ...navigationGroups.map((group) => ({ url: `${base}/categorias/${group.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: .82 })),
    ...tools.map((tool) => ({ url: `${base}/ferramentas/${tool.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: .9 })),
    ...guides.map((guide) => ({ url: `${base}/guias/${guide.slug}`, lastModified: new Date(guide.updatedAt), changeFrequency: "monthly" as const, priority: .75 })),
  ];
}
