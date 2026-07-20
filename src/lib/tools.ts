export type ToolCategory =
  | "Organizar PDF"
  | "Combinar PDF"
  | "Editar PDF"
  | "Converter de PDF"
  | "Converter para PDF"
  | "Formulários"
  | "Otimizar e proteger";

export type ToolSlug =
  | "editar-pdf"
  | "juntar-pdf"
  | "dividir-pdf"
  | "extrair-paginas"
  | "excluir-paginas"
  | "organizar-paginas"
  | "girar-pdf"
  | "duplicar-paginas"
  | "inserir-pagina-em-branco"
  | "alternar-pdfs"
  | "sobrepor-pdfs"
  | "numerar-paginas"
  | "marca-dagua-pdf"
  | "adicionar-texto-pdf"
  | "adicionar-imagem-pdf"
  | "assinar-pdf"
  | "remover-metadados"
  | "recortar-pdf"
  | "redimensionar-pdf"
  | "criar-livreto-pdf"
  | "paginas-por-folha"
  | "imagens-para-pdf"
  | "pdf-para-jpg"
  | "pdf-para-png"
  | "compactar-pdf"
  | "pdf-em-escala-de-cinza"
  | "extrair-texto-pdf"
  | "preencher-formulario-pdf"
  | "achatar-formulario-pdf"
  | "cabecalho-rodape-pdf"
  | "espelhar-pdf"
  | "adicionar-fundo-pdf";

export type ToolIconName =
  | "SquarePen"
  | "Files"
  | "SplitSquareVertical"
  | "FileOutput"
  | "FileMinus"
  | "ListRestart"
  | "RotateCw"
  | "CopyPlus"
  | "FilePlus2"
  | "Shuffle"
  | "Layers3"
  | "ListOrdered"
  | "Stamp"
  | "Type"
  | "ImagePlus"
  | "Signature"
  | "Eraser"
  | "Crop"
  | "Scaling"
  | "BookOpen"
  | "LayoutGrid"
  | "Images"
  | "FileImage"
  | "Image"
  | "Minimize2"
  | "CircleOff"
  | "TextSearch"
  | "ListChecks"
  | "PanelTop"
  | "FlipHorizontal2"
  | "PaintBucket";

export type ToolDefinition = {
  slug: ToolSlug;
  name: string;
  shortDescription: string;
  description: string;
  category: ToolCategory;
  icon: ToolIconName;
  accent: "blue" | "orange" | "green" | "purple" | "teal" | "rose";
  accept: string;
  multiple: boolean;
  keywords: string[];
  intro: string;
  useCases: string[];
  limitations: string[];
  faq: { question: string; answer: string }[];
};

const privacyFaq = {
  question: "O arquivo é enviado para o servidor do LIM PDF?",
  answer: "Não. Esta ferramenta processa o documento no navegador. O arquivo permanece no aparelho e é descartado da memória ao fechar ou atualizar a página.",
};

