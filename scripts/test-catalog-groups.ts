import { catalogGroups, catalogToolBySlug, getCatalogDuplicateSlugs } from "@/lib/catalog-groups";

const duplicates = getCatalogDuplicateSlugs();
if (duplicates.length) {
  throw new Error(`Slugs duplicados nos grupos: ${duplicates.join(", ")}`);
}

const groupedSlugs = catalogGroups.flatMap((group) => group.tools);
const missing = groupedSlugs.filter((slug) => !catalogToolBySlug.has(slug));
if (missing.length) {
  throw new Error(`Slugs sem definição no catálogo: ${missing.join(", ")}`);
}

const standalone = ["converter-pdf", "ocr-pdf", "dimensionar-pdf", "preflight-pdf"];
const missingStandalone = standalone.filter((slug) => !groupedSlugs.includes(slug as never));
if (missingStandalone.length) {
  throw new Error(`Entradas standalone sem jornada: ${missingStandalone.join(", ")}`);
}

const uniqueGrouped = new Set(groupedSlugs);
if (uniqueGrouped.size !== groupedSlugs.length) {
  throw new Error("A cobertura do catálogo não é única.");
}

console.log(JSON.stringify({
  ok: true,
  suite: "catalog-groups",
  groups: catalogGroups.length,
  groupedTools: groupedSlugs.length,
  indexedTools: catalogToolBySlug.size,
  standalone: standalone.length,
  duplicateSlugs: duplicates.length,
}));
