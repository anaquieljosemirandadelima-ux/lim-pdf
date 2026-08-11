import type { AllToolSlug } from "@/lib/all-tools";
import type { ProToolSlug } from "@/lib/pro-tools";
import type { ReleaseToolSlug } from "@/lib/release-tools";

export type ExperienceToolSlug = AllToolSlug | ProToolSlug | ReleaseToolSlug;
export const TOOL_EXPERIENCE_RECENTS_KEY = "limpdf:tool-recents:v4";
export const TOOL_EXPERIENCE_FAVORITES_KEY = "limpdf:tool-favorites:v4";
export const TOOL_EXPERIENCE_CHANGE_EVENT = "limpdf:tool-experience-change";

const fallback: ExperienceToolSlug[] = ["editar-pdf", "converter-pdf", "preflight-pdf"];
const nextSteps: Partial<Record<ExperienceToolSlug, ExperienceToolSlug[]>> = {
  "editar-pdf": ["preflight-pdf", "compactar-pdf", "proteger-pdf"],
  "juntar-pdf": ["organizar-paginas", "normalizar-paginas-pdf", "compactar-pdf"],
  "dividir-pdf": ["juntar-pdf", "compactar-pdf", "editar-pdf"],
  "extrair-paginas": ["juntar-pdf", "editar-pdf", "compactar-pdf"],
  "excluir-paginas": ["organizar-paginas", "compactar-pdf", "proteger-pdf"],
  "organizar-paginas": ["normalizar-paginas-pdf", "numerar-paginas", "preflight-pdf"],
  "girar-pdf": ["normalizar-paginas-pdf", "preflight-pdf", "editar-pdf"],
  "duplicar-paginas": ["organizar-paginas", "numerar-paginas", "compactar-pdf"],
  "inserir-pagina-em-branco": ["editar-pdf", "organizar-paginas", "numerar-paginas"],
  "alternar-pdfs": ["organizar-paginas", "comparar-pdfs", "compactar-pdf"],
  "sobrepor-pdfs": ["editar-pdf", "comparar-pdfs", "compactar-pdf"],
  "numerar-paginas": ["cabecalho-rodape-pdf", "numeracao-bates", "preflight-pdf"],
  "marca-dagua-pdf": ["marcar-confidencial", "proteger-pdf", "preflight-pdf"],
  "adicionar-texto-pdf": ["editar-pdf", "assinar-pdf", "preflight-pdf"],
  "adicionar-imagem-pdf": ["editar-pdf", "compactar-pdf", "preflight-pdf"],
  "assinar-pdf": ["assinatura-digital-pdf", "preflight-pdf", "proteger-pdf"],
  "remover-metadados": ["preflight-pdf", "proteger-pdf", "compactar-pdf"],
  "recortar-pdf": ["normalizar-paginas-pdf", "compactar-pdf", "preflight-pdf"],
  "redimensionar-pdf": ["normalizar-paginas-pdf", "preflight-pdf", "compactar-pdf"],
  "criar-livreto-pdf": ["compactar-pdf", "preflight-pdf", "numerar-paginas"],
  "paginas-por-folha": ["compactar-pdf", "preflight-pdf", "proteger-pdf"],
  "imagens-para-pdf": ["ocr-pdf", "editar-pdf", "preflight-pdf"],
  "pdf-para-jpg": ["converter-pdf", "extrair-imagens-pdf", "editar-pdf"],
  "pdf-para-png": ["converter-pdf", "extrair-imagens-pdf", "editar-pdf"],
  "compactar-pdf": ["preflight-pdf", "proteger-pdf", "editar-pdf"],
  "pdf-em-escala-de-cinza": ["compactar-pdf", "limpar-documento-digitalizado", "preflight-pdf"],
  "extrair-texto-pdf": ["ocr-pdf", "converter-pdf", "pdf-para-word"],
  "preencher-formulario-pdf": ["achatar-formulario-pdf", "assinar-pdf", "preflight-pdf"],
  "achatar-formulario-pdf": ["assinatura-digital-pdf", "preflight-pdf", "proteger-pdf"],
  "cabecalho-rodape-pdf": ["numerar-paginas", "numeracao-bates", "preflight-pdf"],
  "espelhar-pdf": ["paginas-por-folha", "preflight-pdf", "compactar-pdf"],
  "adicionar-fundo-pdf": ["editar-pdf", "marca-dagua-pdf", "preflight-pdf"],
  "pdf-para-word": ["converter-pdf", "ocr-pdf", "editar-pdf"],
  "pdf-para-excel": ["converter-pdf", "ocr-pdf", "editar-pdf"],
  "word-para-pdf": ["editar-pdf", "preflight-pdf", "compactar-pdf"],
  "excel-para-pdf": ["preflight-pdf", "compactar-pdf", "proteger-pdf"],
  "destacar-texto": ["editar-pdf", "anotacoes-pdf", "preflight-pdf"],
  "proteger-pdf": ["preflight-pdf", "assinatura-digital-pdf", "remover-metadados"],
  "desbloquear-pdf": ["editar-pdf", "preflight-pdf", "proteger-pdf"],
  "permissoes-pdf": ["proteger-pdf", "preflight-pdf", "assinatura-digital-pdf"],
  "marcar-confidencial": ["proteger-pdf", "preflight-pdf", "remover-metadados"],
  "ocr-pdf": ["converter-pdf", "pdf-para-word", "editar-pdf"],
  "assinatura-digital-pdf": ["preflight-pdf", "proteger-pdf", "pdf-a"],
  "links-pdf": ["bookmarks-pdf", "editar-pdf", "preflight-pdf"],
  "criar-formulario-pdf": ["preencher-formulario-pdf", "assinatura-digital-pdf", "preflight-pdf"],
  "bookmarks-pdf": ["links-pdf", "organizar-paginas", "preflight-pdf"],
  "comparar-pdfs": ["editar-pdf", "preflight-pdf", "proteger-pdf"],
  "reparar-pdf": ["preflight-pdf", "otimizar-pdf-avancado", "ocr-pdf"],
  "pdf-a": ["preflight-pdf", "assinatura-digital-pdf", "editar-metadados-pdf"],
  "pdf-para-powerpoint": ["converter-pdf", "preflight-pdf", "editar-pdf"],
  "powerpoint-para-pdf": ["converter-pdf", "preflight-pdf", "compactar-pdf"],
  "extrair-imagens-pdf": ["converter-pdf", "imagens-para-pdf", "editar-pdf"],
  "limpar-documento-digitalizado": ["ocr-pdf", "preflight-pdf", "otimizar-pdf-avancado"],
  "otimizar-pdf-avancado": ["preflight-pdf", "proteger-pdf", "pdf-a"],
  "anotacoes-pdf": ["editar-pdf", "comparar-pdfs", "preflight-pdf"],
  "processamento-lote-pdf": ["preflight-pdf", "otimizar-pdf-avancado", "numeracao-bates"],
  "numeracao-bates": ["preflight-pdf", "bookmarks-pdf", "assinatura-digital-pdf"],
  "editar-metadados-pdf": ["preflight-pdf", "pdf-a", "proteger-pdf"],
  "converter-pdf": ["ocr-pdf", "editar-pdf", "preflight-pdf"],
  "normalizar-paginas-pdf": ["preflight-pdf", "compactar-pdf", "editar-pdf"],
  "preflight-pdf": ["editar-pdf", "ocr-pdf", "normalizar-paginas-pdf"],
};

