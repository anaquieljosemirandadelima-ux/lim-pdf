import type { AllToolSlug } from "@/lib/all-tools";

export const TOOL_EXPERIENCE_RECENTS_KEY = "limpdf:tool-recents:v2";
export const TOOL_EXPERIENCE_FAVORITES_KEY = "limpdf:tool-favorites:v2";
export const TOOL_EXPERIENCE_CHANGE_EVENT = "limpdf:tool-experience-change";

const fallback: AllToolSlug[] = ["editar-pdf", "compactar-pdf", "proteger-pdf"];

const nextSteps: Partial<Record<AllToolSlug, AllToolSlug[]>> = {
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
};

export function getNextToolSlugs(slug: AllToolSlug) {
  return nextSteps[slug] || fallback.filter((item) => item !== slug).slice(0, 3);
}

export function readStoredToolSlugs(key: string): AllToolSlug[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(key) || "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((value): value is AllToolSlug => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function announceToolExperienceChange(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOOL_EXPERIENCE_CHANGE_EVENT, { detail: { key } }));
}

export function recordRecentTool(slug: AllToolSlug) {
  if (typeof window === "undefined") return;
  try {
    const current = readStoredToolSlugs(TOOL_EXPERIENCE_RECENTS_KEY).filter((item) => item !== slug);
    window.localStorage.setItem(TOOL_EXPERIENCE_RECENTS_KEY, JSON.stringify([slug, ...current].slice(0, 8)));
    announceToolExperienceChange(TOOL_EXPERIENCE_RECENTS_KEY);
  } catch {
    // Storage is an enhancement only.
  }
}

export function toggleFavoriteTool(slug: AllToolSlug) {
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
