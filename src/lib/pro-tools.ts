import type { ToolDefinition } from "@/lib/tools";

export type ProToolSlug =
  | "ocr-pdf"
  | "assinatura-digital-pdf"
  | "links-pdf"
  | "criar-formulario-pdf"
  | "bookmarks-pdf"
  | "comparar-pdfs"
  | "reparar-pdf"
  | "pdf-a"
  | "pdf-para-powerpoint"
  | "powerpoint-para-pdf"
  | "extrair-imagens-pdf"
  | "limpar-documento-digitalizado"
  | "otimizar-pdf-avancado"
  | "anotacoes-pdf"
  | "processamento-lote-pdf"
  | "numeracao-bates"
  | "editar-metadados-pdf";

export type ProToolDefinition = Omit<ToolDefinition, "slug"> & { slug: ProToolSlug };

type ProToolInput = Pick<ProToolDefinition, "slug" | "name" | "shortDescription" | "description" | "category" | "icon" | "accent" | "accept" | "multiple"> &
  Partial<Pick<ProToolDefinition, "keywords" | "intro" | "useCases" | "limitations" | "faq">>;

const privacyFaq = {
  question: "O documento é enviado ao LIM PDF?",
  answer: "Não. O documento é processado localmente no navegador. Quando um motor público precisa ser carregado, apenas o código/modelo do motor é baixado; o arquivo do usuário não é enviado ao provedor.",
};

function defineTool(input: ProToolInput): ProToolDefinition {
  return {
    keywords: [input.name.toLowerCase(), input.slug.replaceAll("-", " ")],
    intro: input.description,
    useCases: ["Uso profissional", "Fluxo documental", "Processamento local no navegador"],
    limitations: ["Revise o arquivo final antes de distribuir"],
    faq: [privacyFaq],
    ...input,
  };
}

