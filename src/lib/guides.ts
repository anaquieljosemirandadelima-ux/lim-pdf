import type { ToolSlug } from "@/lib/tools";

export type Guide = {
  slug: string;
  title: string;
  description: string;
  readingTime: string;
  publishedAt: string;
  updatedAt: string;
  relatedTool: ToolSlug;
  intro: string;
  sections: { heading: string; paragraphs: string[]; tips?: string[] }[];
  faq: { question: string; answer: string }[];
};

export const guides: Guide[] = [
  {
    slug: "como-juntar-pdf-no-celular",
    title: "Como juntar arquivos PDF no celular sem instalar aplicativo",
    description: "Aprenda a unir vários PDFs no Android ou iPhone, organizar a ordem e baixar um único documento.",
    readingTime: "5 min",
    publishedAt: "2026-07-18",
    updatedAt: "2026-07-18",
    relatedTool: "juntar-pdf",
    intro: "Juntar PDFs no celular é útil quando contratos, comprovantes ou digitalizações foram salvos em arquivos separados. O processamento local evita enviar documentos pessoais para um servidor.",
    sections: [
      { heading: "Antes de começar", paragraphs: ["Localize os documentos no gerenciador de arquivos do aparelho e confirme que todos abrem normalmente.", "Renomear os arquivos com números pode ajudar a visualizar a sequência, embora o LIM PDF permita reorganizá-los depois."], tips: ["Evite fechar a aba durante o processamento.", "Arquivos protegidos por senha precisam ser desbloqueados antes."] },
      { heading: "Passo a passo", paragraphs: ["Abra a ferramenta Juntar PDF, toque em Selecionar arquivos e marque os documentos.", "Use as setas para corrigir a ordem. Depois toque em Juntar PDF agora. O navegador gera o novo arquivo e inicia o download."] },
      { heading: "Como conferir o resultado", paragraphs: ["Abra o PDF final e navegue pelas páginas para confirmar ordem, orientação e legibilidade.", "Para documentos importantes, preserve também os arquivos originais até concluir a revisão."] },
    ],
    faq: [{ question: "Posso juntar PDF no iPhone?", answer: "Sim. O Safari permite selecionar arquivos no app Arquivos e baixar o resultado." }, { question: "Existe limite diário?", answer: "As operações locais não possuem limite diário; o limite prático depende da memória do aparelho." }],
  },
  {
    slug: "como-reduzir-tamanho-de-pdf",
    title: "Como reduzir o tamanho de um PDF para enviar por e-mail ou WhatsApp",
    description: "Entenda os níveis de compressão e como diminuir um PDF sem perder mais qualidade do que o necessário.",
    readingTime: "6 min",
    publishedAt: "2026-07-18",
    updatedAt: "2026-07-18",
    relatedTool: "compactar-pdf",
    intro: "PDFs escaneados podem ficar grandes porque cada página contém uma imagem em alta resolução. A compactação converte essas páginas para uma resolução e qualidade mais adequadas ao compartilhamento.",
    sections: [
      { heading: "Escolha o nível adequado", paragraphs: ["Alta qualidade é indicada para textos pequenos e imagens detalhadas. A opção equilibrada atende à maioria dos envios. Arquivo menor é útil quando o portal possui limite rígido."], tips: ["Teste primeiro a opção equilibrada.", "Revise assinaturas, números e letras pequenas após compactar."] },
      { heading: "O que pode ser perdido", paragraphs: ["A compactação por rasterização transforma cada página em imagem. Links, formulários e seleção de texto podem deixar de funcionar.", "Para contratos digitais e formulários editáveis, preserve uma cópia original."] },
      { heading: "Como obter um resultado menor", paragraphs: ["Remova páginas desnecessárias antes de compactar. Recorte margens excessivas e converta páginas coloridas para escala de cinza quando as cores não forem importantes."] },
    ],
    faq: [{ question: "Compactar altera o arquivo original?", answer: "Não. Uma nova cópia é criada para download." }, { question: "Qual opção gera o menor PDF?", answer: "A opção Arquivo menor, com redução visual mais perceptível." }],
  },
  {
    slug: "como-assinar-pdf-online",
    title: "Como assinar um PDF online de forma simples e privada",
    description: "Veja como desenhar uma assinatura no celular ou computador e entenda a diferença para certificado digital.",
    readingTime: "5 min",
    publishedAt: "2026-07-18",
    updatedAt: "2026-07-18",
    relatedTool: "assinar-pdf",
    intro: "Uma assinatura visual pode ser suficiente em autorizações e fluxos internos, mas não é a mesma coisa que uma assinatura digital com certificado criptográfico.",
    sections: [
      { heading: "Assinatura visual e assinatura digital", paragraphs: ["A assinatura visual é uma imagem inserida no documento. A assinatura digital usa certificado e permite verificar identidade e integridade criptográfica.", "Confirme qual modalidade é exigida antes de assinar documentos jurídicos, públicos ou financeiros."] },
      { heading: "Como desenhar", paragraphs: ["Abra a ferramenta, selecione o PDF e desenhe no campo usando mouse, caneta ou dedo.", "Escolha a posição e processe. A assinatura será aplicada na última página."] },
      { heading: "Cuidados", paragraphs: ["Revise o documento inteiro antes de assinar. Não compartilhe uma imagem da sua assinatura separadamente e mantenha o arquivo final em local seguro."] },
    ],
    faq: [{ question: "A assinatura do LIM PDF é ICP-Brasil?", answer: "Não. É uma assinatura visual simples, sem certificado digital." }, { question: "O desenho é enviado ao servidor?", answer: "Não. Ele permanece no navegador durante a operação." }],
  },
  {
    slug: "como-organizar-paginas-de-pdf",
    title: "Como reorganizar, repetir e inverter páginas de um PDF",
    description: "Aprenda a corrigir documentos fora de ordem usando sequências e intervalos de páginas.",
    readingTime: "5 min",
    publishedAt: "2026-07-18",
    updatedAt: "2026-07-18",
    relatedTool: "organizar-paginas",
    intro: "Digitalizações podem sair fora de ordem, especialmente quando frente e verso são escaneados separadamente. Uma sequência personalizada resolve o problema sem modificar o arquivo original.",
    sections: [
      { heading: "Como escrever a ordem", paragraphs: ["Use números separados por vírgula, como 3,1,2,4. Para incluir um intervalo, escreva 5-9.", "Intervalos inversos também são aceitos: 10-1 cria uma sequência do fim para o início."] },
      { heading: "Como repetir páginas", paragraphs: ["Repita o mesmo número na sequência. Por exemplo, 1,2,2,3 inclui duas cópias da página 2."] },
      { heading: "Revisão final", paragraphs: ["Confira a quantidade de páginas e abra o resultado antes de apagar qualquer versão anterior."] },
    ],
    faq: [{ question: "Posso excluir páginas durante a reorganização?", answer: "Sim. Basta não incluir os números delas na sequência final." }, { question: "Posso inverter o PDF inteiro?", answer: "Sim. Em um PDF de 10 páginas, use 10-1." }],
  },
  {
    slug: "pdf-para-jpg-ou-png",
    title: "PDF para JPG ou PNG: qual formato escolher?",
    description: "Compare tamanho, qualidade e usos de JPG e PNG ao converter páginas de PDF em imagem.",
    readingTime: "6 min",
    publishedAt: "2026-07-18",
    updatedAt: "2026-07-18",
    relatedTool: "pdf-para-jpg",
    intro: "JPG e PNG são formatos de imagem com comportamentos diferentes. A escolha depende do conteúdo das páginas e do destino dos arquivos.",
    sections: [
      { heading: "Quando usar JPG", paragraphs: ["JPG costuma gerar arquivos menores e funciona bem com fotografias, digitalizações e páginas com muitos tons.", "A compressão pode criar pequenas perdas ao redor de letras e linhas finas."] },
      { heading: "Quando usar PNG", paragraphs: ["PNG preserva melhor bordas, gráficos e texto, porém costuma ocupar mais espaço.", "É indicado para apresentações, edição gráfica e capturas que precisam manter nitidez."] },
      { heading: "Escolhendo a resolução", paragraphs: ["Resolução normal é suficiente para visualização. Alta é recomendada para texto pequeno. Muito alta usa mais memória e gera arquivos maiores."] },
    ],
    faq: [{ question: "A conversão mantém links?", answer: "Não. A página se torna uma imagem estática." }, { question: "As imagens vêm separadas?", answer: "Sim. Cada página é salva individualmente dentro de um ZIP." }],
  },
  {
    slug: "privacidade-em-ferramentas-pdf-online",
    title: "Como avaliar a privacidade de uma ferramenta PDF online",
    description: "Saiba identificar processamento local, retenção de arquivos, conexões e cuidados com documentos sensíveis.",
    readingTime: "7 min",
    publishedAt: "2026-07-18",
    updatedAt: "2026-07-18",
    relatedTool: "remover-metadados",
    intro: "Documentos PDF podem conter dados pessoais, contratos, informações financeiras e metadados. A forma de processamento importa tanto quanto a função da ferramenta.",
    sections: [
      { heading: "Processamento local", paragraphs: ["Quando o processamento ocorre no navegador, o arquivo não precisa ser transferido para o servidor do site.", "Ainda assim, bibliotecas externas e recursos de publicidade devem estar descritos na política de privacidade."] },
      { heading: "Verifique a política", paragraphs: ["Procure informações sobre retenção, finalidade, cookies, fornecedores e canal de contato.", "Evite plataformas que não explicam quando o upload ao servidor é necessário."] },
      { heading: "Documentos sensíveis", paragraphs: ["Para informações críticas, use soluções aprovadas pela sua organização, mantenha cópias seguras e confirme se metadados precisam ser removidos antes de compartilhar."] },
    ],
    faq: [{ question: "Processamento local significa risco zero?", answer: "Não. Ele reduz a exposição do arquivo, mas o dispositivo e o navegador também precisam estar seguros." }, { question: "Remover metadados apaga o conteúdo?", answer: "Não. Remove propriedades descritivas, sem apagar textos e imagens visíveis." }],
  },
  {
    slug: "como-preencher-formulario-pdf",
    title: "Como preencher e finalizar um formulário PDF",
    description: "Preencha campos interativos, salve os valores e achate o formulário quando precisar de uma versão fixa.",
    readingTime: "6 min",
    publishedAt: "2026-07-18",
    updatedAt: "2026-07-18",
    relatedTool: "preencher-formulario-pdf",
    intro: "Alguns PDFs possuem campos interativos de texto, caixas de seleção e listas. Esses campos podem ser preenchidos sem desenhar texto manualmente sobre a página.",
    sections: [
      { heading: "Verifique se o PDF possui campos", paragraphs: ["Ao selecionar o arquivo, o LIM PDF lista os campos compatíveis. Se nenhum campo aparecer, o documento pode ser um PDF comum ou usar tecnologia XFA não suportada."] },
      { heading: "Preencha e revise", paragraphs: ["Complete os campos, gere o arquivo e abra o resultado em outro leitor para conferir aparência e conteúdo."] },
      { heading: "Quando achatar", paragraphs: ["Achatar transforma os campos em conteúdo fixo. Faça isso somente após a revisão, porque os campos deixam de ser editáveis."] },
    ],
    faq: [{ question: "A ferramenta cria campos novos?", answer: "Não. Ela preenche campos interativos existentes." }, { question: "Posso achatar depois?", answer: "Sim. Use a ferramenta Achatar formulário PDF." }],
  },
  {
    slug: "preparar-pdf-para-impressao",
    title: "Checklist para preparar um PDF antes de imprimir",
    description: "Revise tamanho, orientação, margens, cores e distribuição de páginas antes de enviar o documento para impressão.",
    readingTime: "7 min",
    publishedAt: "2026-07-18",
    updatedAt: "2026-07-18",
    relatedTool: "paginas-por-folha",
    intro: "Mesmo um PDF que aparece corretamente na tela pode gerar problemas de impressão. Um checklist simples reduz desperdício e retrabalho.",
    sections: [
      { heading: "Tamanho e orientação", paragraphs: ["Confirme se as páginas estão no formato esperado, como A4, Carta ou Ofício. Corrija páginas giradas antes de imprimir."] },
      { heading: "Margens e escala", paragraphs: ["Verifique se textos e elementos importantes não estão próximos demais das bordas. Use redimensionamento quando o conteúdo não cabe no papel escolhido."] },
      { heading: "Economia de papel", paragraphs: ["Para material de consulta, duas ou quatro páginas por folha podem reduzir custos. Faça um teste para confirmar que o texto continua legível."] },
    ],
    faq: [{ question: "O LIM PDF faz preflight gráfico profissional?", answer: "Não nesta fase. Ele oferece ajustes básicos; produção gráfica exige verificação especializada de cores, fontes e sangria." }, { question: "Posso converter para escala de cinza?", answer: "Sim, usando a ferramenta PDF em escala de cinza." }],
  },
];

export const guideBySlug = new Map(guides.map((guide) => [guide.slug, guide]));
