import { allTools, type AllToolSlug, type AnyToolDefinition } from "@/lib/all-tools";
import { proTools, type ProToolDefinition, type ProToolSlug } from "@/lib/pro-tools";

export type StandaloneToolSlug = "converter-pdf" | "ocr-pdf" | "dimensionar-pdf" | "preflight-pdf";
export type CatalogToolSlug = AllToolSlug | ProToolSlug | StandaloneToolSlug;
export type StandaloneToolDefinition = Omit<AnyToolDefinition, "slug"> & { slug: StandaloneToolSlug };
export type CatalogToolDefinition = AnyToolDefinition | ProToolDefinition | StandaloneToolDefinition;
export type CatalogGroupId = "organizar" | "editar" | "converter" | "formularios" | "seguranca" | "otimizar" | "automacao";

export type CatalogGroupDefinition = {
  id: CatalogGroupId;
  title: string;
  description: string;
  accent: "blue" | "orange" | "green" | "purple" | "teal" | "rose";
  tools: CatalogToolSlug[];
};

/**
 * Taxonomia de descoberta: cada ferramenta aparece uma única vez.
 * Capacidades compostas como lote e comparação ficam juntas para evitar
 * cards concorrentes que levam o utilizador à mesma intenção.
 */
export const catalogGroups: CatalogGroupDefinition[] = [
  {
    id: "organizar",
    title: "Organizar e combinar",
    description: "Monte, separe, reordene e navegue por documentos longos.",
    accent: "blue",
    tools: [
      "juntar-pdf", "dividir-pdf", "extrair-paginas", "excluir-paginas", "organizar-paginas",
      "girar-pdf", "duplicar-paginas", "inserir-pagina-em-branco", "alternar-pdfs", "sobrepor-pdfs",
      "bookmarks-pdf",
    ],
  },
  {
    id: "editar",
    title: "Editar, anotar e navegar",
    description: "Altere visualmente, revise e adicione elementos ao PDF.",
    accent: "green",
    tools: [
      "editar-pdf", "adicionar-texto-pdf", "adicionar-imagem-pdf", "destacar-texto", "marca-dagua-pdf",
      "marcar-confidencial", "cabecalho-rodape-pdf", "numerar-paginas", "adicionar-fundo-pdf", "espelhar-pdf",
      "links-pdf", "anotacoes-pdf",
    ],
  },
  {
    id: "converter",
    title: "Converter e extrair",
    description: "Escolha o formato de saída e preserve o conteúdo que precisa reutilizar.",
    accent: "teal",
    tools: [
      "converter-pdf", "ocr-pdf", "pdf-para-word", "pdf-para-excel", "pdf-para-markdown", "pdf-para-powerpoint", "pdf-para-jpg",
      "pdf-para-png", "extrair-texto-pdf", "extrair-imagens-pdf", "word-para-pdf", "excel-para-pdf",
      "powerpoint-para-pdf", "imagens-para-pdf",
    ],
  },
  {
    id: "formularios",
    title: "Formulários e assinaturas",
    description: "Preencha, crie, revise, achate e assine documentos.",
    accent: "purple",
    tools: [
      "preencher-formulario-pdf", "criar-formulario-pdf", "achatar-formulario-pdf", "assinar-pdf", "assinatura-digital-pdf",
    ],
  },
  {
    id: "seguranca",
    title: "Proteger e conformidade",
    description: "Controle acesso, privacidade, metadados, arquivamento e identificação.",
    accent: "rose",
    tools: [
      "proteger-pdf", "desbloquear-pdf", "permissoes-pdf", "remover-metadados", "editar-metadados-pdf",
      "pdf-a", "numeracao-bates",
    ],
  },
  {
    id: "otimizar",
    title: "Otimizar e preparar",
    description: "Reduza, corrija, limpe, recorte e prepare o documento para entrega ou impressão.",
    accent: "orange",
    tools: [
      "preflight-pdf", "dimensionar-pdf", "compactar-pdf", "pdf-em-escala-de-cinza", "recortar-pdf", "redimensionar-pdf", "criar-livreto-pdf",
      "paginas-por-folha", "reparar-pdf", "limpar-documento-digitalizado", "otimizar-pdf-avancado",
    ],
  },
  {
    id: "automacao",
    title: "Comparar e processar em lote",
    description: "Execute operações repetitivas e revise versões sem sair do navegador.",
    accent: "blue",
    tools: ["comparar-pdfs", "processamento-lote-pdf"],
  },
];

