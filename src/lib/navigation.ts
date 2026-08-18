import { allToolBySlug, type AllToolSlug } from "@/lib/all-tools";

export type NavigationGroup = {
  slug: string;
  label: string;
  title: string;
  description: string;
  icon: "organize" | "edit" | "convert" | "forms" | "sign" | "security" | "optimize";
  accent: "blue" | "green" | "teal" | "purple" | "rose" | "orange";
  tools: AllToolSlug[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    slug: "organizar",
    label: "Organizar",
    title: "Organizar PDF",
    description: "Junte, divida, reordene, gire, extraia e ajuste páginas.",
    icon: "organize",
    accent: "blue",
    tools: [
      "juntar-pdf",
      "dividir-pdf",
      "extrair-paginas",
      "excluir-paginas",
      "organizar-paginas",
      "girar-pdf",
      "duplicar-paginas",
      "inserir-pagina-em-branco",
      "alternar-pdfs",
      "sobrepor-pdfs",
    ],
  },
  {
    slug: "editar",
    label: "Editar",
    title: "Editar PDF",
    description: "Edite, destaque e adicione textos, imagens, fundos e marcas.",
    icon: "edit",
    accent: "green",
    tools: [
      "editar-pdf",
      "adicionar-texto-pdf",
      "adicionar-imagem-pdf",
      "destacar-texto",
      "marca-dagua-pdf",
      "marcar-confidencial",
      "cabecalho-rodape-pdf",
      "numerar-paginas",
      "adicionar-fundo-pdf",
      "espelhar-pdf",
    ],
  },
  {
    slug: "converter",
    label: "Converter",
    title: "Converter PDF",
    description: "Converta PDF para Word, Excel, imagens e texto, ou arquivos Office para PDF.",
    icon: "convert",
    accent: "teal",
    tools: [
      "pdf-para-word",
      "pdf-para-excel",
      "pdf-para-markdown",
      "pdf-para-jpg",
      "pdf-para-png",
      "extrair-texto-pdf",
      "word-para-pdf",
      "excel-para-pdf",
      "imagens-para-pdf",
    ],
  },
  {
    slug: "formularios",
    label: "Formulários",
    title: "Formulários PDF",
    description: "Preencha campos interativos e finalize documentos preenchidos.",
    icon: "forms",
    accent: "purple",
    tools: ["preencher-formulario-pdf", "achatar-formulario-pdf"],
  },
  {
    slug: "assinar",
    label: "Assinar",
    title: "Assinar PDF",
    description: "Desenhe e aplique uma assinatura visual diretamente no documento.",
    icon: "sign",
    accent: "rose",
    tools: ["assinar-pdf"],
  },
  {
    slug: "seguranca",
    label: "Segurança",
    title: "Segurança PDF",
    description: "Proteja por senha, remova proteção e controle permissões do documento.",
    icon: "security",
    accent: "blue",
    tools: ["proteger-pdf", "desbloquear-pdf", "permissoes-pdf", "marcar-confidencial", "remover-metadados"],
  },
  {
    slug: "otimizar",
    label: "Otimizar",
    title: "Otimizar PDF",
    description: "Comprima, recorte, redimensione e prepare PDFs para impressão.",
    icon: "optimize",
    accent: "orange",
    tools: [
      "compactar-pdf",
      "pdf-em-escala-de-cinza",
      "recortar-pdf",
      "redimensionar-pdf",
      "criar-livreto-pdf",
      "paginas-por-folha",
    ],
  },
];

export const navigationGroupBySlug = new Map(
  navigationGroups.map((group) => [group.slug, group]),
);

export function getGroupTools(group: NavigationGroup) {
  return group.tools
    .map((slug) => allToolBySlug.get(slug))
    .filter((tool) => tool !== undefined);
}
