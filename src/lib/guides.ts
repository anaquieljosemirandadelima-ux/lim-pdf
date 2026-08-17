export type GuideSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type Guide = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readingTime: string;
  updatedAt: string;
  author: string;
  excerpt: string;
  intro: string;
  sections: GuideSection[];
  faq: { question: string; answer: string }[];
  relatedTools: { label: string; href: string }[];
};

const commonLocalProcessing = "No LIM PDF, o processamento destas tarefas é feito no navegador quando a própria ferramenta indica processamento local. O arquivo original não é enviado automaticamente para um servidor: confirme sempre o aviso de privacidade apresentado na tela antes de começar.";

export const guides: Guide[] = [
  {
    slug: "editar-pdf-sem-perder-formatacao",
    title: "Como editar um PDF sem perder a formatação",
    description: "Um guia prático para escolher entre cobrir conteúdo, inserir texto, adicionar imagens ou reorganizar páginas de um PDF.",
    category: "Edição e organização",
    readingTime: "8 min de leitura",
    updatedAt: "17 de agosto de 2026",
    author: "Equipe editorial LIM PDF",
    excerpt: "Editar PDF não é uma única operação. A melhor abordagem depende de o conteúdo ser texto, imagem, formulário ou apenas uma página fora de ordem.",
    intro: "A edição de PDF costuma dar errado quando se tenta tratar todos os documentos como se fossem iguais. Antes de abrir uma ferramenta, identifique se precisa corrigir um bloco visual, inserir informação, mudar a ordem das páginas ou transformar o documento em outro formato.",
    sections: [
      { heading: "Escolha o tipo de edição antes de carregar o arquivo", paragraphs: ["Se o problema está em uma frase, título ou pequeno campo visual, use a edição visual e revise o resultado na própria página. Se o conteúdo precisa continuar semanticamente editável em outro programa, considere extrair o texto para Word e faça a revisão fora do PDF.", "Para páginas fora de ordem, não cubra nem redesenhe o conteúdo: use Organizar páginas. Para remover uma folha, use Excluir páginas, pois isso preserva melhor a estrutura das páginas restantes."], bullets: ["Texto ou imagem sobre uma área existente: edição visual.", "Página duplicada, em branco ou fora de ordem: organização de páginas.", "Documento digitalizado: OCR antes de procurar ou editar texto."] },
      { heading: "Como reduzir o risco de alterações invisíveis", paragraphs: ["O PDF final deve ser revisado página a página, principalmente quando o documento contém fontes incomuns, tabelas, carimbos ou elementos rotacionados. Uma correção visual pode esconder o conteúdo antigo, mas não necessariamente remove a informação original de todas as camadas.", "Quando a informação for sensível, prefira uma operação de redação própria, com remoção verificável do conteúdo, em vez de apenas desenhar um retângulo preto sobre a página."], bullets: ["Compare o número de páginas antes e depois.", "Faça busca por termos que deveriam ter sido removidos.", "Abra o arquivo exportado em outro leitor de PDF."] },
      { heading: "Fluxo recomendado no LIM PDF", paragraphs: ["Comece pelo Editor PDF para pequenas correções e inserções. Use a barra de páginas para navegar, o histórico para desfazer uma decisão e a exportação somente depois de verificar a prévia. Para operações estruturais, volte ao catálogo e escolha a ferramenta específica: ela apresenta limites e parâmetros mais claros para a tarefa." , commonLocalProcessing] },
    ],
    faq: [
      { question: "O LIM PDF altera o arquivo original?", answer: "Não. A ferramenta gera uma nova saída para download e mantém o arquivo escolhido no dispositivo durante o fluxo local." },
      { question: "Posso editar um PDF digitalizado?", answer: "Primeiro use OCR para criar uma camada de texto pesquisável. A qualidade depende da resolução, contraste, idioma e legibilidade da digitalização." },
    ],
    relatedTools: [{ label: "Editar PDF", href: "/ferramentas/editar-pdf" }, { label: "OCR PDF", href: "/ferramentas/ocr-pdf" }, { label: "Organizar páginas", href: "/ferramentas/organizar-paginas" }],
  },
  {
    slug: "ocr-pdf-escaneado",
    title: "Como transformar um PDF escaneado em texto pesquisável",
    description: "Entenda o que o OCR faz, como preparar a digitalização e como verificar se o texto reconhecido está correto.",
    category: "OCR e digitalização",
    readingTime: "7 min de leitura",
    updatedAt: "17 de agosto de 2026",
    author: "Equipe editorial LIM PDF",
    excerpt: "OCR adiciona uma camada de texto reconhecido a uma imagem. Ele não substitui uma revisão: nomes, números e tabelas precisam de conferência humana.",
    intro: "Um PDF escaneado pode parecer um documento normal, mas muitas vezes cada página é apenas uma imagem. O OCR — reconhecimento óptico de caracteres — analisa essa imagem e cria uma camada pesquisável para que você consiga encontrar palavras e copiar trechos.",
    sections: [
      { heading: "Prepare o arquivo para o reconhecimento", paragraphs: ["A nitidez da origem é o fator mais importante. Digitalizações inclinadas, escuras ou com sombras aumentam a quantidade de erros. Antes do OCR, endireite páginas, remova bordas excessivas e melhore o contraste quando necessário.", "Documentos com várias colunas, carimbos ou escrita manual exigem mais cuidado. O OCR pode reconhecer parte do conteúdo, mas a posição visual e a ordem da leitura podem não coincidir com o que uma pessoa vê."], bullets: ["Prefira imagens nítidas e com contraste suficiente.", "Remova páginas vazias antes de processar lotes grandes.", "Escolha o idioma principal do documento quando a ferramenta oferecer essa opção."] },
      { heading: "Revise o que é mais sensível", paragraphs: ["Depois do processamento, pesquise nomes próprios, números de documentos, datas, valores, códigos e endereços. Esses trechos são curtos, mas um único caractere incorreto pode mudar o significado de um documento.", "Se o texto será usado em uma planilha ou sistema, exporte uma amostra pequena, confira as colunas e só então processe o restante."], bullets: ["Números 0, 1, 5 e 8 costumam ser confundidos em imagens ruins.", "Acentos e hífens podem desaparecer.", "Tabelas e carimbos não devem ser considerados automaticamente confiáveis."] },
      { heading: "O que o resultado do OCR não significa", paragraphs: ["O texto pesquisável não transforma a imagem original em um arquivo editável perfeito. Ele cria uma camada de reconhecimento que pode ser usada para busca, seleção e extração. A página visual continua sendo a referência para conferir o documento.", commonLocalProcessing] },
    ],
    faq: [
      { question: "OCR deixa o PDF totalmente editável?", answer: "Não necessariamente. Ele cria uma camada de texto pesquisável. Para editar o conteúdo com maior liberdade, talvez seja melhor extrair o texto para Word e revisar a formatação." },
      { question: "O OCR reconhece letra manuscrita?", answer: "O resultado de escrita manual varia muito e não deve ser considerado confiável sem revisão página a página." },
    ],
    relatedTools: [{ label: "OCR PDF", href: "/ferramentas/ocr-pdf" }, { label: "Limpar digitalização", href: "/ferramentas/limpar-documento-digitalizado" }, { label: "Extrair texto", href: "/ferramentas/extrair-texto-pdf" }],
  },
  {
    slug: "comprimir-pdf",
    title: "Como comprimir um PDF sem destruir a qualidade",
    description: "Aprenda a escolher entre redução estrutural, compressão visual e uma saída adequada para envio, arquivo ou impressão.",
    category: "Otimização de arquivos",
    readingTime: "6 min de leitura",
    updatedAt: "17 de agosto de 2026",
    author: "Equipe editorial LIM PDF",
    excerpt: "O melhor tamanho depende do uso final. Um PDF para WhatsApp não tem a mesma exigência de um arquivo destinado à impressão ou preservação.",
    intro: "Comprimir PDF é equilibrar tamanho, legibilidade e finalidade. Reduzir demais um arquivo com fotografias pode tornar textos pequenos ilegíveis; reduzir pouco um documento cheio de imagens pode não resolver o problema de envio.",
    sections: [
      { heading: "Defina a finalidade do arquivo", paragraphs: ["Para leitura em celular ou envio por e-mail, uma redução visual moderada costuma oferecer o melhor compromisso. Para impressão, prefira preservar a resolução das imagens e reduza apenas o que não afeta a saída final.", "Em documentos predominantemente textuais, a redução estrutural pode remover dados redundantes sem alterar tanto a aparência. Em documentos com fotos, a resolução e a qualidade JPEG são os principais fatores de tamanho."], bullets: ["Envio rápido: priorize tamanho e verifique textos pequenos.", "Impressão: preserve imagens e fontes necessárias.", "Arquivo de longo prazo: mantenha uma cópia original sem compressão."] },
      { heading: "Verifique o resultado depois da compressão", paragraphs: ["Abra o PDF reduzido em um leitor diferente e confira imagens, fontes, links, formulários e assinatura. Alguns recursos podem deixar de funcionar quando a estrutura é otimizada de forma agressiva.", "Compare o tamanho do arquivo, o número de páginas e pelo menos três páginas representativas: uma com texto, uma com imagens e uma com elementos especiais."], bullets: ["Confira a primeira e a última página.", "Teste busca e cópia de texto quando forem importantes.", "Não substitua o original até confirmar a saída."] },
      { heading: "Uma compressão não resolve todos os casos", paragraphs: ["Um PDF pode continuar grande porque contém imagens em alta resolução, páginas digitalizadas ou fontes incorporadas. Nesses casos, a melhor solução pode ser redimensionar imagens, aplicar OCR com cuidado ou gerar uma versão específica para tela.", commonLocalProcessing] },
    ],
    faq: [
      { question: "Comprimir PDF deixa o arquivo sempre menor?", answer: "Nem sempre. PDFs já otimizados podem ter pouca margem de redução. O resultado depende da estrutura, das imagens e das fontes incorporadas." },
      { question: "A compressão remove a qualidade do documento?", answer: "Uma compressão visual pode reduzir detalhes. Por isso, o LIM PDF oferece a saída para revisão e recomenda conservar o original." },
    ],
    relatedTools: [{ label: "Compactar PDF", href: "/ferramentas/compactar-pdf" }, { label: "Redimensionar PDF", href: "/ferramentas/redimensionar-pdf" }, { label: "Escala de cinza", href: "/ferramentas/pdf-em-escala-de-cinza" }],
  },
  {
    slug: "redacao-segura-pdf",
    title: "Como remover informações sensíveis de um PDF com segurança",
    description: "Veja a diferença entre cobrir um trecho e remover dados, e use uma checklist antes de compartilhar um documento.",
    category: "Privacidade e segurança",
    readingTime: "9 min de leitura",
    updatedAt: "17 de agosto de 2026",
    author: "Equipe editorial LIM PDF",
    excerpt: "Um retângulo preto pode esconder uma palavra visualmente e ainda deixar o conteúdo recuperável. A revisão de privacidade precisa considerar texto, imagens, metadados e anexos.",
    intro: "Documentos com CPF, endereço, dados bancários, informações médicas ou detalhes de contratos exigem mais do que uma alteração estética. Antes de compartilhar um PDF, identifique quais informações devem permanecer e quais precisam ser removidas da saída.",
    sections: [
      { heading: "Cobertura visual não é remoção segura", paragraphs: ["Desenhar uma forma sobre um trecho pode ocultar o texto na tela, mas não garante que o conteúdo antigo desapareceu da estrutura do arquivo. Dependendo de como o PDF foi criado, alguém pode selecionar, copiar, pesquisar ou remover a cobertura.", "Para informações sensíveis, use uma operação de redação que remova o conteúdo subjacente e gere uma nova saída. Ainda assim, faça uma verificação independente antes do envio."], bullets: ["Não use apenas marca-d’água preta como proteção.", "Não assuma que o PDF achatado remove todos os metadados.", "Faça busca por termos e números que deveriam desaparecer."] },
      { heading: "Checklist de revisão antes de compartilhar", paragraphs: ["A privacidade do documento não está apenas no texto visível. Revise comentários, anexos, camadas, propriedades do arquivo, nomes de autores e páginas que ficaram fora do fluxo principal.", "Quando o documento for usado em um contexto profissional, registre qual versão foi revisada, quem autorizou o compartilhamento e qual foi o critério para considerar a redação completa."], bullets: ["Pesquise nomes, números e expressões sensíveis.", "Abra o arquivo em outro leitor e tente selecionar o trecho removido.", "Confira metadados, anexos, comentários e páginas ocultas."] },
      { heading: "Privacidade no processamento local", paragraphs: [commonLocalProcessing, "Processamento local reduz a superfície de envio, mas não elimina riscos do próprio dispositivo. Use um aparelho confiável, mantenha o navegador atualizado e limpe o cache temporário quando terminar."],
      },
    ],
    faq: [
      { question: "O LIM PDF garante que uma redação é juridicamente suficiente?", answer: "Não. A ferramenta é técnica e não substitui revisão jurídica, política interna ou validação do responsável pelo documento." },
      { question: "Devo apagar o arquivo original?", answer: "Não automaticamente. Preserve o original conforme a sua política de retenção e elimine apenas quando houver autorização e uma cópia segura da saída." },
    ],
    relatedTools: [{ label: "Editar PDF", href: "/ferramentas/editar-pdf" }, { label: "Remover metadados", href: "/ferramentas/remover-metadados" }, { label: "Proteger PDF", href: "/ferramentas/proteger-pdf" }],
  },
  {
    slug: "juntar-pdf",
    title: "Como juntar PDFs na ordem certa e revisar o arquivo final",
    description: "Organize anexos, digitalizações e capítulos em um único PDF sem perder a sequência que o leitor precisa seguir.",
    category: "Combinar documentos",
    readingTime: "5 min de leitura",
    updatedAt: "17 de agosto de 2026",
    author: "Equipe editorial LIM PDF",
    excerpt: "A ordem dos arquivos é parte do conteúdo. Uma união bem feita começa por uma lista dos documentos, não pelo botão de processamento.",
    intro: "Juntar PDFs parece uma tarefa simples, mas a ordem, o tamanho das páginas e a proteção dos arquivos podem mudar o resultado. Organize os anexos antes de processar e trate o PDF final como um documento novo que precisa de conferência.",
    sections: [
      { heading: "Monte a sequência antes de carregar", paragraphs: ["Liste o documento principal, os anexos e os comprovantes. Uma convenção simples de nomes, como 01-capa.pdf, 02-contrato.pdf e 03-anexo.pdf, ajuda a evitar trocas quando há muitos arquivos.", "Se os PDFs vierem de fontes diferentes, confira a orientação e o tamanho das páginas. Diferenças são permitidas em muitos casos, mas podem afetar a impressão e a leitura no celular."], bullets: ["Defina qual arquivo será a capa.", "Coloque anexos na ordem em que são citados.", "Separe versões antigas para não misturá-las ao pacote final."] },
      { heading: "Revise o resultado", paragraphs: ["Depois de juntar os arquivos, verifique a quantidade de páginas e navegue pelos pontos de transição. Confira se o último parágrafo de um documento não ficou ao lado de um anexo que deveria ser separado.", "Para pacotes enviados a terceiros, use também metadados, marcadores ou numeração quando o documento for longo."], bullets: ["Confira capa, sumário e última página.", "Teste links e marcadores importantes.", "Abra o resultado em mais de um leitor de PDF."] },
      { heading: "Quando usar outra ferramenta", paragraphs: ["Se precisa alternar frente e verso de duas digitalizações, use Alternar PDFs. Se quer colocar um papel timbrado sobre outro documento, use Sobrepor PDFs. Escolher uma operação específica evita compensações manuais e torna o resultado mais previsível.", commonLocalProcessing] },
    ],
    faq: [
      { question: "Posso juntar mais de dois PDFs?", answer: "Sim. O fluxo aceita múltiplos arquivos PDF e permite reorganizar a sequência antes de gerar a saída." },
      { question: "O arquivo unido mantém os originais?", answer: "Os arquivos escolhidos continuam no dispositivo; a união produz um novo PDF para download." },
    ],
    relatedTools: [{ label: "Juntar PDF", href: "/ferramentas/juntar-pdf" }, { label: "Alternar PDFs", href: "/ferramentas/alternar-pdfs" }, { label: "Organizar páginas", href: "/ferramentas/organizar-paginas" }],
  },
  {
    slug: "converter-pdf-para-word",
    title: "PDF para Word: quando a conversão funciona e quando revisar",
    description: "Entenda por que textos simples convertem melhor do que tabelas, colunas e PDFs digitalizados, e como revisar o DOCX.",
    category: "Conversão de formatos",
    readingTime: "7 min de leitura",
    updatedAt: "17 de agosto de 2026",
    author: "Equipe editorial LIM PDF",
    excerpt: "Converter PDF para Word é uma reconstrução do conteúdo, não uma cópia perfeita do layout. A qualidade depende da origem e da estrutura da página.",
    intro: "PDF foi criado para preservar a aparência; Word foi criado para editar estrutura. A conversão tenta aproximar esses dois objetivos e, por isso, deve ser tratada como um primeiro rascunho editável que precisa de revisão.",
    sections: [
      { heading: "Identifique o tipo de PDF", paragraphs: ["Um PDF criado digitalmente costuma oferecer melhores resultados porque já contém texto e fontes. Um PDF escaneado precisa de OCR antes ou durante a conversão, e tabelas, colunas e cabeçalhos podem exigir ajustes manuais.", "Antes de converter o documento completo, teste uma página representativa. Escolha uma página com tabela, uma com texto corrido e uma com imagem para conhecer as limitações do resultado."], bullets: ["Texto digital: geralmente mais previsível.", "Digitalização: requer OCR e revisão.", "Tabelas e colunas: exigem conferência de ordem e alinhamento."] },
      { heading: "Revise o DOCX por partes", paragraphs: ["Abra o arquivo no Word ou em outro editor compatível e confira títulos, quebras de página, listas, notas e tabelas. Não presuma que um documento visualmente parecido tem a mesma estrutura semântica.", "Se o objetivo é apenas copiar o texto, a extração para TXT ou Markdown pode ser mais simples e transparente do que reconstruir todo o layout."], bullets: ["Confira cabeçalhos e rodapés.", "Procure caracteres especiais e acentos.", "Compare valores, datas e números com o PDF original."] },
      { heading: "Escolha a saída pelo objetivo", paragraphs: ["Word é indicado quando você precisa editar o conteúdo. Para leitura e distribuição, talvez seja melhor manter o PDF e apenas compactá-lo ou reorganizar suas páginas.", commonLocalProcessing] },
    ],
    faq: [
      { question: "O resultado mantém a mesma formatação?", answer: "O objetivo é preservar o layout possível, mas elementos complexos, colunas, fontes e tabelas podem precisar de ajuste no editor de destino." },
      { question: "Posso converter um PDF protegido?", answer: "Você precisa ter autorização e a senha correta. Um arquivo protegido pode bloquear leitura, extração ou conversão." },
    ],
    relatedTools: [{ label: "PDF para Word", href: "/ferramentas/pdf-para-word" }, { label: "OCR PDF", href: "/ferramentas/ocr-pdf" }, { label: "Extrair texto", href: "/ferramentas/extrair-texto-pdf" }],
  },
  {
    slug: "assinar-pdf-digitalmente",
    title: "Como preparar um PDF para assinatura digital",
    description: "Diferencie assinatura visual de assinatura criptográfica e revise o documento antes de inserir um certificado.",
    category: "Assinaturas e confiança",
    readingTime: "8 min de leitura",
    updatedAt: "17 de agosto de 2026",
    author: "Equipe editorial LIM PDF",
    excerpt: "Uma imagem de assinatura e uma assinatura digital não oferecem a mesma evidência. O método deve corresponder ao risco e ao processo que o documento exige.",
    intro: "Antes de assinar, confirme qual tipo de evidência o destinatário precisa. Uma assinatura desenhada ou inserida como imagem identifica visualmente uma aprovação; uma assinatura criptográfica associa o documento a uma chave e permite verificar alterações posteriores.",
    sections: [
      { heading: "Escolha o tipo de assinatura", paragraphs: ["Para uma aprovação interna de baixo risco, uma assinatura visual pode ser suficiente se a política da organização permitir. Para contratos, processos ou documentos que exigem integridade verificável, use um fluxo de assinatura digital com certificado compatível.", "A assinatura digital não corrige um documento incompleto. Primeiro finalize texto, anexos, páginas, metadados e destinatários; depois assine a versão final."], bullets: ["Visual: marca a página, mas não prova integridade por si só.", "Criptográfica: permite verificar alterações após a assinatura.", "Processo externo: pode incluir identidade, carimbo de tempo e trilha de auditoria."] },
      { heading: "Faça uma revisão antes da assinatura", paragraphs: ["Confira nome das partes, datas, valores, páginas e anexos. Um erro depois da assinatura pode exigir uma nova versão e invalidar o fluxo anterior.", "Depois de assinar, abra o PDF em outro leitor e verifique se a assinatura aparece como válida ou se o leitor mostra algum aviso que precisa ser resolvido."], bullets: ["Não assine uma cópia provisória.", "Guarde a versão original conforme a política aplicável.", "Confirme o certificado e a chave antes de iniciar."] },
      { heading: "Limites e responsabilidade", paragraphs: ["A tecnologia de assinatura não substitui avaliação jurídica ou a política de certificação da organização. A validade depende do contexto, do certificado, da cadeia de confiança e das regras aplicáveis.", commonLocalProcessing] },
    ],
    faq: [
      { question: "Uma assinatura desenhada tem o mesmo valor de uma assinatura digital?", answer: "Não necessariamente. São mecanismos diferentes e a aceitação depende do contexto, da política interna e das regras aplicáveis ao documento." },
      { question: "O LIM PDF guarda o certificado?", answer: "O fluxo local utiliza os arquivos escolhidos no navegador. Não envie certificados ou chaves para terceiros e limpe os arquivos temporários após o uso." },
    ],
    relatedTools: [{ label: "Assinar PDF", href: "/ferramentas/assinar-pdf" }, { label: "Assinatura digital", href: "/ferramentas/assinatura-digital-pdf" }, { label: "Remover metadados", href: "/ferramentas/remover-metadados" }],
  },
  {
    slug: "proteger-pdf-com-senha",
    title: "Como proteger um PDF com senha sem perder o controle do arquivo",
    description: "Entenda a diferença entre senha de abertura, permissões e compartilhamento seguro antes de enviar um documento.",
    category: "Privacidade e segurança",
    readingTime: "6 min de leitura",
    updatedAt: "17 de agosto de 2026",
    author: "Equipe editorial LIM PDF",
    excerpt: "Senha ajuda, mas não substitui um processo de compartilhamento seguro. Escolha uma senha forte e entregue a credencial por um canal separado.",
    intro: "Proteger um PDF é mais do que marcar uma caixa. Você precisa decidir se quer impedir a abertura, limitar impressão e cópia, ou apenas reduzir o risco de um arquivo ser encaminhado sem autorização.",
    sections: [
      { heading: "Diferencie abertura e permissões", paragraphs: ["A senha de abertura impede que o leitor visualize o documento sem a credencial. Permissões podem limitar impressão, cópia ou edição, mas diferentes leitores tratam essas regras de maneiras distintas.", "Se o documento contém dados pessoais ou comerciais, a proteção deve ser combinada com um canal de envio seguro e uma senha que não esteja no mesmo e-mail do arquivo."], bullets: ["Use uma senha de abertura para restringir leitura.", "Use permissões para expressar a intenção de uso.", "Não trate restrições de cópia como substituto de redação segura."] },
      { heading: "Compartilhe a senha separadamente", paragraphs: ["Evite enviar arquivo e senha na mesma mensagem. Prefira um canal diferente e confirme o destinatário antes de compartilhar. Para grupos, use um gestor de senhas ou um processo de convite com expiração quando disponível.", "Não reutilize uma senha pessoal ou de acesso à conta em documentos enviados a terceiros."], bullets: ["Use uma senha longa e exclusiva.", "Não coloque a senha no nome do arquivo.", "Confirme quem realmente precisa de acesso."] },
      { heading: "Teste antes de enviar", paragraphs: ["Abra a cópia protegida em uma janela privada ou em outro leitor para garantir que a senha foi aplicada. Teste também a ação que você quer bloquear e mantenha uma cópia de recuperação em local autorizado.", commonLocalProcessing] },
    ],
    faq: [
      { question: "Posso recuperar uma senha esquecida?", answer: "Não conte com recuperação. Mantenha a credencial em um gestor seguro e preserve uma cópia original conforme a sua política." },
      { question: "Uma senha impede qualquer cópia do PDF?", answer: "Restrições de permissões dependem do leitor. Para proteger informação sensível, remova o conteúdo que não deve ser compartilhado em vez de confiar apenas na restrição de cópia." },
    ],
    relatedTools: [{ label: "Proteger PDF", href: "/ferramentas/proteger-pdf" }, { label: "Permissões PDF", href: "/ferramentas/permissoes-pdf" }, { label: "Redação segura", href: "/guias/redacao-segura-pdf" }],
  },
];

export const guideBySlug = new Map(guides.map((guide) => [guide.slug, guide]));
