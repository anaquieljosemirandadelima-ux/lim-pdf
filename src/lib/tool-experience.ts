import type { CatalogToolSlug } from "@/lib/catalog-groups";

export const TOOL_EXPERIENCE_RECENTS_KEY = "limpdf:tool-recents:v2";
export const TOOL_EXPERIENCE_FAVORITES_KEY = "limpdf:tool-favorites:v2";
export const TOOL_EXPERIENCE_CHANGE_EVENT = "limpdf:tool-experience-change";

const fallback: CatalogToolSlug[] = ["editar-pdf", "compactar-pdf", "proteger-pdf"];

const nextSteps: Partial<Record<CatalogToolSlug, CatalogToolSlug[]>> = {
  "editar-pdf": ["compactar-pdf", "proteger-pdf", "assinar-pdf"],
  "juntar-pdf": ["organizar-paginas", "compactar-pdf", "proteger-pdf"],
  "dividir-pdf": ["juntar-pdf", "compactar-pdf", "editar-pdf"],
  "extrair-paginas": ["juntar-pdf", "editar-pdf", "compactar-pdf"],
  "excluir-paginas": ["organizar-paginas", "compactar-pdf", "proteger-pdf"],
  "organizar-paginas": ["numerar-paginas", "compactar-pdf", "proteger-pdf"],
  "girar-pdf": ["organizar-paginas", "compactar-pdf", "editar-pdf"],
  "duplicar-paginas": ["organizar-paginas", "numerar-paginas", "compactar-pdf"],
  "inserir-pagina-em-branco": ["editar-pdf", "organizar-paginas", "numerar-paginas"],
  "alternar-pdfs": ["organizar-paginas", "compactar-pdf", "proteger-pdf"],
  "sobrepor-pdfs": ["editar-pdf", "compactar-pdf", "proteger-pdf"],
  "numerar-paginas": ["cabecalho-rodape-pdf", "compactar-pdf", "proteger-pdf"],
  "marca-dagua-pdf": ["marcar-confidencial", "proteger-pdf", "compactar-pdf"],
  "adicionar-texto-pdf": ["assinar-pdf", "compactar-pdf", "proteger-pdf"],
  "adicionar-imagem-pdf": ["editar-pdf", "compactar-pdf", "proteger-pdf"],
  "assinar-pdf": ["proteger-pdf", "marcar-confidencial", "compactar-pdf"],
  "remover-metadados": ["proteger-pdf", "compactar-pdf", "marcar-confidencial"],
  "recortar-pdf": ["redimensionar-pdf", "compactar-pdf", "editar-pdf"],
  "redimensionar-pdf": ["compactar-pdf", "paginas-por-folha", "proteger-pdf"],
  "criar-livreto-pdf": ["compactar-pdf", "proteger-pdf", "numerar-paginas"],
  "paginas-por-folha": ["compactar-pdf", "proteger-pdf", "espelhar-pdf"],
  "imagens-para-pdf": ["editar-pdf", "compactar-pdf", "proteger-pdf"],
  "pdf-para-jpg": ["imagens-para-pdf", "editar-pdf", "compactar-pdf"],
  "pdf-para-png": ["imagens-para-pdf", "editar-pdf", "compactar-pdf"],
  "compactar-pdf": ["proteger-pdf", "editar-pdf", "assinar-pdf"],
  "pdf-em-escala-de-cinza": ["compactar-pdf", "proteger-pdf", "editar-pdf"],
  "extrair-texto-pdf": ["pdf-para-word", "pdf-para-excel", "editar-pdf"],
  "preencher-formulario-pdf": ["achatar-formulario-pdf", "assinar-pdf", "proteger-pdf"],
  "achatar-formulario-pdf": ["assinar-pdf", "proteger-pdf", "compactar-pdf"],
  "cabecalho-rodape-pdf": ["numerar-paginas", "compactar-pdf", "proteger-pdf"],
  "espelhar-pdf": ["paginas-por-folha", "compactar-pdf", "proteger-pdf"],
  "adicionar-fundo-pdf": ["editar-pdf", "marca-dagua-pdf", "compactar-pdf"],
  "pdf-para-word": ["word-para-pdf", "editar-pdf", "compactar-pdf"],
  "pdf-para-excel": ["excel-para-pdf", "editar-pdf", "compactar-pdf"],
  "word-para-pdf": ["editar-pdf", "compactar-pdf", "proteger-pdf"],
  "excel-para-pdf": ["editar-pdf", "compactar-pdf", "proteger-pdf"],
  "destacar-texto": ["editar-pdf", "assinar-pdf", "compactar-pdf"],
  "proteger-pdf": ["compactar-pdf", "marcar-confidencial", "remover-metadados"],
  "desbloquear-pdf": ["editar-pdf", "compactar-pdf", "proteger-pdf"],
  "permissoes-pdf": ["proteger-pdf", "remover-metadados", "compactar-pdf"],
  "marcar-confidencial": ["proteger-pdf", "remover-metadados", "compactar-pdf"],
  "converter-pdf": ["pdf-para-word", "pdf-para-markdown", "imagens-para-pdf"],
  "ocr-pdf": ["editar-pdf", "pdf-para-word", "preflight-pdf"],
  "dimensionar-pdf": ["criar-livreto-pdf", "paginas-por-folha", "preflight-pdf"],
  "preflight-pdf": ["criar-livreto-pdf", "proteger-pdf", "assinar-pdf"],
  "bookmarks-pdf": ["links-pdf", "anotacoes-pdf", "preflight-pdf"],
  "links-pdf": ["bookmarks-pdf", "anotacoes-pdf", "editar-pdf"],
  "anotacoes-pdf": ["editar-pdf", "links-pdf", "assinar-pdf"],
  "criar-formulario-pdf": ["preencher-formulario-pdf", "achatar-formulario-pdf", "assinatura-digital-pdf"],
  "assinatura-digital-pdf": ["criar-formulario-pdf", "proteger-pdf", "preflight-pdf"],
  "comparar-pdfs": ["processamento-lote-pdf", "editar-pdf", "preflight-pdf"],
  "processamento-lote-pdf": ["comparar-pdfs", "compactar-pdf", "proteger-pdf"],
  "reparar-pdf": ["limpar-documento-digitalizado", "preflight-pdf", "compactar-pdf"],
  "limpar-documento-digitalizado": ["ocr-pdf", "reparar-pdf", "compactar-pdf"],
  "otimizar-pdf-avancado": ["preflight-pdf", "compactar-pdf", "pdf-a"],
  "editar-metadados-pdf": ["remover-metadados", "pdf-a", "proteger-pdf"],
  "pdf-a": ["editar-metadados-pdf", "preflight-pdf", "proteger-pdf"],
  "numeracao-bates": ["pdf-a", "proteger-pdf", "preflight-pdf"],
  "extrair-imagens-pdf": ["pdf-para-jpg", "imagens-para-pdf", "compactar-pdf"],
  "pdf-para-powerpoint": ["powerpoint-para-pdf", "editar-pdf", "compactar-pdf"],
  "powerpoint-para-pdf": ["pdf-para-powerpoint", "editar-pdf", "compactar-pdf"],
};

