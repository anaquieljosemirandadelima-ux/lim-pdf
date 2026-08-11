import { allToolBySlug, type AllToolSlug } from "@/lib/all-tools";
import { proTools, type ProToolSlug } from "@/lib/pro-tools";
import { releaseToolBySlug, type ReleaseToolSlug } from "@/lib/release-tools";

export type NavigationToolSlug = AllToolSlug | ProToolSlug | ReleaseToolSlug;
export type NavigationGroup = {
  slug: string;
  label: string;
  title: string;
  description: string;
  icon: "organize" | "edit" | "convert" | "forms" | "sign" | "security" | "optimize";
  accent: "blue" | "green" | "teal" | "purple" | "rose" | "orange";
  tools: NavigationToolSlug[];
};

const proToolBySlug = new Map(proTools.map((tool) => [tool.slug as ProToolSlug, tool]));

export const navigationGroups: NavigationGroup[] = [
  {
    slug: "organizar",
    label: "Organizar",
    title: "Organizar PDF",
    description: "Junte, divida, reordene, dimensione, compare, marque e processe documentos em lote.",
    icon: "organize",
    accent: "blue",
    tools: [
      "normalizar-paginas-pdf", "juntar-pdf", "dividir-pdf", "extrair-paginas", "excluir-paginas", "organizar-paginas", "girar-pdf", "duplicar-paginas", "inserir-pagina-em-branco", "alternar-pdfs", "sobrepor-pdfs",
      "bookmarks-pdf", "comparar-pdfs", "processamento-lote-pdf", "numeracao-bates",
    ],
  },
  {
    slug: "editar",
    label: "Editar",
    title: "Editar PDF",
    description: "Edite, destaque, anote, insira links, imagens, fundos, marcas e metadados.",
    icon: "edit",
    accent: "green",
    tools: [
      "editar-pdf", "links-pdf", "anotacoes-pdf", "editar-metadados-pdf", "adicionar-texto-pdf", "adicionar-imagem-pdf", "destacar-texto", "marca-dagua-pdf", "marcar-confidencial", "cabecalho-rodape-pdf", "numerar-paginas", "adicionar-fundo-pdf", "espelhar-pdf",
    ],
  },
  {
    slug: "converter",
    label: "Converter",
    title: "Converter PDF",
    description: "Envie o arquivo uma vez, escolha a saída e use OCR real para PDFs escaneados.",
    icon: "convert",
    accent: "teal",
    tools: [
      "converter-pdf", "ocr-pdf", "pdf-para-word", "pdf-para-excel", "pdf-para-powerpoint", "pdf-para-jpg", "pdf-para-png", "extrair-imagens-pdf", "extrair-texto-pdf", "word-para-pdf", "excel-para-pdf", "powerpoint-para-pdf", "imagens-para-pdf",
    ],
  },
  {
    slug: "formularios",
    label: "Formulários",
    title: "Formulários PDF",
    description: "Crie campos interativos, preencha formulários e finalize documentos preenchidos.",
    icon: "forms",
    accent: "purple",
    tools: ["criar-formulario-pdf", "preencher-formulario-pdf", "achatar-formulario-pdf"],
  },
  {
    slug: "assinar",
    label: "Assinar",
    title: "Assinar PDF",
    description: "Aplique assinatura visual ou assinatura digital criptográfica PAdES básica.",
    icon: "sign",
    accent: "rose",
    tools: ["assinar-pdf", "assinatura-digital-pdf"],
  },
  {
    slug: "seguranca",
    label: "Segurança",
    title: "Segurança e revisão de PDF",
    description: "Revise, proteja, desbloqueie, controle permissões, repare e prepare documentos para arquivamento.",
    icon: "security",
    accent: "blue",
    tools: ["preflight-pdf", "proteger-pdf", "desbloquear-pdf", "permissoes-pdf", "assinatura-digital-pdf", "marcar-confidencial", "remover-metadados", "reparar-pdf", "pdf-a"],
  },
  {
    slug: "otimizar",
    label: "Otimizar",
    title: "Otimizar PDF",
    description: "Comprima, limpe digitalizações, dimensione, recorte e prepare PDFs para uso ou impressão.",
    icon: "optimize",
    accent: "orange",
    tools: [
      "normalizar-paginas-pdf", "preflight-pdf", "otimizar-pdf-avancado", "limpar-documento-digitalizado", "compactar-pdf", "pdf-em-escala-de-cinza", "recortar-pdf", "redimensionar-pdf", "criar-livreto-pdf", "paginas-por-folha",
    ],
  },
];

export const navigationGroupBySlug = new Map(navigationGroups.map((group) => [group.slug, group]));

export function getGroupTools(group: NavigationGroup) {
  return group.tools
    .map((slug) => releaseToolBySlug.get(slug as ReleaseToolSlug) || proToolBySlug.get(slug as ProToolSlug) || allToolBySlug.get(slug as AllToolSlug))
    .filter((tool) => tool !== undefined);
}
