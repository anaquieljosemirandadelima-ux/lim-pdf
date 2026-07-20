import type { ToolSlug } from "@/lib/tools";

export type WorkflowDefinition = {
  slug: string;
  title: string;
  description: string;
  accent: "blue" | "orange" | "green" | "purple" | "teal" | "rose";
  tools: ToolSlug[];
};

export const workflows: WorkflowDefinition[] = [
  {
    slug: "preparar-envio",
    title: "Preparar PDF para envio",
    description: "Compacte, remova metadados e proteja a apresentacao antes de compartilhar.",
    accent: "blue",
    tools: ["compactar-pdf", "remover-metadados", "pdf-em-escala-de-cinza"],
  },
  {
    slug: "editar-assinar",
    title: "Editar, preencher e assinar",
    description: "Ajuste texto, preencha campos, assine e fixe o formulario final.",
    accent: "purple",
    tools: ["editar-pdf", "preencher-formulario-pdf", "assinar-pdf", "achatar-formulario-pdf"],
  },
  {
    slug: "organizar-documento",
    title: "Organizar documento completo",
    description: "Junte arquivos, reorganize páginas, numere e exporte uma versão limpa.",
    accent: "green",
    tools: ["juntar-pdf", "organizar-paginas", "numerar-paginas", "excluir-paginas"],
  },
  {
    slug: "converter-imagens",
    title: "Converter PDF e imagens",
    description: "Transforme páginas em imagens ou monte um PDF a partir de fotos.",
    accent: "teal",
    tools: ["pdf-para-jpg", "pdf-para-png", "imagens-para-pdf", "extrair-texto-pdf"],
  },
  {
    slug: "impressao",
    title: "Preparar para impressao",
    description: "Ajuste tamanho, margens, orientacao e economia de papel.",
    accent: "orange",
    tools: ["redimensionar-pdf", "criar-livreto-pdf", "recortar-pdf", "paginas-por-folha"],
  },
];

export function getWorkflowsForTool(slug: ToolSlug) {
  return workflows.filter((workflow) => workflow.tools.includes(slug));
}
