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

const localFaq = { question: "O arquivo sai do meu navegador?", answer: "Não nesta ferramenta. O documento é processado localmente; revise a página de privacidade para entender recursos opcionais do site." };

export const proTools: ProToolDefinition[] = [
  {
    slug: "assinatura-digital-pdf", name: "Assinatura digital PDF", shortDescription: "Assine criptograficamente com certificado X.509 e chave RSA.", description: "Aplique uma assinatura CMS destacada compatível com o perfil PAdES básico usando certificado X.509 PEM e chave privada RSA PKCS#8 PEM no navegador.", category: "Otimizar e proteger", icon: "Signature", accent: "green", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["assinatura digital pdf", "pades", "certificado digital", "x509", "cms pdf"], intro: "Use quando você precisa de integridade criptográfica, e não apenas da imagem de uma rubrica.",
    useCases: ["Assinar PDF com certificado em arquivo", "Detectar alterações posteriores em leitores compatíveis", "Separar assinatura visual de assinatura criptográfica"],
    limitations: ["Aceita certificado X.509 PEM e chave RSA PKCS#8 PEM", "A3, token e cartão precisam de integração nativa", "TSA, LTV e revogação exigem infraestrutura externa de confiança"],
    faq: [{ question: "Isso é a mesma coisa que desenhar a assinatura?", answer: "Não. A assinatura desenhada é visual; esta ferramenta aplica uma assinatura criptográfica ao arquivo." }, localFaq],
  },
  {
    slug: "links-pdf", name: "Links no PDF", shortDescription: "Crie, revise, edite ou remova hyperlinks do documento.", description: "Trabalhe com anotações Link nativas do PDF para URLs e destinos internos entre páginas sem rasterizar o arquivo.", category: "Editar PDF", icon: "Layers3", accent: "blue", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["link pdf", "hyperlink pdf", "url clicável pdf", "link interno pdf"], intro: "Transforme regiões da página em links clicáveis e mantenha o recurso reconhecido por leitores de PDF.",
    useCases: ["Criar links para sites", "Criar navegação para outra página do mesmo PDF", "Corrigir URL existente", "Remover links antes de distribuir"],
    limitations: ["A área do link usa coordenadas PDF em pontos", "Sempre teste os destinos no leitor que será usado pelo destinatário"],
    faq: [{ question: "O link fica realmente clicável?", answer: "Sim. A saída usa anotações Link do próprio formato PDF." }, localFaq],
  },
  {
    slug: "criar-formulario-pdf", name: "Criar formulário PDF", shortDescription: "Adicione campos preenchíveis ao PDF.", description: "Crie campos AcroForm de texto, data, checkbox, rádio, dropdown, lista e campo reservado para assinatura em páginas existentes.", category: "Formulários", icon: "ListChecks", accent: "purple", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["criar formulário pdf", "acroform", "campo preenchível pdf"], intro: "Converta uma página estática em um formulário que leitores PDF compatíveis conseguem preencher.",
    useCases: ["Criar ficha de cadastro", "Adicionar checkbox e opções", "Montar campos de data", "Preparar documento para preenchimento"],
    limitations: ["A posição dos campos é informada em coordenadas da página", "Leitores diferentes podem desenhar widgets de forma ligeiramente diferente"],
    faq: [{ question: "Os campos continuam editáveis depois do download?", answer: "Sim, enquanto você não achatar o formulário depois." }, localFaq],
  },
  {
    slug: "bookmarks-pdf", name: "Marcadores PDF", shortDescription: "Crie bookmarks e navegação por capítulos.", description: "Adicione uma árvore de marcadores nativos com títulos e destinos de página para facilitar a navegação em documentos longos.", category: "Organizar PDF", icon: "BookOpen", accent: "orange", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["bookmark pdf", "marcadores pdf", "sumário pdf", "outline pdf"], intro: "Use o painel de marcadores do leitor como um sumário clicável do documento.",
    useCases: ["Organizar contratos longos", "Separar capítulos", "Criar navegação em apostilas", "Facilitar consulta de relatórios"],
    limitations: ["O marcador aponta para uma página, não altera o texto da página", "A exibição do painel depende do leitor de PDF"],
    faq: [{ question: "É a mesma coisa que um sumário impresso?", answer: "Não. Marcadores ficam na estrutura de navegação do PDF e não ocupam espaço na página." }, localFaq],
  },
  {
    slug: "comparar-pdfs", name: "Comparar PDFs", shortDescription: "Compare duas versões e destaque alterações.", description: "Renderize dois documentos página a página, calcule diferenças visuais e textuais e gere um relatório de comparação.", category: "Organizar PDF", icon: "Layers3", accent: "rose", accept: "application/pdf,.pdf", multiple: true,
    keywords: ["comparar pdf", "diferenças pdf", "diff pdf", "versões pdf"], intro: "Descubra onde duas versões mudaram sem precisar alternar janelas manualmente.",
    useCases: ["Comparar contratos revisados", "Conferir prova e versão final", "Revisar relatórios atualizados", "Localizar mudanças de layout"],
    limitations: ["Mudanças de renderização podem aparecer como diferença visual", "Comparação não substitui revisão jurídica do conteúdo"],
    faq: [{ question: "A comparação é só de texto?", answer: "Não. O relatório combina diferença visual e análise do conteúdo textual disponível." }, localFaq],
  },
  {
    slug: "reparar-pdf", name: "Reparar PDF", shortDescription: "Reconstrua PDFs que ainda podem ser lidos parcialmente.", description: "Tente normalizar a estrutura de um PDF problemático e, quando necessário, reconstrua as páginas que ainda conseguem ser renderizadas.", category: "Otimizar e proteger", icon: "Eraser", accent: "green", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["reparar pdf", "corrigir pdf corrompido", "recuperar pdf"], intro: "Use em arquivos que abrem parcialmente, apresentam estrutura inconsistente ou falham em outros fluxos.",
    useCases: ["Normalizar estrutura", "Salvar páginas ainda renderizáveis", "Criar cópia nova para outro fluxo"],
    limitations: ["Bytes realmente ausentes não podem ser recuperados", "O fallback visual pode rasterizar páginas e perder recursos interativos"],
    faq: [{ question: "Consegue recuperar qualquer PDF corrompido?", answer: "Não. A ferramenta só consegue reaproveitar a estrutura ou as páginas que ainda podem ser interpretadas." }, localFaq],
  },
  {
    slug: "pdf-a", name: "Preparar PDF/A", shortDescription: "Prepare PDF/A-2B e gere uma pré-validação.", description: "Normalize metadados, XMP e formulários para um fluxo de arquivamento PDF/A-2B, deixando explícito o que ainda exige validação normativa especializada.", category: "Otimizar e proteger", icon: "FileOutput", accent: "teal", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["pdf a", "pdf/a", "arquivamento pdf", "pdfa 2b"], intro: "Prepare uma cópia para preservação de longo prazo sem declarar certificação ISO que não foi comprovada.",
    useCases: ["Normalizar metadados para arquivo", "Achatar formulários antes do arquivamento", "Gerar XMP de identificação PDF/A-2B"],
    limitations: ["Conformidade ISO 19005 definitiva exige validador dedicado", "Perfis ICC e fontes do documento podem exigir correção adicional"],
    faq: [{ question: "A saída já é certificada como PDF/A?", answer: "Não. O LIM PDF prepara e pré-valida; a comprovação normativa deve ser feita em um validador aceito pelo seu processo." }, localFaq],
  },
  {
    slug: "pdf-para-powerpoint", name: "PDF para PowerPoint", shortDescription: "Transforme páginas PDF em slides PPTX.", description: "Renderize cada página e monte um PPTX com um slide por página para preservar a aparência visual da apresentação.", category: "Converter de PDF", icon: "FileOutput", accent: "orange", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["pdf para powerpoint", "pdf para pptx"], intro: "Crie uma apresentação visualmente fiel quando o objetivo é reapresentar as páginas, não reconstruir cada elemento editável.",
    useCases: ["Levar relatório para apresentação", "Projetar páginas de apostila", "Usar PDF como base de slides"],
    limitations: ["A página entra como composição visual", "Texto e gráficos não são reconstruídos como objetos PowerPoint independentes"],
    faq: [{ question: "O texto fica editável como caixa do PowerPoint?", answer: "A prioridade desta conversão é preservar a aparência da página, não reconstruir todos os objetos." }, localFaq],
  },
  {
    slug: "powerpoint-para-pdf", name: "PowerPoint para PDF", shortDescription: "Converta PPTX em páginas PDF.", description: "Leia slides OOXML, extraia conteúdo compatível e gere um PDF local sem executar macros, vídeos ou animações.", category: "Converter para PDF", icon: "FilePlus2", accent: "orange", accept: ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation", multiple: false,
    keywords: ["powerpoint para pdf", "pptx para pdf"], intro: "Gere uma versão PDF compartilhável de uma apresentação moderna em formato PPTX.",
    useCases: ["Compartilhar apresentação sem edição", "Gerar versão para impressão", "Arquivar slides"],
    limitations: ["Animações, vídeos, SmartArt e efeitos avançados não são executados", "Slides complexos podem exigir ajuste visual"],
    faq: [{ question: "As animações aparecem no PDF?", answer: "Não. PDF é estático; a conversão trabalha com o conteúdo compatível de cada slide." }, localFaq],
  },
  {
    slug: "extrair-imagens-pdf", name: "Extrair imagens do PDF", shortDescription: "Baixe imagens raster incorporadas em ZIP.", description: "Analise os recursos gráficos do PDF e extraia imagens raster que o leitor local consegue resolver sem simplesmente capturar a página inteira.", category: "Converter de PDF", icon: "Images", accent: "blue", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["extrair imagens pdf", "salvar imagens pdf"], intro: "Recupere fotografias e bitmaps incorporados ao documento em vez de converter cada página completa em imagem.",
    useCases: ["Recuperar fotos de catálogo", "Extrair logos raster", "Reaproveitar imagens incorporadas"],
    limitations: ["Vetores não são imagens raster independentes", "Alguns filtros ou composições internas podem não ser exportáveis isoladamente"],
    faq: [{ question: "É igual a PDF para JPG?", answer: "Não. PDF para JPG transforma a página inteira; esta ferramenta procura imagens incorporadas dentro dela." }, localFaq],
  },
  {
    slug: "limpar-documento-digitalizado", name: "Limpar digitalização", shortDescription: "Endireite, aumente contraste e remova páginas em branco.", description: "Aplique processamento de imagem às páginas digitalizadas, estime inclinação, clareie fundo e reconstrua um PDF mais legível.", category: "Otimizar e proteger", icon: "CircleOff", accent: "purple", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["limpar pdf escaneado", "deskew pdf", "endireitar scan"], intro: "Prepare scans tortos ou acinzentados antes de OCR, impressão ou arquivo.",
    useCases: ["Endireitar páginas", "Aumentar contraste", "Clarear fundo", "Remover páginas visualmente em branco"],
    limitations: ["Limpeza agressiva pode apagar detalhes muito claros", "A reconstrução visual pode perder recursos interativos do PDF original"],
    faq: [{ question: "Devo limpar antes do OCR?", answer: "Em digitalizações tortas ou com fundo ruim, limpar primeiro costuma melhorar o reconhecimento." }, localFaq],
  },
  {
    slug: "otimizar-pdf-avancado", name: "Otimizar PDF avançado", shortDescription: "Escolha otimização estrutural ou compressão visual.", description: "Remova metadados, achate formulários e regrave a estrutura ou rasterize páginas com qualidade e resolução controladas.", category: "Otimizar e proteger", icon: "Minimize2", accent: "green", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["otimizar pdf", "compressão avançada pdf"], intro: "Escolha conscientemente entre preservar estrutura e buscar uma redução visual mais agressiva.",
    useCases: ["Limpar recursos internos", "Achatar formulário", "Reduzir digitalizações pesadas", "Criar cópia leve para tela"],
    limitations: ["Modo visual pode perder texto selecionável e vetores", "Compare letras pequenas e imagens depois de compressão agressiva"],
    faq: [{ question: "Qual modo preserva melhor o PDF?", answer: "O estrutural tenta preservar texto e vetores; o visual prioriza redução de tamanho." }, localFaq],
  },
  {
    slug: "anotacoes-pdf", name: "Anotações PDF nativas", shortDescription: "Crie notas, destaque, sublinhado e tachado nativos.", description: "Adicione objetos de anotação reconhecidos por leitores PDF em vez de apenas desenhar marcas permanentes sobre a página.", category: "Editar PDF", icon: "Type", accent: "orange", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["anotação pdf", "comentário pdf", "highlight annotation"], intro: "Use comentários que continuam sendo comentários no formato PDF e podem ser identificados por leitores compatíveis.",
    useCases: ["Revisar contrato", "Adicionar nota", "Sublinhar trecho", "Marcar texto para revisão"],
    limitations: ["A aparência varia entre leitores", "A região da anotação usa coordenadas da página"],
    faq: [{ question: "A anotação pode continuar editável no leitor?", answer: "Leitores que suportam a anotação nativa podem reconhecê-la como objeto de comentário." }, localFaq],
  },
  {
    slug: "processamento-lote-pdf", name: "Processamento em lote", shortDescription: "Aplique a mesma operação a vários PDFs.", description: "Processe até vários documentos sequencialmente e reúna os resultados em ZIP com limpeza de metadados, numeração, marca confidencial ou normalização estrutural.", category: "Organizar PDF", icon: "Files", accent: "teal", accept: "application/pdf,.pdf", multiple: true,
    keywords: ["pdf em lote", "batch pdf", "processar vários pdf"], intro: "Evite repetir a mesma configuração arquivo por arquivo quando a operação é igual para todo o conjunto.",
    useCases: ["Limpar metadados de vários PDFs", "Numerar páginas de um conjunto", "Marcar documentos como confidenciais", "Normalizar vários arquivos"],
    limitations: ["Arquivos são processados sequencialmente para controlar memória", "Revise uma amostra antes de aplicar operação destrutiva a um lote grande"],
    faq: [{ question: "Recebo um arquivo único?", answer: "Os PDFs processados são reunidos em um ZIP, preservando os documentos separados." }, localFaq],
  },
  {
    slug: "numeracao-bates", name: "Numeração Bates", shortDescription: "Aplique sequência jurídica com prefixo e dígitos.", description: "Numere todas as páginas com prefixo, número inicial, quantidade de dígitos e posição configuráveis para identificação documental.", category: "Organizar PDF", icon: "ListOrdered", accent: "rose", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["bates pdf", "numeração jurídica", "numerar processo pdf"], intro: "Crie identificadores previsíveis para páginas de dossiês, processos e conjuntos documentais.",
    useCases: ["Identificar páginas de processo", "Criar sequência em dossiê", "Padronizar numeração de evidências"],
    limitations: ["A numeração é desenhada sobre a página", "Verifique margens para não cobrir conteúdo existente"],
    faq: [{ question: "Posso escolher o número inicial?", answer: "Sim. Configure prefixo, início, quantidade de dígitos e posição." }, localFaq],
  },
  {
    slug: "editar-metadados-pdf", name: "Editar metadados PDF", shortDescription: "Altere título, autor, assunto e palavras-chave.", description: "Leia os metadados básicos do arquivo e gere uma cópia com propriedades internas revisadas sem mudar a aparência das páginas.", category: "Editar PDF", icon: "SquarePen", accent: "teal", accept: "application/pdf,.pdf", multiple: false,
    keywords: ["editar metadados pdf", "autor pdf", "título pdf", "keywords pdf"], intro: "Corrija as propriedades que leitores, sistemas de arquivo e indexadores podem mostrar sobre o documento.",
    useCases: ["Alterar título", "Corrigir autor", "Atualizar assunto", "Definir palavras-chave"],
    limitations: ["Metadados não substituem o texto visível da página", "Alguns PDFs podem conter metadados XMP adicionais fora dos campos básicos"],
    faq: [{ question: "Isso muda o conteúdo visual?", answer: "Não. A ferramenta altera propriedades internas do documento." }, localFaq],
  },
];

export const proToolBySlug = new Map<ProToolSlug, ProToolDefinition>(proTools.map((tool) => [tool.slug, tool]));
