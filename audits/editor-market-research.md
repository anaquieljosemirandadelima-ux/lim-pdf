# Pesquisa de mercado do editor e fontes

## Google Fonts — CSS API v2

Fonte oficial: [CSS API update — Google Fonts](https://developers.google.com/fonts/docs/css2).

A documentação oficial informa que a CSS API v2 suporta fontes variáveis e permite solicitar famílias únicas ou múltiplas, pesos específicos, itálico e intervalos de eixos como `wght@200..900`. A API usa a URL-base `https://fonts.googleapis.com/css2`; sem especificar estilo, entrega o estilo padrão da família. A documentação também recomenda progressive enhancement, porque navegadores sem suporte a fontes variáveis podem não reproduzir o desenho solicitado; nesses casos, a aplicação deve oferecer fallback para pesos estáticos e usar `@supports` quando necessário.

Aplicação ao LIM PDF: a CSS API é adequada para a pré-visualização da tipografia no canvas HTML, mas não é suficiente sozinha para exportar a fonte dentro do PDF. A arquitetura deve separar `FontPreviewProvider` (CSS API, opcional e sob demanda) de `PdfFontEmbedder` (arquivo de fonte compatível, validação de licença, cache local e fallback). A edição básica precisa continuar funcionando sem rede e com fontes padrão locais.
## Adobe Acrobat Online

Fonte oficial: [Free PDF editor — Adobe Acrobat](https://www.adobe.com/acrobat/online/pdf-editor.html).

A página oficial posiciona o editor online gratuito para adicionar texto, comentários e preencher/assinar documentos. Também informa que o arquivo é tratado nos servidores da Adobe, protegido por HTTPS/TLS 1.2 e armazenado com AES-256 conforme o aviso exibido na página; o serviço é, portanto, um benchmark de segurança percebida, mas não de processamento local.

Implicação para o LIM PDF: destacar processamento local e privacidade sem upload como diferencial, mas elevar o conjunto mínimo gratuito com comentários, preenchimento e assinatura desenhada, enquanto recursos de edição nativa, conformidade e colaboração podem ser Premium/Profissional.
## Smallpdf

Fonte oficial: [Free PDF Editor — Smallpdf](https://smallpdf.com/edit-pdf).

O Smallpdf anuncia edição de texto existente e novo, formas, imagens, destaques, notas adesivas, desenho livre e assinaturas eletrônicas. O fluxo também inclui reorganização, união, extração e divisão de páginas no modo Organize, além de exportação para PDF, Word, Excel, PowerPoint ou JPG. A página destaca uso em Mac, Windows e dispositivos móveis, sem instalação, e conexões com Dropbox e Google Drive; também lista criptografia TLS, GDPR e certificação ISO/IEC 27001 como sinais de segurança da plataforma.

Implicação para o LIM PDF: o conjunto gratuito competitivo precisa oferecer pelo menos texto, formas, imagens, marcações, assinatura desenhada e organização de páginas em uma mesma experiência. O diferencial local pode ser preservado, enquanto compartilhamento, integrações externas, comparação, edição de texto existente mais fiel, colaboração e exportações avançadas são bons candidatos Premium.
## iLovePDF

Fonte oficial: [PDF Editor — iLovePDF](https://www.ilovepdf.com/edit-pdf).

A página oficial resume o editor como uma ferramenta para adicionar texto, formas, comentários e destaques. O fluxo de entrada oferece seleção local e importação de arquivos pelo Google Drive e Dropbox.

Implicação para o LIM PDF: manter o fluxo local como padrão e evitar dependência de Drive/Dropbox na edição básica. Para superar a oferta gratuita, o editor deve incluir os objetos básicos do iLovePDF e avançar em tipografia, formulários, revisão, redação verificável, organização integrada e exportação de alta fidelidade.
## Google Fonts — licenciamento

Fonte oficial: [Licensing — Fonts Knowledge](https://fonts.google.com/knowledge/glossary/licensing).

A documentação explica que toda fonte possui uma licença e recomenda manter uma cópia da licença de cada arquivo de fonte distribuído. A maioria das fontes open source usa a SIL Open Font License, mas os termos devem ser verificados para cada família e uso. A própria página ressalva que não constitui aconselhamento jurídico.

Implicação para o LIM PDF: o catálogo de fontes deve armazenar família, variante, URL de origem e licença; a exportação que embute fontes deve preservar ou disponibilizar as informações de licença quando aplicável. O sistema não deve assumir que toda fonte externa é livre para redistribuição apenas por estar disponível na web.
## PDFgear

Fonte oficial: [Edit PDF Online — PDFgear](https://www.pdfgear.com/edit-pdf/).

O PDFgear anuncia editor 100% gratuito, sem cadastro, sem marca-d’água, sem versão Premium e sem compras no aplicativo. A página afirma que os arquivos permanecem privados e são processados localmente no navegador, e apresenta como funções gratuitas adicionar texto, destaque, comentário, anotação e preenchimento de formulários. O ecossistema também oferece criação de PDF preenchível, achatamento, páginas e conversões.

Implicação para o LIM PDF: PDFgear é o benchmark mais direto do diferencial local. Não basta apenas dizer que o processamento é local; o LIM PDF precisa oferecer melhor qualidade de edição, experiência mais organizada, transparência de limites, mais ferramentas de composição e recursos Premium que sejam claramente superiores, como tipografia com fontes, redação verificável, comparação, histórico, workflows e exportação profissional.
## Sejda

Fonte oficial: [Easy to use Online PDF editor — Sejda](https://www.sejda.com/pdf-editor).

A página informa edição de texto existente, adição de texto e imagens, criação/edição de links, anotação, preenchimento e assinatura. Também apresenta `Find & replace`, whiteout para cobrir conteúdo, edição de hyperlinks e fluxo de documento em branco. O serviço online informa que os arquivos ficam privados e são automaticamente apagados após duas horas; o uso gratuito é limitado por documento, páginas e tarefas por hora, e a Sejda oferece aplicativo Desktop para trabalho offline.

Implicação para o LIM PDF: localizar/substituir, edição de links, whiteout controlado e um modo de documento em branco são oportunidades claras de diferenciação. Como o LIM PDF já processa localmente, pode superar a privacidade operacional da versão online da Sejda, mas precisa oferecer limites transparentes, cancelamento e edição de texto mais consistente.
## PDF24

Fonte oficial: [Edit PDF — PDF24](https://tools.pdf24.org/en/edit-pdf).

O PDF24 apresenta editor online gratuito, sem limites declarados, seguro e sem instalação. A página descreve inserção de formulários, texto, imagens e desenho livre; orienta converter PDF para Word quando a necessidade é editar texto, indicando uma limitação relevante da edição nativa. O serviço é processado na nuvem e os arquivos/resultados são removidos após curto período; a página também declara financiamento por publicidade. Há aplicativo Desktop para Windows e integração de importação com Google Drive/Dropbox.

Implicação para o LIM PDF: preservar a vantagem do processamento local e da ausência de upload, mas superar o PDF24 em edição de texto existente, tipografia e revisão. O modelo de publicidade reforça a necessidade de manter anúncios fora da área de trabalho e evitar interrupção do fluxo Premium.
## Google Fonts — Developer API

Fonte oficial: [Developer API — Google Fonts](https://developers.google.com/fonts/docs/developer_api).

A Developer API fornece metadados JSON das famílias servidas pelo Google Fonts, incluindo estilos e subconjuntos/scripts, e permite ordenar por nome, data, número de estilos, tendência ou popularidade. Diferentemente da CSS API, cada requisição exige uma chave de API no parâmetro `key`.

Decisão preliminar: o LIM PDF não precisa dessa API para a primeira versão do seletor. Um catálogo curado e versionado localmente evita expor chave no frontend, reduz dependência externa e melhora privacidade. A Developer API pode ser usada posteriormente em build-time ou em endpoint server-side para atualizar metadados, nunca como dependência obrigatória do editor no navegador. A CSS API pode ser usada sob demanda apenas para pré-visualização, com fallback local.
