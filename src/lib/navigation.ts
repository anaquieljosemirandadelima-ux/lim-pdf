import { catalogGroups, catalogToolBySlug, type CatalogGroupId, type CatalogToolSlug } from "@/lib/catalog-groups";

export type NavigationGroup = {
  slug: CatalogGroupId;
  label: string;
  title: string;
  description: string;
  icon: "organize" | "edit" | "convert" | "forms" | "sign" | "security" | "optimize";
  accent: "blue" | "green" | "teal" | "purple" | "rose" | "orange";
  tools: CatalogToolSlug[];
};

const labelByGroup: Record<CatalogGroupId, string> = {
  organizar: "Organizar",
  editar: "Editar",
  converter: "Converter",
  formularios: "Formulários",
  seguranca: "Segurança",
  otimizar: "Otimizar",
  automacao: "Automação",
};

const iconByGroup: Record<CatalogGroupId, NavigationGroup["icon"]> = {
  organizar: "organize",
  editar: "edit",
  converter: "convert",
  formularios: "forms",
  seguranca: "security",
  otimizar: "optimize",
  automacao: "organize",
};

export const navigationGroups: NavigationGroup[] = catalogGroups.map((group) => ({
  slug: group.id,
  label: labelByGroup[group.id],
  title: group.title,
  description: group.description,
  icon: iconByGroup[group.id],
  accent: group.accent === "green" ? "green" : group.accent,
  tools: group.tools,
}));

export const navigationGroupBySlug = new Map<string, NavigationGroup>(
  navigationGroups.map((group) => [group.slug, group]),
);

export function getGroupTools(group: NavigationGroup) {
  return group.tools
    .map((slug) => catalogToolBySlug.get(slug))
    .filter((tool) => tool !== undefined);
}
