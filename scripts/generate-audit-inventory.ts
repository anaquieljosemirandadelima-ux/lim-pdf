import { allTools } from "../src/lib/all-tools";
import { proTools } from "../src/lib/pro-tools";
import { productIntentLabels, getProductToolMeta } from "../src/lib/product-catalog";

const all = [...allTools, ...proTools];
const unique = new Map(all.map((tool) => [tool.slug, tool]));
const rows = [...unique.values()].map((tool) => {
  const meta = getProductToolMeta(tool.slug);
  return {
    slug: tool.slug,
    name: tool.name,
    category: tool.category,
    plan: meta.recommendedPlan,
    intent: productIntentLabels[meta.intent],
    mode: meta.processingMode,
    memory: meta.memoryProfile,
    batch: meta.supportsBatch,
    description: tool.shortDescription,
  };
});

const counts = rows.reduce<Record<string, number>>((acc, row) => {
  acc.total = (acc.total ?? 0) + 1;
  acc[`plan:${row.plan}`] = (acc[`plan:${row.plan}`] ?? 0) + 1;
  acc[`intent:${row.intent}`] = (acc[`intent:${row.intent}`] ?? 0) + 1;
  return acc;
}, {});

const lines = [
  "# Inventário técnico do produto LIM PDF",
  "",
  "Gerado a partir de src/lib/all-tools.ts, src/lib/pro-tools.ts e src/lib/product-catalog.ts.",
  "",
  "## Resumo",
  "",
  `- Ferramentas únicas: **${counts.total}**`,
  `- Recomendadas para gratuito: **${counts["plan:free"] ?? 0}**`,
  `- Recomendadas para Premium: **${counts["plan:premium"] ?? 0}**`,
  `- Recomendadas para Profissional: **${counts["plan:professional"] ?? 0}**`,
  "",
  "## Matriz de ferramentas",
  "",
  "| Slug | Ferramenta | Categoria | Plano | Intenção | Modo | Memória | Lote | Descrição |",
  "|---|---|---|---|---|---|---|---|---|",
  ...rows.map((row) => `| ${row.slug} | ${row.name.replaceAll("|", "\\|")} | ${row.category} | ${row.plan} | ${row.intent} | ${row.mode} | ${row.memory} | ${row.batch ? "sim" : "não"} | ${row.description.replaceAll("|", "\\|")} |`),
  "",
  "## Contagens por intenção",
  "",
  "| Intenção | Quantidade |",
  "|---|---:|",
  ...Object.entries(counts).filter(([key]) => key.startsWith("intent:")).sort().map(([key, value]) => `| ${key.slice(7)} | ${value} |`),
];

console.log(lines.join("\n"));
