import type { ToolDefinition } from "@/lib/tools";

export type ReleaseToolSlug = "converter-pdf" | "normalizar-paginas-pdf" | "preflight-pdf";
export type ReleaseToolDefinition = Omit<ToolDefinition, "slug"> & { slug: ReleaseToolSlug };

const privacyFaq = { question: "O arquivo é enviado ao LIM PDF?", answer: "Não. O processamento desta ferramenta acontece no navegador e o conteúdo do documento não é enviado ao LIM PDF." };

export const releaseTools: ReleaseToolDefinition[] = [
  {
    slug: "converter-pdf", name: "Converter PDF", shortDescription: "Envie uma vez e escolha o formato de saída depois do upload.", description: "Converta PDF para Word, Excel, PowerPoint, JPG, PNG ou TXT e converta DOCX, XLSX e PPTX para PDF em um único fluxo.", category: "Converter de PDF", icon: "FileOutput", accent: "blue", accept: "application/pdf,.pdf,.docx,.xlsx,.pptx", multiple: false,
    keywords: ["converter pdf", "converter pdf online", "pdf para word", "pdf para excel", "pdf para powerpoint", "pdf para jpg", "pdf para png"],
    intro: "Um conversor central para quando você não quer voltar ao catálogo apenas para trocar o formato. O arquivo permanece selecionado enquanto você muda a saída.",
    useCases: ["Experimentar outro formato sem reenviar o documento", "Converter PDF para Office ou imagem", "Transformar Word, Excel ou PowerPoint em PDF", "Escolher qualidade de imagem antes do download"],
    limitations: ["PDFs escaneados precisam de OCR para gerar texto editável", "Macros, SmartArt, vídeo e alguns efeitos proprietários do Office não são executados", "Revise documentos com layout complexo depois da conversão"],
    faq: [{ question: "Posso mudar o formato depois de enviar o arquivo?", answer: "Sim. A escolha Converter para fica ao lado do arquivo e pode ser alterada sem novo upload." }, privacyFaq],
  },
  {
    slug: "normalizar-paginas-pdf", name: "Dimensionar páginas PDF", shortDescription: "Padronize páginas em A3, A4, A5, Carta, Legal ou tamanho personalizado.", description: "Redimensione páginas e reposicione o conteúdo com ajuste proporcional, centralização, preenchimento ou esticamento controlado.", category: "Organizar PDF", icon: "Scaling", accent: "purple", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["dimensionar pdf", "tamanho pagina pdf", "redimensionar página pdf", "pdf a4", "padronizar pdf"],
    intro: "Corrija documentos com folhas de tamanhos diferentes e prepare um PDF uniforme para impressão, apresentação ou arquivamento.",
    useCases: ["Transformar páginas em A4", "Padronizar digitalizações com dimensões diferentes", "Converter Carta para A4", "Criar formato personalizado em milímetros"],
    limitations: ["O modo Preencher pode cortar bordas", "O modo Esticar pode deformar o conteúdo", "Elementos interativos podem ser achatados quando o conteúdo precisa ser redesenhado em outra página"],
    faq: [{ question: "Qual modo preserva a proporção?", answer: "Ajustar preserva a proporção e garante que todo o conteúdo caiba na página final." }, privacyFaq],
  },
  {
    slug: "preflight-pdf", name: "Preflight PDF", shortDescription: "Faça um check-up de páginas, texto, formulários, anotações e metadados.", description: "Analise o PDF antes de compartilhar: tamanhos mistos, orientação, camada de texto, formulários, anotações e metadados com recomendações objetivas.", category: "Otimizar e proteger", icon: "ListChecks", accent: "green", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["preflight pdf", "verificar pdf", "check pdf", "analisar pdf", "tamanho páginas pdf"],
    intro: "Um diagnóstico local para encontrar problemas comuns antes de imprimir, enviar, assinar ou arquivar um documento.",
    useCases: ["Detectar páginas sem OCR", "Encontrar tamanhos de página mistos", "Conferir campos de formulário e anotações", "Revisar metadados antes da distribuição"],
    limitations: ["Não substitui preflight gráfico especializado de impressão", "Não certifica conformidade PDF/A", "Não substitui validação jurídica ou criptográfica de assinaturas"],
    faq: [{ question: "O Preflight altera o PDF?", answer: "Não. Ele apenas lê a estrutura e gera um diagnóstico; o arquivo original não é modificado." }, privacyFaq],
  },
];

export const releaseToolBySlug = new Map<ReleaseToolSlug, ReleaseToolDefinition>(releaseTools.map((tool) => [tool.slug, tool]));