export const tools: ToolDefinition[] = [
  {
    slug: "editar-pdf", name: "Editar PDF", shortDescription: "Substitua texto visualmente e adicione novos elementos.",
    description: "Cubra textos selecionados visualmente, adicione textos e imagens e baixe uma nova versão do PDF diretamente no navegador.", category: "Editar PDF", icon: "SquarePen", accent: "blue", accept: "application/pdf", multiple: false,
    keywords: ["editar pdf", "editar texto pdf", "corrigir pdf", "alterar texto pdf", "editor de pdf"],
    intro: "Abra o PDF em um editor visual, selecione áreas da página e substitua visualmente o conteúdo. Também é possível inserir novos textos e imagens antes de exportar.",
    useCases: ["Corrigir dados de um documento", "Atualizar títulos e pequenas informações", "Adicionar observações", "Inserir logotipo ou imagem"],
    limitations: ["A edição de texto cobre o conteúdo original e escreve o novo texto por cima", "Fontes complexas e textos longos podem exigir ajuste manual", "Revise sempre o resultado antes de usar"],
    faq: [{ question: "A ferramenta altera o texto original internamente?", answer: "Ela cobre o bloco visual selecionado e adiciona o novo conteúdo no mesmo local, preservando as demais páginas." }, privacyFaq],
  },
  {
    slug: "juntar-pdf", name: "Juntar PDF", shortDescription: "Combine vários PDFs em um único arquivo.",
    description: "Junte documentos PDF, altere a ordem e baixe um único arquivo sem marca-d’água.", category: "Combinar PDF", icon: "Files", accent: "blue", accept: "application/pdf", multiple: true,
    keywords: ["unir pdf", "combinar pdf", "mesclar pdf", "juntar documentos"],
    intro: "Reúna contratos, comprovantes, apostilas ou digitalizações em um único documento. Antes de processar, você pode mover os arquivos para definir a sequência final.",
    useCases: ["Unificar anexos de um processo", "Montar uma apostila com vários capítulos", "Agrupar comprovantes e recibos", "Reunir digitalizações feitas separadamente"],
    limitations: ["PDFs protegidos por senha precisam ser desbloqueados antes", "Arquivos muito grandes podem exigir mais memória do aparelho"],
    faq: [{ question: "A ordem dos arquivos pode ser alterada?", answer: "Sim. Use as setas ao lado de cada arquivo para definir a ordem antes de juntar." }, privacyFaq],
  },
  {
    slug: "dividir-pdf", name: "Dividir PDF", shortDescription: "Separe todas as páginas em arquivos individuais.",
    description: "Transforme cada página do PDF em um arquivo separado e baixe tudo em um ZIP.", category: "Organizar PDF", icon: "SplitSquareVertical", accent: "orange", accept: "application/pdf", multiple: false,
    keywords: ["separar pdf", "dividir páginas", "pdf por página", "separar documento"],
    intro: "Crie um arquivo PDF independente para cada página do documento. O resultado é organizado em um ZIP para facilitar o download de muitos arquivos.",
    useCases: ["Separar certificados individuais", "Dividir um lote de documentos escaneados", "Enviar somente páginas isoladas", "Organizar fichas por pessoa"],
    limitations: ["A ferramenta cria uma saída para cada página", "Documentos extensos podem gerar um ZIP grande"],
    faq: [{ question: "Como recebo as páginas separadas?", answer: "Todas as páginas são colocadas em um arquivo ZIP, com numeração no nome de cada PDF." }, privacyFaq],
  },
  {
    slug: "extrair-paginas", name: "Extrair páginas", shortDescription: "Crie um PDF apenas com as páginas escolhidas.",
    description: "Selecione páginas ou intervalos e gere um novo PDF diretamente no navegador.", category: "Organizar PDF", icon: "FileOutput", accent: "green", accept: "application/pdf", multiple: false,
    keywords: ["separar páginas pdf", "selecionar páginas", "extrair páginas", "salvar páginas pdf"],
    intro: "Escolha somente as páginas necessárias e gere um documento menor. É possível combinar páginas isoladas e intervalos na mesma seleção.",
    useCases: ["Enviar apenas uma cláusula de contrato", "Separar capítulos de uma apostila", "Criar um resumo com páginas selecionadas", "Retirar páginas úteis de um arquivo grande"],
    limitations: ["A numeração começa em 1", "Use vírgulas e intervalos no formato 1,3-5"],
    faq: [{ question: "Posso escolher páginas fora de ordem?", answer: "A extração preserva a ordem numérica. Para mudar a sequência, use Organizar páginas." }, privacyFaq],
  },
  {
    slug: "excluir-paginas", name: "Excluir páginas", shortDescription: "Remova páginas indesejadas do documento.",
    description: "Informe as páginas que deseja remover e baixe uma nova versão do PDF.", category: "Organizar PDF", icon: "FileMinus", accent: "rose", accept: "application/pdf", multiple: false,
    keywords: ["apagar páginas pdf", "remover páginas pdf", "excluir folha pdf"],
    intro: "Elimine páginas em branco, duplicadas ou desnecessárias sem modificar o arquivo original armazenado no dispositivo.",
    useCases: ["Remover páginas em branco de um scanner", "Excluir anexos antigos", "Apagar uma página duplicada", "Reduzir um documento antes do envio"],
    limitations: ["O PDF precisa conservar pelo menos uma página", "A seleção deve corresponder à numeração atual do documento"],
    faq: [{ question: "O arquivo original é alterado?", answer: "Não. Um novo PDF é gerado para download e o original permanece intacto." }, privacyFaq],
  },
  {
    slug: "organizar-paginas", name: "Organizar páginas", shortDescription: "Defina uma nova ordem para as páginas.",
    description: "Reordene, repita ou selecione páginas digitando a sequência desejada.", category: "Organizar PDF", icon: "ListRestart", accent: "purple", accept: "application/pdf", multiple: false,
    keywords: ["reordenar pdf", "mudar ordem páginas", "organizar pdf", "inverter páginas"],
    intro: "Monte uma sequência personalizada, repita páginas ou inverta intervalos inteiros usando uma lista simples de números.",
    useCases: ["Corrigir digitalização fora de ordem", "Repetir uma capa ou instrução", "Inverter a sequência de um documento", "Montar uma versão personalizada"],
    limitations: ["Informe a sequência completa desejada", "Intervalos inversos podem ser escritos como 8-1"],
    faq: [{ question: "Posso repetir a mesma página?", answer: "Sim. Inclua o mesmo número mais de uma vez, como 1,2,2,3." }, privacyFaq],
  },
  {
    slug: "girar-pdf", name: "Girar PDF", shortDescription: "Gire todas ou apenas algumas páginas.",
    description: "Corrija a orientação de páginas em 90°, 180° ou 270°.", category: "Organizar PDF", icon: "RotateCw", accent: "purple", accept: "application/pdf", multiple: false,
    keywords: ["rotacionar pdf", "virar pdf", "corrigir orientação pdf"],
    intro: "Corrija documentos escaneados de lado ou de cabeça para baixo, aplicando a rotação somente nas páginas necessárias.",
    useCases: ["Corrigir páginas fotografadas na horizontal", "Ajustar um scanner com orientação errada", "Girar somente anexos específicos", "Preparar documento para leitura no celular"],
    limitations: ["A rotação é aplicada em múltiplos de 90 graus", "Deixe o campo de páginas vazio para girar tudo"],
    faq: [{ question: "É possível girar apenas uma página?", answer: "Sim. Digite somente o número da página e escolha o ângulo." }, privacyFaq],
  },
  {
    slug: "duplicar-paginas", name: "Duplicar páginas", shortDescription: "Repita páginas específicas no documento.",
    description: "Escolha as páginas e a quantidade de cópias que deseja inserir após cada original.", category: "Organizar PDF", icon: "CopyPlus", accent: "teal", accept: "application/pdf", multiple: false,
    keywords: ["repetir página pdf", "copiar página pdf", "duplicar folha"],
    intro: "Crie cópias de formulários, etiquetas, instruções ou páginas que precisam aparecer mais de uma vez no mesmo PDF.",
    useCases: ["Repetir uma ficha de preenchimento", "Duplicar páginas para impressão", "Criar múltiplas cópias de uma etiqueta", "Repetir termos ou instruções"],
    limitations: ["São permitidas até 20 cópias adicionais por página", "As cópias são inseridas logo após a página original"],
    faq: [{ question: "Posso duplicar várias páginas de uma vez?", answer: "Sim. Informe páginas e intervalos, como 1,3-5." }, privacyFaq],
  },
  {
    slug: "inserir-pagina-em-branco", name: "Inserir página em branco", shortDescription: "Adicione uma página vazia em qualquer posição.",
    description: "Insira uma página A4 em branco no início, no final ou entre páginas existentes.", category: "Organizar PDF", icon: "FilePlus2", accent: "blue", accept: "application/pdf", multiple: false,
    keywords: ["adicionar página pdf", "página em branco pdf", "inserir folha"],
    intro: "Inclua uma folha A4 vazia para anotações, separação de capítulos, impressão frente e verso ou preenchimento posterior.",
    useCases: ["Separar seções de uma apostila", "Ajustar impressão frente e verso", "Reservar espaço para assinatura", "Inserir uma folha para observações"],
    limitations: ["A página inserida usa o formato A4", "A posição 1 insere no início"],
    faq: [{ question: "Como inserir no final?", answer: "Use uma posição igual ao total de páginas mais um." }, privacyFaq],
  },
  {
    slug: "alternar-pdfs", name: "Alternar dois PDFs", shortDescription: "Misture páginas de dois documentos alternadamente.",
    description: "Combine a página 1 do primeiro PDF, a página 1 do segundo e assim sucessivamente.", category: "Combinar PDF", icon: "Shuffle", accent: "green", accept: "application/pdf", multiple: true,
    keywords: ["misturar pdf", "intercalar páginas pdf", "alternar pdf", "frente verso pdf"],
    intro: "Intercale dois documentos página a página. Essa função é útil para juntar digitalizações separadas de frente e verso.",
    useCases: ["Unir frente e verso escaneados separadamente", "Intercalar tradução e original", "Misturar perguntas e respostas", "Combinar duas sequências paralelas"],
    limitations: ["Selecione exatamente dois PDFs", "A ordem dos arquivos define qual página aparece primeiro"],
    faq: [{ question: "O que acontece se os PDFs tiverem tamanhos diferentes?", answer: "As páginas restantes do documento mais longo são adicionadas ao final." }, privacyFaq],
  },
  {
    slug: "sobrepor-pdfs", name: "Sobrepor PDFs", shortDescription: "Coloque as páginas de um PDF sobre outro.",
    description: "Use um documento como base e aplique outro como camada superior em cada página.", category: "Combinar PDF", icon: "Layers3", accent: "purple", accept: "application/pdf", multiple: true,
    keywords: ["overlay pdf", "sobrepor documentos", "papel timbrado pdf", "camada pdf"],
    intro: "Aplique um papel timbrado, moldura, carimbo ou camada gráfica sobre outro documento mantendo o tamanho da página base.",
    useCases: ["Aplicar papel timbrado", "Adicionar moldura institucional", "Sobrepor uma folha de aprovação", "Combinar arte e conteúdo variável"],
    limitations: ["O primeiro arquivo é usado como base", "A camada é ajustada ao tamanho de cada página base"],
    faq: [{ question: "Posso usar uma única página como camada em todo o PDF?", answer: "Sim. Um PDF de uma página é repetido sobre todas as páginas do arquivo base." }, privacyFaq],
  },
  {
    slug: "numerar-paginas", name: "Numerar páginas", shortDescription: "Adicione números no rodapé ou cabeçalho.",
    description: "Insira numeração sequencial com posição, tamanho e número inicial configuráveis.", category: "Editar PDF", icon: "ListOrdered", accent: "blue", accept: "application/pdf", multiple: false,
    keywords: ["colocar número em pdf", "paginar pdf", "numerar folhas"],
    intro: "Adicione paginação uniforme em documentos acadêmicos, relatórios, propostas e apostilas, escolhendo onde o número será exibido.",
    useCases: ["Paginar trabalhos acadêmicos", "Organizar propostas comerciais", "Numerar anexos jurídicos", "Preparar apostilas para impressão"],
    limitations: ["A numeração usa uma fonte padrão compatível", "O número é aplicado em todas as páginas"],
    faq: [{ question: "Posso começar pelo número zero ou por outro valor?", answer: "Sim. Defina o número inicial antes de processar." }, privacyFaq],
  },
  {
    slug: "marca-dagua-pdf", name: "Marca-d’água em PDF", shortDescription: "Aplique um texto transparente nas páginas.",
    description: "Proteja ou identifique documentos adicionando uma marca-d’água personalizada.", category: "Editar PDF", icon: "Stamp", accent: "orange", accept: "application/pdf", multiple: false,
    keywords: ["marca d água pdf", "carimbar pdf", "confidencial pdf", "rascunho pdf"],
    intro: "Identifique documentos como confidenciais, cópias, rascunhos ou amostras com um texto diagonal discreto.",
    useCases: ["Marcar documento como confidencial", "Identificar uma versão de rascunho", "Criar amostra para aprovação", "Indicar cópia sem valor fiscal"],
    limitations: ["A marca é textual e diagonal", "Textos muito longos são reduzidos para caber na página"],
    faq: [{ question: "Posso aplicar somente em algumas páginas?", answer: "Sim. Informe as páginas ou deixe o campo vazio para aplicar em todas." }, privacyFaq],
  },
  {
    slug: "adicionar-texto-pdf", name: "Adicionar texto ao PDF", shortDescription: "Insira um texto em todas ou algumas páginas.",
    description: "Adicione observações, códigos, datas e outras informações em uma posição escolhida.", category: "Editar PDF", icon: "Type", accent: "teal", accept: "application/pdf", multiple: false,
    keywords: ["escrever no pdf", "inserir texto pdf", "editar pdf", "adicionar data pdf"],
    intro: "Inclua uma observação curta, código interno, data, identificação ou aviso sem precisar abrir um editor de desktop.",
    useCases: ["Adicionar data de revisão", "Inserir número de protocolo", "Identificar um cliente", "Adicionar observação no rodapé"],
    limitations: ["A ferramenta adiciona texto, mas não altera o texto original", "Textos extensos devem ser divididos em operações menores"],
    faq: [{ question: "Esta função edita o texto que já existe?", answer: "Não. Ela adiciona um novo texto sobre a página, sem modificar o conteúdo original." }, privacyFaq],
  },
  {
    slug: "adicionar-imagem-pdf", name: "Adicionar imagem ao PDF", shortDescription: "Insira logotipo, carimbo ou imagem nas páginas.",
    description: "Escolha um JPG ou PNG e aplique-o em uma posição configurável do documento.", category: "Editar PDF", icon: "ImagePlus", accent: "green", accept: "application/pdf", multiple: false,
    keywords: ["colocar logo no pdf", "imagem no pdf", "carimbo imagem pdf", "selo pdf"],
    intro: "Aplique logotipos, selos, rubricas digitalizadas, carimbos ou fotografias em páginas selecionadas.",
    useCases: ["Adicionar logotipo institucional", "Aplicar carimbo de aprovação", "Inserir selo ou certificado", "Adicionar uma rubrica digitalizada"],
    limitations: ["Aceita imagens JPG e PNG", "A imagem é posicionada sobre o conteúdo existente"],
    faq: [{ question: "Posso controlar o tamanho da imagem?", answer: "Sim. Defina a largura como percentual da página e escolha a posição." }, privacyFaq],
  },
  {
    slug: "assinar-pdf", name: "Assinar PDF", shortDescription: "Desenhe e insira sua assinatura no documento.",
    description: "Crie uma assinatura à mão e aplique-a na última página do PDF.", category: "Editar PDF", icon: "Signature", accent: "purple", accept: "application/pdf", multiple: false,
    keywords: ["assinatura pdf", "assinar documento", "rubrica pdf", "assinar online"],
    intro: "Desenhe a assinatura com mouse, caneta ou dedo e aplique na última página do documento, sem enviar o arquivo a terceiros.",
    useCases: ["Assinar declarações simples", "Inserir rubrica em documentos internos", "Aprovar um orçamento", "Assinar uma autorização"],
    limitations: ["Esta é uma assinatura visual simples", "Não substitui certificado digital ICP-Brasil quando a lei exigir"],
    faq: [{ question: "A assinatura possui certificado digital?", answer: "Não. A ferramenta insere uma imagem da assinatura. Para validade criptográfica, use um certificado digital adequado." }, privacyFaq],
  },
  {
    slug: "remover-metadados", name: "Remover metadados", shortDescription: "Apague autor, título, assunto e palavras-chave.",
    description: "Crie uma cópia do PDF sem os principais metadados descritivos do documento.", category: "Otimizar e proteger", icon: "Eraser", accent: "rose", accept: "application/pdf", multiple: false,
    keywords: ["limpar metadados pdf", "remover autor pdf", "privacidade pdf", "limpar propriedades"],
    intro: "Remova informações descritivas comuns que podem revelar autor, aplicativo de origem, assunto ou palavras-chave.",
    useCases: ["Compartilhar documento sem nome do autor", "Limpar propriedades antes de publicar", "Reduzir informações de identificação", "Criar uma cópia sanitizada"],
    limitations: ["A função limpa metadados padrão", "Conteúdo visível e anexos internos não são removidos"],
    faq: [{ question: "Isso remove todo dado oculto possível?", answer: "Remove os principais metadados descritivos. Para auditoria forense completa, utilize uma ferramenta especializada." }, privacyFaq],
  },
  {
    slug: "recortar-pdf", name: "Recortar margens", shortDescription: "Reduza as margens visíveis das páginas.",
    description: "Recorte igualmente os quatro lados do documento usando uma medida em milímetros.", category: "Otimizar e proteger", icon: "Crop", accent: "teal", accept: "application/pdf", multiple: false,
    keywords: ["cortar pdf", "remover margem pdf", "crop pdf", "aparar pdf"],
    intro: "Ajuste a área visível das páginas para remover bordas, marcas de scanner ou espaços excessivos.",
    useCases: ["Remover bordas de digitalização", "Ajustar documento para apresentação", "Eliminar margem branca excessiva", "Preparar páginas para encaixe"],
    limitations: ["O recorte é igual nos quatro lados", "O conteúdo fora da área de recorte deixa de ser exibido"],
    faq: [{ question: "O conteúdo recortado é apagado definitivamente?", answer: "A área visível é reduzida. Alguns leitores podem conservar dados fora da caixa de recorte." }, privacyFaq],
  },
  {
    slug: "redimensionar-pdf", name: "Redimensionar PDF", shortDescription: "Ajuste páginas para formatos prontos ou personalizados.",
    description: "Altere o tamanho das páginas com formatos predefinidos, tamanho personalizado, unidade, margens e modo de ajuste.", category: "Otimizar e proteger", icon: "Scaling", accent: "blue", accept: "application/pdf", multiple: false,
    keywords: ["mudar tamanho pdf", "pdf a4", "redimensionar página", "pdf carta", "tamanho personalizado pdf"],
    intro: "Padronize documentos com páginas de tamanhos diferentes e prepare o conteúdo para impressão em formatos comuns ou personalizados.",
    useCases: ["Converter páginas para A4", "Padronizar documentos misturados", "Preparar material em A5", "Criar tamanho personalizado em mm, cm, polegadas ou pontos"],
    limitations: ["O conteúdo pode ser ajustado dentro da página, preenchido ou mantido no tamanho original", "Margens muito grandes podem impedir o encaixe do conteúdo"],
    faq: [{ question: "O conteúdo fica deformado?", answer: "Somente se você escolher esticar. No modo ajustar, a proporção original é mantida e o conteúdo é centralizado." }, privacyFaq],
  },
  {
    slug: "criar-livreto-pdf", name: "Criar livreto PDF", shortDescription: "Reorganize páginas para impressão dobrada.",
    description: "Gere um PDF imposto em formato livreto, com pares de páginas para frente e verso e páginas em branco quando necessário.", category: "Otimizar e proteger", icon: "BookOpen", accent: "orange", accept: "application/pdf", multiple: false,
    keywords: ["livreto pdf", "booklet pdf", "imposição pdf", "imprimir livreto", "caderno pdf"],
    intro: "Prepare o arquivo para impressão frente e verso com dobra central. A ferramenta calcula a ordem das páginas, completa múltiplos de quatro e monta duas páginas por folha.",
    useCases: ["Criar apostila dobrada", "Preparar manual grampeado ao centro", "Imprimir caderno simples", "Revisar ordem de frente e verso antes da impressão"],
    limitations: ["A saída usa imposição simples de duas páginas por lado", "Confira a opção de virar pela borda curta ou longa na sua impressora antes de imprimir o lote final"],
    faq: [{ question: "A ferramenta adiciona páginas em branco?", answer: "Sim. Quando o total não fecha múltiplo de quatro, páginas em branco são adicionadas ao final para manter a ordem correta do livreto." }, privacyFaq],
  },
  {
    slug: "paginas-por-folha", name: "Páginas por folha", shortDescription: "Coloque 2 ou 4 páginas em uma única folha.",
    description: "Crie um PDF econômico para impressão com várias páginas originais em cada folha A4.", category: "Otimizar e proteger", icon: "LayoutGrid", accent: "green", accept: "application/pdf", multiple: false,
    keywords: ["2 páginas por folha", "4 páginas por folha", "n-up pdf", "economizar papel"],
    intro: "Reduza o consumo de papel colocando duas ou quatro páginas originais em cada folha A4 do novo documento.",
    useCases: ["Imprimir apostilas de forma econômica", "Criar folhetos de revisão", "Reduzir relatórios para consulta", "Montar provas e materiais internos"],
    limitations: ["O formato de saída é A4", "Textos pequenos podem ficar difíceis de ler em quatro páginas por folha"],
    faq: [{ question: "A ordem das páginas é preservada?", answer: "Sim. Elas são distribuídas da esquerda para a direita e de cima para baixo." }, privacyFaq],
  },
  {
    slug: "imagens-para-pdf", name: "Imagens para PDF", shortDescription: "Transforme JPG e PNG em um único PDF.",
    description: "Selecione imagens, escolha a ordem e crie um PDF com uma imagem por página.", category: "Converter para PDF", icon: "Images", accent: "teal", accept: "image/jpeg,image/png", multiple: true,
    keywords: ["jpg para pdf", "png para pdf", "foto para pdf", "imagens em pdf"],
    intro: "Converta fotografias, comprovantes, artes e digitalizações em um documento A4, mantendo uma imagem centralizada por página.",
    useCases: ["Transformar fotos de documentos em PDF", "Reunir comprovantes fotografados", "Criar portfólio simples", "Converter artes JPG ou PNG"],
    limitations: ["Aceita JPG e PNG", "Cada imagem gera uma página A4"],
    faq: [{ question: "Posso alterar a ordem das imagens?", answer: "Sim. Use as setas na lista antes de gerar o PDF." }, privacyFaq],
  },
  {
    slug: "pdf-para-jpg", name: "PDF para JPG", shortDescription: "Converta páginas do PDF em imagens JPG.",
    description: "Renderize cada página em JPG e baixe as imagens organizadas em um ZIP.", category: "Converter de PDF", icon: "FileImage", accent: "orange", accept: "application/pdf", multiple: false,
    keywords: ["pdf para jpg", "converter pdf em imagem", "pdf em foto"],
    intro: "Transforme cada página em uma imagem JPG compatível com redes sociais, editores de imagem e sistemas que não aceitam PDF.",
    useCases: ["Publicar páginas como imagem", "Enviar documento em aplicativo sem suporte a PDF", "Criar miniaturas", "Usar uma página em uma apresentação"],
    limitations: ["O conteúdo é rasterizado", "A qualidade depende da resolução escolhida"],
    faq: [{ question: "Todas as páginas são convertidas?", answer: "Sim. Cada página vira um JPG separado dentro de um arquivo ZIP." }, privacyFaq],
  },
  {
    slug: "pdf-para-png", name: "PDF para PNG", shortDescription: "Converta páginas do PDF em imagens PNG.",
    description: "Renderize cada página em PNG com boa nitidez e baixe tudo em um ZIP.", category: "Converter de PDF", icon: "Image", accent: "purple", accept: "application/pdf", multiple: false,
    keywords: ["pdf para png", "converter pdf png", "página pdf imagem"],
    intro: "Crie imagens PNG de alta nitidez para materiais gráficos, apresentações, documentos digitais e edição posterior.",
    useCases: ["Gerar imagens com texto nítido", "Importar páginas em editores", "Criar prévias de documentos", "Reutilizar páginas em layouts"],
    limitations: ["PNG costuma gerar arquivos maiores que JPG", "Elementos vetoriais são convertidos em pixels"],
    faq: [{ question: "Quando escolher PNG em vez de JPG?", answer: "Use PNG quando priorizar nitidez de texto e gráficos; JPG é menor para fotografias." }, privacyFaq],
  },
  {
    slug: "compactar-pdf", name: "Compactar PDF", shortDescription: "Reduza o tamanho rasterizando as páginas.",
    description: "Gere uma cópia menor escolhendo o equilíbrio entre qualidade visual e tamanho do arquivo.", category: "Otimizar e proteger", icon: "Minimize2", accent: "blue", accept: "application/pdf", multiple: false,
    keywords: ["comprimir pdf", "reduzir pdf", "diminuir tamanho pdf", "pdf leve"],
    intro: "Reduza documentos escaneados e PDFs visuais para facilitar envio por e-mail, WhatsApp ou formulários com limite de tamanho.",
    useCases: ["Enviar arquivo por e-mail", "Adequar PDF a um portal", "Reduzir digitalizações pesadas", "Economizar espaço no celular"],
    limitations: ["A compactação rasteriza as páginas", "Texto selecionável, links e formulários podem deixar de funcionar"],
    faq: [{ question: "A qualidade pode diminuir?", answer: "Sim. Você escolhe a intensidade. Compressão maior gera arquivos menores e imagens menos nítidas." }, privacyFaq],
  },
  {
    slug: "pdf-em-escala-de-cinza", name: "PDF em escala de cinza", shortDescription: "Converta páginas coloridas para tons de cinza.",
    description: "Crie uma versão em preto, branco e cinza para impressão econômica ou padronização.", category: "Otimizar e proteger", icon: "CircleOff", accent: "rose", accept: "application/pdf", multiple: false,
    keywords: ["pdf preto e branco", "pdf escala de cinza", "remover cores pdf"],
    intro: "Converta páginas coloridas em tons de cinza para reduzir custos de impressão e uniformizar documentos digitalizados.",
    useCases: ["Economizar tinta colorida", "Padronizar anexos", "Preparar material para fotocópia", "Criar versão monocromática"],
    limitations: ["A conversão rasteriza as páginas", "Links e texto selecionável podem ser perdidos"],
    faq: [{ question: "O resultado é somente preto e branco?", answer: "O resultado preserva tons intermediários de cinza, oferecendo melhor legibilidade." }, privacyFaq],
  },
  {
    slug: "extrair-texto-pdf", name: "Extrair texto do PDF", shortDescription: "Salve o texto reconhecido em um arquivo TXT.",
    description: "Leia a camada de texto do PDF e baixe o conteúdo organizado por página.", category: "Converter de PDF", icon: "TextSearch", accent: "teal", accept: "application/pdf", multiple: false,
    keywords: ["pdf para txt", "extrair texto pdf", "copiar texto pdf", "pdf em texto"],
    intro: "Extraia o texto de PDFs digitais para pesquisa, revisão, resumo ou reutilização em outros documentos.",
    useCases: ["Copiar conteúdo de relatório", "Criar arquivo para pesquisa", "Preparar texto para revisão", "Reutilizar informações em outro sistema"],
    limitations: ["Não executa OCR em páginas que são somente imagens", "A ordem visual de colunas pode variar"],
    faq: [{ question: "Funciona em PDF escaneado?", answer: "Somente se o arquivo já possuir uma camada de texto criada por OCR." }, privacyFaq],
  },
  {
    slug: "preencher-formulario-pdf", name: "Preencher formulário PDF", shortDescription: "Complete campos interativos existentes no PDF.",
    description: "Detecte campos de texto, caixas de seleção e listas para preencher o formulário no navegador.", category: "Formulários", icon: "ListChecks", accent: "green", accept: "application/pdf", multiple: false,
    keywords: ["preencher pdf", "formulário pdf online", "completar campos pdf"],
    intro: "Abra um formulário PDF interativo, preencha os campos detectados e baixe uma cópia com os valores salvos.",
    useCases: ["Preencher fichas cadastrais", "Completar formulários administrativos", "Responder questionários em PDF", "Preencher solicitações internas"],
    limitations: ["O PDF precisa possuir campos interativos", "Scripts e lógicas avançadas do formulário podem não ser executados"],
    faq: [{ question: "A ferramenta cria campos em um PDF comum?", answer: "Não. Ela preenche campos que já existem no formulário." }, privacyFaq],
  },
  {
    slug: "achatar-formulario-pdf", name: "Achatar formulário PDF", shortDescription: "Fixe os valores dos campos no documento.",
    description: "Transforme campos preenchidos em conteúdo permanente, dificultando alterações acidentais.", category: "Formulários", icon: "PanelTop", accent: "orange", accept: "application/pdf", multiple: false,
    keywords: ["achatar pdf", "flatten pdf", "fixar formulário pdf", "bloquear campos"],
    intro: "Converta campos interativos em conteúdo fixo depois de preencher o documento, facilitando compartilhamento e impressão.",
    useCases: ["Finalizar ficha preenchida", "Evitar alteração acidental de campos", "Preparar formulário para impressão", "Arquivar resposta consolidada"],
    limitations: ["Os campos deixam de ser editáveis", "Salve uma cópia original se precisar alterar depois"],
    faq: [{ question: "É possível desfazer depois?", answer: "Não no arquivo achatado. Guarde o PDF original com campos editáveis." }, privacyFaq],
  },
  {
    slug: "cabecalho-rodape-pdf", name: "Cabeçalho e rodapé", shortDescription: "Adicione textos no topo e na base das páginas.",
    description: "Inclua identificação, data, código, empresa ou observação em todas as páginas.", category: "Editar PDF", icon: "PanelTop", accent: "blue", accept: "application/pdf", multiple: false,
    keywords: ["cabeçalho pdf", "rodapé pdf", "adicionar empresa pdf", "data no pdf"],
    intro: "Padronize relatórios e documentos adicionando um cabeçalho, um rodapé ou ambos, com alinhamento configurável.",
    useCases: ["Adicionar nome da empresa", "Inserir código de documento", "Colocar aviso de confidencialidade", "Adicionar data ou versão"],
    limitations: ["Use textos curtos para evitar sobreposição", "O conteúdo é aplicado em todas as páginas"],
    faq: [{ question: "Posso usar somente o cabeçalho ou somente o rodapé?", answer: "Sim. Deixe o campo que não deseja usar vazio." }, privacyFaq],
  },
  {
    slug: "espelhar-pdf", name: "Espelhar PDF", shortDescription: "Inverta as páginas horizontal ou verticalmente.",
    description: "Crie uma cópia espelhada para transfer, impressão ou correção de digitalizações.", category: "Editar PDF", icon: "FlipHorizontal2", accent: "purple", accept: "application/pdf", multiple: false,
    keywords: ["espelhar pdf", "inverter pdf horizontal", "pdf transfer"],
    intro: "Inverta visualmente o conteúdo de todas as páginas na horizontal ou vertical, sem modificar o arquivo original.",
    useCases: ["Preparar arte para transfer", "Corrigir digitalização espelhada", "Criar material de impressão invertida", "Reverter orientação visual"],
    limitations: ["A transformação é aplicada em todas as páginas", "Texto também será espelhado"],
    faq: [{ question: "Qual opção usar para transfer?", answer: "Normalmente o espelhamento horizontal é usado, mas confirme o processo da sua impressora e material." }, privacyFaq],
  },
  {
    slug: "adicionar-fundo-pdf", name: "Adicionar fundo ao PDF", shortDescription: "Aplique uma cor atrás do conteúdo das páginas.",
    description: "Escolha uma cor de fundo e gere um novo PDF com o conteúdo original por cima.", category: "Editar PDF", icon: "PaintBucket", accent: "teal", accept: "application/pdf", multiple: false,
    keywords: ["fundo pdf", "cor de página pdf", "adicionar fundo documento"],
    intro: "Aplique uma cor uniforme atrás do conteúdo para melhorar apresentação, contraste ou identidade visual do documento.",
    useCases: ["Criar papel colorido digital", "Padronizar fundo de um material", "Melhorar contraste de páginas transparentes", "Aplicar identidade visual simples"],
    limitations: ["O fundo é aplicado em todas as páginas", "Conteúdos com fundo branco opaco podem encobrir a nova cor"],
    faq: [{ question: "A cor fica atrás do texto?", answer: "Sim. O documento original é redesenhado sobre a cor escolhida." }, privacyFaq],
  },
];

export const toolBySlug = new Map(tools.map((tool) => [tool.slug, tool]));

export const categories = [
  { name: "Organizar PDF", description: "Separe, reordene, duplique, gire e ajuste páginas.", href: "/ferramentas#organizar-pdf" },
  { name: "Combinar PDF", description: "Junte, alterne ou sobreponha documentos.", href: "/ferramentas#combinar-pdf" },
  { name: "Editar PDF", description: "Substitua texto visualmente e adicione textos, imagens, assinatura, fundo e marca-d’água.", href: "/ferramentas#editar-pdf" },
  { name: "Converter de PDF", description: "Transforme páginas em JPG, PNG ou texto.", href: "/ferramentas#converter-de-pdf" },
  { name: "Converter para PDF", description: "Transforme imagens JPG e PNG em PDF.", href: "/ferramentas#converter-para-pdf" },
  { name: "Formulários", description: "Preencha e achate formulários PDF interativos.", href: "/ferramentas#formularios" },
  { name: "Otimizar e proteger", description: "Compacte, recorte, limpe e prepare documentos.", href: "/ferramentas#otimizar-e-proteger" },
] as const;
