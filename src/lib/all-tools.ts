import { tools as baseTools, type ToolCategory, type ToolDefinition, type ToolIconName, type ToolSlug } from "@/lib/tools";

export type AdvancedToolSlug =
  | "pdf-para-word"
  | "pdf-para-excel"
  | "pdf-para-markdown"
  | "word-para-pdf"
  | "excel-para-pdf"
  | "destacar-texto"
  | "proteger-pdf"
  | "desbloquear-pdf"
  | "permissoes-pdf"
  | "marcar-confidencial";

export type AllToolSlug = ToolSlug | AdvancedToolSlug;

export type AnyToolDefinition = Omit<ToolDefinition, "slug"> & {
  slug: AllToolSlug;
  category: ToolCategory;
  icon: ToolIconName;
};

const privacyFaq = {
  question: "O arquivo é enviado para o servidor do LIM PDF?",
  answer: "Não. O processamento acontece no navegador e o arquivo permanece no seu dispositivo.",
};

export const advancedTools: AnyToolDefinition[] = [
  {
    slug: "pdf-para-word",
    name: "PDF para Word",
    shortDescription: "Converta o texto do PDF em documento Word editável.",
    description: "Extraia a camada de texto do PDF, preserve páginas e linhas e gere um arquivo DOCX editável diretamente no navegador.",
    category: "Converter de PDF",
    icon: "FileOutput",
    accent: "blue",
    accept: "application/pdf,.pdf",
    multiple: false,
    keywords: ["pdf para word", "pdf para docx", "converter pdf word", "pdf editável"],
    intro: "Converta PDFs digitais em DOCX para editar texto no Word, LibreOffice ou editores compatíveis.",
    useCases: ["Editar contratos e propostas", "Reaproveitar texto de relatórios", "Corrigir documentos", "Criar uma versão Word de um PDF"],
    limitations: ["PDFs somente com imagem precisam ter camada de texto/OCR para gerar conteúdo editável", "Layouts muito complexos podem exigir pequenos ajustes no Word"],
    faq: [{ question: "O Word fica editável?", answer: "Sim. O texto detectado é recriado em um DOCX com separação por páginas e linhas." }, privacyFaq],
  },
  {
    slug: "pdf-para-excel",
    name: "PDF para Excel",
    shortDescription: "Extraia linhas e colunas do PDF para planilhas XLSX.",
    description: "Analise a posição dos textos do PDF, agrupe conteúdo por linhas e gere uma planilha XLSX com uma aba para cada página.",
    category: "Converter de PDF",
    icon: "FileOutput",
    accent: "green",
    accept: "application/pdf,.pdf",
    multiple: false,
    keywords: ["pdf para excel", "pdf para xlsx", "extrair tabela pdf", "converter tabela pdf"],
    intro: "Transforme tabelas e dados textuais de PDFs digitais em células editáveis no Excel.",
    useCases: ["Extrair relatórios financeiros", "Reaproveitar tabelas", "Importar listas para planilha", "Organizar dados de documentos"],
    limitations: ["Tabelas sem linhas regulares podem exigir reorganização", "PDFs escaneados precisam ter camada de texto para extração automática"],
    faq: [{ question: "Cada página vira uma planilha?", answer: "Sim. O arquivo XLSX cria uma aba por página para preservar a separação do documento." }, privacyFaq],
  },
  {
    slug: "pdf-para-markdown",
    name: "PDF para Markdown",
    shortDescription: "Converta o texto do PDF em Markdown estruturado.",
    description: "Extraia o conteúdo textual do PDF, preserve títulos, linhas e páginas e gere um arquivo Markdown editável diretamente no navegador.",
    category: "Converter de PDF",
    icon: "FileOutput",
    accent: "teal",
    accept: "application/pdf,.pdf",
    multiple: false,
    keywords: ["pdf para markdown", "pdf para md", "converter pdf markdown", "extrair markdown pdf"],
    intro: "Transforme PDFs digitais em Markdown para documentação, conhecimento interno, blogs e fluxos de edição técnica.",
    useCases: ["Migrar relatórios para documentação", "Criar rascunhos de artigos", "Reaproveitar manuais", "Preparar conteúdo para GitHub ou CMS"],
    limitations: ["PDFs somente com imagem precisam ter camada de texto/OCR", "Tabelas, colunas e layouts visuais podem exigir revisão manual", "A saída preserva o conteúdo textual, não a aparência completa da página"],
    faq: [{ question: "O arquivo Markdown mantém a formatação do PDF?", answer: "Ele preserva texto, títulos inferidos, linhas e separação de páginas; layouts complexos podem exigir ajustes manuais." }, { question: "O PDF é enviado ao servidor?", answer: "Não. A conversão é executada localmente no navegador." }, privacyFaq],
  },
  {
    slug: "word-para-pdf",
    name: "Word para PDF",
    shortDescription: "Converta documentos DOCX em PDF.",
    description: "Leia o conteúdo textual do DOCX e gere um PDF paginado diretamente no navegador.",
    category: "Converter para PDF",
    icon: "FilePlus2",
    accent: "blue",
    accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    multiple: false,
    keywords: ["word para pdf", "docx para pdf", "converter word pdf"],
    intro: "Crie uma versão PDF do conteúdo textual de documentos Word sem enviar o arquivo para servidores externos.",
    useCases: ["Compartilhar documentos", "Gerar versão para impressão", "Arquivar textos", "Padronizar entrega em PDF"],
    limitations: ["Aceita DOCX; o formato antigo DOC não é suportado", "Recursos avançados de Word, como SmartArt e macros, não são reproduzidos"],
    faq: [{ question: "Aceita arquivos .doc antigos?", answer: "Não. Use DOCX, que é o formato Word moderno baseado em Open XML." }, privacyFaq],
  },
  {
    slug: "excel-para-pdf",
    name: "Excel para PDF",
    shortDescription: "Converta planilhas XLSX em PDF.",
    description: "Leia as células das planilhas XLSX e gere um PDF tabular paginado no navegador.",
    category: "Converter para PDF",
    icon: "FilePlus2",
    accent: "green",
    accept: ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    multiple: false,
    keywords: ["excel para pdf", "xlsx para pdf", "planilha para pdf"],
    intro: "Transforme dados de planilhas em páginas PDF prontas para compartilhar e imprimir.",
    useCases: ["Enviar relatórios", "Imprimir tabelas", "Arquivar planilhas", "Compartilhar dados sem edição"],
    limitations: ["Aceita XLSX", "Gráficos, macros e fórmulas são representados pelos valores disponíveis nas células"],
    faq: [{ question: "As fórmulas continuam funcionando no PDF?", answer: "Não. O PDF recebe o valor armazenado na célula, pois é um formato de visualização." }, privacyFaq],
  },
  {
    slug: "destacar-texto",
    name: "Destacar texto",
    shortDescription: "Localize um termo e aplique marcação amarela no PDF.",
    description: "Procure palavras ou trechos na camada de texto e marque as ocorrências visualmente.",
    category: "Editar PDF",
    icon: "Type",
    accent: "orange",
    accept: "application/pdf,.pdf",
    multiple: false,
    keywords: ["destacar texto pdf", "marca texto pdf", "highlight pdf", "grifar pdf"],
    intro: "Encontre termos importantes em documentos digitais e gere uma cópia com destaque visual.",
    useCases: ["Marcar cláusulas", "Destacar nomes", "Revisar relatórios", "Sinalizar palavras-chave"],
    limitations: ["A busca usa a camada de texto existente", "Trechos divididos em vários blocos internos do PDF podem ser destacados por bloco"],
    faq: [{ question: "Funciona em PDF escaneado?", answer: "Funciona quando o arquivo possui uma camada de texto, inclusive criada previamente por OCR." }, privacyFaq],
  },
  {
    slug: "proteger-pdf",
    name: "Proteger PDF",
    shortDescription: "Adicione senha e criptografia AES-256 ao PDF.",
    description: "Proteja o documento com senha de abertura e senha de proprietário usando criptografia PDF compatível com leitores modernos.",
    category: "Otimizar e proteger",
    icon: "Stamp",
    accent: "rose",
    accept: "application/pdf,.pdf",
    multiple: false,
    keywords: ["proteger pdf", "senha pdf", "criptografar pdf", "bloquear pdf"],
    intro: "Crie uma cópia criptografada do PDF para restringir abertura e alterações não autorizadas.",
    useCases: ["Enviar documento confidencial", "Proteger contratos", "Restringir arquivos internos", "Compartilhar PDF por senha"],
    limitations: ["Guarde a senha em local seguro", "Leitores muito antigos podem não suportar AES-256"],
    faq: [{ question: "A senha é enviada para o servidor?", answer: "Não. A criptografia é executada localmente com recursos do navegador." }, privacyFaq],
  },
  {
    slug: "desbloquear-pdf",
    name: "Desbloquear PDF",
    shortDescription: "Remova a senha de PDFs compatíveis.",
    description: "Informe a senha correta e gere uma cópia descriptografada do documento no navegador.",
    category: "Otimizar e proteger",
    icon: "Eraser",
    accent: "green",
    accept: "application/pdf,.pdf",
    multiple: false,
    keywords: ["desbloquear pdf", "remover senha pdf", "decrypt pdf", "tirar senha pdf"],
    intro: "Remova a proteção quando você possui autorização e a senha do arquivo.",
    useCases: ["Arquivar cópia sem senha", "Preparar PDF para edição", "Integrar documento em outro fluxo", "Remover proteção própria"],
    limitations: ["É necessário conhecer a senha válida", "Alguns esquemas antigos ou incomuns de criptografia podem não ser compatíveis"],
    faq: [{ question: "A ferramenta descobre a senha?", answer: "Não. Ela apenas remove a proteção quando você fornece uma senha válida." }, privacyFaq],
  },
  {
    slug: "permissoes-pdf",
    name: "Permissões PDF",
    shortDescription: "Controle impressão, cópia e alteração do documento.",
    description: "Defina permissões de uso e aplique senha de proprietário ao PDF.",
    category: "Otimizar e proteger",
    icon: "ListChecks",
    accent: "purple",
    accept: "application/pdf,.pdf",
    multiple: false,
    keywords: ["permissões pdf", "bloquear impressão pdf", "bloquear cópia pdf", "proteger edição pdf"],
    intro: "Configure o que leitores compatíveis podem permitir ao abrir o documento sem exigir senha de visualização.",
    useCases: ["Bloquear cópia de conteúdo", "Restringir edição", "Controlar impressão", "Distribuir material somente para leitura"],
    limitations: ["Permissões de PDF dependem do leitor respeitar as restrições", "A senha de proprietário deve ser guardada para alterar as regras depois"],
    faq: [{ question: "O arquivo pode abrir sem senha?", answer: "Sim. Nesta função, a senha de proprietário protege as permissões e o PDF pode ser aberto normalmente." }, privacyFaq],
  },
  {
    slug: "marcar-confidencial",
    name: "Marcar como confidencial",
    shortDescription: "Aplique aviso CONFIDENCIAL em todas as páginas.",
    description: "Adicione uma marca diagonal e um aviso discreto de confidencialidade ao documento.",
    category: "Editar PDF",
    icon: "Stamp",
    accent: "orange",
    accept: "application/pdf,.pdf",
    multiple: false,
    keywords: ["confidencial pdf", "marcar confidencial", "carimbo confidencial", "watermark confidential"],
    intro: "Identifique documentos sensíveis visualmente sem precisar configurar uma marca-d’água manual.",
    useCases: ["Propostas internas", "Documentos de RH", "Relatórios reservados", "Materiais em revisão"],
    limitations: ["A marca é visual e não substitui criptografia", "Use Proteger PDF quando precisar de senha"],
    faq: [{ question: "Isso impede que o PDF seja aberto?", answer: "Não. A função apenas identifica visualmente o documento. Para restringir acesso, use Proteger PDF." }, privacyFaq],
  },
];

export const allTools: AnyToolDefinition[] = [...baseTools, ...advancedTools];
export const allToolBySlug = new Map<AllToolSlug, AnyToolDefinition>(allTools.map((tool) => [tool.slug, tool]));
export const advancedToolSlugs = new Set<AdvancedToolSlug>(advancedTools.map((tool) => tool.slug as AdvancedToolSlug));

export function isAdvancedToolSlug(slug: AllToolSlug): slug is AdvancedToolSlug {
  return advancedToolSlugs.has(slug as AdvancedToolSlug);
}
