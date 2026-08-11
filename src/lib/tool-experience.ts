import type { AllToolSlug } from "@/lib/all-tools";
import type { ProToolSlug } from "@/lib/pro-tools";

export type ExperienceToolSlug = AllToolSlug | ProToolSlug;
export const TOOL_EXPERIENCE_RECENTS_KEY = "limpdf:tool-recents:v3";
export const TOOL_EXPERIENCE_FAVORITES_KEY = "limpdf:tool-favorites:v3";
export const TOOL_EXPERIENCE_CHANGE_EVENT = "limpdf:tool-experience-change";

const fallback: ExperienceToolSlug[] = ["editar-pdf", "ocr-pdf", "compactar-pdf"];
const nextSteps: Partial<Record<ExperienceToolSlug, ExperienceToolSlug[]>> = {
  "editar-pdf": ["compactar-pdf", "proteger-pdf", "assinar-pdf"],
  "juntar-pdf": ["organizar-paginas", "compactar-pdf", "proteger-pdf"],
  "dividir-pdf": ["juntar-pdf", "compactar-pdf", "editar-pdf"],
  "extrair-paginas": ["juntar-pdf", "editar-pdf", "compactar-pdf"],
  "excluir-paginas": ["organizar-paginas", "compactar-pdf", "proteger-pdf"],
  "organizar-paginas": ["numerar-paginas", "bookmarks-pdf", "compactar-pdf"],
  "girar-pdf": ["organizar-paginas", "compactar-pdf", "editar-pdf"],
  "duplicar-paginas": ["organizar-paginas", "numerar-paginas", "compactar-pdf"],
  "inserir-pagina-em-branco": ["editar-pdf", "organizar-paginas", "numerar-paginas"],
  "alternar-pdfs": ["organizar-paginas", "comparar-pdfs", "compactar-pdf"],
  "sobrepor-pdfs": ["editar-pdf", "comparar-pdfs", "compactar-pdf"],
  "numerar-paginas": ["cabecalho-rodape-pdf", "numeracao-bates", "compactar-pdf"],
  "marca-dagua-pdf": ["marcar-confidencial", "proteger-pdf", "compactar-pdf"],
  "adicionar-texto-pdf": ["assinar-pdf", "links-pdf", "compactar-pdf"],
  "adicionar-imagem-pdf": ["editar-pdf", "compactar-pdf", "proteger-pdf"],
  "assinar-pdf": ["assinatura-digital-pdf", "proteger-pdf", "compactar-pdf"],
  "remover-metadados": ["proteger-pdf", "compactar-pdf", "editar-metadados-pdf"],
  "recortar-pdf": ["redimensionar-pdf", "compactar-pdf", "editar-pdf"],
  "redimensionar-pdf": ["compactar-pdf", "paginas-por-folha", "proteger-pdf"],
  "criar-livreto-pdf": ["compactar-pdf", "proteger-pdf", "numerar-paginas"],
  "paginas-por-folha": ["compactar-pdf", "proteger-pdf", "espelhar-pdf"],
  "imagens-para-pdf": ["ocr-pdf", "editar-pdf", "compactar-pdf"],
  "pdf-para-jpg": ["imagens-para-pdf", "extrair-imagens-pdf", "editar-pdf"],
  "pdf-para-png": ["imagens-para-pdf", "extrair-imagens-pdf", "editar-pdf"],
  "compactar-pdf": ["proteger-pdf", "editar-pdf", "otimizar-pdf-avancado"],
  "pdf-em-escala-de-cinza": ["compactar-pdf", "limpar-documento-digitalizado", "proteger-pdf"],
  "extrair-texto-pdf": ["ocr-pdf", "pdf-para-word", "pdf-para-excel"],
  "preencher-formulario-pdf": ["achatar-formulario-pdf", "assinar-pdf", "assinatura-digital-pdf"],
  "achatar-formulario-pdf": ["assinatura-digital-pdf", "proteger-pdf", "compactar-pdf"],
  "cabecalho-rodape-pdf": ["numerar-paginas", "numeracao-bates", "compactar-pdf"],
  "espelhar-pdf": ["paginas-por-folha", "compactar-pdf", "proteger-pdf"],
  "adicionar-fundo-pdf": ["editar-pdf", "marca-dagua-pdf", "compactar-pdf"],
  "pdf-para-word": ["word-para-pdf", "ocr-pdf", "editar-pdf"],
  "pdf-para-excel": ["excel-para-pdf", "ocr-pdf", "editar-pdf"],
  "word-para-pdf": ["editar-pdf", "compactar-pdf", "proteger-pdf"],
  "excel-para-pdf": ["editar-pdf", "compactar-pdf", "proteger-pdf"],
  "destacar-texto": ["editar-pdf", "anotacoes-pdf", "compactar-pdf"],
  "proteger-pdf": ["assinatura-digital-pdf", "remover-metadados", "compactar-pdf"],
  "desbloquear-pdf": ["editar-pdf", "compactar-pdf", "proteger-pdf"],
  "permissoes-pdf": ["proteger-pdf", "remover-metadados", "assinatura-digital-pdf"],
  "marcar-confidencial": ["proteger-pdf", "remover-metadados", "compactar-pdf"],

  "ocr-pdf": ["pdf-para-word", "pdf-para-excel", "limpar-documento-digitalizado"],
  "assinatura-digital-pdf": ["proteger-pdf", "pdf-a", "remover-metadados"],
  "links-pdf": ["bookmarks-pdf", "editar-pdf", "compactar-pdf"],
  "criar-formulario-pdf": ["preencher-formulario-pdf", "assinatura-digital-pdf", "achatar-formulario-pdf"],
  "bookmarks-pdf": ["links-pdf", "organizar-paginas", "compactar-pdf"],
  "comparar-pdfs": ["editar-pdf", "assinatura-digital-pdf", "proteger-pdf"],
  "reparar-pdf": ["otimizar-pdf-avancado", "ocr-pdf", "proteger-pdf"],
  "pdf-a": ["assinatura-digital-pdf", "editar-metadados-pdf", "proteger-pdf"],
  "pdf-para-powerpoint": ["powerpoint-para-pdf", "compactar-pdf", "editar-pdf"],
  "powerpoint-para-pdf": ["editar-pdf", "compactar-pdf", "proteger-pdf"],
  "extrair-imagens-pdf": ["imagens-para-pdf", "pdf-para-png", "editar-pdf"],
  "limpar-documento-digitalizado": ["ocr-pdf", "otimizar-pdf-avancado", "pdf-a"],
  "otimizar-pdf-avancado": ["proteger-pdf", "pdf-a", "assinatura-digital-pdf"],
  "anotacoes-pdf": ["editar-pdf", "comparar-pdfs", "assinatura-digital-pdf"],
  "processamento-lote-pdf": ["otimizar-pdf-avancado", "proteger-pdf", "numeracao-bates"],
  "numeracao-bates": ["bookmarks-pdf", "assinatura-digital-pdf", "proteger-pdf"],
  "editar-metadados-pdf": ["pdf-a", "assinatura-digital-pdf", "proteger-pdf"],
};