export function getNextToolSlugs(slug: ExperienceToolSlug) { return nextSteps[slug] || fallback.filter((item) => item !== slug).slice(0, 3); }
export function readStoredToolSlugs(key: string): ExperienceToolSlug[] {
  if (typeof window === "undefined") return [];
  try { const raw = JSON.parse(window.localStorage.getItem(key) || "[]") as unknown; return Array.isArray(raw) ? raw.filter((value): value is ExperienceToolSlug => typeof value === "string") : []; } catch { return []; }
}
function announceToolExperienceChange(key: string) { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(TOOL_EXPERIENCE_CHANGE_EVENT, { detail: { key } })); }
export function recordRecentTool(slug: ExperienceToolSlug) {
  if (typeof window === "undefined") return;
  try { const current = readStoredToolSlugs(TOOL_EXPERIENCE_RECENTS_KEY).filter((item) => item !== slug); window.localStorage.setItem(TOOL_EXPERIENCE_RECENTS_KEY, JSON.stringify([slug, ...current].slice(0, 8))); announceToolExperienceChange(TOOL_EXPERIENCE_RECENTS_KEY); } catch { /* storage opcional */ }
}
export function toggleFavoriteTool(slug: ExperienceToolSlug) {
  const current = readStoredToolSlugs(TOOL_EXPERIENCE_FAVORITES_KEY); const next = current.includes(slug) ? current.filter((item) => item !== slug) : [slug, ...current].slice(0, 16);
  try { window.localStorage.setItem(TOOL_EXPERIENCE_FAVORITES_KEY, JSON.stringify(next)); announceToolExperienceChange(TOOL_EXPERIENCE_FAVORITES_KEY); } catch { /* storage opcional */ }
  return next;
}