export function getNextToolSlugs(slug: CatalogToolSlug) {
  return nextSteps[slug] || fallback.filter((item) => item !== slug).slice(0, 3);
}

export function readStoredToolSlugs(key: string): CatalogToolSlug[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(key) || "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((value): value is CatalogToolSlug => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function announceToolExperienceChange(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOOL_EXPERIENCE_CHANGE_EVENT, { detail: { key } }));
}

export function recordRecentTool(slug: CatalogToolSlug) {
  if (typeof window === "undefined") return;
  try {
    const current = readStoredToolSlugs(TOOL_EXPERIENCE_RECENTS_KEY).filter((item) => item !== slug);
    window.localStorage.setItem(TOOL_EXPERIENCE_RECENTS_KEY, JSON.stringify([slug, ...current].slice(0, 8)));
    announceToolExperienceChange(TOOL_EXPERIENCE_RECENTS_KEY);
  } catch {
    // Storage is an enhancement only.
  }
}

export function toggleFavoriteTool(slug: CatalogToolSlug) {
  const current = readStoredToolSlugs(TOOL_EXPERIENCE_FAVORITES_KEY);
  const next = current.includes(slug) ? current.filter((item) => item !== slug) : [slug, ...current].slice(0, 16);
  try {
    window.localStorage.setItem(TOOL_EXPERIENCE_FAVORITES_KEY, JSON.stringify(next));
    announceToolExperienceChange(TOOL_EXPERIENCE_FAVORITES_KEY);
  } catch {
    // Storage is an enhancement only.
  }
  return next;
}