export const catalogGroupById = new Map(catalogGroups.map((group) => [group.id, group]));

const standaloneTools: StandaloneToolDefinition[] = [
  {
    slug: "converter-pdf", name: "Conversor PDF", shortDescription: "Escolha a conversão depois do upload.", description: "Abra um PDF e escolha a saída adequada sem procurar outra ferramenta.", category: "Converter de PDF", icon: "FileOutput", accent: "teal", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["converter pdf", "conversor", "pdf para word", "pdf para excel", "pdf para imagem", "pdf para markdown"], intro: "Comece pelo documento e escolha o formato de saída depois.", useCases: ["Converter PDF para Word", "Extrair tabelas para Excel", "Gerar imagens", "Criar Markdown"], limitations: ["A qualidade da saída depende do texto e da estrutura do PDF"], faq: [],
  },
  {
    slug: "ocr-pdf", name: "OCR PDF", shortDescription: "Torne digitalizações pesquisáveis.", description: "Reconheça texto em páginas digitalizadas com processamento local e revisão de confiança.", category: "Converter de PDF", icon: "TextSearch", accent: "teal", accept: "application/pdf,.pdf", multiple: true,
    keywords: ["ocr", "texto pesquisável", "digitalização", "scanner", "reconhecer texto"], intro: "Transforme uma imagem digitalizada em PDF pesquisável.", useCases: ["Pesquisar documentos escaneados", "Reconhecer recibos", "Preparar arquivos para edição"], limitations: ["OCR é automático e documentos importantes precisam de revisão"], faq: [],
  },
  {
    slug: "dimensionar-pdf", name: "Dimensionar página", shortDescription: "Padronize A4, Carta, A3 ou tamanho personalizado.", description: "Ajuste o tamanho das páginas antes de entregar ou imprimir.", category: "Otimizar e proteger", icon: "Scaling", accent: "orange", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["dimensionar pdf", "redimensionar", "a4", "carta", "a3", "impressão"], intro: "Deixe todas as páginas prontas para o formato de destino.", useCases: ["Padronizar páginas", "Preparar para A4", "Corrigir tamanhos misturados"], limitations: ["A escala pode alterar a disposição visual do documento"], faq: [],
  },
  {
    slug: "preflight-pdf", name: "Revisar PDF", shortDescription: "Cheque qualidade, privacidade e impressão.", description: "Analise o PDF localmente antes de enviar, imprimir ou arquivar.", category: "Otimizar e proteger", icon: "ListChecks", accent: "rose", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["preflight", "revisar pdf", "privacidade", "impressão", "pdf/a", "qualidade"], intro: "Faça uma revisão final sem alterar o documento original.", useCases: ["Conferir metadados", "Verificar links", "Preparar impressão", "Exportar relatório"], limitations: ["O relatório é uma orientação técnica e não substitui validação jurídica ou editorial"], faq: [],
  },
];

export const catalogToolBySlug = new Map<CatalogToolSlug, CatalogToolDefinition>([
  ...allTools.map((tool) => [tool.slug, tool] as const),
  ...proTools.map((tool) => [tool.slug, tool] as const),
  ...standaloneTools.map((tool) => [tool.slug, tool] as const),
]);

export function getCatalogGroupForTool(slug: CatalogToolSlug) {
  return catalogGroups.find((group) => group.tools.includes(slug));
}

export function getCatalogDuplicateSlugs() {
  const counts = new Map<CatalogToolSlug, number>();
  for (const group of catalogGroups) {
    for (const slug of group.tools) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([slug]) => slug);
}