export function getNextToolSlugs(slug: ExperienceToolSlug) {
  return nextSteps[slug] || fallback.filter((item) => item !== slug).slice(0, 3);
}

export function readStoredToolSlugs(key: string): ExperienceToolSlug[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(key) || "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((value): value is ExperienceToolSlug => typeof value === "string") : [];
  } catch { return []; }
}

function announceToolExperienceChange(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOOL_EXPERIENCE_CHANGE_EVENT, { detail: { key } }));
}

export function recordRecentTool(slug: ExperienceToolSlug) {
  if (typeof window === "undefined") return;
  try {
    const current = readStoredToolSlugs(TOOL_EXPERIENCE_RECENTS_KEY).filter((item) => item !== slug);
    window.localStorage.setItem(TOOL_EXPERIENCE_RECENTS_KEY, JSON.stringify([slug, ...current].slice(0, 8)));
    announceToolExperienceChange(TOOL_EXPERIENCE_RECENTS_KEY);
  } catch { /* storage opcional */ }
}

export function toggleFavoriteTool(slug: ExperienceToolSlug) {
  const current = readStoredToolSlugs(TOOL_EXPERIENCE_FAVORITES_KEY);
  const next = current.includes(slug) ? current.filter((item) => item !== slug) : [slug, ...current].slice(0, 16);
  try {
    window.localStorage.setItem(TOOL_EXPERIENCE_FAVORITES_KEY, JSON.stringify(next));
    announceToolExperienceChange(TOOL_EXPERIENCE_FAVORITES_KEY);
  } catch { /* storage opcional */ }
  return next;
}
