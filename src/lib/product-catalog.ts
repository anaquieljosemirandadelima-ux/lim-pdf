import { allTools, type AllToolSlug, type AnyToolDefinition } from "@/lib/all-tools";
import { proTools, type ProToolDefinition, type ProToolSlug } from "@/lib/pro-tools";

export type RecommendedPlan = "free" | "premium" | "professional";
export type ProcessingMode = "local" | "optional-cloud" | "cloud-required";
export type MemoryProfile = "low" | "medium" | "high" | "very-high";
export type ProductIntent =
  | "organizar"
  | "editar"
  | "converter"
  | "formularios"
  | "seguranca"
  | "otimizar"
  | "automacao";

export type ProductToolMeta = {
  slug: string;
  recommendedPlan: RecommendedPlan;
  processingMode: ProcessingMode;
  memoryProfile: MemoryProfile;
  intent: ProductIntent;
  supportsBatch: boolean;
  recommendedBytes: number;
  labels: string[];
};

const MB = 1024 * 1024;
const DEFAULT_RECOMMENDED_BYTES = 100 * MB;
const LARGE_RECOMMENDED_BYTES = 250 * MB;

const premiumSlugs = new Set<string>([
  "pdf-para-word",
  "pdf-para-excel",
  "word-para-pdf",
  "excel-para-pdf",
  "comparar-pdfs",
  "ocr-pdf",
  "processamento-lote-pdf",
  "anotacoes-pdf",
  "pdf-a",
  "numeracao-bates",
  "extrair-imagens-pdf",
  "limpar-documento-digitalizado",
  "otimizar-pdf-avancado",
  "editar-metadados-pdf",
]);

const professionalSlugs = new Set<string>([
  "assinatura-digital-pdf",
  "criar-formulario-pdf",
  "comparar-pdfs",
  "pdf-a",
  "numeracao-bates",
  "processamento-lote-pdf",
]);

const intentBySlug: Record<string, ProductIntent> = {
  "juntar-pdf": "organizar",
  "dividir-pdf": "organizar",
  "extrair-paginas": "organizar",
  "excluir-paginas": "organizar",
  "organizar-paginas": "organizar",
  "girar-pdf": "organizar",
  "duplicar-paginas": "organizar",
  "inserir-pagina-em-branco": "organizar",
  "alternar-pdfs": "organizar",
  "sobrepor-pdfs": "organizar",
  "criar-livreto-pdf": "organizar",
  "paginas-por-folha": "organizar",
  "editar-pdf": "editar",
  "adicionar-texto-pdf": "editar",
  "adicionar-imagem-pdf": "editar",
  "destacar-texto": "editar",
  "marca-dagua-pdf": "editar",
  "marcar-confidencial": "editar",
  "cabecalho-rodape-pdf": "editar",
  "numerar-paginas": "editar",
  "adicionar-fundo-pdf": "editar",
  "espelhar-pdf": "editar",
  "assinar-pdf": "seguranca",
  "assinatura-digital-pdf": "seguranca",
  "proteger-pdf": "seguranca",
  "desbloquear-pdf": "seguranca",
  "permissoes-pdf": "seguranca",
  "remover-metadados": "seguranca",
  "editar-metadados-pdf": "seguranca",
  "pdf-para-word": "converter",
  "pdf-para-excel": "converter",
  "pdf-para-powerpoint": "converter",
  "pdf-para-jpg": "converter",
  "pdf-para-png": "converter",
  "extrair-texto-pdf": "converter",
  "extrair-imagens-pdf": "converter",
  "word-para-pdf": "converter",
  "excel-para-pdf": "converter",
  "powerpoint-para-pdf": "converter",
  "imagens-para-pdf": "converter",
  "preencher-formulario-pdf": "formularios",
  "achatar-formulario-pdf": "formularios",
  "criar-formulario-pdf": "formularios",
  "compactar-pdf": "otimizar",
  "pdf-em-escala-de-cinza": "otimizar",
  "recortar-pdf": "otimizar",
  "redimensionar-pdf": "otimizar",
  "reparar-pdf": "otimizar",
  "pdf-a": "otimizar",
  "limpar-documento-digitalizado": "otimizar",
  "otimizar-pdf-avancado": "otimizar",
  "comparar-pdfs": "automacao",
  "processamento-lote-pdf": "automacao",
  "bookmarks-pdf": "automacao",
  "links-pdf": "editar",
  "anotacoes-pdf": "editar",
  "numeracao-bates": "automacao",
};

const highMemorySlugs = new Set<string>([
  "editar-pdf",
  "pdf-para-word",
  "pdf-para-excel",
  "pdf-para-powerpoint",
  "powerpoint-para-pdf",
  "comparar-pdfs",
  "ocr-pdf",
  "limpar-documento-digitalizado",
  "otimizar-pdf-avancado",
  "processamento-lote-pdf",
]);

const veryHighMemorySlugs = new Set<string>([
  "comparar-pdfs",
  "ocr-pdf",
  "pdf-para-excel",
  "pdf-para-powerpoint",
  "powerpoint-para-pdf",
]);

const batchSlugs = new Set<string>(["juntar-pdf", "alternar-pdfs", "sobrepor-pdfs", "processamento-lote-pdf", "imagens-para-pdf"]);

export function getProductToolMeta(slug: string): ProductToolMeta {
  const recommendedPlan: RecommendedPlan = professionalSlugs.has(slug)
    ? "professional"
    : premiumSlugs.has(slug)
      ? "premium"
      : "free";
  const memoryProfile: MemoryProfile = veryHighMemorySlugs.has(slug)
    ? "very-high"
    : highMemorySlugs.has(slug)
      ? "high"
      : batchSlugs.has(slug)
        ? "medium"
        : "low";
  const recommendedBytes = memoryProfile === "very-high" ? DEFAULT_RECOMMENDED_BYTES : memoryProfile === "high" ? LARGE_RECOMMENDED_BYTES : 500 * MB;
  const labels = ["Processamento local"];
  if (recommendedPlan === "premium") labels.push("Premium recomendado");
  if (recommendedPlan === "professional") labels.push("Profissional");
  if (batchSlugs.has(slug)) labels.push("Lote");
  if (memoryProfile === "very-high") labels.push("Alta memória");
  return {
    slug,
    recommendedPlan,
    processingMode: "local",
    memoryProfile,
    intent: intentBySlug[slug] ?? "editar",
    supportsBatch: batchSlugs.has(slug),
    recommendedBytes,
    labels,
  };
}

export const productToolMeta = new Map<string, ProductToolMeta>([
  ...allTools.map((tool) => [tool.slug, getProductToolMeta(tool.slug)] as const),
  ...proTools.map((tool) => [tool.slug, getProductToolMeta(tool.slug)] as const),
]);

export const productTools: Array<AnyToolDefinition | ProToolDefinition> = [...allTools, ...proTools];

export function getProductToolLabel(slug: string) {
  const meta = productToolMeta.get(slug) ?? getProductToolMeta(slug);
  if (meta.recommendedPlan === "professional") return "Profissional";
  if (meta.recommendedPlan === "premium") return "Premium recomendado";
  return "Gratuito";
}

export function isProductToolSlug(slug: string): slug is AllToolSlug | ProToolSlug {
  return productToolMeta.has(slug);
}

export const productIntentLabels: Record<ProductIntent, string> = {
  organizar: "Organizar páginas",
  editar: "Editar e revisar",
  converter: "Converter arquivos",
  formularios: "Formulários e dados",
  seguranca: "Proteger e assinar",
  otimizar: "Otimizar e reduzir",
  automacao: "Automação profissional",
};