export const proTools: ProToolDefinition[] = [
  defineTool({
    slug: "ocr-pdf", name: "OCR PDF", shortDescription: "Reconheça texto em PDFs escaneados e gere uma camada pesquisável.",
    description: "Renderize cada página localmente, reconheça português, inglês e espanhol com OCR real e gere um PDF pesquisável.",
    category: "Converter de PDF", icon: "TextSearch", accent: "blue", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["ocr pdf", "pdf escaneado", "reconhecer texto", "pdf pesquisável", "tesseract"],
    useCases: ["Pesquisar contratos digitalizados", "Copiar texto de documentos escaneados", "Preparar PDF para Word/Excel", "Arquivar digitalizações pesquisáveis"],
    limitations: ["A precisão depende da qualidade da digitalização", "Na primeira execução o navegador baixa o motor OCR e os modelos de idioma", "Revise nomes próprios e números pequenos"],
    faq: [{ question: "É OCR real?", answer: "Sim. As páginas são renderizadas e reconhecidas pelo Tesseract WebAssembly; a saída recebe uma nova camada pesquisável." }, privacyFaq],
  }),
  defineTool({
    slug: "assinatura-digital-pdf", name: "Assinatura digital PDF", shortDescription: "Aplique assinatura criptográfica PAdES básica com certificado e chave RSA.",
    description: "Assine o PDF com certificado X.509 e chave privada PKCS#8 RSA diretamente no navegador usando CMS destacado e ETSI.CAdES.detached.",
    category: "Otimizar e proteger", icon: "Signature", accent: "green", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["assinatura digital pdf", "pades", "certificado digital", "x509", "cms pdf"],
    limitations: ["Aceita certificado X.509 PEM e chave RSA PKCS#8 PEM", "A3/token exige integração nativa do sistema", "TSA, LTV e validação de revogação exigem infraestrutura externa de confiança"],
    faq: [{ question: "É diferente da assinatura desenhada?", answer: "Sim. Esta função aplica uma assinatura criptográfica verificável por leitores PDF compatíveis." }, privacyFaq],
  }),
  defineTool({ slug: "links-pdf", name: "Links no PDF", shortDescription: "Insira hyperlinks clicáveis em regiões do documento.", description: "Crie anotações Link nativas do PDF apontando para endereços HTTPS com página e área configuráveis.", category: "Editar PDF", icon: "Layers3", accent: "blue", accept: "application/pdf,.pdf", multiple: false, keywords: ["link pdf", "hyperlink pdf", "url clicável pdf"] }),
  defineTool({ slug: "criar-formulario-pdf", name: "Criar formulário PDF", shortDescription: "Crie campos de texto, checkbox, rádio, lista e dropdown.", description: "Adicione campos AcroForm nativos a páginas existentes e gere um PDF preenchível em leitores compatíveis.", category: "Formulários", icon: "ListChecks", accent: "purple", accept: "application/pdf,.pdf", multiple: false, keywords: ["criar formulário pdf", "acroform", "campo preenchível pdf"] }),
  defineTool({ slug: "bookmarks-pdf", name: "Marcadores PDF", shortDescription: "Crie bookmarks para navegar entre páginas.", description: "Monte marcadores nativos no painel de navegação do PDF com títulos e destinos de página.", category: "Organizar PDF", icon: "BookOpen", accent: "orange", accept: "application/pdf,.pdf", multiple: false, keywords: ["bookmark pdf", "marcadores pdf", "sumário pdf", "outline pdf"] }),
  defineTool({ slug: "comparar-pdfs", name: "Comparar PDFs", shortDescription: "Compare dois documentos e destaque diferenças visuais.", description: "Renderize dois PDFs página a página, calcule diferenças de pixels e gere um relatório lado a lado com mapa de alterações.", category: "Organizar PDF", icon: "Layers3", accent: "rose", accept: "application/pdf,.pdf", multiple: true, keywords: ["comparar pdf", "diferenças pdf", "diff pdf"] }),
  defineTool({ slug: "reparar-pdf", name: "Reparar PDF", shortDescription: "Reconstrua PDFs que ainda podem ser lidos parcialmente.", description: "Tente normalizar a estrutura e, quando necessário, reconstrua páginas renderizáveis em um novo PDF.", category: "Otimizar e proteger", icon: "Eraser", accent: "green", accept: "application/pdf,.pdf", multiple: false, keywords: ["reparar pdf", "corrigir pdf corrompido", "recuperar pdf"], limitations: ["Não é possível recuperar bytes ausentes", "O fallback visual rasteriza as páginas recuperadas"] }),
  defineTool({
    slug: "pdf-a", name: "PDF/A", shortDescription: "Prepare documentos para arquivamento PDF/A e verifique restrições básicas.",
    description: "Normalize metadados, XMP e formulários para um fluxo PDF/A-2B com relatório de pré-validação.", category: "Otimizar e proteger", icon: "FileOutput", accent: "teal", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["pdf a", "pdf/a", "arquivamento pdf", "pdfa 2b"],
    limitations: ["Conformidade ISO 19005 definitiva exige um validador PDF/A dedicado", "Perfis ICC e fontes do documento de origem podem exigir correção adicional"],
    faq: [{ question: "O LIM PDF emite certificado de conformidade PDF/A?", answer: "Não. Ele prepara e pré-valida o arquivo; a comprovação normativa deve ser feita em validador especializado." }, privacyFaq],
  }),
  defineTool({ slug: "pdf-para-powerpoint", name: "PDF para PowerPoint", shortDescription: "Converta cada página do PDF em um slide PPTX.", description: "Renderize as páginas e monte um arquivo PPTX OOXML com um slide por página, preservando a aparência visual.", category: "Converter de PDF", icon: "FileOutput", accent: "orange", accept: "application/pdf,.pdf", multiple: false, keywords: ["pdf para powerpoint", "pdf para pptx"] }),
  defineTool({ slug: "powerpoint-para-pdf", name: "PowerPoint para PDF", shortDescription: "Converta PPTX em PDF com reconstrução local de slides.", description: "Leia slides OOXML, extraia imagens e texto e gere páginas PDF diretamente no navegador.", category: "Converter para PDF", icon: "FilePlus2", accent: "orange", accept: ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation", multiple: false, keywords: ["powerpoint para pdf", "pptx para pdf"], limitations: ["Animações, vídeos, SmartArt e efeitos avançados não são executados", "Apresentações complexas podem exigir ajuste visual"] }),
  defineTool({ slug: "extrair-imagens-pdf", name: "Extrair imagens do PDF", shortDescription: "Extraia imagens raster incorporadas e baixe em ZIP.", description: "Analise operadores do PDF e exporte as imagens raster incorporadas que o leitor local consegue resolver.", category: "Converter de PDF", icon: "Images", accent: "blue", accept: "application/pdf,.pdf", multiple: false, keywords: ["extrair imagens pdf", "salvar imagens pdf"] }),
  defineTool({ slug: "limpar-documento-digitalizado", name: "Limpar digitalização", shortDescription: "Endireite, aumente contraste, clareie fundo e remova páginas em branco.", description: "Aplique processamento local de imagem, estimativa de inclinação, limpeza de fundo e reconstrução do PDF.", category: "Otimizar e proteger", icon: "CircleOff", accent: "purple", accept: "application/pdf,.pdf", multiple: false, keywords: ["limpar pdf escaneado", "deskew pdf", "endireitar scan"] }),
  defineTool({ slug: "otimizar-pdf-avancado", name: "Otimizar PDF avançado", shortDescription: "Escolha otimização estrutural ou compressão visual agressiva.", description: "Remova metadados, achate formulários e regrave a estrutura ou rasterize páginas com resolução e qualidade controladas.", category: "Otimizar e proteger", icon: "Minimize2", accent: "green", accept: "application/pdf,.pdf", multiple: false, keywords: ["otimizar pdf", "compressão avançada pdf"] }),
  defineTool({ slug: "anotacoes-pdf", name: "Anotações PDF nativas", shortDescription: "Adicione notas e destaques reconhecidos por leitores PDF.", description: "Crie objetos de anotação PDF reais em vez de apenas desenhar comentários sobre a página.", category: "Editar PDF", icon: "Type", accent: "orange", accept: "application/pdf,.pdf", multiple: false, keywords: ["anotação pdf", "comentário pdf", "highlight annotation"] }),
  defineTool({ slug: "processamento-lote-pdf", name: "Processamento em lote", shortDescription: "Aplique a mesma operação a vários PDFs e baixe um ZIP.", description: "Processe vários documentos sequencialmente com remoção de metadados, numeração, marca visual ou normalização.", category: "Organizar PDF", icon: "Files", accent: "teal", accept: "application/pdf,.pdf", multiple: true, keywords: ["pdf em lote", "batch pdf", "processar vários pdf"] }),
  defineTool({ slug: "numeracao-bates", name: "Numeração Bates", shortDescription: "Aplique prefixo e sequência jurídica em todas as páginas.", description: "Adicione identificadores Bates com prefixo, número inicial, quantidade de dígitos e posição configuráveis.", category: "Organizar PDF", icon: "ListOrdered", accent: "rose", accept: "application/pdf,.pdf", multiple: false, keywords: ["bates pdf", "numeração jurídica"] }),
  defineTool({ slug: "editar-metadados-pdf", name: "Editar metadados PDF", shortDescription: "Edite título, autor, assunto, palavras-chave e produtor.", description: "Leia os metadados básicos e gere uma cópia com novas propriedades internas sem alterar o conteúdo visual.", category: "Editar PDF", icon: "SquarePen", accent: "teal", accept: "application/pdf,.pdf", multiple: false, keywords: ["editar metadados pdf", "autor pdf", "título pdf"] }),
];
